from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User


class ScoreEventType(str, enum.Enum):
    ON_TIME_PAYMENT = "ON_TIME_PAYMENT"
    LATE_PAYMENT = "LATE_PAYMENT"
    SLOT_REVOKED = "SLOT_REVOKED"
    ACCOUNT_LONGEVITY = "ACCOUNT_LONGEVITY"


SCORE_DELTAS = {
    ScoreEventType.ON_TIME_PAYMENT: 5,
    ScoreEventType.LATE_PAYMENT: -5,
    ScoreEventType.SLOT_REVOKED: -20,
    ScoreEventType.ACCOUNT_LONGEVITY: 10,
}


class ScoreEvent(Base):
    __tablename__ = "score_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[ScoreEventType] = mapped_column(
        SAEnum(ScoreEventType, name="score_event_type"),
        nullable=False,
        index=True,
    )
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    user: Mapped[User] = relationship("User", back_populates="score_events")
