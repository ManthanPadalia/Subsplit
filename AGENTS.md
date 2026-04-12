# AGENTS.md — SubSplit

You are building **SubSplit**, a subscription sharing platform where the platform
itself buys subscription plans and sells individual slots to users.

This file is your navigation guide. Read it fully before doing anything.
Then open only the specific doc listed for your current task.

---

## Project structure

```
subsplit/
├── AGENTS.md              ← you are here
├── docs/
│   ├── subsplit-prd.md               ← Doc 1: what we are building
│   ├── subsplit-database-schema.md   ← Doc 2: all models, enums, seed script
│   ├── subsplit-api-spec.md          ← Doc 3: every endpoint, request, response
│   ├── subsplit-ui-spec.md           ← Doc 4: every page, component, interaction
│   └── subsplit-business-logic.md    ← Doc 5: pricing, scoring, state machine
├── backend/               ← FastAPI + PostgreSQL
└── frontend/              ← React 18 + Vite + TypeScript
```

---

## Tech stack (do not deviate)

| Layer | Stack |
|---|---|
| Backend | FastAPI, PostgreSQL 16, SQLAlchemy 2.x, Pydantic v2, Alembic |
| Auth | python-jose (JWT HS256), passlib + bcrypt |
| Payments | Razorpay Python SDK (test mode only) |
| Frontend | React 18, TypeScript, Vite, React Router v6 |
| Styling | Tailwind CSS v3 + shadcn/ui |
| State | TanStack Query v5 (server state), Zustand (auth) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Animation | Framer Motion |
| Theme | next-themes (light/dark) |
| Icons | Lucide React |
| HTTP | Axios |

---

## Non-negotiable rules

These rules apply to every single file you write. Never break them.

### Backend rules
1. All monetary values stored as **integers in paise**. Never store floats.
   Use `//` integer division for slot cost: `slot_cost = subscription_cost // total_slots`.
2. Never store plain text passwords. Always use `passlib.context.CryptContext` with bcrypt.
3. All protected endpoints use the `get_current_user` dependency from `app/dependencies.py`.
4. All admin endpoints use the `get_current_admin` dependency from `app/dependencies.py`.
5. All API responses follow the envelope: `{ "success": true, "data": {...} }`.
6. All error responses use the codes defined in Doc 3 Section 12 exactly.
7. Never perform slot state transitions without going through `slot_service.transition_slot()`.
8. All database access uses the `get_db` dependency — never create a session manually in a router.
9. Every monetary response field appears in both units: `amount_paise` AND `amount_rupees`.

### Frontend rules
1. **Never use hardcoded Tailwind color classes.** Only use CSS variable-based semantic tokens:
   `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`,
   `border-border`, `bg-primary`, `text-primary`. Raw classes like `bg-white`,
   `text-gray-600`, `bg-gray-50` break dark mode and are forbidden.
2. Card elevation uses border only — never `shadow-*` classes.
   Pattern: `bg-card border border-border rounded-lg p-4`.
3. All API calls go through `src/api/client.ts` (Axios instance with JWT interceptor).
   Never use `fetch()` directly.
4. All server state uses TanStack Query. Never use `useEffect` + `useState` for API calls.
5. All forms use React Hook Form + Zod. Never use uncontrolled inputs.
6. Protected routes use `<ProtectedRoute>` wrapper. Admin routes use `<AdminRoute>` wrapper.
   Both are defined in `src/App.tsx`.
7. The brand accent bar on plan cards is: `<div className="absolute top-0 left-0 right-0 h-[3px] bg-primary rounded-t-lg" />`.
8. Slot availability dots use square shape (`rounded-sm`), not circles.

---

## Doc navigation — open only what you need

