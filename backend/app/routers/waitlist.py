from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.plan import Plan
from app.models.slot import Slot, SlotStatus
from app.models.user import User
from app.models.waitlist import WaitlistEntry
from app.schemas.waitlist import (
    WaitlistEntryOut,
    WaitlistJoinRequest,
    WaitlistJoinResponse,
    WaitlistPlanSummary,
)
from app.services import slot_service

router = APIRouter()


def _success_response(data: dict | None, message: str | None = None) -> dict:
    response = {"success": True, "data": data}
    if message is not None:
        response["message"] = message
    return response


def _get_active_plan(db: Session, plan_id: uuid.UUID) -> Plan:
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.is_active.is_(True)).first()
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PLAN_NOT_FOUND", "message": "Plan not found"},
        )
    return plan


def _build_plan_summary(plan: Plan) -> WaitlistPlanSummary:
    return WaitlistPlanSummary(
        id=plan.id,
        name=plan.name,
        category=plan.category,
        logo_url=plan.logo_url,
        user_pays_paise=plan.user_pays_paise,
    )


def _build_waitlist_entry(
    db: Session,
    entry: WaitlistEntry,
) -> WaitlistEntryOut:
    return WaitlistEntryOut(
        id=entry.id,
        plan=_build_plan_summary(entry.plan),
        queue_position=slot_service.get_waitlist_position(db, entry.plan_id, entry.user_id),
        joined_at=entry.joined_at,
    )


@router.post("/join", status_code=status.HTTP_201_CREATED)
def join_waitlist(
    payload: WaitlistJoinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    plan = _get_active_plan(db, payload.plan_id)

    if slot_service.get_available_slot_count(db, plan.id) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "SLOTS_AVAILABLE",
                "message": "Slots are available for this plan. Purchase directly instead.",
            },
        )

    existing_slot = (
        db.query(Slot)
        .filter(
            Slot.plan_id == plan.id,
            Slot.user_id == current_user.id,
            Slot.status.in_([SlotStatus.OCCUPIED, SlotStatus.GRACE]),
        )
        .first()
    )
    if existing_slot is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ALREADY_SUBSCRIBED",
                "message": "User already holds a slot on this plan",
            },
        )

    existing_entry = (
        db.query(WaitlistEntry)
        .filter(
            WaitlistEntry.user_id == current_user.id,
            WaitlistEntry.plan_id == plan.id,
            WaitlistEntry.notified.is_(False),
        )
        .first()
    )
    if existing_entry is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ALREADY_ON_WAITLIST",
                "message": "User is already on this plan's waitlist",
            },
        )

    entry = WaitlistEntry(user_id=current_user.id, plan_id=plan.id)
    db.add(entry)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ALREADY_ON_WAITLIST",
                "message": "User is already on this plan's waitlist",
            },
        ) from exc

    db.refresh(entry)

    queue_position = slot_service.get_waitlist_position(db, plan.id, current_user.id)
    response = WaitlistJoinResponse(
        waitlist_entry_id=entry.id,
        plan_id=plan.id,
        plan_name=plan.name,
        queue_position=queue_position,
        joined_at=entry.joined_at,
    )
    return _success_response(
        data=response.model_dump(mode="json"),
        message=f"You are #{queue_position} in the waitlist for {plan.name}.",
    )


@router.delete("/leave/{plan_id}")
def leave_waitlist(
    plan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    entry = (
        db.query(WaitlistEntry)
        .options(joinedload(WaitlistEntry.plan))
        .filter(
            WaitlistEntry.user_id == current_user.id,
            WaitlistEntry.plan_id == plan_id,
            WaitlistEntry.notified.is_(False),
        )
        .first()
    )
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "WAITLIST_ENTRY_NOT_FOUND",
                "message": "User is not on the specified plan's waitlist",
            },
        )

    plan_name = entry.plan.name
    db.delete(entry)
    db.commit()

    return _success_response(
        data=None,
        message=f"You have been removed from the waitlist for {plan_name}.",
    )


@router.get("/my")
def get_my_waitlist_entries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    entries = (
        db.query(WaitlistEntry)
        .options(joinedload(WaitlistEntry.plan))
        .filter(
            WaitlistEntry.user_id == current_user.id,
            WaitlistEntry.notified.is_(False),
        )
        .order_by(WaitlistEntry.joined_at.asc())
        .all()
    )

    return _success_response(
        data={
            "waitlist_entries": [
                _build_waitlist_entry(db, entry).model_dump(mode="json") for entry in entries
            ]
        }
    )
