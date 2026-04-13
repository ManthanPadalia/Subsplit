from pydantic import BaseModel, Field


class SlotRevokeRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=255)


class AdminPlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1)
    logo_url: str | None = None
    platform_fee_paise: int | None = Field(
        default=None,
        ge=0,
        description="Fixed per-slot platform fee stored as an integer in paise.",
    )
    access_instructions: str | None = None
    uptime_percentage: float | None = Field(default=None, ge=0, le=100)
    is_active: bool | None = None
