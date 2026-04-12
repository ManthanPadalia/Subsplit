import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from app.core.money import paise_to_rupees
from app.models.slot import SlotStatus


class SlotOut(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    user_id: uuid.UUID | None
    slot_number: int
    status: SlotStatus
    assigned_at: datetime | None
    expires_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class SlotWithPlan(SlotOut):
    plan_name: str
    plan_category: str
    user_pays_paise: int

    @computed_field(return_type=float)
    @property
    def user_pays_rupees(self) -> float:
        return paise_to_rupees(self.user_pays_paise)


class SlotCancelResponse(BaseModel):
    message: str = "Slot cancelled successfully. No refund is issued for partial months."
