from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.plan import Plan
from app.models.score_event import ScoreEvent, ScoreEventType
from app.models.slot import Slot, SlotStatus
from app.models.waitlist import WaitlistEntry
from app.services.scoring_service import create_score_event, get_user_score

VALID_TRANSITIONS = {
    SlotStatus.AVAILABLE: [SlotStatus.OCCUPIED],
    SlotStatus.OCCUPIED: [SlotStatus.AVAILABLE, SlotStatus.GRACE],
    SlotStatus.GRACE: [SlotStatus.OCCUPIED, SlotStatus.REVOKED],
    SlotStatus.REVOKED: [SlotStatus.AVAILABLE],
}


def get_available_slot(db: Session, plan_id: uuid.UUID) -> Slot | None:
    """Return the first AVAILABLE slot for a plan, or None."""
    return (
        db.query(Slot)
        .filter(Slot.plan_id == plan_id, Slot.status == SlotStatus.AVAILABLE)
        .order_by(Slot.slot_number.asc())
        .first()
    )


def get_available_slot_count(db: Session, plan_id: uuid.UUID) -> int:
    """Return number of AVAILABLE slots for a plan."""
    return (
        db.query(Slot)
        .filter(Slot.plan_id == plan_id, Slot.status == SlotStatus.AVAILABLE)
        .count()
    )


def get_occupied_slot_count(db: Session, plan_id: uuid.UUID) -> int:
    """Return number of OCCUPIED slots for a plan."""
    return (
        db.query(Slot)
        .filter(
            Slot.plan_id == plan_id,
            Slot.status.in_([SlotStatus.OCCUPIED, SlotStatus.GRACE]),
        )
        .count()
    )


def transition_slot(
    db: Session,
    slot: Slot,
    new_status: SlotStatus,
    admin_override: bool = False,
) -> Slot:
    """
    Transition a slot to a new status.
    Validates the transition unless admin_override is True.
    """
    if not admin_override:
        allowed = VALID_TRANSITIONS.get(slot.status, [])
        if new_status not in allowed:
            raise ValueError(
                f"Invalid slot transition: {slot.status} -> {new_status}. "
                f"Allowed: {[s.value for s in allowed]}"
            )

    slot.status = new_status
    slot.updated_at = datetime.now(timezone.utc)

    if new_status in (SlotStatus.AVAILABLE, SlotStatus.REVOKED):
        slot.user_id = None
        slot.assigned_at = None
        slot.expires_at = None

    db.add(slot)
    return slot


def cancel_slot(db: Session, slot: Slot) -> Slot:
    """
    User voluntarily cancels an OCCUPIED slot.
    Slot becomes AVAILABLE. Waitlist promotion runs.
    No score change for voluntary cancellation.
    """
    if slot.status != SlotStatus.OCCUPIED:
        raise ValueError(f"Cannot cancel slot with status {slot.status}")

    plan_id = slot.plan_id

    transition_slot(db=db, slot=slot, new_status=SlotStatus.AVAILABLE)
    db.flush()

    promote_from_waitlist(db=db, plan_id=plan_id, slot=slot)
    db.commit()
    return slot


def admin_revoke_slot(
    db: Session,
    slot: Slot,
    reason: str = "Admin revocation",
) -> tuple[Slot, uuid.UUID | None]:
    """
    Admin forcibly revokes a slot.
    Skips GRACE — goes directly to AVAILABLE.
    Score event: SLOT_REVOKED (-20).
    Waitlist promotion runs.
    """
    if slot.status not in (SlotStatus.OCCUPIED, SlotStatus.GRACE):
        raise ValueError(f"Cannot revoke slot with status {slot.status}")

    user_id = slot.user_id
    plan = db.query(Plan).filter(Plan.id == slot.plan_id).first()
    plan_id = slot.plan_id

    create_score_event(
        db=db,
        user_id=user_id,
        event_type=ScoreEventType.SLOT_REVOKED,
        description=f"Admin revocation — {plan.name} — {reason}",
    )

    transition_slot(
        db=db,
        slot=slot,
        new_status=SlotStatus.REVOKED,
        admin_override=True,
    )
    transition_slot(db=db, slot=slot, new_status=SlotStatus.AVAILABLE)
    db.flush()

    promoted_user_id = promote_from_waitlist(db=db, plan_id=plan_id, slot=slot)
    db.commit()
    return slot, promoted_user_id


def create_plan_slots(db: Session, plan: Plan) -> list[Slot]:
    """
    Create all slot records for a newly created plan.
    Called immediately after Plan is inserted.
    All slots start as AVAILABLE.
    """
    slots = []
    for i in range(1, plan.total_slots + 1):
        slot = Slot(
            plan_id=plan.id,
            slot_number=i,
            status=SlotStatus.AVAILABLE,
        )
        db.add(slot)
        slots.append(slot)
    db.flush()
    return slots


