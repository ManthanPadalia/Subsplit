# SubSplit — Business Logic Document

**Version:** 1.0  
**Status:** Final — MVP  
**Last Updated:** April 2026

This document defines every rule, formula, and algorithm that governs how SubSplit
behaves. Codex must implement these exactly. Any logic not covered here should be
flagged for clarification rather than improvised.

---

## Table of Contents

1. [Monetary Arithmetic Rules](#1-monetary-arithmetic-rules)
2. [Slot Pricing Formula](#2-slot-pricing-formula)
3. [SubSplit Score Algorithm](#3-subsplit-score-algorithm)
4. [Slot State Machine](#4-slot-state-machine)
5. [Payment Lapse Handling](#5-payment-lapse-handling)
6. [Waitlist Promotion Rules](#6-waitlist-promotion-rules)
7. [Admin Demand Signal Logic](#7-admin-demand-signal-logic)
8. [Service Layer Implementation](#8-service-layer-implementation)

---

## 1. Monetary Arithmetic Rules

### Rule 1.1 — Storage unit
All monetary values are stored in the database as **integers in paise**.  
1 Indian Rupee (INR) = 100 paise.

```python
# CORRECT
subscription_cost_paise: int = 64900   # ₹649.00

# WRONG — never store floats in the database
subscription_cost_rupees: float = 649.00
```

### Rule 1.2 — Conversion helpers
These two helpers must be used for every conversion. Never inline the math.

```python
# backend/app/core/money.py

def rupees_to_paise(rupees: float) -> int:
    """Convert rupees (float) to paise (int) for storage."""
    return int(round(rupees * 100))

def paise_to_rupees(paise: int) -> float:
    """Convert paise (int) to rupees (float) for display."""
    return round(paise / 100, 2)
```

### Rule 1.3 — Integer division for slot cost
When dividing a subscription cost across slots, use **integer (floor) division**.
The remainder is absorbed into SubSplit's margin — it is never passed to the user
and never causes a floating-point display error.

```python
# CORRECT — integer division
slot_cost_paise: int = subscription_cost_paise // total_slots

# WRONG — float division
slot_cost_paise: float = subscription_cost_paise / total_slots
```

### Rule 1.4 — API response format
Every monetary value in every API response must appear in **both units**:

```json
{
  "subscription_cost_paise": 64900,
  "subscription_cost_rupees": 649.00,
  "slot_cost_paise": 16225,
  "slot_cost_rupees": 162.25,
  "platform_fee_paise": 3700,
  "platform_fee_rupees": 37.00,
  "user_pays_paise": 19925,
  "user_pays_rupees": 199.25
}
```

### Rule 1.5 — Display rounding
In all API responses, `_rupees` values are rounded to 2 decimal places using
Python's `round()`. Do not use truncation.

```python
rupees_value = round(paise / 100, 2)
```

---

## 2. Slot Pricing Formula

### Formula

```
slot_cost_paise  = subscription_cost_paise // total_slots
user_pays_paise  = slot_cost_paise + platform_fee_paise
```

### Worked Example A — Netflix Premium

```
Input:
  subscription_cost_paise = 64900   (₹649/mo — what SubSplit pays)
  total_slots              = 4
  platform_fee_paise       = 3700   (₹37 — SubSplit's fixed fee)

Calculation:
  slot_cost_paise = 64900 // 4 = 16225   (₹162.25)
  user_pays_paise = 16225 + 3700 = 19925 (₹199.25)

SubSplit revenue per plan per month:
  gross_collected  = 19925 × 4 = 79700   (₹797.00)
  cost             = 64900               (₹649.00)
  gross_margin     = 79700 - 64900 = 14800 (₹148.00)

SubSplit margin breakdown:
  platform_fee_total = 3700 × 4 = 14800  (₹148.00)
  integer_remainder  = 64900 - (16225 × 4) = 64900 - 64900 = 0

Note: The integer remainder (difference between actual cost and
floor-divided slot costs) is also retained by SubSplit. For most
plans this is 0–3 paise and is negligible.
```

### Worked Example B — Spotify Family

```
Input:
  subscription_cost_paise = 17900   (₹179/mo)
  total_slots              = 6
  platform_fee_paise       = 2100   (₹21)

Calculation:
  slot_cost_paise = 17900 // 6 = 2983   (₹29.83)
  user_pays_paise = 2983 + 2100 = 5083  (₹50.83)

Integer remainder check:
  2983 × 6 = 17898
  17900 - 17898 = 2 paise retained by SubSplit

SubSplit revenue per plan per month:
  gross_collected = 5083 × 6 = 30498  (₹304.98)
  cost            = 17900              (₹179.00)
  gross_margin    = 30498 - 17900 = 12598 (₹125.98)
```

### Worked Example C — Adobe Creative Cloud Teams

```
Input:
  subscription_cost_paise = 423000  (₹4230/mo)
  total_slots              = 3
  platform_fee_paise       = 27000  (₹270)

Calculation:
  slot_cost_paise = 423000 // 3 = 141000  (₹1410.00)
  user_pays_paise = 141000 + 27000 = 168000 (₹1680.00)

SubSplit revenue per plan per month:
  gross_collected = 168000 × 3 = 504000  (₹5040.00)
  cost            = 423000               (₹4230.00)
  gross_margin    = 504000 - 423000 = 81000 (₹810.00)
```

### Worked Example D — Partial occupancy (plan not full)

```
Input:
  Plan: Microsoft 365 Family
  subscription_cost_paise = 48900  (₹489/mo)
  total_slots              = 6
  platform_fee_paise       = 3100  (₹31)
  occupied_slots           = 4     (only 4 of 6 slots sold)

Calculation:
  slot_cost_paise = 48900 // 6 = 8150   (₹81.50)
  user_pays_paise = 8150 + 3100 = 11250 (₹112.50)

Revenue with 4 occupied slots:
  gross_collected = 11250 × 4 = 45000  (₹450.00)
  cost            = 48900               (₹489.00)
  gross_margin    = 45000 - 48900 = -3900 (₹-39.00)

SubSplit is operating at a LOSS when < 4 slots are occupied.
Break-even occupancy:
  break_even_slots = ceil(subscription_cost_paise / user_pays_paise)
  break_even_slots = ceil(48900 / 11250) = ceil(4.35) = 5 slots

This is why the admin analytics page shows cost vs revenue per plan —
admins must monitor plans with low utilization.
```

### Pricing SQLAlchemy property methods

These go on the `Plan` model. They are computed, never stored.

```python
# backend/app/models/plan.py

@property
def slot_cost_paise(self) -> int:
    """Cost per slot using integer division. No float errors."""
    return self.subscription_cost_paise // self.total_slots

@property
def user_pays_paise(self) -> int:
    """What each user pays per month: slot cost + platform fee."""
    return self.slot_cost_paise + self.platform_fee_paise

@property
def monthly_revenue_paise(self, occupied_slots: int) -> int:
    """Gross collected from occupied slots this month."""
    return self.user_pays_paise * occupied_slots

@property
def monthly_margin_paise(self, occupied_slots: int) -> int:
    """Net margin: what SubSplit keeps after paying the provider."""
    return self.monthly_revenue_paise(occupied_slots) - self.subscription_cost_paise
```

---

## 3. SubSplit Score Algorithm

### Overview

SubSplit Score is a **trust score from 0 to 100** assigned to every user.
It reflects payment reliability and is used to prioritise waitlist position.

Key design decisions:
- Score is **not stored** as a mutable field on the `users` table.
- Score is **computed dynamically** by summing all `delta` values in the
  `score_events` table for that user, then clamping the result to [0, 100].
- This makes the score fully auditable — every point change has a record.
- Starting base is **100**. All events apply deltas to this base.

### Score formula

```python
def calculate_score(score_events: list[ScoreEvent]) -> int:
    """
    Compute current SubSplit Score from event history.
    Base is 100. Sum all deltas. Clamp to [0, 100].
    """
    total_delta = sum(event.delta for event in score_events)
    raw_score = 100 + total_delta
    return max(0, min(100, raw_score))
```

### SQL equivalent (used in queries that need score for sorting)

```sql
SELECT
  LEAST(100, GREATEST(0, 100 + COALESCE(SUM(se.delta), 0))) AS subsplit_score
FROM score_events se
WHERE se.user_id = :user_id;
```

### Score event types and deltas

| Event Type | Delta | When It Fires |
|---|---|---|
| `ON_TIME_PAYMENT` | `+5` | Payment verified before `slot.expires_at` |
| `LATE_PAYMENT` | `-5` | Payment verified after `slot.expires_at` but within grace period |
| `SLOT_REVOKED` | `-20` | Grace period expired without payment — slot forcibly revoked |
| `ACCOUNT_LONGEVITY` | `+10` | Account is 90+ days old with zero `SLOT_REVOKED` events (one-time only) |

### Score event creation — when and where each fires

#### ON_TIME_PAYMENT (+5)
Fires inside `payment_service.py → activate_slot()` when
`POST /api/payments/verify` succeeds and
`datetime.now(utc) < slot.expires_at` (or `slot.expires_at is None`
for a first-time purchase, which is always on-time).

```python
def create_on_time_payment_event(db: Session, user_id: UUID, plan_name: str):
    event = ScoreEvent(
        user_id=user_id,
        event_type=ScoreEventType.ON_TIME_PAYMENT,
        delta=SCORE_DELTAS[ScoreEventType.ON_TIME_PAYMENT],
        description=f"On-time payment for {plan_name}",
    )
    db.add(event)
```

#### LATE_PAYMENT (-5)
Fires inside `payment_service.py → activate_slot()` when verification
succeeds but `datetime.now(utc) >= slot.expires_at` AND
`slot.status == SlotStatus.GRACE`.

```python
def create_late_payment_event(db: Session, user_id: UUID, plan_name: str):
    event = ScoreEvent(
        user_id=user_id,
        event_type=ScoreEventType.LATE_PAYMENT,
        delta=SCORE_DELTAS[ScoreEventType.LATE_PAYMENT],
        description=f"Late payment during grace period for {plan_name}",
    )
    db.add(event)
```

#### SLOT_REVOKED (-20)
Fires inside `slot_service.py → revoke_slot()` — called either by
admin manual revocation or automatic grace period expiry.

```python
def create_slot_revoked_event(db: Session, user_id: UUID, plan_name: str):
    event = ScoreEvent(
        user_id=user_id,
        event_type=ScoreEventType.SLOT_REVOKED,
        delta=SCORE_DELTAS[ScoreEventType.SLOT_REVOKED],
        description=f"Slot revoked — {plan_name}",
    )
    db.add(event)
```

#### ACCOUNT_LONGEVITY (+10) — one-time
Fires inside `scoring_service.py → check_longevity_bonus()`.
Called when the user's profile is loaded via `GET /api/auth/me`.

Rules for this event to fire:
1. `user.created_at` is more than 90 days ago.
2. The user has **zero** `SLOT_REVOKED` events in their history.
3. The user does **not** already have an `ACCOUNT_LONGEVITY` event
   (checked by querying `score_events` — must be idempotent).

```python
def check_longevity_bonus(db: Session, user: User) -> None:
    """Award the one-time account longevity bonus if eligible."""
    from datetime import datetime, timezone, timedelta

    # Already awarded?
    existing = db.query(ScoreEvent).filter(
        ScoreEvent.user_id == user.id,
        ScoreEvent.event_type == ScoreEventType.ACCOUNT_LONGEVITY,
    ).first()
    if existing:
        return

    # Account is 90+ days old?
    age_days = (datetime.now(timezone.utc) - user.created_at).days
    if age_days < 90:
        return

    # No revocations in history?
    revocations = db.query(ScoreEvent).filter(
        ScoreEvent.user_id == user.id,
        ScoreEvent.event_type == ScoreEventType.SLOT_REVOKED,
    ).count()
    if revocations > 0:
        return

    # All checks pass — award the bonus
    event = ScoreEvent(
        user_id=user.id,
        event_type=ScoreEventType.ACCOUNT_LONGEVITY,
        delta=SCORE_DELTAS[ScoreEventType.ACCOUNT_LONGEVITY],
        description="Account longevity bonus — 90 days with no revocations",
    )
    db.add(event)
    db.commit()
```

### Score tier definitions

These tiers are used for UI badge colours and admin filtering only.
They do not affect the score calculation itself.

| Tier | Score Range | Badge colour | Meaning |
|---|---|---|---|
| High | 75 – 100 | Green (`text-success`) | Reliable payer, top waitlist priority |
| Medium | 40 – 74 | Amber (`text-warning`) | Good standing, some late payments |
| Low | 0 – 39 | Red (`text-destructive`) | At-risk, bottom waitlist priority |

```python
def get_score_tier(score: int) -> str:
    if score >= 75:
        return "HIGH"
    elif score >= 40:
        return "MEDIUM"
    else:
        return "LOW"
```

### Score helper in `scoring_service.py`

```python
# backend/app/services/scoring_service.py

from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.score_event import ScoreEvent, ScoreEventType, SCORE_DELTAS
from app.models.user import User
import uuid


def get_user_score(db: Session, user_id: uuid.UUID) -> int:
    """
    Calculate the current SubSplit Score for a user.
    Returns integer in range [0, 100].
    """
    result = db.query(
        func.least(
            100,
            func.greatest(
                0,
                100 + func.coalesce(func.sum(ScoreEvent.delta), 0)
            )
        )
    ).filter(
        ScoreEvent.user_id == user_id
    ).scalar()

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
```

---

## 4. Slot State Machine

### States

| State | Meaning | `user_id` | `expires_at` |
|---|---|---|---|
| `AVAILABLE` | No holder. Can be purchased. | `NULL` | `NULL` |
| `OCCUPIED` | Active holder. Access is live. | set | set |
| `GRACE` | Payment lapsed. 3-day grace window. | set (same user) | original value |
| `REVOKED` | Grace expired. Access cut off. | `NULL` | `NULL` |

### Valid transitions

```
AVAILABLE  →  OCCUPIED   : user purchases slot (payment verified)
OCCUPIED   →  AVAILABLE  : user cancels slot voluntarily
OCCUPIED   →  GRACE      : slot.expires_at passes with no renewal payment
GRACE      →  OCCUPIED   : user pays during grace period
GRACE      →  REVOKED    : grace period (3 days after expires_at) passes
REVOKED    →  AVAILABLE  : automatic, immediately after revocation
```

### Invalid transitions (must raise an error)

```
AVAILABLE  →  GRACE      : ERROR — cannot enter grace from available
AVAILABLE  →  REVOKED    : ERROR — cannot revoke an unoccupied slot
REVOKED    →  OCCUPIED   : ERROR — revoked slot must go through AVAILABLE first
OCCUPIED   →  REVOKED    : ERROR — must go through GRACE first (except admin force-revoke)
```

**Exception:** Admin manual revocation (`POST /api/admin/slots/:id/revoke`) skips
the GRACE state and goes directly `OCCUPIED → REVOKED → AVAILABLE`. This is the
only valid shortcut and must be clearly documented in the admin UI.

### Transition enforcement in `slot_service.py`

```python
# backend/app/services/slot_service.py

VALID_TRANSITIONS = {
    SlotStatus.AVAILABLE: [SlotStatus.OCCUPIED],
    SlotStatus.OCCUPIED:  [SlotStatus.AVAILABLE, SlotStatus.GRACE],
    SlotStatus.GRACE:     [SlotStatus.OCCUPIED, SlotStatus.REVOKED],
    SlotStatus.REVOKED:   [SlotStatus.AVAILABLE],
}

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
                f"Invalid slot transition: {slot.status} → {new_status}. "
                f"Allowed: {[s.value for s in allowed]}"
            )

    slot.status = new_status
    slot.updated_at = datetime.now(timezone.utc)

    # Clear user assignment when slot becomes AVAILABLE or REVOKED
    if new_status in (SlotStatus.AVAILABLE, SlotStatus.REVOKED):
        slot.user_id = None
        slot.assigned_at = None
        slot.expires_at = None

    db.add(slot)
    return slot
```

---

## 5. Payment Lapse Handling

### Overview

When a user does not renew their slot before `expires_at`, a three-stage
process begins: warning → grace → revocation.

For the MVP demo, stage transitions are triggered by the admin manually
or by calling the check endpoint. There is no background scheduler.

### Stage definitions

```
Stage 0 — Active
  Condition:  slot.status = OCCUPIED and now() < slot.expires_at
  Action:     None. Slot is healthy.

Stage 1 — Expiring soon (warning)
  Condition:  slot.status = OCCUPIED and
              slot.expires_at - now() <= 3 days
  Action:     No status change. Frontend shows a warning banner
              on the user dashboard. No score change.

Stage 2 — Grace period
  Condition:  slot.status = OCCUPIED and now() >= slot.expires_at
  Action:     slot.status → GRACE
              ScoreEvent: LATE_PAYMENT delta = -5
              User retains access during grace period.
              Grace window = 3 days from slot.expires_at.

Stage 3 — Revocation
  Condition:  slot.status = GRACE and
              now() >= slot.expires_at + timedelta(days=3)
  Action:     slot.status → REVOKED → AVAILABLE
              ScoreEvent: SLOT_REVOKED delta = -20
              Waitlist promotion runs immediately.
              User loses access.
```

### Grace period boundary

```python
from datetime import timedelta

def get_grace_deadline(slot: Slot) -> datetime:
    """
    The absolute deadline after which a GRACE slot is revoked.
    Grace period = 3 days after the original expiry date.
    """
    if slot.expires_at is None:
        raise ValueError("Slot has no expiry date")
    return slot.expires_at + timedelta(days=3)

def is_in_grace_window(slot: Slot) -> bool:
    """True if the slot is past expiry but still within the grace period."""
    now = datetime.now(timezone.utc)
    return slot.expires_at <= now < get_grace_deadline(slot)

def is_grace_expired(slot: Slot) -> bool:
    """True if the grace period has ended and slot should be revoked."""
    return datetime.now(timezone.utc) >= get_grace_deadline(slot)
```

### Lapse check function

This function is called by `GET /api/admin/dashboard` (to show at-risk slots)
and by `POST /api/admin/slots/check-lapses` (manual trigger for demo).

```python
# backend/app/services/slot_service.py

def check_and_apply_lapses(db: Session) -> dict:
    """
    Scan all slots and apply lapse logic.
    Returns a summary of changes made.
    
    For MVP: called manually via admin endpoint.
    In production: would be a scheduled cron job.
    """
    from app.services.scoring_service import create_score_event

    now = datetime.now(timezone.utc)
    results = {
        "moved_to_grace": [],
        "revoked": [],
    }

    # ── Step 1: Move OCCUPIED → GRACE ──────────────────────────────────
    # Slots where expires_at has passed but grace period has not
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

        # Transition to GRACE (no user reassignment yet)
        slot.status = SlotStatus.GRACE
        slot.updated_at = now
        db.add(slot)

        # Score event: LATE_PAYMENT
        create_score_event(
            db=db,
            user_id=user_id,
            event_type=ScoreEventType.LATE_PAYMENT,
            description=f"Payment lapsed for {plan.name} — grace period started",
        )
        results["moved_to_grace"].append(str(slot.id))

    # ── Step 2: Revoke GRACE slots whose grace period has expired ───────
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

        # Score event: SLOT_REVOKED
        create_score_event(
            db=db,
            user_id=user_id,
            event_type=ScoreEventType.SLOT_REVOKED,
            description=f"Slot revoked — {plan.name} — grace period expired",
        )

        # Transition: GRACE → AVAILABLE (skip REVOKED enum for simplicity,
        # log as REVOKED in score event, set slot to AVAILABLE immediately)
        slot.status = SlotStatus.AVAILABLE
        slot.user_id = None
        slot.assigned_at = None
        slot.expires_at = None
        slot.updated_at = now
        db.add(slot)

        results["revoked"].append(str(slot.id))

        # Run waitlist promotion for this plan
        promote_from_waitlist(db=db, plan_id=slot.plan_id, slot=slot)

    db.commit()
    return results
```

### Late payment (user pays during grace period)

When a user pays while their slot is in `GRACE` status, the payment
verification function handles the transition back to `OCCUPIED`.

```python
# Inside payment_service.py → activate_slot()

def activate_slot(db: Session, slot: Slot, user: User, plan: Plan) -> Slot:
    """
    Called after successful payment verification.
    Handles both first-time purchase and grace period renewal.
    """
    now = datetime.now(timezone.utc)

    if slot.status == SlotStatus.GRACE:
        # Late payment — user paying during grace period
        score_event_type = ScoreEventType.LATE_PAYMENT
        description = f"Late payment during grace period — {plan.name}"
    else:
        # Normal purchase or on-time renewal
        score_event_type = ScoreEventType.ON_TIME_PAYMENT
        description = f"On-time payment — {plan.name}"

    # Transition slot to OCCUPIED
    slot.status = SlotStatus.OCCUPIED
    slot.user_id = user.id
    slot.assigned_at = now
    # New expiry = 30 days from now (not from old expiry — fresh billing cycle)
    slot.expires_at = now + timedelta(days=30)
    slot.updated_at = now
    db.add(slot)

    # Create score event
    from app.services.scoring_service import create_score_event
    create_score_event(
        db=db,
        user_id=user.id,
        event_type=score_event_type,
        description=description,
    )

    db.commit()
    return slot
```

### Warning banner logic (frontend)

On the user dashboard, the `ActiveSlotCard` component shows a warning
if the slot is expiring within 3 days. This is purely frontend logic —
no API call needed, computed from `slot.expires_at`.

```ts
// src/components/dashboard/ActiveSlotCard.tsx

function getSlotWarning(slot: Slot): string | null {
  if (!slot.expires_at) return null

  const now = new Date()
  const expiry = new Date(slot.expires_at)
  const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  if (slot.status === "GRACE") {
    const graceDeadline = new Date(expiry.getTime() + 3 * 24 * 60 * 60 * 1000)
    const daysLeft = Math.ceil(
      (graceDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    return `Grace period — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} to renew before losing your slot`
  }

  if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
    return `Renews in ${Math.ceil(daysUntilExpiry)} day${Math.ceil(daysUntilExpiry) !== 1 ? 's' : ''}`
  }

  return null
}
```

---

## 6. Waitlist Promotion Rules

### Overview

When a slot becomes available (through cancellation, revocation, or new
plan creation), the system automatically selects the most deserving
waitlisted user and promotes them.

### Promotion criteria (priority order)

1. **SubSplit Score — descending** (higher score = higher priority).
   Users with score 90 are promoted before users with score 70.

2. **Join date — ascending** (earlier join = higher priority) as tiebreaker.
   If two users have the same score, the one who joined the waitlist first wins.

3. **`notified = false`** filter — only promote users who have not already
   been notified (prevents double-promotion).

### Promotion SQL query

```sql
SELECT
  we.id            AS entry_id,
  we.user_id,
  we.plan_id,
  we.joined_at,
  LEAST(100, GREATEST(0, 100 + COALESCE(SUM(se.delta), 0))) AS subsplit_score
FROM waitlist_entries we
LEFT JOIN score_events se ON se.user_id = we.user_id
WHERE
  we.plan_id  = :plan_id
  AND we.notified = false
GROUP BY we.id, we.user_id, we.plan_id, we.joined_at
ORDER BY
  subsplit_score DESC,
  we.joined_at   ASC
LIMIT 1;
```

### Promotion function

```python
# backend/app/services/slot_service.py

def promote_from_waitlist(
    db: Session,
    plan_id: uuid.UUID,
    slot: Slot,
) -> uuid.UUID | None:
    """
    Find the highest-priority waitlisted user for a plan and
    mark them as notified. Returns the promoted user_id or None.

    NOTE: For MVP, 'promotion' means marking notified=True and
    storing the notification. No email is sent. The user sees
    their waitlist status update on their next dashboard load.
    """
    from sqlalchemy import func

    # Subquery: compute score for each waitlisted user
    score_subq = (
        db.query(
            ScoreEvent.user_id,
            func.least(
                100,
                func.greatest(
                    0,
                    100 + func.coalesce(func.sum(ScoreEvent.delta), 0)
                )
            ).label("subsplit_score"),
        )
        .group_by(ScoreEvent.user_id)
        .subquery()
    )

    # Main query: get top waitlist entry
    result = (
        db.query(WaitlistEntry, score_subq.c.subsplit_score)
        .outerjoin(score_subq, WaitlistEntry.user_id == score_subq.c.user_id)
        .filter(
            WaitlistEntry.plan_id == plan_id,
            WaitlistEntry.notified == False,
        )
        .order_by(
            func.coalesce(score_subq.c.subsplit_score, 100).desc(),
            WaitlistEntry.joined_at.asc(),
        )
        .first()
    )

    if result is None:
        return None  # No one is waiting

    entry, score = result

    # Mark as notified
    entry.notified = True
    entry.notified_at = datetime.now(timezone.utc)
    db.add(entry)

    # Assign the slot to the promoted user
    slot.user_id = entry.user_id
    slot.status = SlotStatus.OCCUPIED
    slot.assigned_at = datetime.now(timezone.utc)
    slot.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    db.add(slot)

    db.commit()
    return entry.user_id
```

### Queue position calculation

Used by `GET /api/waitlist/my` and `POST /api/waitlist/join` to show
the user their current position.

```python
def get_waitlist_position(
    db: Session,
    plan_id: uuid.UUID,
    user_id: uuid.UUID,
) -> int:
    """
    Return the 1-based queue position of a user in a plan's waitlist.
    Position = number of users with higher score OR same score but earlier join date.
    """
    from sqlalchemy import func, case

    # Get the requesting user's score
    user_score = get_user_score(db, user_id)

    # Get user's join date
    user_entry = (
        db.query(WaitlistEntry)
        .filter(
            WaitlistEntry.plan_id == plan_id,
            WaitlistEntry.user_id == user_id,
            WaitlistEntry.notified == False,
        )
        .first()
    )
    if user_entry is None:
        raise ValueError("User is not on this waitlist")

    # Count entries that rank above this user
    ahead_count = 0
    all_entries = (
        db.query(WaitlistEntry)
        .filter(
            WaitlistEntry.plan_id == plan_id,
            WaitlistEntry.notified == False,
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

    return ahead_count + 1  # 1-based
```

### When promotion runs

Promotion is triggered automatically in these scenarios:

| Trigger | Function called |
|---|---|
| User cancels slot (`DELETE /api/slots/:id/cancel`) | `promote_from_waitlist()` |
| Admin revokes slot (`POST /api/admin/slots/:id/revoke`) | `promote_from_waitlist()` |
| Grace period expires (`check_and_apply_lapses()`) | `promote_from_waitlist()` |

Promotion is **not** triggered when a new plan is created (slots start as
AVAILABLE and users can buy them directly — no promotion needed).

### Edge cases

**No waitlist:** `promote_from_waitlist()` returns `None`. Slot stays
`AVAILABLE` for direct purchase.

**Promoted user already has a slot on this plan:** This should not occur
because `POST /api/waitlist/join` prevents users who already hold a slot
from joining the waitlist. If it somehow occurs, skip that entry and
try the next one. Log a warning.

**All waitlist entries are notified:** Same as no waitlist — slot stays
`AVAILABLE`.

---

## 7. Admin Demand Signal Logic

### Overview

The demand signals section on the admin analytics page shows which
subscription services users are requesting most. This helps the admin
decide which new plans to purchase and add to the platform.

### Data source for MVP

For the MVP, demand signal data is **seeded directly into the database**
via the seed script. It is not dynamically computed from user behaviour.

The seed script inserts rows into a `demand_signals` table (defined below).
The analytics endpoint reads from this table.

### `demand_signals` table

This table is not in the main schema document because it is MVP-specific
and will be replaced by real user analytics in a future version.

```python
# backend/app/models/demand_signal.py

import uuid
import enum
from sqlalchemy import String, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin
from .plan import PlanCategory


class DemandSignal(Base, TimestampMixin):
    __tablename__ = "demand_signals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[PlanCategory] = mapped_column(
        SAEnum(PlanCategory, name="plan_category"), nullable=False
    )
    request_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_margin_paise: Mapped[int] = mapped_column(Integer, nullable=False)
```

### Seed data for demand signals

```python
# Inside backend/app/seed.py — add this section

demand_signal_data = [
    {
        "name": "YouTube Premium",
        "category": PlanCategory.STREAMING,
        "request_count": 89,
        "estimated_margin_paise": 3100,
    },
    {
        "name": "LinkedIn Learning",
        "category": PlanCategory.EDUCATION,
        "request_count": 67,
        "estimated_margin_paise": 21000,
    },
    {
        "name": "PlayStation Plus",
        "category": PlanCategory.GAMING,
        "request_count": 54,
        "estimated_margin_paise": 12000,
    },
    {
        "name": "Notion AI",
        "category": PlanCategory.PRODUCTIVITY,
        "request_count": 41,
        "estimated_margin_paise": 8900,
    },
    {
        "name": "Disney+ Hotstar",
        "category": PlanCategory.STREAMING,
        "request_count": 38,
        "estimated_margin_paise": 4400,
    },
    {
        "name": "Duolingo Max",
        "category": PlanCategory.EDUCATION,
        "request_count": 29,
        "estimated_margin_paise": 6700,
    },
]

for signal_data in demand_signal_data:
    db.add(DemandSignal(**signal_data))
```

### Demand signal sort order

The analytics endpoint always returns demand signals sorted by
`request_count DESC`. The highest-demand service appears first.

```python
signals = (
    db.query(DemandSignal)
    .order_by(DemandSignal.request_count.desc())
    .all()
)
```

### Estimated margin calculation

`estimated_margin_paise` in the seed data represents the expected
**platform fee per slot per month** if SubSplit were to add this plan.

This is an admin estimate, not a computed value. It is entered manually
when seeding and displayed as-is on the analytics page.

```
Display: "Est. margin: ₹{estimated_margin_paise / 100:.0f}/slot/mo"
```

### Analytics computed fields

The following values in `GET /api/admin/analytics` are computed at
query time from live database data:

| Field | Computation |
|---|---|
| `revenue_by_category` | `SUM(slots.count * plans.user_pays_paise)` grouped by `plans.category` where `slots.status = OCCUPIED` |
| `slot_utilization_by_category` | `COUNT(OCCUPIED slots) / COUNT(total slots) * 100` grouped by `plans.category` |
| `users_by_category` | `COUNT(DISTINCT slots.user_id)` grouped by `plans.category` where `slots.status = OCCUPIED` |
| `score_distribution` | `COUNT(users)` grouped by score tier (computed via score_events) |
| `recent_activity` | Last 10 `score_events` records joined to `users` and `plans` |

`revenue_trend` and `demand_signals` are seeded and returned as-is.

### Analytics query implementations

```python
# backend/app/routers/admin.py

from sqlalchemy import func, case

def get_revenue_by_category(db: Session) -> list[dict]:
    """
    Revenue per category = sum of (user_pays_paise × occupied slots)
    for all active plans in that category.
    """
    results = (
        db.query(
            Plan.category,
            func.sum(
                case(
                    (Slot.status == SlotStatus.OCCUPIED, Plan.user_pays_paise),
                    else_=0
                )
            ).label("revenue_paise"),
        )
        .join(Slot, Slot.plan_id == Plan.id)
        .filter(Plan.is_active == True)
        .group_by(Plan.category)
        .all()
    )
    return [
        {
            "category": row.category.value,
            "revenue_paise": int(row.revenue_paise or 0),
            "revenue_rupees": round((row.revenue_paise or 0) / 100, 2),
        }
        for row in results
    ]


def get_slot_utilization_by_category(db: Session) -> list[dict]:
    """
    Utilization per category = occupied / total * 100.
    """
    results = (
        db.query(
            Plan.category,
            func.count(Slot.id).label("total"),
            func.sum(
                case((Slot.status == SlotStatus.OCCUPIED, 1), else_=0)
            ).label("occupied"),
        )
        .join(Slot, Slot.plan_id == Plan.id)
        .filter(Plan.is_active == True)
        .group_by(Plan.category)
        .all()
    )
    return [
        {
            "category": row.category.value,
            "utilization_percentage": round(
                (row.occupied / row.total * 100) if row.total else 0, 2
            ),
        }
        for row in results
    ]


def get_score_distribution(db: Session) -> dict:
    """
    Count users in each score tier.
    Score is computed dynamically from score_events.
    """
    users = db.query(User).filter(User.role == UserRole.USER).all()
    distribution = {"high": 0, "medium": 0, "low": 0}
    for user in users:
        score = get_user_score(db, user.id)
        if score >= 75:
            distribution["high"] += 1
        elif score >= 40:
            distribution["medium"] += 1
        else:
            distribution["low"] += 1
    return distribution
```

---

## 8. Service Layer Implementation

### File: `backend/app/services/slot_service.py` (complete)

```python
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.slot import Slot, SlotStatus
from app.models.plan import Plan
from app.models.waitlist import WaitlistEntry
from app.models.score_event import ScoreEvent, ScoreEventType
from app.services.scoring_service import create_score_event, get_user_score


VALID_TRANSITIONS = {
    SlotStatus.AVAILABLE: [SlotStatus.OCCUPIED],
    SlotStatus.OCCUPIED:  [SlotStatus.AVAILABLE, SlotStatus.GRACE],
    SlotStatus.GRACE:     [SlotStatus.OCCUPIED, SlotStatus.REVOKED],
    SlotStatus.REVOKED:   [SlotStatus.AVAILABLE],
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
            Slot.status.in_([SlotStatus.OCCUPIED, SlotStatus.GRACE])
        )
        .count()
    )


def cancel_slot(db: Session, slot: Slot) -> Slot:
    """
    User voluntarily cancels an OCCUPIED slot.
    Slot becomes AVAILABLE. Waitlist promotion runs.
    No score change for voluntary cancellation.
    """
    if slot.status != SlotStatus.OCCUPIED:
        raise ValueError(f"Cannot cancel slot with status {slot.status}")

    plan_id = slot.plan_id

    slot.status = SlotStatus.AVAILABLE
    slot.user_id = None
    slot.assigned_at = None
    slot.expires_at = None
    slot.updated_at = datetime.now(timezone.utc)
    db.add(slot)
    db.flush()

    promote_from_waitlist(db=db, plan_id=plan_id, slot=slot)
    db.commit()
    return slot


def admin_revoke_slot(
    db: Session,
    slot: Slot,
    reason: str = "Admin revocation",
) -> Slot:
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

    # Score penalty
    create_score_event(
        db=db,
        user_id=user_id,
        event_type=ScoreEventType.SLOT_REVOKED,
        description=f"Admin revocation — {plan.name} — {reason}",
    )

    # Free the slot
    slot.status = SlotStatus.AVAILABLE
    slot.user_id = None
    slot.assigned_at = None
    slot.expires_at = None
    slot.updated_at = datetime.now(timezone.utc)
    db.add(slot)
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
                    100 + func.coalesce(func.sum(ScoreEvent.delta), 0)
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
            WaitlistEntry.notified == False,
        )
        .order_by(
            func.coalesce(score_subq.c.score, 100).desc(),
            WaitlistEntry.joined_at.asc(),
        )
        .first()
    )

    if result is None:
        return None

    entry, score = result
    now = datetime.now(timezone.utc)

    entry.notified = True
    entry.notified_at = now
    db.add(entry)

    slot.user_id = entry.user_id
    slot.status = SlotStatus.OCCUPIED
    slot.assigned_at = now
    slot.expires_at = now + timedelta(days=30)
    slot.updated_at = now
    db.add(slot)

    return entry.user_id
```

### File: `backend/app/services/payment_service.py` (complete)

```python
import uuid
import hmac
import hashlib
import os
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

import razorpay

from app.models.payment import Payment, PaymentStatus
from app.models.slot import Slot, SlotStatus
from app.models.plan import Plan
from app.models.user import User
from app.services.scoring_service import create_score_event
from app.models.score_event import ScoreEventType


def get_razorpay_client() -> razorpay.Client:
    return razorpay.Client(
        auth=(
            os.getenv("RAZORPAY_KEY_ID"),
            os.getenv("RAZORPAY_KEY_SECRET"),
        )
    )


def create_razorpay_order(
    db: Session,
    user: User,
    slot: Slot,
    plan: Plan,
) -> Payment:
    """
    Create a Razorpay order and a PENDING Payment record.
    Returns the Payment record (contains razorpay_order_id).
    """
    client = get_razorpay_client()
    amount = plan.user_pays_paise

    # Create payment record first (get UUID for receipt)
    payment = Payment(
        user_id=user.id,
        slot_id=slot.id,
        amount_paise=amount,
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    db.flush()  # Get payment.id without committing

    # Create Razorpay order
    try:
        rzp_order = client.order.create({
            "amount": amount,
            "currency": "INR",
            "receipt": str(payment.id),
            "notes": {
                "plan_name": plan.name,
                "slot_number": str(slot.slot_number),
                "user_email": user.email,
            }
        })
    except Exception as e:
        db.rollback()
        raise RuntimeError(f"Razorpay order creation failed: {str(e)}")

    payment.razorpay_order_id = rzp_order["id"]
    db.add(payment)
    db.commit()
    return payment


def verify_and_activate(
    db: Session,
    user: User,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> tuple[Payment, Slot]:
    """
    Verify Razorpay HMAC signature.
    On success: update payment to SUCCESS, activate the slot.
    On failure: update payment to FAILED, raise ValueError.
    """
    # Find the pending payment
    payment = (
        db.query(Payment)
        .filter(
            Payment.razorpay_order_id == razorpay_order_id,
            Payment.user_id == user.id,
            Payment.status == PaymentStatus.PENDING,
        )
        .first()
    )
    if payment is None:
        raise ValueError("PAYMENT_NOT_FOUND")

    # Verify HMAC-SHA256 signature
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    expected_signature = hmac.new(
        key=key_secret.encode("utf-8"),
        msg=f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, razorpay_signature):
        # Mark payment as failed
        payment.status = PaymentStatus.FAILED
        payment.failure_reason = "HMAC signature verification failed"
        db.add(payment)
        db.commit()
        raise ValueError("INVALID_SIGNATURE")

    # Signature valid — update payment
    payment.status = PaymentStatus.SUCCESS
    payment.razorpay_payment_id = razorpay_payment_id
    payment.razorpay_signature = razorpay_signature
    db.add(payment)

    # Activate the slot
    slot = db.query(Slot).filter(Slot.id == payment.slot_id).first()
    plan = db.query(Plan).filter(Plan.id == slot.plan_id).first()
    now = datetime.now(timezone.utc)

    # Determine score event type based on slot state
    if slot.status == SlotStatus.GRACE:
        score_event_type = ScoreEventType.LATE_PAYMENT
        description = f"Late payment during grace period — {plan.name}"
    else:
        score_event_type = ScoreEventType.ON_TIME_PAYMENT
        description = f"On-time payment — {plan.name}"

    slot.status = SlotStatus.OCCUPIED
    slot.user_id = user.id
    slot.assigned_at = now
    slot.expires_at = now + timedelta(days=30)
    slot.updated_at = now
    db.add(slot)

    create_score_event(
        db=db,
        user_id=user.id,
        event_type=score_event_type,
        description=description,
    )

    db.commit()
    return payment, slot
```

---

*End of Business Logic Document — SubSplit v1.0 MVP*
