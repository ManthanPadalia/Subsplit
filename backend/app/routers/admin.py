from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.money import paise_to_rupees
from app.dependencies import get_current_admin
from app.models.demand_signal import DemandSignal
from app.models.payment import Payment, PaymentStatus
from app.models.plan import Plan, PlanCategory
from app.models.score_event import ScoreEvent, ScoreEventType
from app.models.slot import Slot, SlotStatus
from app.models.user import User, UserRole
from app.models.waitlist import WaitlistEntry
from app.schemas.admin import AdminPlanUpdate, SlotRevokeRequest
from app.schemas.plan import PlanCreate
from app.services import scoring_service, slot_service

router = APIRouter(dependencies=[Depends(get_current_admin)])

ACTIVE_SLOT_STATUSES = {SlotStatus.OCCUPIED, SlotStatus.GRACE}


def _success_response(data: dict | None, message: str | None = None) -> dict:
    response = {"success": True, "data": data}
    if message is not None:
        response["message"] = message
    return response


def _user_initials(name: str) -> str | None:
    parts = [part for part in name.split() if part]
    if not parts:
        return None
    if len(parts) == 1:
        return parts[0][0].upper()
    return f"{parts[0][0]}{parts[-1][0]}".upper()


def _active_slot_count(plan: Plan) -> int:
    return sum(1 for slot in plan.slots if slot.status in ACTIVE_SLOT_STATUSES)


def _available_slot_count(plan: Plan) -> int:
    return sum(1 for slot in plan.slots if slot.status == SlotStatus.AVAILABLE)


def _monthly_revenue_paise(plan: Plan, occupied_slots: int) -> int:
    return plan.user_pays_paise * occupied_slots


def _monthly_margin_paise(plan: Plan, occupied_slots: int) -> int:
    return _monthly_revenue_paise(plan, occupied_slots) - plan.subscription_cost_paise


def _utilization_percentage(occupied_slots: int, total_slots: int) -> float:
    if total_slots == 0:
        return 0.0
    return round((occupied_slots / total_slots) * 100, 2)


def _plan_summary(plan: Plan) -> dict:
    occupied_slots = _active_slot_count(plan)
    available_slots = _available_slot_count(plan)
    monthly_revenue_paise = _monthly_revenue_paise(plan, occupied_slots)
    monthly_margin_paise = _monthly_margin_paise(plan, occupied_slots)
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
        "utilization_percentage": _utilization_percentage(occupied_slots, plan.total_slots),
        "monthly_revenue_paise": monthly_revenue_paise,
        "monthly_revenue_rupees": paise_to_rupees(monthly_revenue_paise),
        "monthly_margin_paise": monthly_margin_paise,
        "monthly_margin_rupees": paise_to_rupees(monthly_margin_paise),
        "uptime_percentage": float(plan.uptime_percentage),
        "is_active": plan.is_active,
        "created_at": plan.created_at,
    }


def _parse_action(description: str | None, event_type: ScoreEventType) -> tuple[str, str]:
    description = description or ""
    if event_type == ScoreEventType.ON_TIME_PAYMENT:
        if description.startswith("On-time payment"):
            plan_name = _extract_plan_name(description)
            if plan_name is not None:
                return f"Purchased slot on {plan_name}", "SLOT_PURCHASE"
        return description, "SLOT_PURCHASE"
    if event_type == ScoreEventType.LATE_PAYMENT:
        plan_name = _extract_plan_name(description)
        if plan_name is not None:
            return f"Late payment for {plan_name}", "LATE_PAYMENT"
        return description, "LATE_PAYMENT"
    if event_type == ScoreEventType.SLOT_REVOKED:
        return description, "SLOT_REVOKED"
    return description, event_type.value


def _extract_plan_name(description: str | None) -> str | None:
    if not description:
        return None
    if " for " in description:
        return description.split(" for ", 1)[1].strip()
    if " — " in description:
        parts = [part.strip() for part in description.split(" — ") if part.strip()]
        if len(parts) >= 2:
            return parts[1]
    return None


