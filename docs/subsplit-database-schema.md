# SubSplit — Database Schema Document

**Version:** 1.0  
**Status:** Final — MVP  
**Database:** PostgreSQL 16  
**ORM:** SQLAlchemy 2.x  
**Migrations:** Alembic  
**Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Entity Relationship Summary](#2-entity-relationship-summary)
3. [Table Specifications](#3-table-specifications)
   - [users](#31-users)
   - [plans](#32-plans)
   - [slots](#33-slots)
   - [payments](#34-payments)
   - [waitlist_entries](#35-waitlist_entries)
   - [score_events](#36-score_events)
4. [Relationships](#4-relationships)
5. [Indexes](#5-indexes)
6. [Enums](#6-enums)
7. [SQLAlchemy Models (Ready to Use)](#7-sqlalchemy-models-ready-to-use)
8. [Pydantic Schemas (Ready to Use)](#8-pydantic-schemas-ready-to-use)
9. [Alembic Setup and Initial Migration](#9-alembic-setup-and-initial-migration)
10. [Database Connection Setup](#10-database-connection-setup)
11. [Seed Data Script](#11-seed-data-script)

---

## 1. Overview

SubSplit uses a PostgreSQL relational database with 6 core tables. The schema is designed around the central concept of a **slot** — a purchasable unit of a subscription plan owned by SubSplit.

### Core design decisions

- **Monetary values** are stored as integers in **paise** (1 INR = 100 paise) to avoid floating point arithmetic errors. All price fields end in `_paise`.
- **SubSplit Score** is not stored as a mutable field. It is computed dynamically from the `score_events` table by summing all deltas for a user, clamped to 0–100.
- **Slot status** follows a strict state machine. Invalid state transitions are rejected at the service layer.
- **Soft deletes** are not used. Plans can be deactivated (`is_active = false`). All other records are permanent for audit purposes.
- **UUIDs** are used as primary keys across all tables for security (no sequential ID enumeration) and future distributed compatibility.
- All timestamps are stored in **UTC**.

---

## 2. Entity Relationship Summary

```
users
  │
  ├──< slots (one user → many slots, via user_id FK)
  │
  ├──< payments (one user → many payments, via user_id FK)
  │
  ├──< waitlist_entries (one user → many waitlist entries, via user_id FK)
  │
  └──< score_events (one user → many score events, via user_id FK)

plans
  │
  ├──< slots (one plan → many slots, via plan_id FK)
  │
  └──< waitlist_entries (one plan → many waitlist entries, via plan_id FK)

slots
  │
  └──< payments (one slot → many payments, via slot_id FK)
```

### Cardinality summary

| Relationship | Type |
|---|---|
| User → Slots | One-to-Many (a user can hold multiple slots across different plans) |
| User → Payments | One-to-Many |
| User → WaitlistEntries | One-to-Many |
| User → ScoreEvents | One-to-Many |
| Plan → Slots | One-to-Many (total slots = total rows for that plan) |
| Plan → WaitlistEntries | One-to-Many |
| Slot → Payments | One-to-Many (a slot can have multiple payment records over time) |

---

## 3. Table Specifications

---

### 3.1 `users`

Stores all registered users including admins. Role differentiates user type.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique user identifier |
| `name` | VARCHAR(100) | NOT NULL | — | User's full name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | — | User's email address |
| `hashed_password` | VARCHAR(255) | NOT NULL | — | bcrypt hashed password |
| `role` | ENUM('USER','ADMIN') | NOT NULL | `'USER'` | User role |
| `is_active` | BOOLEAN | NOT NULL | `true` | Whether the account is active |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Account creation timestamp (UTC) |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last update timestamp (UTC) |

**Indexes:**
- `PRIMARY KEY` on `id`
- `UNIQUE INDEX` on `email`

**Notes:**
- `hashed_password` stores only the bcrypt hash. Plain text password is never stored.
- SubSplit Score is computed from `score_events`, not stored here.
- Admin accounts are created manually via seed script or direct DB insertion. There is no public admin registration endpoint.

---

### 3.2 `plans`

Stores each subscription plan that SubSplit has purchased and made available for slot allocation.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique plan identifier |
| `name` | VARCHAR(100) | NOT NULL | — | Plan display name (e.g. "Netflix Premium") |
| `category` | ENUM | NOT NULL | — | One of: STREAMING, EDUCATION, GAMING, PRODUCTIVITY, MUSIC |
| `description` | TEXT | NOT NULL | — | Short description shown on plan detail page |
| `logo_url` | VARCHAR(500) | NULLABLE | `NULL` | URL to the platform's logo image |
| `total_slots` | INTEGER | NOT NULL, CHECK > 0 | — | Total number of slots available (e.g. 4 for Netflix Premium) |
| `subscription_cost_paise` | INTEGER | NOT NULL, CHECK > 0 | — | Full monthly cost SubSplit pays, in paise (e.g. 64900 for ₹649) |
| `platform_fee_paise` | INTEGER | NOT NULL, CHECK >= 0 | — | SubSplit's fixed fee per slot per month, in paise (e.g. 3700 for ₹37) |
| `access_instructions` | TEXT | NULLABLE | `NULL` | Admin-written instructions on how to access this subscription |
| `uptime_percentage` | NUMERIC(5,2) | NOT NULL | `99.90` | 30-day uptime percentage shown on plan cards |
| `is_active` | BOOLEAN | NOT NULL | `true` | Whether plan is visible and purchasable on the public site |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Plan creation timestamp (UTC) |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last update timestamp (UTC) |

**Computed values (not stored, calculated at query time):**
```
slot_cost_paise = subscription_cost_paise / total_slots  (integer division)
user_pays_paise = slot_cost_paise + platform_fee_paise
available_slots = COUNT(slots WHERE plan_id = this.id AND status = 'AVAILABLE')
occupied_slots  = COUNT(slots WHERE plan_id = this.id AND status = 'OCCUPIED')
```

**Indexes:**
- `PRIMARY KEY` on `id`
- `INDEX` on `category`
- `INDEX` on `is_active`

---

### 3.3 `slots`

Each row represents one slot within a plan. When a plan with 4 total slots is created, 4 rows are inserted into this table. A slot is the atomic purchasable unit.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique slot identifier |
| `plan_id` | UUID | NOT NULL, FK → plans.id | — | The plan this slot belongs to |
| `user_id` | UUID | NULLABLE, FK → users.id | `NULL` | The user currently holding this slot (NULL if available) |
| `slot_number` | INTEGER | NOT NULL | — | Display number of the slot within the plan (1, 2, 3, 4...) |
| `status` | ENUM | NOT NULL | `'AVAILABLE'` | One of: AVAILABLE, OCCUPIED, GRACE, REVOKED |
| `assigned_at` | TIMESTAMPTZ | NULLABLE | `NULL` | When the slot was last assigned to a user |
| `expires_at` | TIMESTAMPTZ | NULLABLE | `NULL` | When the current billing period ends |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Slot creation timestamp (UTC) |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last status change timestamp (UTC) |

**Constraints:**
- When `status = 'AVAILABLE'`, `user_id` MUST be `NULL`.
- When `status = 'OCCUPIED'` or `'GRACE'`, `user_id` MUST NOT be `NULL`.
- `slot_number` must be unique within a plan: `UNIQUE(plan_id, slot_number)`.

**Indexes:**
- `PRIMARY KEY` on `id`
- `INDEX` on `plan_id`
- `INDEX` on `user_id`
- `INDEX` on `status`
- `UNIQUE INDEX` on `(plan_id, slot_number)`

**State machine:**
```
AVAILABLE → OCCUPIED  : user purchases slot (payment verified)
OCCUPIED  → GRACE     : payment period expires without renewal
GRACE     → OCCUPIED  : user pays during grace period
GRACE     → REVOKED   : grace period (3 days) expires without payment
REVOKED   → AVAILABLE : after revocation, slot is freed for reassignment
OCCUPIED  → AVAILABLE : user cancels their slot
```

---

### 3.4 `payments`

Records every payment attempt associated with a slot purchase or renewal.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique payment identifier |
| `user_id` | UUID | NOT NULL, FK → users.id | — | The user who made the payment |
| `slot_id` | UUID | NOT NULL, FK → slots.id | — | The slot being purchased or renewed |
| `amount_paise` | INTEGER | NOT NULL, CHECK > 0 | — | Amount charged in paise |
| `status` | ENUM | NOT NULL | `'PENDING'` | One of: PENDING, SUCCESS, FAILED |
| `razorpay_order_id` | VARCHAR(100) | NULLABLE, UNIQUE | `NULL` | Razorpay order ID returned from order creation |
| `razorpay_payment_id` | VARCHAR(100) | NULLABLE, UNIQUE | `NULL` | Razorpay payment ID returned after successful payment |
| `razorpay_signature` | VARCHAR(255) | NULLABLE | `NULL` | HMAC-SHA256 signature for verification |
| `failure_reason` | TEXT | NULLABLE | `NULL` | Reason for failure if status = FAILED |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Payment initiation timestamp (UTC) |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last status update timestamp (UTC) |

**Indexes:**
- `PRIMARY KEY` on `id`
- `INDEX` on `user_id`
- `INDEX` on `slot_id`
- `INDEX` on `status`
- `UNIQUE INDEX` on `razorpay_order_id` (when not null)
- `UNIQUE INDEX` on `razorpay_payment_id` (when not null)

**Notes:**
- A payment record is created as `PENDING` when the Razorpay order is created.
- It is updated to `SUCCESS` or `FAILED` after signature verification.
- Multiple payment records can exist for the same slot (one per billing period).

---

### 3.5 `waitlist_entries`

Tracks users waiting for a slot on a fully occupied plan. Used for automatic slot promotion.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique waitlist entry identifier |
| `user_id` | UUID | NOT NULL, FK → users.id | — | The waiting user |
| `plan_id` | UUID | NOT NULL, FK → plans.id | — | The plan being waited for |
| `joined_at` | TIMESTAMPTZ | NOT NULL | `now()` | When the user joined the waitlist |
| `notified` | BOOLEAN | NOT NULL | `false` | Whether the user has been notified of slot availability |
| `notified_at` | TIMESTAMPTZ | NULLABLE | `NULL` | When the notification was sent |

**Constraints:**
- A user cannot join the same plan's waitlist twice: `UNIQUE(user_id, plan_id)`.

**Indexes:**
- `PRIMARY KEY` on `id`
- `INDEX` on `plan_id`
- `INDEX` on `user_id`
- `UNIQUE INDEX` on `(user_id, plan_id)`

**Waitlist promotion query (used by slot_service.py):**
```sql
SELECT we.user_id
FROM waitlist_entries we
JOIN users u ON u.id = we.user_id
WHERE we.plan_id = :plan_id
  AND we.notified = false
ORDER BY (
  SELECT LEAST(100, GREATEST(0, 100 + COALESCE(SUM(se.delta), 0)))
  FROM score_events se
  WHERE se.user_id = we.user_id
) DESC,
we.joined_at ASC
LIMIT 1;
```

---

### 3.6 `score_events`

An append-only log of every event that affects a user's SubSplit Score. The current score is derived by summing all deltas.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique event identifier |
| `user_id` | UUID | NOT NULL, FK → users.id | — | The user whose score changed |
| `event_type` | ENUM | NOT NULL | — | One of: ON_TIME_PAYMENT, LATE_PAYMENT, SLOT_REVOKED, ACCOUNT_LONGEVITY |
| `delta` | INTEGER | NOT NULL | — | Score change: positive = increase, negative = decrease |
| `description` | VARCHAR(255) | NULLABLE | `NULL` | Human-readable reason for the score change |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | When the event occurred (UTC) |

**Indexes:**
- `PRIMARY KEY` on `id`
- `INDEX` on `user_id`
- `INDEX` on `event_type`
- `INDEX` on `created_at`

**Score delta reference:**

| `event_type` | `delta` | Trigger |
|---|---|---|
| `ON_TIME_PAYMENT` | `+5` | Payment succeeded before slot expires |
| `LATE_PAYMENT` | `-5` | Payment made during grace period |
| `SLOT_REVOKED` | `-20` | Grace period expired, slot forcibly revoked |
| `ACCOUNT_LONGEVITY` | `+10` | Account is 90+ days old with no SLOT_REVOKED events (one-time) |

**Score calculation query:**
```sql
SELECT LEAST(100, GREATEST(0, 100 + COALESCE(SUM(delta), 0))) AS subsplit_score
FROM score_events
WHERE user_id = :user_id;
```

---

## 4. Relationships

```
users.id ──────────────────────────────────────────┐
                                                    │ FK (nullable)
plans.id ─────────────┐                             │
                      │ FK                          │
                      ▼                             ▼
                   slots ──────────────────── users
                      │ FK
                      ▼
                  payments ──────────────── users (FK)

plans.id ─────────────────────────────── waitlist_entries ── users (FK)

users.id ──────────────────────────────── score_events
```

### Foreign key behaviors

| FK | On Delete | On Update |
|---|---|---|
| `slots.plan_id → plans.id` | RESTRICT | CASCADE |
| `slots.user_id → users.id` | SET NULL | CASCADE |
| `payments.user_id → users.id` | RESTRICT | CASCADE |
| `payments.slot_id → slots.id` | RESTRICT | CASCADE |
| `waitlist_entries.user_id → users.id` | CASCADE | CASCADE |
| `waitlist_entries.plan_id → plans.id` | CASCADE | CASCADE |
| `score_events.user_id → users.id` | CASCADE | CASCADE |

---

## 5. Indexes

### Complete index list

```sql
-- users
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- plans
CREATE INDEX idx_plans_category ON plans(category);
CREATE INDEX idx_plans_is_active ON plans(is_active);

-- slots
CREATE INDEX idx_slots_plan_id ON slots(plan_id);
CREATE INDEX idx_slots_user_id ON slots(user_id);
CREATE INDEX idx_slots_status ON slots(status);
CREATE UNIQUE INDEX idx_slots_plan_slot_number ON slots(plan_id, slot_number);

-- payments
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_slot_id ON payments(slot_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE UNIQUE INDEX idx_payments_razorpay_order ON payments(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;
CREATE UNIQUE INDEX idx_payments_razorpay_payment ON payments(razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- waitlist_entries
CREATE INDEX idx_waitlist_plan_id ON waitlist_entries(plan_id);
CREATE INDEX idx_waitlist_user_id ON waitlist_entries(user_id);
CREATE UNIQUE INDEX idx_waitlist_user_plan ON waitlist_entries(user_id, plan_id);

-- score_events
CREATE INDEX idx_score_events_user_id ON score_events(user_id);
CREATE INDEX idx_score_events_event_type ON score_events(event_type);
CREATE INDEX idx_score_events_created_at ON score_events(created_at);
```

---

## 6. Enums

Define these as PostgreSQL native enums and mirror them in SQLAlchemy.

```sql
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');

CREATE TYPE plan_category AS ENUM (
  'STREAMING',
  'EDUCATION',
  'GAMING',
  'PRODUCTIVITY',
  'MUSIC'
);

CREATE TYPE slot_status AS ENUM (
  'AVAILABLE',
  'OCCUPIED',
  'GRACE',
  'REVOKED'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'SUCCESS',
  'FAILED'
);

CREATE TYPE score_event_type AS ENUM (
  'ON_TIME_PAYMENT',
  'LATE_PAYMENT',
  'SLOT_REVOKED',
  'ACCOUNT_LONGEVITY'
);
```

---

## 7. SQLAlchemy Models (Ready to Use)

### `backend/app/models/__init__.py`
```python
from .user import User
from .plan import Plan
from .slot import Slot
from .payment import Payment
from .waitlist import WaitlistEntry
from .score_event import ScoreEvent

__all__ = [
    "User",
    "Plan",
    "Slot",
    "Payment",
    "WaitlistEntry",
    "ScoreEvent",
]
```

---

### `backend/app/models/base.py`
```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped
from sqlalchemy.dialects.postgresql import UUID


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
```

---

### `backend/app/models/user.py`
```python
import uuid
from sqlalchemy import String, Boolean, Enum as SAEnum
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin
import enum


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
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role"),
        nullable=False,
        default=UserRole.USER,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    slots: Mapped[list["Slot"]] = relationship("Slot", back_populates="user")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="user")
    waitlist_entries: Mapped[list["WaitlistEntry"]] = relationship(
        "WaitlistEntry", back_populates="user", cascade="all, delete-orphan"
    )
    score_events: Mapped[list["ScoreEvent"]] = relationship(
        "ScoreEvent", back_populates="user", cascade="all, delete-orphan"
    )
```

---

### `backend/app/models/plan.py`
```python
import uuid
import enum
from sqlalchemy import String, Integer, Text, Boolean, Enum as SAEnum, Numeric
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class PlanCategory(str, enum.Enum):
    STREAMING = "STREAMING"
    EDUCATION = "EDUCATION"
    GAMING = "GAMING"
    PRODUCTIVITY = "PRODUCTIVITY"
    MUSIC = "MUSIC"


class Plan(Base, TimestampMixin):
    __tablename__ = "plans"

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
    uptime_percentage: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=99.90
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    # Relationships
    slots: Mapped[list["Slot"]] = relationship("Slot", back_populates="plan")
    waitlist_entries: Mapped[list["WaitlistEntry"]] = relationship(
        "WaitlistEntry", back_populates="plan", cascade="all, delete-orphan"
    )

    @property
    def slot_cost_paise(self) -> int:
        return self.subscription_cost_paise // self.total_slots

    @property
    def user_pays_paise(self) -> int:
        return self.slot_cost_paise + self.platform_fee_paise
```

---

### `backend/app/models/slot.py`
```python
import uuid
import enum
from datetime import datetime
from sqlalchemy import Integer, DateTime, Enum as SAEnum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class SlotStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    GRACE = "GRACE"
    REVOKED = "REVOKED"


class Slot(Base, TimestampMixin):
    __tablename__ = "slots"
    __table_args__ = (
        UniqueConstraint("plan_id", "slot_number", name="uq_slot_plan_number"),
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
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    plan: Mapped["Plan"] = relationship("Plan", back_populates="slots")
    user: Mapped["User | None"] = relationship("User", back_populates="slots")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="slot")
```

---

### `backend/app/models/payment.py`
```python
import uuid
import enum
from sqlalchemy import Integer, Text, String, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    slot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("slots.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus, name="payment_status"),
        nullable=False,
        default=PaymentStatus.PENDING,
        index=True,
    )
    razorpay_order_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, unique=True
    )
    razorpay_payment_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, unique=True
    )
    razorpay_signature: Mapped[str | None] = mapped_column(String(255), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="payments")
    slot: Mapped["Slot"] = relationship("Slot", back_populates="payments")
```

---

### `backend/app/models/waitlist.py`
```python
import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from .base import Base


class WaitlistEntry(Base):
    __tablename__ = "waitlist_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "plan_id", name="uq_waitlist_user_plan"),
    )

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
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ),
    )
    notified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="waitlist_entries")
    plan: Mapped["Plan"] = relationship("Plan", back_populates="waitlist_entries")
```

---

### `backend/app/models/score_event.py`
```python
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Integer, String, Enum as SAEnum, ForeignKey, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from .base import Base


class ScoreEventType(str, enum.Enum):
    ON_TIME_PAYMENT = "ON_TIME_PAYMENT"
    LATE_PAYMENT = "LATE_PAYMENT"
    SLOT_REVOKED = "SLOT_REVOKED"
    ACCOUNT_LONGEVITY = "ACCOUNT_LONGEVITY"


SCORE_DELTAS = {
    ScoreEventType.ON_TIME_PAYMENT: +5,
    ScoreEventType.LATE_PAYMENT: -5,
    ScoreEventType.SLOT_REVOKED: -20,
    ScoreEventType.ACCOUNT_LONGEVITY: +10,
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

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="score_events")
```

---

## 8. Pydantic Schemas (Ready to Use)

### `backend/app/schemas/user.py`
```python
import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, computed_field
from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserWithScore(UserOut):
    subsplit_score: int


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: int
```

---

### `backend/app/schemas/plan.py`
```python
import uuid
from datetime import datetime
from pydantic import BaseModel, Field, computed_field
from app.models.plan import PlanCategory


class PlanCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: PlanCategory
    description: str = Field(..., min_length=1)
    logo_url: str | None = None
    total_slots: int = Field(..., gt=0)
    subscription_cost_paise: int = Field(..., gt=0)
    platform_fee_paise: int = Field(..., ge=0)
    access_instructions: str | None = None
    uptime_percentage: float = Field(default=99.90, ge=0, le=100)


class PlanUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    logo_url: str | None = None
    platform_fee_paise: int | None = None
    access_instructions: str | None = None
    uptime_percentage: float | None = None
    is_active: bool | None = None


class PlanOut(BaseModel):
    id: uuid.UUID
    name: str
    category: PlanCategory
    description: str
    logo_url: str | None
    total_slots: int
    subscription_cost_paise: int
    platform_fee_paise: int
    slot_cost_paise: int
    user_pays_paise: int
    access_instructions: str | None
    uptime_percentage: float
    is_active: bool
    available_slots: int
    occupied_slots: int
    created_at: datetime

    model_config = {"from_attributes": True}
```

---

### `backend/app/schemas/slot.py`
```python
import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.slot import SlotStatus


class SlotOut(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    user_id: uuid.UUID | None
    slot_number: int
    status: SlotStatus
    assigned_at: datetime | None
    expires_at: datetime | None

    model_config = {"from_attributes": True}


class SlotWithPlan(SlotOut):
    plan_name: str
    plan_category: str
    user_pays_paise: int
```

---

### `backend/app/schemas/payment.py`
```python
import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.payment import PaymentStatus


class CreateOrderRequest(BaseModel):
    slot_id: uuid.UUID


class CreateOrderResponse(BaseModel):
    razorpay_order_id: str
    amount_paise: int
    currency: str = "INR"
    payment_id: uuid.UUID


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    slot_id: uuid.UUID
    amount_paise: int
    status: PaymentStatus
    razorpay_order_id: str | None
    razorpay_payment_id: str | None
    failure_reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
```

---

## 9. Alembic Setup and Initial Migration

### Step 1 — Install and initialize Alembic

```bash
cd backend
pip install alembic
alembic init alembic
```

### Step 2 — Update `alembic.ini`

Set the database URL line:
```ini
sqlalchemy.url = postgresql://subsplit_user:subsplit_password@localhost:5432/subsplit_db
```

Or better, use an environment variable to avoid committing credentials:
```ini
sqlalchemy.url =
```

### Step 3 — Update `alembic/env.py`

```python
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

load_dotenv()

# Import all models so Alembic detects them
from app.models.base import Base
from app.models.user import User
from app.models.plan import Plan
from app.models.slot import Slot
from app.models.payment import Payment
from app.models.waitlist import WaitlistEntry
from app.models.score_event import ScoreEvent

config = context.config
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### Step 4 — Generate and apply the initial migration

```bash
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head
```

---

## 10. Database Connection Setup

### `backend/app/core/database.py`
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    echo=False,  # Set to True during development to log SQL queries
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### `backend/.env`
```env
DATABASE_URL=postgresql://subsplit_user:subsplit_password@localhost:5432/subsplit_db
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### PostgreSQL setup commands
```bash
# Create database and user
psql -U postgres
CREATE USER subsplit_user WITH PASSWORD 'subsplit_password';
CREATE DATABASE subsplit_db OWNER subsplit_user;
GRANT ALL PRIVILEGES ON DATABASE subsplit_db TO subsplit_user;
\q
```

---

## 11. Seed Data Script

### `backend/app/seed.py`

Run this after applying migrations to populate the database with demo data.

```python
"""
SubSplit database seed script.
Run with: python -m app.seed
"""
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.plan import Plan, PlanCategory
from app.models.slot import Slot, SlotStatus
from app.models.score_event import ScoreEvent, ScoreEventType, SCORE_DELTAS
from app.models.waitlist import WaitlistEntry
from app.models.payment import Payment, PaymentStatus


def seed_database():
    db: Session = SessionLocal()
    try:
        print("Seeding SubSplit database...")

        # ── Admin user ──────────────────────────────────────────────────────
        admin = User(
            name="SubSplit Admin",
            email="admin@subsplit.com",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
        )
        db.add(admin)

        # ── Regular users ───────────────────────────────────────────────────
        users_data = [
            ("Arjun Rao", "arjun@example.com", 90),
            ("Priya Sharma", "priya@example.com", 75),
            ("Karan Mehta", "karan@example.com", 38),
            ("Neha Singh", "neha@example.com", 55),
            ("Vivek Kumar", "vivek@example.com", 88),
        ]
        users = []
        for name, email, target_score in users_data:
            u = User(
                name=name,
                email=email,
                hashed_password=get_password_hash("password123"),
                role=UserRole.USER,
            )
            db.add(u)
            users.append((u, target_score))

        db.flush()

        # ── Score events for users ──────────────────────────────────────────
        for user, target_score in users:
            delta_needed = target_score - 100
            if delta_needed > 0:
                event_type = ScoreEventType.ON_TIME_PAYMENT
                for _ in range(delta_needed // 5):
                    db.add(ScoreEvent(
                        user_id=user.id,
                        event_type=event_type,
                        delta=+5,
                        description="On-time payment",
                    ))
            elif delta_needed < 0:
                if delta_needed <= -20:
                    db.add(ScoreEvent(
                        user_id=user.id,
                        event_type=ScoreEventType.SLOT_REVOKED,
                        delta=-20,
                        description="Slot revoked due to non-payment",
                    ))
                    remaining = delta_needed + 20
                    for _ in range(abs(remaining) // 5):
                        db.add(ScoreEvent(
                            user_id=user.id,
                            event_type=ScoreEventType.LATE_PAYMENT,
                            delta=-5,
                            description="Late payment during grace period",
                        ))
                else:
                    for _ in range(abs(delta_needed) // 5):
                        db.add(ScoreEvent(
                            user_id=user.id,
                            event_type=ScoreEventType.LATE_PAYMENT,
                            delta=-5,
                            description="Late payment during grace period",
                        ))

        # ── Plans ───────────────────────────────────────────────────────────
        plans_data = [
            {
                "name": "Netflix Premium",
                "category": PlanCategory.STREAMING,
                "description": "4K Ultra HD streaming on 4 screens simultaneously. Includes all Netflix originals and movies.",
                "logo_url": "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
                "total_slots": 4,
                "subscription_cost_paise": 64900,
                "platform_fee_paise": 3700,
                "access_instructions": "You will receive a profile invite email from SubSplit within 10 minutes of purchase. Accept the invite and set your profile PIN. Do not change the account email or password.",
                "uptime_percentage": 99.20,
            },
            {
                "name": "Spotify Family",
                "category": PlanCategory.MUSIC,
                "description": "Individual Spotify Premium accounts for up to 6 family members. Full features, separate libraries.",
                "logo_url": "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg",
                "total_slots": 6,
                "subscription_cost_paise": 17900,
                "platform_fee_paise": 2100,
                "access_instructions": "You will receive an invite to join the SubSplit Spotify Family plan. Accept via email. Your music library and playlists remain completely separate.",
                "uptime_percentage": 99.80,
            },
            {
                "name": "Amazon Prime",
                "category": PlanCategory.STREAMING,
                "description": "Prime Video access including Prime originals, fast delivery benefits, and Prime Music.",
                "logo_url": None,
                "total_slots": 2,
                "subscription_cost_paise": 29900,
                "platform_fee_paise": 5000,
                "access_instructions": "You will get access to a shared Amazon Prime account. Use only the Prime Video and Music features. Do not make purchases on the account.",
                "uptime_percentage": 98.90,
            },
            {
                "name": "Adobe Creative Cloud",
                "category": PlanCategory.PRODUCTIVITY,
                "description": "Full Adobe Creative Cloud Teams plan. Access Photoshop, Illustrator, Premiere Pro, After Effects, and all 20+ apps.",
                "logo_url": None,
                "total_slots": 3,
                "subscription_cost_paise": 423000,
                "platform_fee_paise": 27000,
                "access_instructions": "You will receive an Adobe Teams invitation email. Create your personal Adobe ID and accept. All your work is saved to your personal Creative Cloud storage.",
                "uptime_percentage": 99.50,
            },
            {
                "name": "Microsoft 365 Family",
                "category": PlanCategory.PRODUCTIVITY,
                "description": "Word, Excel, PowerPoint, Outlook, Teams, and 1TB OneDrive for each user. Desktop and web versions included.",
                "logo_url": None,
                "total_slots": 6,
                "subscription_cost_paise": 48900,
                "platform_fee_paise": 3100,
                "access_instructions": "You will receive a Microsoft 365 Family sharing invitation. Sign in with your personal Microsoft account to activate your subscription.",
                "uptime_percentage": 99.90,
            },
            {
                "name": "Coursera Plus",
                "category": PlanCategory.EDUCATION,
                "description": "Unlimited access to 7,000+ courses, professional certificates, and guided projects from top universities.",
                "logo_url": None,
                "total_slots": 3,
                "subscription_cost_paise": 380000,
                "platform_fee_paise": 20000,
                "access_instructions": "You will receive login credentials for your dedicated Coursera account under the SubSplit team plan. All your course progress and certificates are saved to your profile.",
                "uptime_percentage": 99.10,
            },
            {
                "name": "Xbox Game Pass Ultimate",
                "category": PlanCategory.GAMING,
                "description": "100+ high-quality games, EA Play membership, Xbox Live Gold, and cloud gaming included.",
                "logo_url": None,
                "total_slots": 2,
                "subscription_cost_paise": 49900,
                "platform_fee_paise": 8000,
                "access_instructions": "SubSplit uses Xbox home sharing. You need to set the SubSplit account as your Home Xbox. Detailed setup instructions will be sent after purchase.",
                "uptime_percentage": 97.80,
            },
        ]

        plans = []
        for plan_data in plans_data:
            plan = Plan(**plan_data)
            db.add(plan)
            plans.append(plan)

        db.flush()

        # ── Slots ────────────────────────────────────────────────────────────
        now = datetime.now(timezone.utc)
        slot_assignments = {}

        for plan in plans:
            for i in range(1, plan.total_slots + 1):
                slot = Slot(
                    plan_id=plan.id,
                    slot_number=i,
                    status=SlotStatus.AVAILABLE,
                )
                db.add(slot)
                db.flush()

                # Assign first 1-2 slots to demo users
                user_list = [u for u, _ in users]
                if i == 1 and len(user_list) >= 1:
                    slot.user_id = user_list[0].id
                    slot.status = SlotStatus.OCCUPIED
                    slot.assigned_at = now - timedelta(days=15)
                    slot.expires_at = now + timedelta(days=15)
                    slot_assignments[str(slot.id)] = user_list[0].id
                elif i == 2 and len(user_list) >= 2:
                    slot.user_id = user_list[1].id
                    slot.status = SlotStatus.OCCUPIED
                    slot.assigned_at = now - timedelta(days=10)
                    slot.expires_at = now + timedelta(days=20)
                    slot_assignments[str(slot.id)] = user_list[1].id

        db.flush()

        # ── Payments for assigned slots ──────────────────────────────────────
        for slot_id_str, user_id in slot_assignments.items():
            slot = db.query(Slot).filter(Slot.id == uuid.UUID(slot_id_str)).first()
            if slot:
                plan = db.query(Plan).filter(Plan.id == slot.plan_id).first()
                db.add(Payment(
                    user_id=user_id,
                    slot_id=slot.id,
                    amount_paise=plan.user_pays_paise,
                    status=PaymentStatus.SUCCESS,
                    razorpay_order_id=f"order_demo_{uuid.uuid4().hex[:16]}",
                    razorpay_payment_id=f"pay_demo_{uuid.uuid4().hex[:16]}",
                    razorpay_signature="demo_signature_verified",
                ))

        # ── Waitlist entries ─────────────────────────────────────────────────
        # Add users 3 and 4 to Netflix waitlist (it will be full after seed)
        netflix = next(p for p in plans if p.name == "Netflix Premium")
        for user, _ in users[2:4]:
            db.add(WaitlistEntry(
                user_id=user.id,
                plan_id=netflix.id,
            ))

        db.commit()
        print("Database seeded successfully.")
        print(f"  Admin: admin@subsplit.com / admin123")
        print(f"  Users: arjun@example.com / password123 (and 4 others)")
        print(f"  Plans: {len(plans)} plans created")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
```

---

## Quick Reference

### Monetary conversion helpers

```python
def paise_to_rupees(paise: int) -> float:
    """Convert paise to rupees for display."""
    return round(paise / 100, 2)

def rupees_to_paise(rupees: float) -> int:
    """Convert rupees to paise for storage."""
    return int(round(rupees * 100))
```

### Score calculation helper

```python
from sqlalchemy import func
from app.models.score_event import ScoreEvent

def get_user_score(db: Session, user_id: uuid.UUID) -> int:
    """Calculate current SubSplit Score for a user."""
    result = db.query(
        func.least(100, func.greatest(0, 100 + func.coalesce(func.sum(ScoreEvent.delta), 0)))
    ).filter(ScoreEvent.user_id == user_id).scalar()
    return int(result or 100)
```

### Available slots count helper

```python
from app.models.slot import Slot, SlotStatus

def get_available_slot_count(db: Session, plan_id: uuid.UUID) -> int:
    return db.query(Slot).filter(
        Slot.plan_id == plan_id,
        Slot.status == SlotStatus.AVAILABLE
    ).count()

def get_first_available_slot(db: Session, plan_id: uuid.UUID) -> Slot | None:
    return db.query(Slot).filter(
        Slot.plan_id == plan_id,
        Slot.status == SlotStatus.AVAILABLE
    ).first()
```

---

*End of Database Schema Document — SubSplit v1.0 MVP*
