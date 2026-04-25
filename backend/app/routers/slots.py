from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.slot import Slot, SlotStatus
from app.models.user import User, UserRole
from app.schemas.slot import SlotDetailOut, SlotOut, SlotPaymentHistoryItem, SlotPlanSummary
from app.services import slot_service

router = APIRouter()


def _success_response(data: dict | None, message: str | None = None) -> dict:
    response = {"success": True, "data": data}
    if message is not None:
        response["message"] = message
    return response


def _build_plan_summary(slot: Slot) -> SlotPlanSummary:
    return SlotPlanSummary(
        id=slot.plan.id,
        name=slot.plan.name,
        category=slot.plan.category,
        logo_url=slot.plan.logo_url,
        user_pays_paise=slot.plan.user_pays_paise,
        access_instructions=slot.plan.access_instructions,
    )


def _build_slot_out(slot: Slot) -> SlotOut:
    return SlotOut(
        id=slot.id,
        slot_number=slot.slot_number,
        status=slot.status,
        assigned_at=slot.assigned_at,
        expires_at=slot.expires_at,
        plan=_build_plan_summary(slot),
    )


@router.get("/my")
def get_my_slots(
    status_filter: SlotStatus | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    query = (
        db.query(Slot)
        .options(joinedload(Slot.plan))
        .filter(Slot.user_id == current_user.id)
        .order_by(Slot.assigned_at.desc().nullslast(), Slot.created_at.desc())
    )

    if status_filter is not None:
        query = query.filter(Slot.status == status_filter)

    slots = query.all()

    return _success_response(
        data={"slots": [_build_slot_out(slot).model_dump(mode="json") for slot in slots]}
    )


@router.get("/{slot_id}")
def get_slot(
    slot_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    slot = (
        db.query(Slot)
        .options(
            joinedload(Slot.plan),
            joinedload(Slot.payments),
        )
        .filter(Slot.id == slot_id)
        .first()
    )
    if slot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SLOT_NOT_FOUND", "message": "Slot not found"},
        )

    if slot.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "You do not have access to this slot"},
        )

    payload = SlotDetailOut(
        **_build_slot_out(slot).model_dump(),
        payment_history=[
            SlotPaymentHistoryItem(
                id=payment.id,
                amount_paise=payment.amount_paise,
                status=payment.status,
                created_at=payment.created_at,
            )
            for payment in sorted(slot.payments, key=lambda item: item.created_at, reverse=True)
        ],
    )
    return _success_response(data=payload.model_dump(mode="json"))


@router.delete("/{slot_id}/cancel")
def cancel_slot(
    slot_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if slot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SLOT_NOT_FOUND", "message": "Slot not found"},
        )

    if slot.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "You do not have access to this slot"},
        )

    if slot.status != SlotStatus.OCCUPIED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "SLOT_NOT_CANCELLABLE",
                "message": "Only occupied slots can be cancelled",
            },
        )

    slot_service.cancel_slot(db, slot)
    return _success_response(
        data=None,
        message="Slot cancelled successfully. No refund is issued for partial months.",
    )
