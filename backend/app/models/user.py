from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .payment import Payment
    from .score_event import ScoreEvent
    from .slot import Slot
    from .waitlist import WaitlistEntry


class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role"),
        nullable=False,
        default=UserRole.USER,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    slots: Mapped[list[Slot]] = relationship("Slot", back_populates="user")
    payments: Mapped[list[Payment]] = relationship("Payment", back_populates="user")
    waitlist_entries: Mapped[list[WaitlistEntry]] = relationship(
        "WaitlistEntry",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    score_events: Mapped[list[ScoreEvent]] = relationship(
        "ScoreEvent",
        back_populates="user",
        cascade="all, delete-orphan",
    )
