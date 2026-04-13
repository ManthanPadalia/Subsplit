# SubSplit — Codex Prompt Sequence

**Version:** 1.0  
**Status:** Final — MVP  
**Last Updated:** April 2026

## How to use this document

1. Open Codex and start a new task.
2. Copy the prompt exactly as written — including the doc references.
3. Wait for Codex to finish. Review the output before moving to the next prompt.
4. Never skip a prompt. Never combine two prompts into one.
5. After every prompt, check the output compiles/runs before continuing.
6. Keep `AGENTS.md` open in your repo root — Codex reads it automatically.

---

## Phase 1 — Foundation

---

### Prompt 01 — Backend project structure and dependencies

```
Read AGENTS.md first.

Set up the complete FastAPI backend project structure for SubSplit.

Create the following folder structure inside /backend:

backend/
├── app/
│   ├── __init__.py
│   ├── main.py              (empty for now — just the FastAPI instance)
│   ├── dependencies.py      (empty for now)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── money.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── plan.py
│   │   ├── slot.py
│   │   ├── payment.py
│   │   ├── waitlist.py
│   │   ├── score_event.py
│   │   └── demand_signal.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── plan.py
│   │   ├── slot.py
│   │   └── payment.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── plans.py
│   │   ├── slots.py
│   │   ├── payments.py
│   │   ├── waitlist.py
│   │   ├── scores.py
│   │   └── admin.py
│   └── services/
│       ├── __init__.py
│       ├── slot_service.py
│       ├── scoring_service.py
│       └── payment_service.py
├── alembic/
├── alembic.ini
├── requirements.txt
├── .env
├── .env.example
├── .gitignore
└── ruff.toml

Create requirements.txt with these exact packages:
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic[email]==2.7.1
pydantic-settings==2.2.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.1
razorpay==1.4.1
httpx==0.27.0
ruff==0.4.4

Create .env.example (no real values):
DATABASE_URL=postgresql://subsplit_user:subsplit_password@localhost:5432/subsplit_db
SECRET_KEY=your-super-secret-jwt-key-minimum-32-chars-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

Create .gitignore that ignores: __pycache__, .env, *.pyc, .venv, venv,
dist, .pytest_cache, alembic/versions/*.py (do NOT ignore alembic/env.py).

Create ruff.toml:
[tool.ruff]
line-length = 100
target-version = "py311"
select = ["E", "F", "I"]

Create backend/app/main.py as a minimal FastAPI app with CORS middleware
allowing http://localhost:5173. Include a root GET / health check endpoint
returning {"status": "ok", "message": "SubSplit API is running."}.

Do NOT implement any routes yet. Do NOT fill in any model files yet.
Just the structure, requirements.txt, config files, and the bare main.py.
```

---

### Prompt 02 — Core config and database connection

```
Read AGENTS.md and docs/subsplit-database-schema.md Section 10.

Implement the following files exactly as specified in the schema doc:

1. backend/app/core/config.py
   Use pydantic-settings BaseSettings. Load all values from .env.
   Fields: DATABASE_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
   Create a singleton settings instance at the bottom of the file.

2. backend/app/core/database.py
   Implement exactly as shown in docs/subsplit-database-schema.md Section 10.
   Use create_engine with pool_pre_ping=True, pool_size=5, max_overflow=10.
   Implement get_db() generator function as a FastAPI dependency.
   Set echo=False.

3. backend/app/core/money.py
   Implement two functions exactly as specified in
   docs/subsplit-business-logic.md Section 1:
   - rupees_to_paise(rupees: float) -> int
   - paise_to_rupees(paise: int) -> float
   Add docstrings explaining the paise system.

4. backend/app/core/security.py
   Implement exactly as shown in docs/subsplit-api-spec.md Section 11:
   - get_password_hash(password: str) -> str
   - verify_password(plain: str, hashed: str) -> bool
   - create_access_token(data: dict) -> str
   - decode_access_token(token: str) -> dict | None
   Use HS256. Load SECRET_KEY and ALGORITHM from settings (not os.getenv directly).
   Token expiry uses ACCESS_TOKEN_EXPIRE_MINUTES from settings.

After implementing all four files, verify they import correctly by running:
cd backend && python -c "from app.core.config import settings; print(settings.DATABASE_URL)"
```

---

### Prompt 03 — SQLAlchemy models

```
Read AGENTS.md and docs/subsplit-database-schema.md Sections 3, 6, and 7.

Implement all SQLAlchemy models for SubSplit. Follow the schema doc exactly.
Every model must match the field names, types, constraints, and relationships
specified. Do not add any fields not in the spec.

Implement in this order:

1. backend/app/models/base.py
   - Base (DeclarativeBase)
   - TimestampMixin (created_at, updated_at with timezone=True and auto-update)

2. backend/app/models/user.py
   - UserRole enum: USER, ADMIN
   - User model with all fields from Section 3.1
   - Relationships: slots, payments, waitlist_entries, score_events

3. backend/app/models/plan.py
   - PlanCategory enum: STREAMING, EDUCATION, GAMING, PRODUCTIVITY, MUSIC
   - Plan model with all fields from Section 3.2
   - Computed properties: slot_cost_paise, user_pays_paise
     (use integer division as specified in business-logic.md Section 2)
   - Relationships: slots, waitlist_entries

4. backend/app/models/slot.py
   - SlotStatus enum: AVAILABLE, OCCUPIED, GRACE, REVOKED
   - Slot model with all fields from Section 3.3
   - UniqueConstraint on (plan_id, slot_number)
   - Relationships: plan, user, payments

5. backend/app/models/payment.py
   - PaymentStatus enum: PENDING, SUCCESS, FAILED
   - Payment model with all fields from Section 3.4
   - Relationships: user, slot

6. backend/app/models/waitlist.py
   - WaitlistEntry model with all fields from Section 3.5
   - UniqueConstraint on (user_id, plan_id)
   - Relationships: user, plan

7. backend/app/models/score_event.py
   - ScoreEventType enum: ON_TIME_PAYMENT, LATE_PAYMENT, SLOT_REVOKED, ACCOUNT_LONGEVITY
   - SCORE_DELTAS dict mapping each type to its delta value
     (ON_TIME_PAYMENT: +5, LATE_PAYMENT: -5, SLOT_REVOKED: -20, ACCOUNT_LONGEVITY: +10)
   - ScoreEvent model with all fields from Section 3.6
   - Relationship: user

8. backend/app/models/demand_signal.py
   - DemandSignal model with fields: id (UUID), name, category (PlanCategory enum),
     request_count (int), estimated_margin_paise (int)
   - Include TimestampMixin

9. backend/app/models/__init__.py
   Export all models: User, Plan, Slot, Payment, WaitlistEntry, ScoreEvent, DemandSignal

After writing all models, verify imports with:
cd backend && python -c "from app.models import User, Plan, Slot, Payment, WaitlistEntry, ScoreEvent, DemandSignal; print('All models imported OK')"
```

---

### Prompt 04 — Alembic setup and initial migration

