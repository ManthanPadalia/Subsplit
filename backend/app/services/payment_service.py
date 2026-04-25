from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.payment import Payment, PaymentStatus
from app.models.plan import Plan
from app.models.score_event import ScoreEventType
from app.models.slot import Slot, SlotStatus
from app.models.user import User
from app.services.scoring_service import create_score_event
from app.services.slot_service import transition_slot

if TYPE_CHECKING:
    import razorpay


def get_razorpay_client() -> razorpay.Client:
    import razorpay

    return razorpay.Client(
        auth=(
            settings.RAZORPAY_KEY_ID,
            settings.RAZORPAY_KEY_SECRET,
        )
    )


def create_razorpay_order(
    db: Session,
    user: User,
    slot: Slot,
    plan: Plan,
) -> Payment:
    """
    Create a Razorpay order and a PENDING Payment record.
    Returns the Payment record (contains razorpay_order_id).
    """
    client = get_razorpay_client()
    amount = plan.user_pays_paise

    payment = Payment(
        user_id=user.id,
        slot_id=slot.id,
        amount_paise=amount,
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    db.flush()

    try:
        rzp_order = client.order.create(
            {
                "amount": amount,
                "currency": "INR",
                "receipt": str(payment.id),
                "notes": {
                    "plan_name": plan.name,
                    "slot_number": str(slot.slot_number),
                    "user_email": user.email,
                },
            }
        )
    except Exception as e:
        db.rollback()
        raise RuntimeError(f"Razorpay order creation failed: {str(e)}") from e

    payment.razorpay_order_id = rzp_order["id"]
    db.add(payment)
    db.commit()
    return payment


def verify_and_activate(
    db: Session,
    user: User,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> tuple[Payment, Slot]:
    """
    Verify Razorpay HMAC signature.
    On success: update payment to SUCCESS, activate the slot.
    On failure: update payment to FAILED, raise ValueError.
    """
    payment = db.query(Payment).filter(Payment.razorpay_order_id == razorpay_order_id).first()
    if payment is None:
        raise ValueError("PAYMENT_NOT_FOUND")

    if payment.user_id != user.id:
        raise PermissionError("FORBIDDEN")

    if payment.status != PaymentStatus.PENDING:
        raise ValueError("PAYMENT_ALREADY_PROCESSED")

    expected_signature = hmac.new(
        key=settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        msg=f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, razorpay_signature):
        payment.status = PaymentStatus.FAILED
        payment.failure_reason = "HMAC signature verification failed"
        db.add(payment)
        db.commit()
        raise ValueError("INVALID_SIGNATURE")

    payment.status = PaymentStatus.SUCCESS
    payment.razorpay_payment_id = razorpay_payment_id
    payment.razorpay_signature = razorpay_signature
    db.add(payment)

    slot = db.query(Slot).filter(Slot.id == payment.slot_id).first()
    plan = db.query(Plan).filter(Plan.id == slot.plan_id).first()
    now = datetime.now(timezone.utc)

    if slot.status == SlotStatus.GRACE:
        score_event_type = ScoreEventType.LATE_PAYMENT
        description = f"Late payment during grace period — {plan.name}"
    else:
        score_event_type = ScoreEventType.ON_TIME_PAYMENT
        description = f"On-time payment — {plan.name}"

    transition_slot(db=db, slot=slot, new_status=SlotStatus.OCCUPIED)
    slot.user_id = user.id
    slot.assigned_at = now
    slot.expires_at = now + timedelta(days=30)
    slot.updated_at = now
    db.add(slot)

    create_score_event(
        db=db,
        user_id=user.id,
        event_type=score_event_type,
        description=description,
    )

    db.commit()
    db.refresh(payment)
    db.refresh(slot)
    return payment, slot
