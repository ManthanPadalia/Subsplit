from pydantic import BaseModel, Field


class SlotRevokeRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=255)
