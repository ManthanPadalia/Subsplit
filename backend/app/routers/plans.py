from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.money import paise_to_rupees
from app.models.plan import Plan, PlanCategory
from app.models.slot import Slot, SlotStatus

router = APIRouter()


def _success_response(data: dict, message: str | None = None) -> dict:
    response = {"success": True, "data": data}
    if message is not None:
        response["message"] = message
    return response


def _parse_category(category: str | None) -> PlanCategory | None:
    if category is None:
        return None

    try:
        return PlanCategory(category)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_CATEGORY",
                "message": "Category value is not a valid enum option",
            },
        ) from exc


def _build_plan_summary(
    plan: Plan,
    available_slots: int,
    occupied_slots: int,
) -> dict:
    return {
        "id": plan.id,
        "name": plan.name,
        "category": plan.category,
        "description": plan.description,
        "logo_url": plan.logo_url,
        "total_slots": plan.total_slots,
        "subscription_cost_paise": plan.subscription_cost_paise,
        "subscription_cost_rupees": paise_to_rupees(plan.subscription_cost_paise),
        "platform_fee_paise": plan.platform_fee_paise,
        "platform_fee_rupees": paise_to_rupees(plan.platform_fee_paise),
        "slot_cost_paise": plan.slot_cost_paise,
        "slot_cost_rupees": paise_to_rupees(plan.slot_cost_paise),
        "user_pays_paise": plan.user_pays_paise,
        "user_pays_rupees": paise_to_rupees(plan.user_pays_paise),
        "available_slots": available_slots,
        "occupied_slots": occupied_slots,
        "uptime_percentage": float(plan.uptime_percentage),
        "is_active": plan.is_active,
        "created_at": plan.created_at,
    }


def _user_initials(name: str) -> str | None:
    parts = [part for part in name.split() if part]
    if not parts:
        return None
    if len(parts) == 1:
        return parts[0][0].upper()
    return f"{parts[0][0]}{parts[-1][0]}".upper()


@router.get("")
def get_plans(
    category: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    parsed_category = _parse_category(category)

    slot_counts_subquery = (
        db.query(
            Slot.plan_id.label("plan_id"),
            func.count(case((Slot.status == SlotStatus.AVAILABLE, 1))).label(
                "available_slots"
            ),
            func.count(
                case((Slot.status.in_([SlotStatus.OCCUPIED, SlotStatus.GRACE]), 1))
            ).label("occupied_slots"),
        )
        .group_by(Slot.plan_id)
        .subquery()
    )

    base_query = db.query(Plan).filter(Plan.is_active.is_(True))
    if parsed_category is not None:
        base_query = base_query.filter(Plan.category == parsed_category)

    total = base_query.count()

    plans = (
        base_query.outerjoin(slot_counts_subquery, Plan.id == slot_counts_subquery.c.plan_id)
        .with_entities(
            Plan,
            func.coalesce(slot_counts_subquery.c.available_slots, 0),
            func.coalesce(slot_counts_subquery.c.occupied_slots, 0),
        )
        .order_by(Plan.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return _success_response(
        data={
            "plans": [
                _build_plan_summary(plan, available_slots, occupied_slots)
                for plan, available_slots, occupied_slots in plans
            ],
            "total": total,
            "skip": skip,
            "limit": limit,
        }
    )


@router.get("/{plan_id}")
def get_plan(plan_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    plan = (
        db.query(Plan)
        .options(joinedload(Plan.slots).joinedload(Slot.user))
        .filter(Plan.id == plan_id)
        .first()
    )
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "PLAN_NOT_FOUND",
                "message": "Plan not found",
            },
        )

    if not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "PLAN_INACTIVE",
                "message": "Plan is inactive",
            },
        )

    available_slots = sum(1 for slot in plan.slots if slot.status == SlotStatus.AVAILABLE)
    occupied_slots = sum(
        1 for slot in plan.slots if slot.status in {SlotStatus.OCCUPIED, SlotStatus.GRACE}
    )

    data = _build_plan_summary(plan, available_slots, occupied_slots)
    data["access_instructions"] = plan.access_instructions
    data["slots"] = [
        {
            "id": slot.id,
            "slot_number": slot.slot_number,
            "status": slot.status,
            "user_initials": _user_initials(slot.user.name) if slot.user is not None else None,
        }
        for slot in sorted(plan.slots, key=lambda item: item.slot_number)
    ]

    return _success_response(data=data)
