# SubSplit — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Final — MVP  
**Project Type:** College Major Project  
**Last Updated:** April 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution](#3-solution)
4. [Target Audience](#4-target-audience)
5. [User Roles](#5-user-roles)
6. [Tech Stack](#6-tech-stack)
7. [Design System](#7-design-system)
8. [Feature List with Acceptance Criteria](#8-feature-list-with-acceptance-criteria)
9. [User Flows](#9-user-flows)
10. [Business Logic Rules](#10-business-logic-rules)
11. [Out of Scope for MVP](#11-out-of-scope-for-mvp)
12. [Success Metrics](#12-success-metrics)
13. [Constraints and Assumptions](#13-constraints-and-assumptions)

---

## 1. Project Overview

**Product Name:** SubSplit  
**Tagline:** Pay only for the slot you use.

SubSplit is a subscription sharing platform where the **platform itself** (SubSplit) purchases subscription plans and sells individual slots to users. Unlike traditional subscription sharing platforms where random users share their personal accounts (which is untrustworthy and often violates terms of service), SubSplit acts as the verified account holder, guaranteeing access, uptime, and a consistent user experience.

Users pay a per-slot price (the subscription cost divided by available slots) plus a fixed SubSplit platform fee. They get a real, working slot on a platform they want — at a fraction of the full subscription cost.

---

## 2. Problem Statement

### The old way (broken)
- User-to-user subscription sharing platforms rely on random people sharing their personal account credentials.
- Buyers have no guarantee the account won't be password-changed, banned, or revoked.
- Sellers could disappear at any time leaving buyers without access and no refund.
- This model violates most subscription service Terms of Service, creating legal and ethical risk for users.

### The gap in the market
- People want affordable access to streaming, education, gaming, productivity, and music platforms.
- The cost of owning individual subscriptions to Netflix + Spotify + Adobe CC + Microsoft 365 + Coursera adds up to thousands of rupees per month.
- No trustworthy, platform-owned sharing solution exists at an accessible price point.

---

## 3. Solution

SubSplit solves the trust problem by removing the middleman user entirely.

- SubSplit purchases verified subscription plans directly from service providers.
- SubSplit divides the plan into slots equal to the number of users the plan supports.
- Users purchase a slot — they never share credentials with another random user.
- SubSplit manages all access, renewals, and slot assignments centrally.
- If a slot lapses, SubSplit reassigns it from a waitlist, ensuring no slot goes to waste.

### Pricing formula
```
User pays = (Full subscription cost ÷ Total slots) + SubSplit platform fee
```

**Example — Netflix Premium (₹649/mo, 4 slots):**
```
₹649 ÷ 4 = ₹162.25 (slot cost)
₹162.25 + ₹37 (platform fee) = ₹199/mo per user
SubSplit earns: ₹37 × 4 = ₹148/mo per plan
```

---

## 4. Target Audience

SubSplit targets all demographics globally with an initial focus on cost-conscious digital consumers.

| Segment | Why they use SubSplit |
|---|---|
| Students and young adults | Maximum savings on entertainment and education platforms |
| Working professionals | Access to productivity tools like Adobe CC and Microsoft 365 at low cost |
| Families | Affordable access to streaming and music for each family member individually |
| Gamers | Xbox Game Pass and PlayStation Plus at slot prices |
| Lifelong learners | Coursera Plus and Udemy at a fraction of individual cost |

**Geography:** Global from launch, with pricing in INR for the MVP demo.

---

## 5. User Roles

### 5.1 Guest (unauthenticated user)
- Can view the homepage.
- Can browse available subscription plans and categories.
- Can use the savings calculator.
- Can view plan detail pages including slot availability and pricing breakdown.
- Cannot purchase a slot or join a waitlist.
- Clicking any purchase or waitlist action redirects to login/signup.

### 5.2 User (authenticated)
- Can do everything a Guest can.
- Can purchase a slot on any available plan.
- Can join the waitlist for fully occupied plans.
- Can view their active subscriptions and slot access details.
- Can view their payment history.
- Has a SubSplit Score (0–100) that reflects payment reliability.
- Can manage their account settings.
- Can cancel an active slot subscription.

### 5.3 Admin (platform administrator)
- Separate login from the user login.
- Can create, edit, activate, and deactivate subscription plans.
- Can manage slots — assign, revoke, and view slot holders.
- Can set and update the SubSplit platform fee per plan.
- Can view the full user list with SubSplit Scores and statuses.
- Can view the admin analytics dashboard.
- Can see demand signals and decide which new plans to add.
- Can view revenue, cost, and margin per plan.
- Has access to a full audit trail of slot changes and payments.

---

## 6. Tech Stack

### Backend
| Tool | Version | Purpose |
|---|---|---|
| FastAPI | Latest | REST API framework, auto Swagger UI docs |
| PostgreSQL | 16 | Primary relational database |
| SQLAlchemy | 2.x | ORM for database queries and model definitions |
| Pydantic | v2 | Request/response validation and serialization |
| Alembic | Latest | Database schema migrations |
| python-jose | Latest | JWT token generation and verification |
| passlib + bcrypt | Latest | Password hashing |
| Razorpay Python SDK | Latest | Payment order creation and verification (demo mode) |
| python-dotenv | Latest | Environment variable management |
| Ruff | Latest | Python linter (replaces flake8 + isort) |
| Uvicorn | Latest | ASGI server to run FastAPI |

### Frontend
| Tool | Version | Purpose |
|---|---|---|
| React | 18 | UI component framework |
| TypeScript | 5.x | Type safety across the frontend |
| Vite | Latest | Dev server and build tool |
| React Router | v6 | Client-side routing and protected routes |
| Tailwind CSS | v3 | Utility-first styling |
| shadcn/ui | Latest | Pre-built accessible components |
| TanStack Query | v5 | Server state management, caching, loading/error states |
| Axios | Latest | HTTP client for API calls |
| Zustand | Latest | Global client state (auth session, user data) |
| React Hook Form | Latest | Form state management |
| Zod | Latest | Client-side schema validation |
| Recharts | Latest | Admin analytics charts |
| Framer Motion | Latest | Page transitions and micro-animations |
| Lucide React | Latest | Icon library |
| next-themes | Latest | Dark/light theme management |

### Database and Storage
| Tool | Purpose |
|---|---|
| PostgreSQL 16 (local) | Run locally during development and demo |
| pgAdmin 4 | Visual database browser for development |
| Alembic | Version-controlled schema migrations |

### Dev Tooling
| Tool | Purpose |
|---|---|
| ESLint + Prettier | Frontend code linting and formatting |
| Husky | Pre-commit hooks — runs lint before every commit |
| Ruff | Backend Python linting |
| VS Code | Primary IDE |
| GitHub | Version control — mono-repo structure |

### Repository Structure
```
subsplit/                        ← mono-repo root
├── .husky/
│   └── pre-commit
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── plan.py
│   │   │   ├── slot.py
│   │   │   ├── payment.py
│   │   │   └── waitlist.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── plan.py
│   │   │   ├── slot.py
│   │   │   └── payment.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── plans.py
│   │   │   ├── slots.py
│   │   │   ├── payments.py
│   │   │   ├── waitlist.py
│   │   │   └── admin.py
│   │   ├── services/
│   │   │   ├── slot_service.py
│   │   │   ├── scoring_service.py
│   │   │   └── payment_service.py
│   │   └── dependencies.py
│   ├── alembic/
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env
│   └── ruff.toml
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── plans/
│   │   │   ├── dashboard/
│   │   │   └── admin/
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── BrowsePlansPage.tsx
│   │   │   ├── PlanDetailPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── AdminPage.tsx
│   │   │   └── AdminAnalyticsPage.tsx
│   │   ├── hooks/
│   │   ├── store/
│   │   │   └── authStore.ts
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── plans.ts
│   │   │   ├── slots.ts
│   │   │   └── payments.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── lib/
│   │       └── utils.ts
│   ├── .eslintrc.json
│   ├── .prettierrc
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

---

## 7. Design System

### 7.1 Theme
- The application supports **both light and dark themes**.
- Theme is toggled via a Sun/Moon button in the navbar.
- Default theme reads from the user's OS preference (`prefers-color-scheme`).
- Theme preference is persisted to `localStorage` via `next-themes`.
- Implementation: `next-themes` with `attribute="class"` applied to the `<html>` element.

### 7.2 Color Palette

#### Brand Colors
| Token | Light Mode Value | Dark Mode Value | Usage |
|---|---|---|---|
| `--primary` | `#6C47FF` (violet) | `#6C47FF` (unchanged) | CTAs, brand accents, active states |
| `--primary-light` | `#F4F1FF` | `#2E1065` | Badges, tinted backgrounds |
| `--background` | `#F9FAFB` | `#09090B` | Page background |
| `--card` | `#FFFFFF` | `#18181B` | Card backgrounds |
| `--foreground` | `#0A0A0A` | `#FAFAFA` | Primary text |
| `--muted-foreground` | `#6B7280` | `#A1A1AA` | Secondary text, labels |
| `--border` | `#E5E7EB` | `#27272A` | All borders |
| `--muted` | `#F3F4F6` | `#27272A` | Muted backgrounds |

#### Semantic Colors
| Token | Value | Usage |
|---|---|---|
| Success | `#16A34A` | Active slots, successful payments |
| Success light | `#F0FDF4` / `#052E16` (dark) | Success badges |
| Warning | `#D97706` | Grace period status |
| Warning light | `#FEF9C3` / `#422006` (dark) | Warning badges |
| Danger | `#DC2626` | Revoked slots, failed payments |
| Danger light | `#FEF2F2` / `#450A0A` (dark) | Danger badges |

### 7.3 Typography
- **Font Family:** Inter (loaded from Google Fonts)
- **Rule:** Never use hardcoded color values in components. Always use CSS variable-based Tailwind classes.

| Style | Size | Weight | Usage |
|---|---|---|---|
| Display | 48px | 700 | Hero headlines |
| H1 | 24px | 600 | Page titles |
| H2 | 18px | 600 | Section headings |
| H3 | 16px | 600 | Card titles |
| Body | 14px | 400 | General content |
| Small | 12px | 400 | Captions, metadata |
| Label | 11px | 500 | Uppercase metric labels |
| Price | 28px | 700 | Price display (tabular nums) |

### 7.4 Border Radius Scale
| Token | Value | Usage |
|---|---|---|
| `rounded-sm` | 4px | Badges, status chips |
| `rounded-md` | 8px | Buttons, inputs |
| `rounded-lg` | 12px | Cards |
| `rounded-xl` | 16px | Modals, sheets |
| `rounded-full` | 9999px | Pills, avatars |

### 7.5 Elevation
- Cards use **border** for elevation, never box-shadow.
- Default card: `border border-border` (0.5px)
- Hover card: `border-2 border-border`
- Selected/featured card: `border-2 border-primary`

### 7.6 Critical Dark Mode Rule
**Every Tailwind class that applies a color must use a CSS variable-based semantic class.** Never use raw color classes like `bg-white`, `text-gray-600`, or `bg-gray-100`. These break in dark mode.

**Correct:** `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`  
**Incorrect:** `bg-white`, `bg-gray-50`, `text-gray-700`, `border-gray-200`

### 7.7 Tailwind Config (`tailwind.config.ts`)
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6C47FF',
          light: '#F4F1FF',
        },
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
}

export default config
```

---

## 8. Feature List with Acceptance Criteria

---

### Feature 1 — User Authentication

**Description:** Users can register, log in, and log out. Admins have a separate protected login.

**Acceptance Criteria:**

- [ ] User can register with name, email, and password.
- [ ] Password is hashed using bcrypt before storage. Plain text passwords are never stored.
- [ ] User can log in with email and password and receive a JWT access token.
- [ ] JWT token is stored in the Zustand auth store and sent as a Bearer token on all authenticated requests.
- [ ] Token expires after 24 hours. Expired token redirects user to login.
- [ ] Protected routes (`/dashboard`, `/admin`) redirect unauthenticated users to `/login`.
- [ ] Admin routes (`/admin/*`) are accessible only to users with `role = ADMIN`. Non-admins are redirected to `/dashboard`.
- [ ] User can log out. Logging out clears the JWT from the store and redirects to homepage.
- [ ] Login and signup forms show inline validation errors (empty fields, invalid email format, password too short).
- [ ] Signup shows a password strength indicator (weak / medium / strong).

---

### Feature 2 — Browse Plans (Public)

**Description:** Any visitor can browse all active subscription plans without logging in.

**Acceptance Criteria:**

- [ ] Homepage displays a category filter row with options: All, Streaming, Education, Gaming, Productivity, Music.
- [ ] Clicking a category filters the plan cards to show only plans in that category.
- [ ] Each plan card displays: platform name, category badge, slot availability grid (visual dots — filled = taken, empty = available), price per slot per month, and uptime badge.
- [ ] Slot grid uses square dots. Violet dots = occupied slots. Gray dots = available slots.
- [ ] If a plan has 0 available slots, the card shows "Waitlist" instead of "Get this slot".
- [ ] Plans are fetched from `GET /api/plans` and displayed using TanStack Query.
- [ ] A loading skeleton is shown while plans are being fetched.
- [ ] If no plans match the selected category, an empty state message is shown.
- [ ] Clicking a plan card navigates to the plan detail page at `/plans/:id`.

---

### Feature 3 — Savings Calculator (Public Homepage)

**Description:** An interactive calculator on the homepage that shows users how much they save annually by using SubSplit vs buying subscriptions individually.

**Acceptance Criteria:**

- [ ] Calculator displays a list of available subscriptions with checkboxes.
- [ ] Each subscription shows its individual monthly cost next to the checkbox.
- [ ] When a user checks a subscription, the calculator updates in real time.
- [ ] Calculator displays three values: solo annual cost, SubSplit annual cost, and total annual savings.
- [ ] Savings percentage is calculated and displayed.
- [ ] All number updates animate smoothly (number count-up animation).
- [ ] Calculator is fully functional without login.
- [ ] A "Start saving" CTA button below the calculator redirects to signup.
- [ ] Calculator data is hardcoded on the frontend (does not require an API call).

---

### Feature 4 — Plan Detail Page

**Description:** A detailed page for each subscription plan showing all information needed to make a purchase decision.

**Acceptance Criteria:**

- [ ] Page is accessible at `/plans/:id`.
- [ ] Left section displays: plan logo/name, category badge, description, slot grid visualization (each slot shown as a numbered block — occupied slots show initials placeholder, available slots show a "+" icon), uptime percentage for last 30 days, and what access the user will get.
- [ ] Right section (sticky on desktop) displays the transparent pricing breakdown:
  ```
  [Plan name] ([N] total slots)
  ──────────────────────────────
  Subscription cost     ₹XXX/mo
  ÷ Your slot cost      ₹XXX/mo
  SubSplit platform fee + ₹XX
  ──────────────────────────────
  You pay               ₹XXX/mo
  ```
- [ ] "Get this slot" button is shown if slots are available.
- [ ] "Join waitlist" button is shown if no slots are available, along with the current waitlist count.
- [ ] Clicking "Get this slot" while unauthenticated redirects to login, then returns to this page after login.
- [ ] Clicking "Get this slot" while authenticated opens the payment flow.
- [ ] Page fetches plan data from `GET /api/plans/:id`.

---

### Feature 5 — Slot Purchase and Payment

**Description:** Authenticated users can purchase a slot on an available plan using Razorpay (demo mode).

**Acceptance Criteria:**

- [ ] On clicking "Get this slot", a payment confirmation modal appears showing the pricing breakdown and total.
- [ ] On confirming, the frontend calls `POST /api/payments/create-order` which creates a Razorpay order and returns an `order_id`.
- [ ] The Razorpay checkout modal opens using the returned `order_id`.
- [ ] In demo/test mode, any test card number completes the payment.
- [ ] On successful payment, Razorpay returns `payment_id` and `signature` to the frontend.
- [ ] Frontend calls `POST /api/payments/verify` with `order_id`, `payment_id`, and `signature`.
- [ ] Backend verifies the Razorpay signature. If valid, the slot status is set to `OCCUPIED` and assigned to the user.
- [ ] A success screen is shown with access instructions for the purchased subscription.
- [ ] If payment fails, an error message is shown and no slot is assigned.
- [ ] Payment record is created in the database with status `SUCCESS` or `FAILED`.
- [ ] SubSplit Score is updated on successful payment (`+5` points).

---

### Feature 6 — User Dashboard

**Description:** The authenticated user's personal control panel showing all active subscriptions, payment history, and waitlist positions.

**Acceptance Criteria:**

- [ ] Dashboard is accessible at `/dashboard` and requires authentication.
- [ ] Top section shows: user's name, avatar initials, and SubSplit Score as a circular progress ring (0–100, color-coded: green ≥ 75, amber 40–74, red < 40).
- [ ] Tooltip on the score ring explains what the score means and how it is calculated.
- [ ] "Active subscriptions" section shows a card for each slot the user holds.
- [ ] Each active subscription card shows: platform logo placeholder, plan name, category badge, slot status badge (Active / Grace Period / Revoked), renewal date, and an "Access details" expandable section.
- [ ] "Access details" shows how to access that subscription (instructions stored per plan in the database).
- [ ] "Payment history" section shows a table with columns: date, plan name, amount, status badge (Success / Failed / Pending).
- [ ] "Waitlist" section shows plans the user is waiting for, their queue position, and a "Leave waitlist" button.
- [ ] Empty state is shown with a CTA to browse plans if the user has no active subscriptions.
- [ ] All data is fetched via TanStack Query from the relevant API endpoints.

---

### Feature 7 — SubSplit Score

**Description:** A trust score (0–100) assigned to every user that reflects their payment reliability. It is used to prioritize waitlist position.

**Acceptance Criteria:**

- [ ] Every new user starts with a SubSplit Score of `100`.
- [ ] Score is displayed on the user dashboard as a circular progress ring.
- [ ] Score events are logged in the `ScoreEvent` table with type, delta, and timestamp.
- [ ] Score is recalculated as: `base (100) + sum of all deltas`, clamped between 0 and 100.

**Score delta rules:**
| Event | Delta |
|---|---|
| On-time payment (slot renewed successfully) | +5 |
| Payment made during grace period | -5 |
| Slot revoked due to non-payment | -20 |
| Account older than 90 days with no issues | +10 (one-time) |

- [ ] Waitlist position is sorted by SubSplit Score descending (higher score = earlier position).
- [ ] Admin can see each user's score and score history in the user management section.

---

### Feature 8 — Waitlist System

**Description:** When a plan is fully occupied, users can join a waitlist. When a slot becomes available, the highest-scoring waitlisted user is automatically promoted.

**Acceptance Criteria:**

- [ ] "Join waitlist" button appears on the plan detail page when `available_slots = 0`.
- [ ] Clicking "Join waitlist" calls `POST /api/waitlist/join` with the plan ID.
- [ ] A user cannot join the same waitlist twice. The button shows "On waitlist" if already joined.
- [ ] When a slot is revoked or a user cancels, the slot status is set to `AVAILABLE`.
- [ ] The backend automatically finds the top waitlisted user for that plan (highest SubSplit Score, earliest join date as tiebreaker).
- [ ] The promoted waitlist user's slot is set to `OCCUPIED` and they are notified (notification stored in the database; email is out of scope for MVP).
- [ ] The user can see their waitlist position on their dashboard.
- [ ] The user can leave a waitlist via `DELETE /api/waitlist/leave/:planId`.

---

### Feature 9 — Payment Lapse Handling

**Description:** A multi-stage system that handles what happens when a user's slot payment lapses.

**Acceptance Criteria:**

- [ ] Three days before a slot expires, the slot status changes to `EXPIRING_SOON`. (Status is checked via a background mechanism or manually triggered in demo.)
- [ ] When a slot's `expires_at` date passes without renewal, the slot status changes to `GRACE`.
- [ ] During the grace period (3 days), the user retains access. Their SubSplit Score is decremented by 5.
- [ ] If the user does not renew within the grace period, the slot status changes to `REVOKED`.
- [ ] On revocation, the user's SubSplit Score is decremented by 20.
- [ ] The slot is then returned to `AVAILABLE` and the waitlist promotion logic runs.
- [ ] Admin can see all slots in GRACE and REVOKED status on the admin dashboard.
- [ ] Admin can manually revoke a slot from the manage slots panel.

---

### Feature 10 — Admin Dashboard

**Description:** The admin's overview panel showing platform-wide health metrics.

**Acceptance Criteria:**

- [ ] Accessible at `/admin` and restricted to users with `role = ADMIN`.
- [ ] Top metric cards show: total monthly revenue, active slots (occupied / total), total registered users, and total platform fee earned.
- [ ] Below metrics: a table of all subscription plans with columns — plan name, category, total slots, occupied slots, slot price, platform fee, monthly revenue from that plan, and status (Active / Inactive).
- [ ] Admin can toggle a plan's active status from this table.
- [ ] Below plan table: a list of users in GRACE or at-risk status (SubSplit Score < 40).
- [ ] Clicking on a plan row navigates to the slot management view for that plan.

---

### Feature 11 — Admin Plan Management

**Description:** Admin can create new subscription plans and manage existing ones.

**Acceptance Criteria:**

- [ ] Admin can create a new plan via a form with fields: name, category (dropdown), description, logo URL, total slots, monthly subscription cost (what SubSplit pays), and platform fee (what SubSplit charges on top).
- [ ] The slot price per user is automatically calculated and displayed in the form: `(monthly cost ÷ total slots) + platform fee`.
- [ ] Admin can edit all fields of an existing plan.
- [ ] Admin can deactivate a plan (hides it from public browse, does not delete it).
- [ ] When a plan is created, the correct number of `Slot` records are created in the database with status `AVAILABLE`.

---

### Feature 12 — Admin Slot Management

**Description:** Admin can view and manage individual slots for each plan.

**Acceptance Criteria:**

- [ ] Admin can view all slots for a plan: slot number, assigned user (name + email), status, assigned date, and expiry date.
- [ ] Admin can manually revoke any slot. Revocation triggers the waitlist promotion logic.
- [ ] Admin can view slot history — who has held a particular slot over time.
- [ ] Slot statuses are color-coded: green = OCCUPIED, gray = AVAILABLE, amber = GRACE, red = REVOKED.

---

### Feature 13 — Admin Analytics Page

**Description:** A data-rich analytics page that helps the admin understand platform performance and make informed decisions about which new subscriptions to add.

**Acceptance Criteria:**

- [ ] Accessible at `/admin/analytics`.
- [ ] Top row: four metric cards — monthly revenue, slot utilization rate, total users, platform fee earned.
- [ ] Revenue by category chart: horizontal bar chart showing revenue broken down by Streaming, Education, Gaming, Productivity, Music. Tab switcher to toggle between Revenue, Slot Utilization, and User Count views.
- [ ] Revenue trend chart: bar chart showing last 6 months of total revenue (data seeded in the database for demo).
- [ ] **Demand signals section:** A grid of cards showing subscription services users have requested (data seeded for demo). Each card shows: service name, category, number of requests, estimated margin per slot, and an "Add plan" button. Clicking "Add plan" marks it as queued (UI state only for demo).
- [ ] SubSplit Score distribution: three stat cards showing count of High (75–100), Medium (40–74), and Low (0–39) score users.
- [ ] Recent user activity table: shows last 10 user actions (slot purchase, payment, slot lapse) with user avatar initials, name, action, and SubSplit Score badge.

---

## 9. User Flows

### 9.1 New User Purchase Flow
```
Homepage → Browse plans → View plan detail → Sign up → 
Slot checkout (pricing breakdown) → Razorpay payment → 
Payment success → Slot activated → Dashboard (active subscription shown)
```

### 9.2 Returning User Flow
```
Login → Dashboard → View active subscriptions → 
Access details (how to use the slot)
```

### 9.3 Slot Full Flow
```
Browse plans → View plan detail → Plan is full → 
Join waitlist → Dashboard (waitlist position shown) → 
[Slot becomes available] → Notified → Slot auto-assigned
```

### 9.4 Payment Lapse Flow
```
Slot expires → Grace period begins (3 days) → 
Score -5 → [No payment] → Slot revoked → Score -20 → 
Slot available → Waitlist user promoted
```

### 9.5 Admin Add Plan Flow
```
Admin login → Admin dashboard → Add new plan → 
Fill form (name, category, slots, cost, fee) → 
Plan created → Slots auto-generated → Plan visible on public browse
```

---

## 10. Business Logic Rules

### 10.1 Slot Pricing Formula
```python
slot_price = round(subscription_cost / total_slots, 2)
user_pays = slot_price + platform_fee
```
- All monetary values stored in the database as integers in paise (₹1 = 100 paise) to avoid floating point errors.
- Displayed to users in rupees with 2 decimal places.

### 10.2 SubSplit Score Rules
- Score is clamped between 0 and 100 at all times.
- Score is recalculated from the `ScoreEvent` table on every read, not stored as a mutable field.
- Wait list is sorted: `ORDER BY subsplit_score DESC, joined_at ASC` (score descending, join date ascending as tiebreaker).

### 10.3 Slot Status State Machine
```
AVAILABLE → OCCUPIED (on purchase)
OCCUPIED  → GRACE (on payment lapse)
GRACE     → OCCUPIED (on late payment)
GRACE     → REVOKED (on grace period expiry)
REVOKED   → AVAILABLE (after waitlist promotion check)
AVAILABLE ← OCCUPIED (on user cancellation)
```

### 10.4 Razorpay Integration (Demo Mode)
- Use Razorpay test API keys.
- Backend creates an order via `razorpay.order.create()`.
- Frontend opens Razorpay checkout with the order ID.
- On payment success, frontend sends `order_id`, `payment_id`, `razorpay_signature` to backend.
- Backend verifies signature using HMAC-SHA256: `hmac(key_secret, order_id + "|" + payment_id)`.
- Only verified payments result in slot assignment.

### 10.5 JWT Authentication
- Tokens are signed with `HS256` using a secret from environment variables.
- Token payload: `{ "sub": user_id, "role": user_role, "exp": expiry_timestamp }`.
- All protected endpoints extract and validate the token from the `Authorization: Bearer <token>` header.

---

## 11. Out of Scope for MVP

The following features are explicitly excluded from the MVP to keep scope manageable for a college project:

- Email notifications (slot activation, payment lapse warning, waitlist notification)
- Google OAuth / social login
- Real subscription access management (the platform does not actually manage Netflix profiles etc. — access instructions are manually entered by admin)
- Mobile application (web only)
- Deployment (local demo only)
- Refund processing
- Multi-currency support
- Subscription auto-renewal (renewal is manual in the demo)
- Real-time notifications (WebSockets)
- File uploads (plan logos are URLs only)
- Two-factor authentication
- Admin audit log UI (data is stored but no UI)

---

## 12. Success Metrics

For a college demo, the following constitute a successful MVP:

| Metric | Target |
|---|---|
| All 13 features implemented and demo-able | 100% |
| Zero broken API endpoints in demo | 0 errors |
| Swagger UI accessible at `/docs` showing all routes | Yes |
| Dark and light theme working on all pages | Yes |
| Savings calculator functional on homepage | Yes |
| Admin can create a plan and slots appear for purchase | Yes |
| Full payment flow completable in test mode | Yes |
| SubSplit Score updates after payment events | Yes |
| Admin analytics page shows charts and demand signals | Yes |
| Responsive layout on desktop (1280px+) | Yes |

---

## 13. Constraints and Assumptions

### Constraints
- The project is a college MVP — no production deployment required.
- No real money is processed — Razorpay test mode only.
- SubSplit does not actually purchase or manage real subscriptions — access instructions are entered manually by the admin.
- The team is a single solo developer — scope is intentionally bounded.
- No mobile responsiveness required (desktop-first for demo).
- No email sending — notifications are stored in the database only.

### Assumptions
- PostgreSQL is installed and running locally on port 5432.
- The developer has a Razorpay test account and test API keys.
- Python 3.11+ is installed for the backend.
- Node.js 18+ is installed for the frontend.
- All subscription data (plans, pricing, categories) is seeded manually by the admin via the admin panel.
- Demand signal data on the analytics page is seeded directly into the database for demo purposes.
- Revenue trend chart data (last 6 months) is seeded into the database for demo purposes.

---

*End of PRD — SubSplit v1.0 MVP*