| Task | Open this doc | Relevant sections |
|---|---|---|
| Understanding what to build | `docs/subsplit-prd.md` | All |
| Creating/modifying any SQLAlchemy model | `docs/subsplit-database-schema.md` | §3, §6, §7 |
| Creating Pydantic schemas | `docs/subsplit-database-schema.md` | §8 |
| Setting up Alembic | `docs/subsplit-database-schema.md` | §9 |
| Database connection setup | `docs/subsplit-database-schema.md` | §10 |
| Running seed data | `docs/subsplit-database-schema.md` | §11 |
| Building any API route/router | `docs/subsplit-api-spec.md` | §3–§9 |
| Setting up `main.py` | `docs/subsplit-api-spec.md` | §10 |
| Setting up `dependencies.py` / JWT | `docs/subsplit-api-spec.md` | §11 |
| Looking up error codes | `docs/subsplit-api-spec.md` | §12 |
| Building any frontend page | `docs/subsplit-ui-spec.md` | Section for that page |
| Building shared components | `docs/subsplit-ui-spec.md` | §12 |
| Setting up routing + auth guards | `docs/subsplit-ui-spec.md` | §14 |
| Setting up Axios client + stores | `docs/subsplit-ui-spec.md` | §15 |
| Implementing pricing formula | `docs/subsplit-business-logic.md` | §1, §2 |
| Implementing SubSplit Score | `docs/subsplit-business-logic.md` | §3 |
| Implementing slot state machine | `docs/subsplit-business-logic.md` | §4 |
| Implementing payment lapse logic | `docs/subsplit-business-logic.md` | §5 |
| Implementing waitlist promotion | `docs/subsplit-business-logic.md` | §6 |
| Implementing admin analytics | `docs/subsplit-business-logic.md` | §7 |
| Implementing service layer files | `docs/subsplit-business-logic.md` | §8 |

---

## Build order

Always build in this sequence. Never skip ahead.

```
Phase 1 — Foundation
  1.  Backend project setup (FastAPI app, folder structure, requirements.txt)
  2.  Database connection (core/database.py, core/config.py, .env)
  3.  SQLAlchemy models (all 6 models + base)
  4.  Alembic init + first migration
  5.  Pydantic schemas
  6.  Security utilities (core/security.py — JWT + bcrypt)
  7.  Dependencies (dependencies.py — get_current_user, get_current_admin)
  8.  Seed script + run it

Phase 2 — Backend routes
  9.  Auth router (register, login, me)
  10. Plans router (GET /plans, GET /plans/:id)
  11. Service layer (slot_service.py, scoring_service.py, payment_service.py)
  12. Slots router (GET /slots/my, GET /slots/:id, DELETE /slots/:id/cancel)
  13. Payments router (create-order, verify, GET /payments/my)
  14. Waitlist router (join, leave, my)
  15. Score router (GET /scores/my)
  16. Admin router (dashboard, plans CRUD, slots, users, analytics)

Phase 3 — Frontend
  17. Vite + React project setup (tailwind, shadcn init, next-themes, router)
  18. Tailwind config (design tokens — colors, fonts, radius)
  19. CSS variables (index.css — light + dark theme vars)
  20. Zustand auth store + Axios client
  21. TypeScript types (src/types/index.ts)
  22. App.tsx routing + ProtectedRoute + AdminRoute
  23. Shared components (Navbar, Footer, ThemeToggle, SlotDot, StatusBadge)
  24. Homepage (hero, how it works, savings calculator, featured plans)
  25. Browse plans page + PlanCard component
  26. Plan detail page + CheckoutCard + PaymentModal
  27. Login page + Signup page
  28. User dashboard (ScoreRing, ActiveSlotCard, PaymentHistory, WaitlistTab)
  29. Admin dashboard (metrics, plans table, at-risk slots)
  30. Admin analytics page (charts, demand signals, score distribution)
  31. Admin plan detail page (slot grid, revoke, waitlist table)
```

---

## Key decisions already made — do not re-decide these

