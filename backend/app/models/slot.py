from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .payment import Payment
    from .plan import Plan
    from .user import User


class SlotStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    GRACE = "GRACE"
    REVOKED = "REVOKED"


class Slot(Base, TimestampMixin):
    __tablename__ = "slots"
    __table_args__ = (
        UniqueConstraint("plan_id", "slot_number", name="uq_slot_plan_number"),
        CheckConstraint(
            "(status != 'AVAILABLE') OR (user_id IS NULL)",
            name="ck_slots_available_requires_no_user",
        ),
        CheckConstraint(
            "(status NOT IN ('OCCUPIED', 'GRACE')) OR (user_id IS NOT NULL)",
            name="ck_slots_occupied_or_grace_requires_user",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    slot_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[SlotStatus] = mapped_column(
        SAEnum(SlotStatus, name="slot_status"),
        nullable=False,
        default=SlotStatus.AVAILABLE,
        index=True,
    )
    assigned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    plan: Mapped[Plan] = relationship("Plan", back_populates="slots")
    user: Mapped[User | None] = relationship("User", back_populates="slots")
    payments: Mapped[list[Payment]] = relationship("Payment", back_populates="slot")
