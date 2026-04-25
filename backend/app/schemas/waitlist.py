import uuid
from datetime import datetime

from pydantic import BaseModel, computed_field

from app.core.money import paise_to_rupees
from app.models.plan import PlanCategory


class WaitlistJoinRequest(BaseModel):
    plan_id: uuid.UUID


class WaitlistJoinResponse(BaseModel):
    waitlist_entry_id: uuid.UUID
    plan_id: uuid.UUID
    plan_name: str
    queue_position: int
    joined_at: datetime


class WaitlistPlanSummary(BaseModel):
    id: uuid.UUID
    name: str
    category: PlanCategory
    logo_url: str | None
    user_pays_paise: int

    @computed_field(return_type=float)
    @property
    def user_pays_rupees(self) -> float:
        return paise_to_rupees(self.user_pays_paise)


class WaitlistEntryOut(BaseModel):
    id: uuid.UUID
    plan: WaitlistPlanSummary
    queue_position: int
    joined_at: datetime