def _get_plan_or_404(db: Session, plan_id: uuid.UUID) -> Plan:
    plan = (
        db.query(Plan)
        .options(
            joinedload(Plan.slots).joinedload(Slot.user),
            joinedload(Plan.waitlist_entries),
        )
        .filter(Plan.id == plan_id)
        .first()
    )
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PLAN_NOT_FOUND", "message": "Plan not found"},
        )
    return plan


def _get_user_or_404(db: Session, user_id: uuid.UUID) -> User:
    user = (
        db.query(User)
        .options(
            joinedload(User.slots).joinedload(Slot.plan),
            joinedload(User.score_events),
            joinedload(User.payments).joinedload(Payment.slot).joinedload(Slot.plan),
        )
        .filter(User.id == user_id)
        .first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "USER_NOT_FOUND", "message": "User not found"},
        )
    return user


def get_revenue_by_category(db: Session) -> list[dict]:
    plans = (
        db.query(Plan)
        .options(joinedload(Plan.slots))
        .filter(Plan.is_active.is_(True))
        .all()
    )
    revenue_map: dict[str, int] = defaultdict(int)
    for plan in plans:
        occupied_slots = sum(1 for slot in plan.slots if slot.status == SlotStatus.OCCUPIED)
        revenue_map[plan.category.value] += plan.user_pays_paise * occupied_slots
    return [
        {
            "category": category,
            "revenue_paise": revenue_paise,
            "revenue_rupees": paise_to_rupees(revenue_paise),
        }
        for category, revenue_paise in sorted(revenue_map.items())
    ]


def get_slot_utilization_by_category(db: Session) -> list[dict]:
    plans = (
        db.query(Plan)
        .options(joinedload(Plan.slots))
        .filter(Plan.is_active.is_(True))
        .all()
    )
    totals: dict[str, dict[str, int]] = defaultdict(lambda: {"occupied": 0, "total": 0})
    for plan in plans:
        category_totals = totals[plan.category.value]
        category_totals["total"] += len(plan.slots)
        category_totals["occupied"] += sum(
            1 for slot in plan.slots if slot.status == SlotStatus.OCCUPIED
        )
    return [
        {
            "category": category,
            "utilization_percentage": _utilization_percentage(
                values["occupied"],
                values["total"],
            ),
        }
        for category, values in sorted(totals.items())
    ]


def get_users_by_category(db: Session) -> list[dict]:
    plans = (
        db.query(Plan)
        .options(joinedload(Plan.slots))
        .filter(Plan.is_active.is_(True))
        .all()
    )
    category_users: dict[str, set[uuid.UUID]] = defaultdict(set)
    for plan in plans:
        for slot in plan.slots:
            if slot.status == SlotStatus.OCCUPIED and slot.user_id is not None:
                category_users[plan.category.value].add(slot.user_id)
    return [
        {"category": category, "user_count": len(user_ids)}
        for category, user_ids in sorted(category_users.items())
    ]


def get_score_distribution(db: Session) -> dict:
    users = db.query(User).filter(User.role == UserRole.USER).all()
    distribution = {"high": 0, "medium": 0, "low": 0}
    for user in users:
        score = scoring_service.get_user_score(db, user.id)
        if score >= 75:
            distribution["high"] += 1
        elif score >= 40:
            distribution["medium"] += 1
        else:
            distribution["low"] += 1
    return {
        "high": {"range": "75-100", "count": distribution["high"]},
        "medium": {"range": "40-74", "count": distribution["medium"]},
        "low": {"range": "0-39", "count": distribution["low"]},
    }


def get_revenue_trend(db: Session) -> list[dict]:
    payments = (
        db.query(Payment)
        .filter(Payment.status == PaymentStatus.SUCCESS)
        .order_by(Payment.created_at.asc())
        .all()
    )
    monthly_totals: dict[str, int] = defaultdict(int)
    for payment in payments:
        month = payment.created_at.strftime("%Y-%m")
        monthly_totals[month] += payment.amount_paise
    return [
        {
            "month": month,
            "revenue_paise": amount_paise,
            "revenue_rupees": paise_to_rupees(amount_paise),
        }
        for month, amount_paise in sorted(monthly_totals.items())
    ]


