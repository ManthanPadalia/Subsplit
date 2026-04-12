from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.score_event import SCORE_DELTAS, ScoreEvent, ScoreEventType
from app.models.user import User


def get_user_score(db: Session, user_id: uuid.UUID) -> int:
    """
    Calculate the current SubSplit Score for a user.
    Returns integer in range [0, 100].
    """
    result = (
        db.query(
            func.least(
                100,
                func.greatest(
                    0,
                    100 + func.coalesce(func.sum(ScoreEvent.delta), 0),
                ),
            )
        )
        .filter(ScoreEvent.user_id == user_id)
        .scalar()
    )

    return int(result) if result is not None else 100


def create_score_event(
    db: Session,
    user_id: uuid.UUID,
    event_type: ScoreEventType,
    description: str,
) -> ScoreEvent:
    """
    Create a score event with the correct delta for the given type.
    Always use this function — never hardcode delta values.
    """
    event = ScoreEvent(
        user_id=user_id,
        event_type=event_type,
        delta=SCORE_DELTAS[event_type],
        description=description,
    )
    db.add(event)
    return event


def get_score_history(db: Session, user_id: uuid.UUID) -> list[ScoreEvent]:
    """Return all score events for a user, newest first."""
    return (
        db.query(ScoreEvent)
        .filter(ScoreEvent.user_id == user_id)
        .order_by(ScoreEvent.created_at.desc())
        .all()
    )


def check_longevity_bonus(db: Session, user: User) -> None:
    """Award the one-time account longevity bonus if eligible."""
    existing = (
        db.query(ScoreEvent)
        .filter(
            ScoreEvent.user_id == user.id,
            ScoreEvent.event_type == ScoreEventType.ACCOUNT_LONGEVITY,
        )
        .first()
    )
    if existing:
        return

    age_days = (datetime.now(timezone.utc) - user.created_at).days
    if age_days < 90:
        return

    revocations = (
        db.query(ScoreEvent)
        .filter(
            ScoreEvent.user_id == user.id,
            ScoreEvent.event_type == ScoreEventType.SLOT_REVOKED,
        )
        .count()
    )
    if revocations > 0:
        return

    event = ScoreEvent(
        user_id=user.id,
        event_type=ScoreEventType.ACCOUNT_LONGEVITY,
        delta=SCORE_DELTAS[ScoreEventType.ACCOUNT_LONGEVITY],
        description="Account longevity bonus — 90 days with no revocations",
    )
    db.add(event)
    db.commit()


def get_score_tier(score: int) -> str:
    if score >= 75:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"
