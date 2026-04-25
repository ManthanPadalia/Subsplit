import uuid

from sqlalchemy import Enum as SAEnum
from sqlalchemy import Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin
from .plan import PlanCategory


class DemandSignal(Base, TimestampMixin):
    __tablename__ = "demand_signals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[PlanCategory] = mapped_column(
        SAEnum(PlanCategory, name="plan_category"),
        nullable=False,
    )
    request_count: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_margin_paise: Mapped[int] = mapped_column(Integer, nullable=False)
