import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from app.core.money import paise_to_rupees
from app.models.payment import PaymentStatus
from app.models.plan import PlanCategory
from app.models.slot import SlotStatus


class CreateOrderRequest(BaseModel):
    plan_id: uuid.UUID


class CreateOrderResponse(BaseModel):
    payment_id: uuid.UUID
    razorpay_order_id: str
    amount_paise: int
    currency: str = "INR"
    plan_name: str
    slot_number: int

    @computed_field(return_type=float)
    @property
    def amount_rupees(self) -> float:
        return paise_to_rupees(self.amount_paise)


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentPlanSummary(BaseModel):
    id: uuid.UUID
    name: str
    category: PlanCategory


class ActivatedSlotPlanSummary(BaseModel):
    id: uuid.UUID
    name: str
    category: PlanCategory
    access_instructions: str | None


class ActivatedSlotSummary(BaseModel):
    id: uuid.UUID
    slot_number: int
    status: SlotStatus
    assigned_at: datetime | None
    expires_at: datetime | None
    plan: ActivatedSlotPlanSummary


class VerifyPaymentResponse(BaseModel):
    payment_id: uuid.UUID
    status: PaymentStatus
    slot: ActivatedSlotSummary


class PaymentOut(BaseModel):
    id: uuid.UUID
    amount_paise: int
    status: PaymentStatus
    razorpay_order_id: str | None
    razorpay_payment_id: str | None
    failure_reason: str | None
    created_at: datetime
    plan: PaymentPlanSummary

    model_config = ConfigDict(from_attributes=True)

    @computed_field(return_type=float)
    @property
    def amount_rupees(self) -> float:
        return paise_to_rupees(self.amount_paise)
