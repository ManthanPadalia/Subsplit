from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.core.money import paise_to_rupees
from app.models.plan import PlanCategory
from app.models.slot import SlotStatus


class PlanSlotPreview(BaseModel):
    id: uuid.UUID
    slot_number: int
    status: SlotStatus
    user_initials: str | None


class PlanCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: PlanCategory
    description: str = Field(..., min_length=1)
    logo_url: str | None = None
    total_slots: int = Field(..., gt=0)
    subscription_cost_paise: int = Field(
        ...,
        gt=0,
        description="Full monthly subscription cost stored as an integer in paise.",
    )
    platform_fee_paise: int = Field(
        ...,
        ge=0,
        description="Fixed per-slot platform fee stored as an integer in paise.",
    )
    access_instructions: str | None = None
    uptime_percentage: float = Field(default=99.90, ge=0, le=100)


class PlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    category: PlanCategory | None = None
    description: str | None = Field(default=None, min_length=1)
    logo_url: str | None = None
    total_slots: int | None = Field(default=None, gt=0)
    subscription_cost_paise: int | None = Field(
        default=None,
        gt=0,
        description="Full monthly subscription cost stored as an integer in paise.",
    )
    platform_fee_paise: int | None = Field(
        default=None,
        ge=0,
        description="Fixed per-slot platform fee stored as an integer in paise.",
    )
    access_instructions: str | None = None
    uptime_percentage: float | None = Field(default=None, ge=0, le=100)
    is_active: bool | None = None


class PlanOut(BaseModel):
    id: uuid.UUID
    name: str
    category: PlanCategory
    description: str
    logo_url: str | None
    total_slots: int
    subscription_cost_paise: int
    platform_fee_paise: int
    slot_cost_paise: int
    user_pays_paise: int
    access_instructions: str | None
    uptime_percentage: float
    is_active: bool
    available_slots: int
    occupied_slots: int
    created_at: datetime
    slots: list[PlanSlotPreview] | None = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field(return_type=float)
    @property
    def subscription_cost_rupees(self) -> float:
        return paise_to_rupees(self.subscription_cost_paise)

    @computed_field(return_type=float)
    @property
    def platform_fee_rupees(self) -> float:
        return paise_to_rupees(self.platform_fee_paise)

    @computed_field(return_type=float)
    @property
    def slot_cost_rupees(self) -> float:
        return paise_to_rupees(self.slot_cost_paise)

    @computed_field(return_type=float)
    @property
    def user_pays_rupees(self) -> float:
        return paise_to_rupees(self.user_pays_paise)