```
Read AGENTS.md and docs/subsplit-database-schema.md Section 9.

Set up Alembic and generate the initial database migration for SubSplit.

Steps:

1. Initialize Alembic inside /backend:
   cd backend && alembic init alembic

2. Update backend/alembic/env.py exactly as shown in
   docs/subsplit-database-schema.md Section 9 Step 3.
   Key requirements:
   - Import all 7 models (User, Plan, Slot, Payment, WaitlistEntry, ScoreEvent, DemandSignal)
   - Set target_metadata = Base.metadata
   - Load DATABASE_URL from .env using dotenv
   - Implement both run_migrations_offline() and run_migrations_online()

3. Update backend/alembic.ini:
   Set sqlalchemy.url = (leave blank — loaded dynamically from env in env.py)

4. Create the PostgreSQL database and user by running these SQL commands
   (show the commands but do not execute them — the developer will run them):
   CREATE USER subsplit_user WITH PASSWORD 'subsplit_password';
   CREATE DATABASE subsplit_db OWNER subsplit_user;
   GRANT ALL PRIVILEGES ON DATABASE subsplit_db TO subsplit_user;

5. Generate the initial migration:
   cd backend && alembic revision --autogenerate -m "initial_schema"

6. Apply the migration:
   cd backend && alembic upgrade head

7. Verify by connecting to the database and listing tables:
   cd backend && python -c "
   from app.core.database import engine
   from sqlalchemy import inspect
   inspector = inspect(engine)
   print('Tables created:', inspector.get_table_names())
   "

Expected output should include: users, plans, slots, payments,
waitlist_entries, score_events, demand_signals.

If the migration fails, show the exact error and fix it before continuing.
```

---

### Prompt 05 — Pydantic schemas

```
Read AGENTS.md and docs/subsplit-database-schema.md Section 8.

Implement all Pydantic v2 schemas for SubSplit. Follow the schema doc exactly.

1. backend/app/schemas/user.py
   Implement: UserCreate, UserLogin, UserOut, UserWithScore, Token, TokenPayload
   - UserCreate: name (1-100 chars), email (EmailStr), password (min 8)
   - UserOut: id, name, email, role, is_active, created_at. model_config from_attributes=True
   - UserWithScore: extends UserOut, adds subsplit_score: int
   - Token: access_token, token_type = "bearer"

2. backend/app/schemas/plan.py
   Implement: PlanCreate, PlanUpdate, PlanOut, PlanSlotPreview
   - PlanCreate: all required fields. subscription_cost_paise and platform_fee_paise
     are integers in paise (document this with Field description)
   - PlanUpdate: all fields Optional
   - PlanOut: includes computed fields slot_cost_paise, user_pays_paise,
     available_slots, occupied_slots. model_config from_attributes=True
   - PlanSlotPreview: id, slot_number, status, user_initials (str | None)

3. backend/app/schemas/slot.py
   Implement: SlotOut, SlotWithPlan, SlotCancelResponse

4. backend/app/schemas/payment.py
   Implement: CreateOrderRequest, CreateOrderResponse, VerifyPaymentRequest, PaymentOut
   - CreateOrderRequest: plan_id (UUID)
   - CreateOrderResponse: payment_id, razorpay_order_id, amount_paise,
     amount_rupees, currency="INR", plan_name, slot_number
   - VerifyPaymentRequest: razorpay_order_id, razorpay_payment_id, razorpay_signature
   - PaymentOut: full payment details including plan name

5. backend/app/schemas/__init__.py
   Export all schema classes.

All schemas use Pydantic v2 syntax (model_config instead of class Config).
No field can be named the same as a Python builtin.

Verify with:
cd backend && python -c "from app.schemas import *; print('All schemas imported OK')"
```

---

### Prompt 06 — Dependencies and service layer foundation

```
Read AGENTS.md.
Read docs/subsplit-api-spec.md Section 11.
Read docs/subsplit-business-logic.md Section 3 and Section 8.

Implement the following files:

1. backend/app/dependencies.py
   Implement exactly as shown in docs/subsplit-api-spec.md Section 11:
   - bearer_scheme = HTTPBearer()
   - get_current_user(credentials, db) -> User
     Decodes JWT, fetches user from DB, raises 401 if invalid or inactive
   - get_current_admin(current_user) -> User
     Calls get_current_user, raises 403 if role != ADMIN

2. backend/app/services/scoring_service.py
   Implement all functions from docs/subsplit-business-logic.md Section 3:
   - get_user_score(db, user_id) -> int
     Uses SQLAlchemy func.least/greatest to compute score from score_events.
     Returns integer in range [0, 100]. Returns 100 if no events exist.
   - create_score_event(db, user_id, event_type, description) -> ScoreEvent
     Always uses SCORE_DELTAS dict for delta. Never hardcodes delta values.
   - get_score_history(db, user_id) -> list[ScoreEvent]
     Returns all events newest first.
   - check_longevity_bonus(db, user) -> None
     Awards +10 one-time bonus if: account >= 90 days old, zero SLOT_REVOKED
     events, no existing ACCOUNT_LONGEVITY event. Idempotent.
   - get_score_tier(score: int) -> str
     Returns "HIGH" (>=75), "MEDIUM" (>=40), "LOW" (<40)

3. backend/app/services/slot_service.py
   Implement the complete slot service from docs/subsplit-business-logic.md Section 8.
   Include all functions:
   - VALID_TRANSITIONS dict
   - get_available_slot(db, plan_id) -> Slot | None
   - get_available_slot_count(db, plan_id) -> int
   - get_occupied_slot_count(db, plan_id) -> int
   - transition_slot(db, slot, new_status, admin_override=False) -> Slot
   - cancel_slot(db, slot) -> Slot
   - admin_revoke_slot(db, slot, reason) -> tuple[Slot, uuid | None]
   - create_plan_slots(db, plan) -> list[Slot]
   - promote_from_waitlist(db, plan_id, slot) -> uuid | None
   - check_and_apply_lapses(db) -> dict
   - get_waitlist_position(db, plan_id, user_id) -> int

4. backend/app/services/payment_service.py
   Implement the complete payment service from docs/subsplit-business-logic.md Section 8.
   Include:
   - get_razorpay_client() -> razorpay.Client
   - create_razorpay_order(db, user, slot, plan) -> Payment
   - verify_and_activate(db, user, razorpay_order_id, razorpay_payment_id,
     razorpay_signature) -> tuple[Payment, Slot]
   HMAC verification must use hmac.compare_digest for timing-safe comparison.

Verify imports:
cd backend && python -c "
from app.dependencies import get_current_user, get_current_admin
from app.services.scoring_service import get_user_score
from app.services.slot_service import promote_from_waitlist
from app.services.payment_service import verify_and_activate
print('All service imports OK')
"
```

---

### Prompt 07 — Seed script

```
Read AGENTS.md and docs/subsplit-database-schema.md Section 11.

Implement the complete seed script at backend/app/seed.py exactly as specified
in the schema doc Section 11.

The seed script must create:
- 1 admin user: admin@subsplit.com / admin123
- 5 regular users with the names, emails, and target SubSplit Scores specified
- Score events for each user to reach their target score
- 7 subscription plans with the exact data from the seed spec
- Correct number of Slot records for each plan (all start AVAILABLE)
- Assign slots 1 and 2 of each plan to demo users 1 and 2 (OCCUPIED)
- Payment records for all assigned slots (SUCCESS status)
- 2 WaitlistEntry records for Netflix Premium (users 3 and 4)
- 6 DemandSignal records with the data from business-logic.md Section 7

The script must:
- Be idempotent-safe: check if admin user already exists before inserting.
  If admin exists, print "Database already seeded." and exit early.
- Wrap everything in a try/except with db.rollback() on failure.
- Print a success summary showing counts of each entity created.
- Be runnable with: cd backend && python -m app.seed

After writing the script, run it:
cd backend && python -m app.seed

Verify the seed worked:
cd backend && python -c "
from app.core.database import SessionLocal
from app.models import User, Plan, Slot
db = SessionLocal()
print('Users:', db.query(User).count())
print('Plans:', db.query(Plan).count())
print('Slots:', db.query(Slot).count())
db.close()
"
Expected: Users: 6, Plans: 7, Slots: 25 (4+6+2+3+6+3+2 = 26 — verify against plan data)
```

---

## Phase 2 — Backend Routes

---

### Prompt 08 — Auth router

