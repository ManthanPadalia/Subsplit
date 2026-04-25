import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from app.core.money import paise_to_rupees
from app.models.payment import PaymentStatus
from app.models.plan import PlanCategory
from app.models.slot import SlotStatus


class SlotPlanSummary(BaseModel):
    id: uuid.UUID
    name: str
    category: PlanCategory
    logo_url: str | None
    user_pays_paise: int
    access_instructions: str | None

    @computed_field(return_type=float)
    @property
    def user_pays_rupees(self) -> float:
        return paise_to_rupees(self.user_pays_paise)


class SlotPaymentHistoryItem(BaseModel):
    id: uuid.UUID
    amount_paise: int
    status: PaymentStatus
    created_at: datetime

    @computed_field(return_type=float)
    @property
    def amount_rupees(self) -> float:
        return paise_to_rupees(self.amount_paise)


class SlotOut(BaseModel):
    id: uuid.UUID
    slot_number: int
    status: SlotStatus
    assigned_at: datetime | None
    expires_at: datetime | None
    plan: SlotPlanSummary

    model_config = ConfigDict(from_attributes=True)


class SlotDetailOut(SlotOut):
    payment_history: list[SlotPaymentHistoryItem]


class SlotCancelResponse(BaseModel):
    message: str = "Slot cancelled successfully. No refund is issued for partial months."
