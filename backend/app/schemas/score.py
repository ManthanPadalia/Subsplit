import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.score_event import ScoreEventType


class ScoreBreakdown(BaseModel):
    base: int
    total_delta: int
    final_score: int


class ScoreEventOut(BaseModel):
    id: uuid.UUID
    event_type: ScoreEventType
    delta: int
    description: str | None
    created_at: datetime


class ScoreSummaryOut(BaseModel):
    subsplit_score: int
    score_breakdown: ScoreBreakdown
    events: list[ScoreEventOut]