```
Read AGENTS.md.
Read docs/subsplit-api-spec.md Section 3 (Auth Endpoints).
Read docs/subsplit-api-spec.md Section 1 (Global Conventions — response envelope).

Implement backend/app/routers/auth.py with these 4 endpoints:

POST /api/auth/register
- Validate UserCreate schema (name, email, password min 8 chars)
- Check email uniqueness — return 409 EMAIL_ALREADY_EXISTS if taken
- Hash password with get_password_hash from core/security.py
- Create User with role=USER
- Create and return JWT token
- Return 201 with user object and token
- Response uses envelope: {"success": true, "data": {...}}

POST /api/auth/login
- Validate UserLogin schema
- Find user by email — return 401 INVALID_CREDENTIALS if not found
- Verify password — return 401 INVALID_CREDENTIALS if wrong
- Check is_active — return 403 ACCOUNT_INACTIVE if false
- Create and return JWT token
- Return 200 with user object and token

GET /api/auth/me
- Requires get_current_user dependency
- Call check_longevity_bonus(db, user) from scoring_service
- Compute subsplit_score using get_user_score(db, user.id)
- Return UserWithScore schema

PUT /api/auth/me
- Requires get_current_user dependency
- Accept optional name field only
- Update and return updated UserWithScore

All error responses must use the exact error codes from
docs/subsplit-api-spec.md Section 12.

Error response format:
{
  "success": false,
  "error": {"code": "ERROR_CODE", "message": "Human readable message"}
}

Register this router in backend/app/main.py:
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

Test with:
cd backend && uvicorn app.main:app --reload &
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"password123"}'
```

---

### Prompt 09 — Plans router

```
Read AGENTS.md.
Read docs/subsplit-api-spec.md Section 4 (Plan Endpoints).
Read docs/subsplit-business-logic.md Section 2 (Pricing Formula).

Implement backend/app/routers/plans.py with these 2 endpoints:

GET /api/plans
- Auth: None required
- Optional query param: category (validates against PlanCategory enum)
- Optional pagination: skip (default 0), limit (default 20, max 100)
- Filter: only return plans where is_active = True
- For each plan, compute and include:
  - slot_cost_paise = subscription_cost_paise // total_slots
  - user_pays_paise = slot_cost_paise + platform_fee_paise
  - slot_cost_rupees, user_pays_rupees (use paise_to_rupees from core/money.py)
  - subscription_cost_rupees, platform_fee_rupees
  - available_slots: COUNT(slots WHERE status=AVAILABLE)
  - occupied_slots: COUNT(slots WHERE status IN (OCCUPIED, GRACE))
- Return 200 with list of plans, total count, skip, limit
- Return 400 INVALID_CATEGORY for invalid category value

GET /api/plans/:id
- Auth: None required
- Return 404 PLAN_NOT_FOUND if plan does not exist
- Return 404 PLAN_INACTIVE if plan is_active=False
- Include all fields from GET /api/plans plus:
  - access_instructions
  - slots array: each slot has id, slot_number, status, user_initials
    user_initials = first letter of first name + first letter of last name
    from the assigned user. Null if slot is AVAILABLE.
    NEVER expose user.id or user.email on this public endpoint.

Register in main.py:
app.include_router(plans.router, prefix="/api/plans", tags=["Plans"])

Test:
curl http://localhost:8000/api/plans
curl http://localhost:8000/api/plans?category=STREAMING
```

---

### Prompt 10 — Slots router

```
Read AGENTS.md.
Read docs/subsplit-api-spec.md Section 5 (Slot Endpoints).

Implement backend/app/routers/slots.py with these 3 endpoints:

GET /api/slots/my
- Auth: get_current_user required
- Optional query param: status (filter by SlotStatus)
- Return all slots where user_id = current_user.id
- Each slot includes nested plan object with:
  name, category, logo_url, user_pays_paise, user_pays_rupees,
  access_instructions
- Return 200 with slots array

GET /api/slots/:id
- Auth: get_current_user required
- Find slot by id
- Return 404 SLOT_NOT_FOUND if not found
- Return 403 FORBIDDEN if slot.user_id != current_user.id
  AND current_user.role != ADMIN
- Include nested plan object and payment_history for this slot
- Return 200

DELETE /api/slots/:id/cancel
- Auth: get_current_user required
- Find slot by id
- Return 404 SLOT_NOT_FOUND if not found
- Return 403 FORBIDDEN if slot.user_id != current_user.id
- Return 409 SLOT_NOT_CANCELLABLE if slot.status != OCCUPIED
- Call slot_service.cancel_slot(db, slot)
  This handles: OCCUPIED→AVAILABLE, clears user_id, runs waitlist promotion
- Return 200 with success message

Register in main.py:
app.include_router(slots.router, prefix="/api/slots", tags=["Slots"])
```

---

### Prompt 11 — Payments router

```
Read AGENTS.md.
Read docs/subsplit-api-spec.md Section 6 (Payment Endpoints).
Read docs/subsplit-business-logic.md Section 5 (Payment Lapse) and Section 8.

Implement backend/app/routers/payments.py with these 3 endpoints:

POST /api/payments/create-order
- Auth: get_current_user required
- Request body: CreateOrderRequest (plan_id: UUID)
- Validate: plan exists and is_active — 404 PLAN_NOT_FOUND
- Find first AVAILABLE slot using slot_service.get_available_slot(db, plan_id)
- If no available slot: 409 PLAN_FULL
- Check user does not already hold an OCCUPIED or GRACE slot on this plan:
  query slots where plan_id=plan_id AND user_id=current_user.id
  AND status IN (OCCUPIED, GRACE) — if exists: 409 ALREADY_SUBSCRIBED
- Call payment_service.create_razorpay_order(db, user, slot, plan)
- Return 201 CreateOrderResponse

POST /api/payments/verify
- Auth: get_current_user required
- Request body: VerifyPaymentRequest
- Call payment_service.verify_and_activate(db, user, order_id, payment_id, signature)
- If ValueError("PAYMENT_NOT_FOUND"): 404
- If ValueError("INVALID_SIGNATURE"): 400
- If ValueError("PAYMENT_ALREADY_PROCESSED"): 409
- On success: return 200 with payment and activated slot details

GET /api/payments/my
- Auth: get_current_user required
- Optional query params: status, skip, limit
- Return all payments for current_user ordered by created_at DESC
- Each payment includes nested plan name and category
- Return 200 with payments array and pagination metadata

Register in main.py:
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])

Test with Razorpay test mode:
After creating an order, the razorpay_order_id should start with "order_"
```

---

### Prompt 12 — Waitlist router

```
Read AGENTS.md.
Read docs/subsplit-api-spec.md Section 7 (Waitlist Endpoints).
Read docs/subsplit-business-logic.md Section 6 (Waitlist Promotion Rules).

Implement backend/app/routers/waitlist.py with these 3 endpoints:

POST /api/waitlist/join
- Auth: get_current_user required
- Request body: { "plan_id": UUID }
- Validate plan exists and is_active — 404 PLAN_NOT_FOUND
- Check available_slots == 0 using slot_service.get_available_slot_count()
  If slots ARE available: 409 SLOTS_AVAILABLE (user should buy directly)
- Check user doesn't already hold a slot on this plan:
  409 ALREADY_SUBSCRIBED
- Check user isn't already on waitlist:
  query waitlist_entries WHERE user_id=current_user.id AND plan_id=plan_id
  AND notified=False — if exists: 409 ALREADY_ON_WAITLIST
- Create WaitlistEntry record
- Compute queue_position using slot_service.get_waitlist_position()
- Return 201 with entry details and queue_position

DELETE /api/waitlist/leave/:planId
- Auth: get_current_user required
- Find entry where user_id=current_user.id AND plan_id=planId AND notified=False
- 404 WAITLIST_ENTRY_NOT_FOUND if not found
- Delete the entry
- Return 200

GET /api/waitlist/my
- Auth: get_current_user required
- Return all waitlist entries for current_user where notified=False
- Each entry includes nested plan object and computed queue_position
- queue_position is computed for each entry using get_waitlist_position()
- Return 200

Register in main.py:
app.include_router(waitlist.router, prefix="/api/waitlist", tags=["Waitlist"])
```