def get_recent_activity(db: Session) -> list[dict]:
    events = (
        db.query(ScoreEvent)
        .options(joinedload(ScoreEvent.user))
        .order_by(ScoreEvent.created_at.desc())
        .limit(10)
        .all()
    )
    activity = []
    for event in events:
        user = event.user
        action, action_type = _parse_action(event.description, event.event_type)
        activity.append(
            {
                "user_name": user.name,
                "user_initials": _user_initials(user.name),
                "subsplit_score": scoring_service.get_user_score(db, user.id),
                "action": action,
                "action_type": action_type,
                "timestamp": event.created_at,
            }
        )
    return activity


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)) -> dict:
    plans = db.query(Plan).options(joinedload(Plan.slots)).order_by(Plan.created_at.asc()).all()
    users = db.query(User).filter(User.role == UserRole.USER).all()
    grace_slots = (
        db.query(Slot)
        .options(joinedload(Slot.plan), joinedload(Slot.user))
        .filter(Slot.status == SlotStatus.GRACE)
        .order_by(Slot.expires_at.asc().nullslast())
        .all()
    )

    plans_summary = [_plan_summary(plan) for plan in plans]
    total_slots = sum(plan.total_slots for plan in plans)
    occupied_slots = sum(summary["occupied_slots"] for summary in plans_summary)
    available_slots = sum(summary["available_slots"] for summary in plans_summary)
    total_monthly_revenue_paise = sum(summary["monthly_revenue_paise"] for summary in plans_summary)
    platform_fee_earned_paise = sum(
        plan.platform_fee_paise * _active_slot_count(plan) for plan in plans
    )

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_users_this_month = sum(1 for user in users if user.created_at >= month_start)
    at_risk_users = sum(
        1 for user in users if scoring_service.get_user_score(db, user.id) < 40
    )

    at_risk_slots = [
        {
            "slot_id": slot.id,
            "slot_number": slot.slot_number,
            "status": slot.status,
            "expires_at": slot.expires_at,
            "plan_name": slot.plan.name,
            "user_name": slot.user.name if slot.user is not None else None,
            "user_email": slot.user.email if slot.user is not None else None,
            "subsplit_score": (
                scoring_service.get_user_score(db, slot.user_id)
                if slot.user_id is not None
                else None
            ),
        }
        for slot in grace_slots
    ]

    return _success_response(
        data={
            "metrics": {
                "total_monthly_revenue_paise": total_monthly_revenue_paise,
                "total_monthly_revenue_rupees": paise_to_rupees(total_monthly_revenue_paise),
                "platform_fee_earned_paise": platform_fee_earned_paise,
                "platform_fee_earned_rupees": paise_to_rupees(platform_fee_earned_paise),
                "total_slots": total_slots,
                "occupied_slots": occupied_slots,
                "available_slots": available_slots,
                "utilization_percentage": _utilization_percentage(occupied_slots, total_slots),
                "total_users": len(users),
                "new_users_this_month": new_users_this_month,
                "grace_period_slots": len(grace_slots),
                "at_risk_users": at_risk_users,
            },
            "plans_summary": plans_summary,
            "at_risk_slots": at_risk_slots,
        }
    )


@router.post("/plans", status_code=status.HTTP_201_CREATED)
def create_plan(payload: PlanCreate, db: Session = Depends(get_db)) -> dict:
    plan = Plan(
        name=payload.name,
        category=payload.category,
        description=payload.description,
        logo_url=payload.logo_url,
        total_slots=payload.total_slots,
        subscription_cost_paise=payload.subscription_cost_paise,
        platform_fee_paise=payload.platform_fee_paise,
        access_instructions=payload.access_instructions,
        uptime_percentage=payload.uptime_percentage,
        is_active=True,
    )
    try:
        db.add(plan)
        db.flush()
        slot_service.create_plan_slots(db, plan)
        db.commit()
        db.refresh(plan)
    except Exception:
        db.rollback()
        raise

    return _success_response(
        data=_plan_summary(
            db.query(Plan).options(joinedload(Plan.slots)).filter(Plan.id == plan.id).first()
        ),
        message=f"Plan created with {plan.total_slots} slots.",
    )


