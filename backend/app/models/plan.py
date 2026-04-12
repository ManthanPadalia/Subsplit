from __future__ import annotations

import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, Integer, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .slot import Slot
    from .waitlist import WaitlistEntry


class PlanCategory(str, enum.Enum):
    STREAMING = "STREAMING"
    EDUCATION = "EDUCATION"
    GAMING = "GAMING"
    PRODUCTIVITY = "PRODUCTIVITY"
    MUSIC = "MUSIC"


class Plan(Base, TimestampMixin):
    __tablename__ = "plans"
    __table_args__ = (
        CheckConstraint("total_slots > 0", name="ck_plans_total_slots_positive"),
        CheckConstraint(
            "subscription_cost_paise > 0",
            name="ck_plans_subscription_cost_positive",
        ),
        CheckConstraint(
            "platform_fee_paise >= 0",
            name="ck_plans_platform_fee_non_negative",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[PlanCategory] = mapped_column(
        SAEnum(PlanCategory, name="plan_category"),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    total_slots: Mapped[int] = mapped_column(Integer, nullable=False)
    subscription_cost_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    platform_fee_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    access_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    uptime_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("99.90"),
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    slots: Mapped[list[Slot]] = relationship("Slot", back_populates="plan")
    waitlist_entries: Mapped[list[WaitlistEntry]] = relationship(
        "WaitlistEntry",
        back_populates="plan",
        cascade="all, delete-orphan",
    )

    @property
    def slot_cost_paise(self) -> int:
        return self.subscription_cost_paise // self.total_slots

    @property
    def user_pays_paise(self) -> int:
        return self.slot_cost_paise + self.platform_fee_paise