---

### Prompt 13 — Score router

```
Read AGENTS.md.
Read docs/subsplit-api-spec.md Section 8 (SubSplit Score Endpoints).
Read docs/subsplit-business-logic.md Section 3 (SubSplit Score Algorithm).

Implement backend/app/routers/scores.py with 1 endpoint:

GET /api/scores/my
- Auth: get_current_user required
- Compute current score using scoring_service.get_user_score(db, user.id)
- Fetch full event history using scoring_service.get_score_history(db, user.id)
- Compute score_breakdown:
  {
    "base": 100,
    "total_delta": sum of all deltas,
    "final_score": clamped score
  }
- Return 200 with:
  {
    "success": true,
    "data": {
      "subsplit_score": int,
      "score_breakdown": { base, total_delta, final_score },
      "events": [{ id, event_type, delta, description, created_at }]
    }
  }

Register in main.py:
app.include_router(scores.router, prefix="/api/scores", tags=["SubSplit Score"])
```

---

### Prompt 14 — Admin router

```
Read AGENTS.md.
Read docs/subsplit-api-spec.md Section 9 (Admin Endpoints).
Read docs/subsplit-business-logic.md Sections 7 and 8.

Implement backend/app/routers/admin.py with all admin endpoints.
ALL endpoints in this router require get_current_admin dependency.

GET /api/admin/dashboard
- Compute metrics:
  - total_monthly_revenue_paise: SUM(user_pays_paise) for all OCCUPIED+GRACE slots
  - platform_fee_earned_paise: SUM(platform_fee_paise) for all OCCUPIED+GRACE slots
  - total_slots, occupied_slots, available_slots, utilization_percentage
  - total_users: COUNT(users WHERE role=USER)
  - new_users_this_month: COUNT(users created in current calendar month)
  - grace_period_slots: COUNT(slots WHERE status=GRACE)
  - at_risk_users: users whose computed score < 40
- plans_summary: all plans with per-plan revenue, margin, utilization
- at_risk_slots: all GRACE slots with user details and score
- Return all monetary values in both paise and rupees

POST /api/admin/plans
- Request body: PlanCreate schema
- Create Plan record
- Call slot_service.create_plan_slots(db, plan) to create all slot records
- Wrap in transaction: if slot creation fails, roll back plan creation
- Return 201 with full plan details

GET /api/admin/plans
- Return ALL plans including inactive
- Support filtering by is_active, category
- Include full cost/margin data

GET /api/admin/plans/:id
- Return plan with all slot details and slot holders
- Include waitlist_count

PUT /api/admin/plans/:id
- Accept PlanUpdate schema (all optional fields)
- Do NOT allow changing total_slots, subscription_cost_paise, or category
- Return updated plan

POST /api/admin/slots/:id/revoke
- Request body: { "reason": string }
- Validate slot status is OCCUPIED or GRACE — 409 SLOT_NOT_REVOKABLE
- Call slot_service.admin_revoke_slot(db, slot, reason)
- Return 200 with revocation result

GET /api/admin/users
- Support filtering by role, score_max (users with score <= this value)
- Include computed subsplit_score for each user
- Support pagination

GET /api/admin/users/:id
- Full user profile with active_slots, score_events, payment_history

PATCH /api/admin/users/:id/deactivate
- Set user.is_active = False
- Return 200

GET /api/admin/analytics
- Call all analytics computation functions from business-logic.md Section 7:
  - get_revenue_by_category(db)
  - get_slot_utilization_by_category(db)
  - users by category
  - revenue_trend: read from seeded data or compute from payment records
  - score_distribution: get_score_distribution(db)
  - demand_signals: read all DemandSignal records ordered by request_count DESC
  - recent_activity: last 10 score_events with user and plan details
- Return full analytics response as specified in api-spec.md Section 9

POST /api/admin/slots/check-lapses
- Trigger slot_service.check_and_apply_lapses(db)
- Return summary of changes made

GET /api/admin/waitlist/:planId
- Return waitlist for plan sorted by score DESC, joined_at ASC
- Include queue position for each entry

Register in main.py:
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

After implementing all admin routes, verify the full API is working:
cd backend && uvicorn app.main:app --reload
Open http://localhost:8000/docs and verify all 28 API operations appear.
```

---

## Phase 3 — Frontend

---

### Prompt 15 — Frontend project setup

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Section 1 (Global Rules) and Section 7 (Design System
from prd.md).

Set up the complete React + Vite + TypeScript frontend for SubSplit inside /frontend.

Steps:

1. Create Vite project:
   npm create vite@latest frontend -- --template react-ts
   cd frontend

2. Install all dependencies:
   npm install react-router-dom@6 @tanstack/react-query axios zustand
   npm install react-hook-form @hookform/resolvers zod
   npm install recharts framer-motion lucide-react
   npm install next-themes
   npm install -D tailwindcss postcss autoprefixer
   npm install -D @types/node

3. Install and initialize shadcn/ui:
   npx shadcn@latest init
   When prompted: choose Default style, use CSS variables: yes

4. Install required shadcn components:
   npx shadcn@latest add button input label card dialog alert-dialog
   npx shadcn@latest add tabs table badge skeleton switch
   npx shadcn@latest add dropdown-menu sheet sonner checkbox
   npx shadcn@latest add tooltip progress

5. Create tailwind.config.ts with the exact design tokens from
   docs/subsplit-ui-spec.md Section 1 and docs/subsplit-prd.md Section 7.7:
   - Brand violet: #6C47FF as primary
   - Font: Inter
   - Border radius scale: sm=4px, md=8px, lg=12px, xl=16px
   - darkMode: ['class']

6. Update src/index.css with CSS variables for both light and dark themes
   as specified in docs/subsplit-prd.md Section 7:
   :root { --primary: 258 100% 64%; --background: 0 0% 98%; etc. }
   .dark { --background: 240 10% 4%; --card: 240 5% 11%; etc. }

7. Add Inter font: update index.html to include Google Fonts link for Inter.

8. Create frontend/.env:
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id

9. Create src/lib/utils.ts with:
   - cn() helper (clsx + tailwind-merge)
   - formatDate(dateStr) -> string (en-IN locale)
   - formatRelativeTime(dateStr) -> string
   - paise_to_rupees(paise) -> number
   - formatRupees(paise) -> string (₹ prefix, en-IN locale)

10. Verify setup:
    npm run dev
    Should open at http://localhost:5173 with no errors.