@router.get("/plans")
def get_admin_plans(
    is_active: bool | None = Query(default=None),
    category: PlanCategory | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    query = db.query(Plan)
    if is_active is not None:
        query = query.filter(Plan.is_active.is_(is_active))
    if category is not None:
        query = query.filter(Plan.category == category)

    total = query.count()
    plans = (
        query.options(joinedload(Plan.slots))
        .order_by(Plan.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return _success_response(
        data={
            "plans": [_plan_summary(plan) for plan in plans],
            "total": total,
            "skip": skip,
            "limit": limit,
        }
    )


@router.get("/plans/{plan_id}")
def get_admin_plan(plan_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    plan = _get_plan_or_404(db, plan_id)
    data = _plan_summary(plan)
    data["access_instructions"] = plan.access_instructions
    data["slots"] = [
        {
            "id": slot.id,
            "slot_number": slot.slot_number,
            "status": slot.status,
            "assigned_at": slot.assigned_at,
            "expires_at": slot.expires_at,
            "user": (
                {
                    "id": slot.user.id,
                    "name": slot.user.name,
                    "email": slot.user.email,
                    "subsplit_score": scoring_service.get_user_score(db, slot.user.id),
                }
                if slot.user is not None
                else None
            ),
        }
        for slot in sorted(plan.slots, key=lambda item: item.slot_number)
    ]
    data["waitlist_count"] = sum(1 for entry in plan.waitlist_entries if not entry.notified)
    return _success_response(data=data)


@router.put("/plans/{plan_id}")
def update_plan(
    plan_id: uuid.UUID,
    payload: AdminPlanUpdate,
    db: Session = Depends(get_db),
) -> dict:
    plan = db.query(Plan).options(joinedload(Plan.slots)).filter(Plan.id == plan_id).first()
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PLAN_NOT_FOUND", "message": "Plan not found"},
        )

    update_data = payload.model_dump(exclude_unset=True)
    immutable_fields = {"total_slots", "subscription_cost_paise", "category"}
    attempted_immutable = sorted(field for field in immutable_fields if field in update_data)
    if attempted_immutable:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "VALIDATION_ERROR",
                "message": (
                    "total_slots, subscription_cost_paise, and category "
                    "cannot be changed after plan creation"
                ),
                "details": {"fields": attempted_immutable},
            },
        )

    for field, value in update_data.items():
        setattr(plan, field, value)

    db.add(plan)
    db.commit()
    db.refresh(plan)
    plan = db.query(Plan).options(joinedload(Plan.slots)).filter(Plan.id == plan_id).first()
    return _success_response(
        data=_plan_summary(plan),
        message="Plan updated successfully.",
    )


@router.post("/slots/{slot_id}/revoke")
def revoke_slot(
    slot_id: uuid.UUID,
    payload: SlotRevokeRequest,
    db: Session = Depends(get_db),
) -> dict:
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if slot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SLOT_NOT_FOUND", "message": "Slot not found"},
        )
    if slot.status not in ACTIVE_SLOT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "SLOT_NOT_REVOKABLE",
                "message": "Only occupied or grace-period slots can be revoked",
            },
        )

    updated_slot, promoted_user_id = slot_service.admin_revoke_slot(db, slot, payload.reason)
    return _success_response(
        data={
            "slot_id": updated_slot.id,
            "new_status": updated_slot.status,
            "waitlist_promoted": promoted_user_id is not None,
            "promoted_user_id": promoted_user_id,
        },
        message=(
            "Slot revoked. Waitlist user notified."
            if promoted_user_id is not None
            else "Slot revoked."
        ),
    )


@router.get("/users")
def get_admin_users(
    role: UserRole | None = Query(default=None),
    score_max: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    query = db.query(User).options(joinedload(User.slots)).order_by(User.created_at.asc())
    if role is not None:
        query = query.filter(User.role == role)

    users = query.all()
    user_rows = []
    for user in users:
        subsplit_score = scoring_service.get_user_score(db, user.id)
        if score_max is not None and subsplit_score > score_max:
            continue
        active_slot_count = sum(1 for slot in user.slots if slot.status in ACTIVE_SLOT_STATUSES)
        user_rows.append(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
                "subsplit_score": subsplit_score,
                "active_slot_count": active_slot_count,
                "created_at": user.created_at,
            }
        )

    total = len(user_rows)
    return _success_response(
        data={
            "users": user_rows[skip : skip + limit],
            "total": total,
            "skip": skip,
            "limit": limit,
        }
    )