- **Monetary storage:** paise (integers). Display in rupees. Never change this.
- **Score storage:** never stored. Always computed from `score_events` table via SUM.
- **Slot state machine:** enforced in `slot_service.py`. Routers never change slot status directly.
- **Payment flow:** create-order → Razorpay modal → verify (HMAC) → activate slot.
- **Waitlist sort:** SubSplit Score DESC, joined_at ASC. Higher score = earlier position.
- **Grace period:** exactly 3 days after `slot.expires_at`. Not 72 hours from notification.
- **Admin revocation:** skips GRACE, goes directly to AVAILABLE. Score -20 fires immediately.
- **Theme:** next-themes, `attribute="class"` on `<html>`. Default = system preference.
- **CORS:** backend allows `http://localhost:5173` only.
- **Auth token:** stored in Zustand with `persist` middleware (localStorage). Expires 24h.
- **No email sending in MVP.** Notifications stored in DB only (`waitlist_entries.notified`).
- **No deployment.** Local dev only. Backend on port 8000, frontend on port 5173.

---

## Folder conventions

### Backend (`backend/app/`)
- `models/` — SQLAlchemy ORM models only. No business logic here.
- `schemas/` — Pydantic request/response models only. No DB queries here.
- `routers/` — Route handlers only. Call services, never implement logic directly.
- `services/` — All business logic lives here. Routers call services.
- `core/` — Config, database connection, security utilities.
- `dependencies.py` — FastAPI dependency functions only.

### Frontend (`frontend/src/`)
- `api/` — Axios functions only. One file per domain (plans, slots, payments).
- `components/ui/` — shadcn base components only. Do not modify these.
- `components/plans/` — Plan-related components (PlanCard, SlotGrid, CheckoutCard).
- `components/dashboard/` — User dashboard components.
- `components/admin/` — Admin-specific components.
- `pages/` — Page-level components only. No inline business logic.
- `hooks/` — Custom React hooks (usePlans, useSlots, useAuth).
- `store/` — Zustand stores only.
- `types/` — TypeScript interfaces only. No logic.
- `lib/utils.ts` — Pure utility functions (cn, formatDate, formatRupees).

---

## Environment variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://subsplit_user:subsplit_password@localhost:5432/subsplit_db
SECRET_KEY=your-super-secret-jwt-key-minimum-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Frontend (`frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

Both `.env` files are gitignored. Never commit secrets.

---

## Demo credentials (after seed script runs)

```
Admin:  admin@subsplit.com  /  admin123
User 1: arjun@example.com  /  password123   (score: 90)
User 2: priya@example.com  /  password123   (score: 75)
User 3: karan@example.com  /  password123   (score: 38 — at risk)
User 4: neha@example.com   /  password123   (score: 55)
User 5: vivek@example.com  /  password123   (score: 88)
```

---

## When you are unsure

1. Check the relevant doc section listed in the navigation table above.
2. If the doc covers it — implement exactly as specified.
3. If the doc does not cover it — ask before implementing.
4. Never invent business logic. Never guess at state transitions.
5. Never add features not listed in `docs/subsplit-prd.md` Section 8.

## Skills

Additional guidance is in `.agents/skills/`. Read the relevant skill file
before each task as listed below. Never read all skills at once — only open
the one relevant to your current task.

| Task | Skill file to read |
|---|---|
| Any shadcn component (Button, Dialog, Table, Tabs etc.) | `.agents/skills/shadcn/SKILL.md` |
| Any frontend page or component | `.agents/skills/frontend-design/SKILL.md` |
| Any TypeScript types, interfaces, or generics | `.agents/skills/typescript-advanced-types/SKILL.md` |
| Any API route or REST endpoint design | `.agents/skills/api-design-principles/SKILL.md` |
| Any SQLAlchemy query or database operation | `.agents/skills/python-performance-optimization/SKILL.md` |
| Something is broken and needs debugging | `.agents/skills/systematic-debugging/SKILL.md` |
| Before claiming any task is complete | `.agents/skills/verification-before-completion/SKILL.md` |
| Final polish pass — only after Prompt 27 | `.agents/skills/polish/SKILL.md` |
| Final integration testing — Prompt 27 only | `.agents/skills/webapp-testing/SKILL.md` |