```

---

### Prompt 16 — TypeScript types, Zustand store, and Axios client

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Section 15 (API Integration Layer).

Implement the data layer for the SubSplit frontend.

1. src/types/index.ts
   Implement all TypeScript interfaces exactly as specified in
   docs/subsplit-ui-spec.md Section 15:
   Plan, PlanDetail, SlotPreview, Slot, SlotStatus, Payment,
   WaitlistEntry, User, ScoreEvent.
   Include all fields. Use exact field names matching the API responses.

2. src/store/authStore.ts
   Implement Zustand store with persist middleware exactly as specified in
   docs/subsplit-ui-spec.md Section 12:
   - State: user (User | null), token (string | null)
   - Actions: setAuth(user, token), clearAuth()
   - Computed: isAuthenticated() -> boolean, isAdmin() -> boolean
   - Persist key: 'subsplit-auth'

3. src/api/client.ts
   Implement Axios client exactly as specified in docs/subsplit-ui-spec.md Section 15:
   - Base URL from import.meta.env.VITE_API_BASE_URL
   - Request interceptor: attach Bearer token from authStore
   - Response interceptor: on 401, call clearAuth() and redirect to /login
   - Export getErrorMessage(error) helper that extracts error.message from
     the API error envelope

4. src/api/auth.ts
   - login(email, password) -> { user, access_token }
   - register(name, email, password) -> { user, access_token }
   - getMe() -> UserWithScore
   - updateMe(name) -> UserWithScore

5. src/api/plans.ts
   - getPlans(category?) -> { plans, total, skip, limit }
   - getPlan(id) -> PlanDetail

6. src/api/slots.ts
   - getMySlots(status?) -> { slots }
   - getSlot(id) -> SlotDetail
   - cancelSlot(id) -> void

7. src/api/payments.ts
   - createOrder(planId) -> CreateOrderResponse
   - verifyPayment(orderId, paymentId, signature) -> { payment, slot }
   - getMyPayments(status?) -> { payments, total }

8. src/api/waitlist.ts
   - joinWaitlist(planId) -> WaitlistEntry
   - leaveWaitlist(planId) -> void
   - getMyWaitlist() -> { waitlist_entries }

9. src/api/scores.ts
   - getMyScore() -> { subsplit_score, score_breakdown, events }

10. src/api/admin.ts
    - getAdminDashboard() -> AdminDashboard
    - createPlan(data) -> Plan
    - updatePlan(id, data) -> Plan
    - getAdminPlans(filters?) -> { plans }
    - getAdminPlan(id) -> AdminPlanDetail
    - revokeSlot(id, reason) -> void
    - getAdminUsers(filters?) -> { users }
    - getAdminUser(id) -> AdminUserDetail
    - deactivateUser(id) -> void
    - getAnalytics() -> AnalyticsData
    - checkLapses() -> LapseResult
    - getPlanWaitlist(planId) -> { waitlist }

Verify no TypeScript errors:
npm run build
```

---

### Prompt 17 — App routing and layout shell

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Section 14 (Routing) and Section 2 (Layout Shell).

1. src/main.tsx
   Wrap app with:
   - QueryClientProvider (TanStack Query)
   - ThemeProvider from next-themes (attribute="class", defaultTheme="system",
     enableSystem=true)
   - Toaster from sonner (position="top-right", richColors=true)

2. src/App.tsx
   Implement complete routing exactly as specified in
   docs/subsplit-ui-spec.md Section 14:
   - ProtectedRoute component: checks isAuthenticated(), redirects to /login
   - AdminRoute component: checks isAuthenticated() AND isAdmin(),
     redirects to /login or /dashboard
   - All routes as specified:
     / → HomePage
     /plans → BrowsePlansPage
     /plans/:id → PlanDetailPage
     /login → LoginPage
     /signup → SignupPage
     /dashboard → ProtectedRoute > DashboardPage
     /admin → AdminRoute > AdminPage
     /admin/analytics → AdminRoute > AdminAnalyticsPage
     /admin/plans/:id → AdminRoute > AdminPlanDetailPage
     * → redirect to /
   - Create placeholder page components for all pages (just return a div with
     the page name — real implementation comes in later prompts)

3. src/components/layout/Navbar.tsx
   Implement exactly as specified in docs/subsplit-ui-spec.md Section 2:
   - Height: 56px fixed, bg-background/80 backdrop-blur-sm border-b border-border
   - Left: SubSplit wordmark ("Sub" + "Split" in text-primary)
   - Center (desktop): Browse plans, How it works links
   - Right unauthenticated: ThemeToggle, Log in, Get started
   - Right authenticated (USER): ThemeToggle, avatar dropdown with Dashboard,
     Account settings, Log out
   - Right authenticated (ADMIN): Same but dropdown includes Admin dashboard,
     Analytics
   - Mobile: logo + hamburger → Sheet with all links
   Use useAuthStore() to determine auth state.