@router.get("/users/{user_id}")
def get_admin_user(user_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    user = _get_user_or_404(db, user_id)
    active_slots = [
        {
            "slot_id": slot.id,
            "plan_name": slot.plan.name,
            "status": slot.status,
            "expires_at": slot.expires_at,
        }
        for slot in sorted(user.slots, key=lambda item: item.created_at, reverse=True)
        if slot.status in ACTIVE_SLOT_STATUSES
    ]
    score_events = [
        {
            "event_type": event.event_type,
            "delta": event.delta,
            "description": event.description,
            "created_at": event.created_at,
        }
        for event in sorted(user.score_events, key=lambda item: item.created_at, reverse=True)
    ]
    payment_history = [
        {
            "amount_paise": payment.amount_paise,
            "amount_rupees": paise_to_rupees(payment.amount_paise),
            "status": payment.status,
            "created_at": payment.created_at,
            "plan_name": payment.slot.plan.name,
        }
        for payment in sorted(user.payments, key=lambda item: item.created_at, reverse=True)
    ]
    return _success_response(
        data={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "subsplit_score": scoring_service.get_user_score(db, user.id),
            "created_at": user.created_at,
            "active_slots": active_slots,
            "score_events": score_events,
            "payment_history": payment_history,
        }
    )


@router.patch("/users/{user_id}/deactivate")
def deactivate_user(user_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "USER_NOT_FOUND", "message": "User not found"},
        )
    user.is_active = False
    db.add(user)
    db.commit()
    return _success_response(data=None, message="User account deactivated.")


@router.get("/analytics")
def get_admin_analytics(db: Session = Depends(get_db)) -> dict:
    demand_signals = (
        db.query(DemandSignal)
        .order_by(DemandSignal.request_count.desc(), DemandSignal.created_at.desc())
        .all()
    )
    return _success_response(
        data={
            "revenue_by_category": get_revenue_by_category(db),
            "slot_utilization_by_category": get_slot_utilization_by_category(db),
            "users_by_category": get_users_by_category(db),
            "revenue_trend": get_revenue_trend(db),
            "score_distribution": get_score_distribution(db),
            "demand_signals": [
                {
                    "id": signal.id,
                    "name": signal.name,
                    "category": signal.category,
                    "request_count": signal.request_count,
                    "estimated_margin_paise": signal.estimated_margin_paise,
                    "estimated_margin_rupees": paise_to_rupees(signal.estimated_margin_paise),
                }
                for signal in demand_signals
            ],
            "recent_activity": get_recent_activity(db),
        }
    )


@router.post("/slots/check-lapses")
def check_lapses(db: Session = Depends(get_db)) -> dict:
    return _success_response(
        data=slot_service.check_and_apply_lapses(db),
        message="Lapse check completed.",
    )


@router.get("/waitlist/{plan_id}")
def get_plan_waitlist(plan_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PLAN_NOT_FOUND", "message": "Plan not found"},
        )

    entries = (
        db.query(WaitlistEntry)
        .options(joinedload(WaitlistEntry.user))
        .filter(
            WaitlistEntry.plan_id == plan_id,
            WaitlistEntry.notified.is_(False),
        )
        .all()
    )
    sorted_entries = sorted(
        entries,
        key=lambda entry: (
            -scoring_service.get_user_score(db, entry.user_id),
            entry.joined_at,
        ),
    )

    waitlist = []
    for index, entry in enumerate(sorted_entries, start=1):
        waitlist.append(
            {
                "position": index,
                "entry_id": entry.id,
                "user": {
                    "id": entry.user.id,
                    "name": entry.user.name,
                    "email": entry.user.email,
                    "subsplit_score": scoring_service.get_user_score(db, entry.user.id),
                },
                "joined_at": entry.joined_at,
                "notified": entry.notified,
            }
        )

    return _success_response(
        data={
            "plan_id": plan.id,
            "plan_name": plan.name,
            "waitlist": waitlist,
            "total_waiting": len(waitlist),
        }
    )