def promote_from_waitlist(
    db: Session,
    plan_id: uuid.UUID,
    slot: Slot,
) -> uuid.UUID | None:
    """
    Find the top waitlisted user and promote them to the freed slot.
    Returns promoted user_id, or None if waitlist is empty.
    """
    score_subq = (
        db.query(
            ScoreEvent.user_id.label("uid"),
            func.least(
                100,
                func.greatest(
                    0,
                    100 + func.coalesce(func.sum(ScoreEvent.delta), 0),
                )
            ).label("score"),
        )
        .group_by(ScoreEvent.user_id)
        .subquery()
    )

    result = (
        db.query(WaitlistEntry, func.coalesce(score_subq.c.score, 100).label("score"))
        .outerjoin(score_subq, WaitlistEntry.user_id == score_subq.c.uid)
        .filter(
            WaitlistEntry.plan_id == plan_id,
            WaitlistEntry.notified.is_(False),
        )
        .order_by(
            func.coalesce(score_subq.c.score, 100).desc(),
            WaitlistEntry.joined_at.asc(),
        )
        .first()
    )

    if result is None:
        return None

    entry, _score = result
    now = datetime.now(timezone.utc)

    entry.notified = True
    entry.notified_at = now
    db.add(entry)

    transition_slot(db=db, slot=slot, new_status=SlotStatus.OCCUPIED)
    slot.user_id = entry.user_id
    slot.assigned_at = now
    slot.expires_at = now + timedelta(days=30)
    slot.updated_at = now
    db.add(slot)

    return entry.user_id


def check_and_apply_lapses(db: Session) -> dict:
    """
    Scan all slots and apply lapse logic.
    Returns a summary of changes made.

    For MVP: called manually via admin endpoint.
    In production: would be a scheduled cron job.
    """
    now = datetime.now(timezone.utc)
    results = {
        "moved_to_grace": [],
        "revoked": [],
    }

    expired_slots = (
        db.query(Slot)
        .filter(
            Slot.status == SlotStatus.OCCUPIED,
            Slot.expires_at <= now,
            Slot.expires_at > now - timedelta(days=3),
        )
        .all()
    )

    for slot in expired_slots:
        plan = db.query(Plan).filter(Plan.id == slot.plan_id).first()
        user_id = slot.user_id

        transition_slot(db=db, slot=slot, new_status=SlotStatus.GRACE)

        create_score_event(
            db=db,
            user_id=user_id,
            event_type=ScoreEventType.LATE_PAYMENT,
            description=f"Payment lapsed for {plan.name} — grace period started",
        )
        results["moved_to_grace"].append(str(slot.id))

    grace_expired_slots = (
        db.query(Slot)
        .filter(
            Slot.status == SlotStatus.GRACE,
            Slot.expires_at <= now - timedelta(days=3),
        )
        .all()
    )

    for slot in grace_expired_slots:
        plan = db.query(Plan).filter(Plan.id == slot.plan_id).first()
        user_id = slot.user_id

        create_score_event(
            db=db,
            user_id=user_id,
            event_type=ScoreEventType.SLOT_REVOKED,
            description=f"Slot revoked — {plan.name} — grace period expired",
        )

        transition_slot(db=db, slot=slot, new_status=SlotStatus.REVOKED)
        transition_slot(db=db, slot=slot, new_status=SlotStatus.AVAILABLE)

        results["revoked"].append(str(slot.id))

        promote_from_waitlist(db=db, plan_id=slot.plan_id, slot=slot)

    db.commit()
    return results


def get_waitlist_position(
    db: Session,
    plan_id: uuid.UUID,
    user_id: uuid.UUID,
) -> int:
    """
    Return the 1-based queue position of a user in a plan's waitlist.
    Position = number of users with higher score OR same score but earlier join date.
    """
    user_score = get_user_score(db, user_id)

    user_entry = (
        db.query(WaitlistEntry)
        .filter(
            WaitlistEntry.plan_id == plan_id,
            WaitlistEntry.user_id == user_id,
            WaitlistEntry.notified.is_(False),
        )
        .first()
    )
    if user_entry is None:
        raise ValueError("User is not on this waitlist")

    ahead_count = 0
    all_entries = (
        db.query(WaitlistEntry)
        .filter(
            WaitlistEntry.plan_id == plan_id,
            WaitlistEntry.notified.is_(False),
            WaitlistEntry.user_id != user_id,
        )
        .all()
    )

    for entry in all_entries:
        entry_score = get_user_score(db, entry.user_id)
        if entry_score > user_score:
            ahead_count += 1
        elif entry_score == user_score and entry.joined_at < user_entry.joined_at:
            ahead_count += 1

    return ahead_count + 1
