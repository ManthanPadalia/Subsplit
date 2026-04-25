from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.payment import Payment, PaymentStatus
from app.models.plan import Plan
from app.models.slot import Slot, SlotStatus
from app.models.user import User
from app.schemas.payment import (
    ActivatedSlotPlanSummary,
    ActivatedSlotSummary,
    CreateOrderRequest,
    CreateOrderResponse,
    PaymentOut,
    PaymentPlanSummary,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from app.services import payment_service, slot_service

router = APIRouter()


def _success_response(data: dict, message: str | None = None) -> dict:
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


def _get_plan(db: Session, plan_id: uuid.UUID) -> Plan:
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PLAN_NOT_FOUND", "message": "Plan not found"},
        )
    return plan


@router.post("/create-order", status_code=status.HTTP_201_CREATED)
def create_order(
    payload: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    plan = _get_active_plan(db, payload.plan_id)

    slot = slot_service.get_available_slot(db, plan.id)
    if slot is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "PLAN_FULL", "message": "No available slots for this plan"},
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

    try:
        payment = payment_service.create_razorpay_order(db, current_user, slot, plan)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "PAYMENT_GATEWAY_ERROR",
                "message": "Unable to create Razorpay order",
                "details": {"reason": str(exc)},
            },
        ) from exc

    response = CreateOrderResponse(
        payment_id=payment.id,
        razorpay_order_id=payment.razorpay_order_id or "",
        amount_paise=payment.amount_paise,
        plan_name=plan.name,
        slot_number=slot.slot_number,
    )
    return _success_response(
        data=response.model_dump(mode="json"),
        message="Order created. Complete payment to activate your slot.",
    )


@router.post("/verify")
def verify_payment(
    payload: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        payment, slot = payment_service.verify_and_activate(
            db=db,
            user=current_user,
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=payload.razorpay_payment_id,
            razorpay_signature=payload.razorpay_signature,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "You do not have access to this payment"},
        ) from exc
    except ValueError as exc:
        code = str(exc)
        if code == "PAYMENT_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": code, "message": "Payment not found"},
            ) from exc
        if code == "INVALID_SIGNATURE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": code, "message": "Invalid payment signature"},
            ) from exc
        if code == "PAYMENT_ALREADY_PROCESSED":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": code, "message": "Payment has already been processed"},
            ) from exc
        raise

    plan = _get_plan(db, slot.plan_id)
    response = VerifyPaymentResponse(
        payment_id=payment.id,
        status=payment.status,
        slot=ActivatedSlotSummary(
            id=slot.id,
            slot_number=slot.slot_number,
            status=slot.status,
            assigned_at=slot.assigned_at,
            expires_at=slot.expires_at,
            plan=ActivatedSlotPlanSummary(
                id=plan.id,
                name=plan.name,
                category=plan.category,
                access_instructions=plan.access_instructions,
            ),
        ),
    )
    return _success_response(
        data=response.model_dump(mode="json"),
        message="Payment verified. Your slot is now active!",
    )


@router.get("/my")
def get_my_payments(
    status_filter: PaymentStatus | None = Query(default=None, alias="status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    query = (
        db.query(Payment)
        .options(joinedload(Payment.slot).joinedload(Slot.plan))
        .filter(Payment.user_id == current_user.id)
    )
    if status_filter is not None:
        query = query.filter(Payment.status == status_filter)

    total = query.count()
    payments = (
        query.order_by(Payment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    response_items = [
        PaymentOut(
            id=payment.id,
            amount_paise=payment.amount_paise,
            status=payment.status,
            razorpay_order_id=payment.razorpay_order_id,
            razorpay_payment_id=payment.razorpay_payment_id,
            failure_reason=payment.failure_reason,
            created_at=payment.created_at,
            plan=PaymentPlanSummary(
                id=payment.slot.plan.id,
                name=payment.slot.plan.name,
                category=payment.slot.plan.category,
            ),
        ).model_dump(mode="json")
        for payment in payments
    ]

    return _success_response(
        data={"payments": response_items, "total": total, "skip": skip, "limit": limit}
    )