4. src/components/layout/Footer.tsx
   Implement as specified in docs/subsplit-ui-spec.md Section 2.
   Hidden on /admin/* routes (use useLocation() to check).

5. src/components/ui/ThemeToggle.tsx
   Implement Sun/Moon crossfade toggle as specified in
   docs/subsplit-ui-spec.md Section 12.

6. src/components/layout/AppShell.tsx
   Wrap Navbar + {children} + Footer.
   Admin pages use AdminShell (Navbar replaced by AdminSidebar).

7. src/components/admin/AdminSidebar.tsx
   Fixed 220px left sidebar with links:
   Dashboard → /admin
   Plans → /admin/plans (links to dashboard for MVP)
   Users → /admin/users (links to dashboard for MVP)
   Analytics → /admin/analytics
   Active link: bg-primary/10 text-primary font-medium
   Bottom: user name + Log out button

Verify the app renders with routing:
npm run dev → open http://localhost:5173
Navigate to /login, /plans — should show placeholder pages.
```

---

### Prompt 18 — Shared components

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Section 1 (Global Rules) and Section 12 (Shared Components).

Implement all shared components used across multiple pages.

1. src/components/plans/SlotDot.tsx
   Props: filled (boolean), className? (string)
   Filled: bg-primary, Empty: bg-muted border border-border
   Shape: w-2.5 h-2.5 rounded-sm (square dots — NOT circles)

2. src/components/ui/StatusBadge.tsx
   Props: status (string)
   Map all statuses to their exact class combinations from
   docs/subsplit-ui-spec.md Section 1:
   ACTIVE/OCCUPIED/SUCCESS: bg-success/10 text-success border-success/20
   GRACE/PENDING/WARNING: bg-warning/10 text-warning border-warning/20
   REVOKED/FAILED: bg-destructive/10 text-destructive border-destructive/20
   AVAILABLE: bg-muted text-muted-foreground border-border
   STREAMING: bg-primary/10 text-primary border-primary/20
   EDUCATION: bg-blue-500/10 text-blue-600 border-blue-500/20
   GAMING: bg-purple-500/10 text-purple-600 border-purple-500/20
   PRODUCTIVITY: bg-orange-500/10 text-orange-600 border-orange-500/20
   MUSIC: bg-green-500/10 text-green-600 border-green-500/20
   Base classes: text-xs font-medium px-2 py-0.5 rounded border inline-flex items-center

3. src/components/plans/PlanCardSkeleton.tsx
   Props: count (number, default 6)
   Renders count skeleton cards in the same grid as PlanCard.
   Use shadcn Skeleton component.
   Match the PlanCard layout: badge, title, slot dots, price, button.

4. src/components/ui/ErrorState.tsx
   Props: message? (string), onRetry? (() => void)
   Centered error display with retry button.

5. src/components/ui/EmptyState.tsx
   Props: icon (LucideIcon), title, description, action? ({label, onClick})
   Centered empty state with icon circle, title, description, optional CTA button.

6. src/hooks/useAuth.ts
   Custom hook that wraps useAuthStore.
   Returns: user, token, isAuthenticated, isAdmin, setAuth, clearAuth.

7. src/hooks/usePlans.ts
   TanStack Query hook:
   - usePlans(category?) → useQuery(['plans', category], () => getPlans(category))
   - usePlan(id) → useQuery(['plan', id], () => getPlan(id))
   staleTime: 2 minutes

8. src/hooks/useSlots.ts
   - useMySlots(status?) → useQuery
   - useCancelSlot() → useMutation with onSuccess invalidating ['slots']

9. src/hooks/usePayments.ts
   - useMyPayments() → useQuery
   - useCreateOrder() → useMutation
   - useVerifyPayment() → useMutation with onSuccess invalidating ['slots']

10. src/hooks/useWaitlist.ts
    - useMyWaitlist() → useQuery
    - useJoinWaitlist() → useMutation
    - useLeaveWaitlist() → useMutation

11. src/hooks/useScore.ts
    - useMyScore() → useQuery(['score'], getMyScore)

All mutations show toast.success on success and toast.error on error.
Use getErrorMessage() from api/client.ts for error messages.
```

---

### Prompt 19 — Homepage

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Section 3 (Homepage) fully.
Read docs/subsplit-prd.md Section 7 (Design System) for color tokens.

Implement src/pages/HomePage.tsx with all 5 sections.

CRITICAL: Follow all rules from docs/subsplit-ui-spec.md Section 1.
Never use bg-white, text-gray-*, bg-gray-*. Only semantic tokens.

Section 1 — Hero (py-20 md:py-28, centered):
- Eyebrow: "Subscription sharing, reimagined" in text-primary uppercase tracking-widest
- Headline: "Pay only for the <span text-primary>slot</span> you use."
  text-5xl md:text-6xl font-bold tracking-tight
- Subheadline: text-base text-muted-foreground max-w-xl mx-auto
- Two CTA buttons: "Browse plans" (primary) → /plans,
  "See my savings" (outline) → smooth scroll to #savings-calculator
- Trust row: 3 items with checkmarks: "SubSplit-owned accounts",
  "Instant slot access", "Cancel anytime"

Section 2 — How it works (id="how-it-works"):
- Heading + 3-column card grid
- Step 1: Browse plans, Step 2: Pick your slot, Step 3: Get instant access
- Each card: numbered circle (bg-primary/10 text-primary), title, description

Section 3 — Savings Calculator (id="savings-calculator"):
Implement src/components/plans/SavingsCalculator.tsx:
- Hardcoded subscription list (no API call):
  Netflix ₹649/₹199, Spotify ₹179/₹49, Amazon ₹299/₹99,
  Adobe ₹4230/₹1499, Microsoft ₹489/₹119, Coursera ₹3800/₹999, Xbox ₹499/₹169
- Checkbox list with solo prices shown
- Live calculation: solo annual, SubSplit annual, savings, percentage
- Savings number wrapped in framer-motion AnimatePresence for count-up on change
- Savings percentage pill: bg-success/10 text-success
- "Start saving" CTA → /signup

Section 4 — Featured plans preview:
- Heading: "Most popular plans"
- Fetch first 3 plans using usePlans() hook
- Show PlanCard components (implement PlanCard in this prompt — see Section 5 spec)
- "Browse all plans →" button → /plans

Section 5 — Trust section (bg-muted/30):
- 4-card 2x2 grid: "We own every account", "Transparent pricing",
  "Slot guarantee", "Trust score system"

PlanCard component (src/components/plans/PlanCard.tsx):
Implement exactly as specified in docs/subsplit-ui-spec.md Section 4.
- bg-card border border-border rounded-lg relative overflow-hidden
- 3px violet accent bar at top: absolute top-0 left-0 right-0 h-[3px] bg-primary
- Category badge (StatusBadge), uptime dot + percentage
- Plan name, SlotDot grid, "X of Y slots available" text
- Price: text-2xl font-bold tabular-nums text-foreground
- Savings chip: bg-success/10 text-success
- "Get this slot" button (primary) or "Join waitlist" (outline) based on available_slots
- Full card click → /plans/:id
- hover:ring-1 hover:ring-border transition-all

Loading state: show 6 PlanCardSkeleton components
Error state: show ErrorState component
```

---

### Prompt 20 — Browse plans page

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Section 4 (Browse Plans Page) fully.

Implement src/pages/BrowsePlansPage.tsx.

Layout:
- AppShell wrapper
- Page heading: "Browse subscription plans"
- Subtitle: "All plans are SubSplit-owned. Your slot is guaranteed."
- CategoryFilter component
- Plans grid

CategoryFilter (src/components/plans/CategoryFilter.tsx):
- Pills: All · Streaming · Education · Gaming · Productivity · Music
- Active pill: bg-primary text-primary-foreground border-primary
- Inactive pill: bg-card text-muted-foreground border-border hover:border-primary/50
- Single selection only
- State: selectedCategory (local useState, "ALL" by default)

Plans grid:
- grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5
- Use usePlans(selectedCategory) hook
- Loading: 6 PlanCardSkeleton
- Error: ErrorState with refetch
- Empty: EmptyState with Search icon, "No plans in this category",
  button to reset to "ALL"
- Render: PlanCard for each plan (already implemented in Prompt 19)

Page behavior:
- Category filter changes trigger re-fetch with new category param
- URL does not need to update on filter change (local state is fine)
- Plans load without authentication
```

---

### Prompt 21 — Plan detail and checkout

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Section 5 (Plan Detail + Checkout) fully.

Implement src/pages/PlanDetailPage.tsx.

Route: /plans/:id
Fetch plan using usePlan(id) from usePlans hook.

Two-column layout (desktop):
Left col (lg:col-span-2): plan info
Right col (lg:col-span-1): sticky checkout card

Left column components:

1. Plan header: logo placeholder (first letter in bg-primary/10 circle), name,
   category badge, uptime indicator

2. SlotGrid (src/components/plans/SlotGrid.tsx):
   - Grid of slot tiles (4 columns)
   - AVAILABLE slot: dashed border, Plus icon, "Open" text
   - OCCUPIED slot: solid border bg-primary/5, user initials circle, "Slot N"
   - "X of Y slots available" text below grid

3. Plan description card

4. Access instructions card (only shown if user holds a slot on this plan —
   check by calling useMySlots() and matching plan_id)

Right column — CheckoutCard (src/components/plans/CheckoutCard.tsx):
Implement the pricing breakdown exactly as specified:
  "[Plan name] ([N] total slots)"
  "Subscription cost: ₹XXX/mo"
  "÷ Your slot cost: ₹XXX/mo"
  "SubSplit platform fee: + ₹XX"
  [divider]
  "You pay: ₹XXX/mo" (large, bold)

Savings chip below breakdown.

CTA logic:
- If available_slots > 0 and user is authenticated: "Get this slot" → opens PaymentModal
- If available_slots > 0 and user is NOT authenticated: "Get this slot" → /login?redirect=/plans/:id
- If available_slots == 0: "Join waitlist" → opens waitlist modal if authenticated,
  else redirects to login

3 trust badges: Shield (Secure payment), Zap (Instant access), X (Cancel anytime)

PaymentModal (src/components/plans/PaymentModal.tsx):
shadcn Dialog:
- Shows plan name, slot number, total amount
- "Pay ₹{amount}" button with loading spinner
- On click:
  1. Call createOrder(plan.id) mutation
  2. On success: open Razorpay checkout with:
     key: import.meta.env.VITE_RAZORPAY_KEY_ID
     amount: order.amount_paise
     order_id: order.razorpay_order_id
     theme: { color: "#6C47FF" }
  3. In Razorpay handler callback: call verifyPayment mutation
  4. On verify success: show success screen, navigate to /dashboard
  5. On any error: toast.error, keep modal open

Add Razorpay script to index.html:
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>

Declare window.Razorpay type in a .d.ts file.

Success screen (inside modal after payment):
CheckCircle2 icon in bg-success/10 circle, "Slot activated!" heading,
description, "Go to dashboard" button.

Waitlist modal: simple Dialog confirming join, shows queue position after joining.
```

---

### Prompt 22 — Login and signup pages

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Sections 6 and 7 (Login and Signup).

Implement both auth pages.

1. src/pages/LoginPage.tsx
   Route: /login
   Redirect to /dashboard if already authenticated (check isAuthenticated()).

   Layout: centered card max-w-sm mx-auto, bg-card border border-border rounded-xl p-8

   Content:
   - SubSplit wordmark (centered, text-xl font-bold)
   - "Welcome back" heading (text-2xl font-semibold)
   - "Log in to your SubSplit account" (text-sm text-muted-foreground)
   - Email Input with Label, error display below
   - Password Input with show/hide toggle (Eye/EyeOff icons)
   - "Forgot password?" link (right-aligned, non-functional, just renders)
   - "Log in" Button (full width, primary)
   - Divider line with "or" text
   - Google button (outline, full width, disabled with opacity-50, tooltip "Coming soon")
   - "Don't have an account? Sign up" link → /signup

   Zod schema:
   email: z.string().email("Enter a valid email address")
   password: z.string().min(1, "Password is required")

   Form behavior:
   - Use React Hook Form + zodResolver
   - On submit: call login mutation from useAuth hook
   - Loading: button shows Loader2 spinner, disabled
   - Success: setAuth(user, token) in Zustand, redirect to ?redirect param or /dashboard
   - Error: toast.error with server error message

2. src/pages/SignupPage.tsx
   Route: /signup
   Same centered card layout as login.

   Additional fields: name (first), confirm password (last)

   Password strength indicator below password field:
   - 3-segment bar: red (weak < 8 chars), amber (medium: 8+ with numbers),
     green (strong: 12+ with special char)
   - Show only when password field has value

   Zod schema:
   name: z.string().min(1).max(100)
   email: z.string().email()
   password: z.string().min(8, "Minimum 8 characters")
   confirmPassword: z.string()
   .refine((data) => data.password === data.confirmPassword, {
     message: "Passwords do not match",
     path: ["confirmPassword"]
   })

   On success: setAuth, redirect to /dashboard
```

---

### Prompt 23 — User dashboard

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Section 8 (User Dashboard) fully.

Implement src/pages/DashboardPage.tsx.
Route: /dashboard (ProtectedRoute)

Layout:
- Page heading row: "My dashboard" + "Welcome back, {user.name}"
- Score ring + quick stats row
- shadcn Tabs: Active subscriptions | Payment history | Waitlist

1. ScoreRing (src/components/dashboard/ScoreRing.tsx):
   - Fetch score using useMyScore() hook
   - SVG circular progress ring (80x80, -rotate-90):
     Background circle: text-muted stroke
     Progress arc: strokeDasharray calculated from score/100 * 201
     Color: score>=75 text-success, score>=40 text-warning, else text-destructive
   - Score number centered inside ring
   - Below ring: label "SubSplit Score", description based on tier
   - "How is this calculated?" link → opens Dialog explaining the scoring system

   Dialog content:
   "ON_TIME_PAYMENT +5 points — payment before expiry"
   "LATE_PAYMENT -5 points — payment during grace period"
   "SLOT_REVOKED -20 points — slot lost to non-payment"
   "ACCOUNT_LONGEVITY +10 points — 90 days with no revocations (one time)"

   Quick stats (3 cards):
   - Active slots: count of OCCUPIED slots from useMySlots()
   - Member since: formatDate(user.created_at)
   - SubSplit Score: number with tier badge

2. Tab 1 — Active subscriptions:
   Fetch with useMySlots()
   Loading: 2 skeleton cards
   Empty: EmptyState (Package icon, "No active subscriptions", "Browse plans" button)

   ActiveSlotCard (src/components/dashboard/ActiveSlotCard.tsx):
   Implement exactly as specified in docs/subsplit-ui-spec.md Section 8.
   Include:
   - Plan logo placeholder (letter in rounded square)
   - Plan name, category badge, status badge, slot number
   - Since date, Renews date (amber if GRACE), Monthly price
   - GRACE warning banner (bg-warning/10 border-warning/20)
   - "Access details" button (toggles collapsible showing access_instructions)
   - "Cancel slot" button (opens AlertDialog)

   Warning banner logic (from business-logic.md Section 5):
   - If status=GRACE: "Grace period — N days to renew before losing your slot"
   - If expires within 3 days: "Renews in N days"

   Cancel AlertDialog:
   "Cancel your slot?"
   "Your slot will be released immediately. No refund for current month."
   Buttons: "Keep my slot" | "Yes, cancel slot" (bg-destructive)
   On confirm: useCancelSlot() mutation → toast.success → invalidate slots query

3. Tab 2 — Payment history:
   Fetch with useMyPayments()
   shadcn Table: Date | Plan | Amount | Status
   Use StatusBadge for status column
   Empty: "No payment history yet."

4. Tab 3 — Waitlist:
   Fetch with useMyWaitlist()
   Each entry: plan logo, name, "Position #{position}", "Joined {date}"
   "Leave" button → useLeaveWaitlist() mutation → toast → invalidate waitlist
   Empty: "You are not waiting for any plans."
```

---

### Prompt 24 — Admin dashboard

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Section 9 (Admin Dashboard) fully.

Implement src/pages/AdminPage.tsx.
Route: /admin (AdminRoute)

Use AdminShell (sidebar layout) instead of AppShell.

Fetch data using: useQuery(['adminDashboard'], getAdminDashboard)

1. Top metric cards (grid-cols-2 lg:grid-cols-4):
   Monthly revenue (₹ formatted), Slot utilization (X/Y), Total users, Platform fee earned
   Each shows delta text below the main value.
   Loading: 4 skeleton metric cards

2. Plans table (shadcn Table in a card):
   Columns: Plan | Category | Slots | Utilization | Price/slot | Revenue | Status | Actions
   - Mini utilization bar (div with bg-primary fill at utilization%)
   - Status column: shadcn Switch for is_active toggle
     On change: call updatePlan(id, { is_active: !current }) mutation
   - Actions: "Manage" button → /admin/plans/:id

   "Add plan" button (top right of table card):
   Opens AddPlanDialog.

3. AddPlanDialog (src/components/admin/AddPlanDialog.tsx):
   shadcn Dialog with form:
   Fields: name, category (Select), description (Textarea), logo_url (optional),
   total_slots (number), subscription_cost_rupees (number — converted to paise on submit),
   platform_fee_rupees (number), access_instructions (Textarea)

   Live pricing preview (updates as user types cost/slots/fee):
   "Slot cost: ₹{cost/slots}/mo"
   "+ Platform fee: ₹{fee}/mo"
   "User pays: ₹{cost/slots + fee}/mo"

   On submit: createPlan({ ...data, subscription_cost_paise: rupees_to_paise(cost),
   platform_fee_paise: rupees_to_paise(fee) })
   Success: close dialog, invalidate plans query, toast.success("Plan created with N slots.")

4. At-risk slots panel (right column):
   Heading: "Slots needing attention"
   List each GRACE slot: user name, plan name, status badge, score
   Empty: "All slots are healthy."

5. Quick actions row:
   "Check lapses" button → calls checkLapses() mutation → shows result toast
   with count of slots moved to grace and slots revoked.
```

---

### Prompt 25 — Admin analytics page

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Section 10 (Admin Analytics) fully.
Read docs/subsplit-business-logic.md Section 7 (Demand Signals) for data shapes.

Implement src/pages/AdminAnalyticsPage.tsx.
Route: /admin/analytics (AdminRoute)
Fetch: useQuery(['adminAnalytics'], getAnalytics)

Layout (all sections full-width, stacked):

1. Top metric cards — same 4 as dashboard (reuse MetricCard component)

2. Two-column grid: Revenue chart (left) | Trend chart (right)

   RevenueByCategory (src/components/admin/RevenueByCategory.tsx):
   - Tab switcher: Revenue | Utilization | Users
   - Recharts BarChart (layout="vertical", horizontal bars)
   - Category on Y axis, value on X axis
   - Bar fill: var(--primary) via stroke hex #6C47FF
   - Tooltip styled with bg-card, border-border, border-radius 8px

   RevenueTrend (src/components/admin/RevenueTrend.tsx):
   - Last 6 months bar chart (vertical bars)
   - Latest month bar: full opacity, others: 40% opacity
   - Y axis formatted as ₹Xk
   - Tooltip shows full ₹ amount

3. DemandSignals (src/components/admin/DemandSignals.tsx):
   Full-width card. Heading + subheading.
   grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4

   Each demand card:
   - Service name, category badge, request count (top right, text-primary font-bold)
   - Horizontal progress bar (width = request_count / max_request_count * 100%)
   - "Est. margin: ₹{margin}/slot/mo"
   - "Add plan" button (outline):
     On click: set local added=true state for that card
     Button changes to "Queued" with CheckCircle2 icon, disabled
     (UI-only state for demo — no API call)

4. Two-column grid: Score distribution (left) | Recent activity (right)

   Score distribution: 3 colored cards (success/warning/destructive)
   Each shows count and range label.

   Recent activity (shadcn Table):
   Columns: User | Action | Score | Time
   User column: avatar initials circle + name
   Score column: StatusBadge based on tier
   Time: formatRelativeTime()
```

---

### Prompt 26 — Admin plan detail page

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Section 11 (Admin Plan Management) fully.

Implement src/pages/AdminPlanDetailPage.tsx.
Route: /admin/plans/:id (AdminRoute)
Fetch: useQuery(['adminPlan', id], () => getAdminPlan(id))

Layout:
- Back link: "← Admin dashboard" → /admin
- Plan header: name, category badge, active/inactive Switch
- Two columns: Slot grid (left) | Plan settings form (right)
- Waitlist section (full width below)

1. Admin slot grid (grid-cols-2 md:grid-cols-4):
   Each slot tile is larger than the public view. Shows full user details.
   Implement exactly as specified in docs/subsplit-ui-spec.md Section 11.

   AVAILABLE slot: dashed border bg-muted/20, "Available" text
   OCCUPIED slot: bg-primary/5 border-primary/30
     Shows: user name, user email, SubSplit Score, expiry date
     "Revoke slot" button (text-destructive, ghost variant)
   GRACE slot: bg-warning/5 border-warning/30
     Same as OCCUPIED but with warning styling
   REVOKED slot: bg-destructive/5 border-destructive/30

   Revoke button opens AlertDialog:
   "Revoke this slot?"
   "{user.name}'s slot will be revoked. Score -20. Next waitlisted user promoted."
   Input for reason (optional)
   On confirm: call revokeSlot(slot.id, reason) mutation
   Success: toast, invalidate plan query

2. Plan settings form (right column):
   Pre-filled with current plan values.
   Editable fields: name, description, logo_url, platform_fee (in ₹),
   access_instructions, uptime_percentage, is_active
   NOT editable: category, total_slots, subscription_cost (show as read-only)
   "Save changes" button → updatePlan(id, changes) mutation

3. Waitlist table:
   Heading: "Waitlist ({total_waiting} waiting)"
   shadcn Table: Position | User | Email | Score | Joined
   Position column: text-primary font-bold "#1", "#2" etc.
   Score column: StatusBadge colored by tier
   Empty: "No one is waiting for this plan."
```

---

### Prompt 27 — Final integration and polish

```
Read AGENTS.md.
Read docs/subsplit-ui-spec.md Section 13 (State Patterns).

Perform final integration, polish, and verification across the whole project.

Backend tasks:
1. Verify all 28 API operations are registered in main.py and appear in Swagger UI.
   Open http://localhost:8000/docs — screenshot or list all endpoints.

2. Test the complete payment flow end-to-end using Razorpay test mode:
   - Register a new user
   - Browse plans
   - Create an order for Netflix Premium
   - Complete with test card: 4111 1111 1111 1111, any future expiry, any CVV
   - Verify slot is OCCUPIED and payment is SUCCESS in the database

3. Test SubSplit Score:
   - Log in as karan@example.com (score should be ~38)
   - Verify GET /api/scores/my returns score < 40

4. Test admin flow:
   - Log in as admin@subsplit.com
   - Create a new plan via POST /api/admin/plans
   - Verify slots are auto-created
   - Trigger lapse check via POST /api/admin/slots/check-lapses

Frontend tasks:
5. Verify dark mode works on EVERY page:
   Toggle theme on each page. No element should show bg-white or text-gray in dark mode.
   If any hardcoded colors are found, replace with semantic tokens.

6. Verify all loading states:
   Temporarily add artificial delay to API calls and verify skeletons show correctly
   on: browse plans, plan detail, dashboard, admin dashboard, analytics.

7. Verify all empty states:
   - Dashboard with no subscriptions
   - Waitlist tab with no entries
   - Browse plans with a category that has no plans

8. Verify protected routes:
   - Visiting /dashboard while logged out → redirects to /login
   - Visiting /admin as a regular user → redirects to /dashboard
   - Visiting /admin as admin → works correctly

9. Add page titles to each page using document.title:
   Homepage: "SubSplit — Pay only for the slot you use"
   Browse: "Browse Plans — SubSplit"
   Plan detail: "{plan.name} — SubSplit"
   Dashboard: "My Dashboard — SubSplit"
   Admin: "Admin Dashboard — SubSplit"
   Analytics: "Analytics — SubSplit"

10. Final README.md at repo root:
    Create a comprehensive README with:
    - Project description and tech stack
    - Prerequisites (PostgreSQL 16, Python 3.11+, Node 18+)
    - Backend setup steps (venv, pip install, .env setup, migrate, seed, run)
    - Frontend setup steps (npm install, .env setup, npm run dev)
    - Demo credentials
    - API documentation link (http://localhost:8000/docs)
    - Brief description of each key feature
```

---

## Quick reference — Prompt to file mapping

| Prompt | Files created |
|---|---|
| 01 | backend/ folder structure, requirements.txt, main.py skeleton |
| 02 | core/config.py, core/database.py, core/money.py, core/security.py |
| 03 | All 8 model files + models/__init__.py |
| 04 | alembic/env.py, first migration, tables created |
| 05 | All 4 schema files + schemas/__init__.py |
| 06 | dependencies.py, scoring_service.py, slot_service.py, payment_service.py |
| 07 | app/seed.py — run to populate database |
| 08 | routers/auth.py |
| 09 | routers/plans.py |
| 10 | routers/slots.py |
| 11 | routers/payments.py |
| 12 | routers/waitlist.py |
| 13 | routers/scores.py |
| 14 | routers/admin.py |
| 15 | frontend/ project, tailwind config, index.css, utils.ts |
| 16 | types/index.ts, authStore.ts, api/client.ts, all api/*.ts files |
| 17 | App.tsx, Navbar, Footer, ThemeToggle, AppShell, AdminSidebar |
| 18 | SlotDot, StatusBadge, PlanCardSkeleton, ErrorState, EmptyState, all hooks |
| 19 | HomePage.tsx, PlanCard.tsx, SavingsCalculator.tsx |
| 20 | BrowsePlansPage.tsx, CategoryFilter.tsx |
| 21 | PlanDetailPage.tsx, SlotGrid.tsx, CheckoutCard.tsx, PaymentModal.tsx |
| 22 | LoginPage.tsx, SignupPage.tsx |
| 23 | DashboardPage.tsx, ScoreRing.tsx, ActiveSlotCard.tsx |
| 24 | AdminPage.tsx, AddPlanDialog.tsx |
| 25 | AdminAnalyticsPage.tsx, RevenueByCategory.tsx, RevenueTrend.tsx, DemandSignals.tsx |
| 26 | AdminPlanDetailPage.tsx |
| 27 | Integration testing, dark mode audit, README.md |

**Total: 27 prompts. Build time estimate: 8–12 hours of focused Codex sessions.**

---

*End of Codex Prompt Sequence — SubSplit v1.0 MVP*
