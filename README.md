# SubSplit

SubSplit is a subscription sharing platform where the platform itself buys subscription plans and sells individual slots to users. Users can browse plans, purchase a slot, join waitlists for full plans, and build a SubSplit Score based on payment reliability. Admins can manage plans, monitor utilization, and review platform analytics.

## Tech Stack

- Backend: FastAPI, PostgreSQL 16, SQLAlchemy 2.x, Pydantic v2, Alembic
- Authentication: JWT (`python-jose`), `passlib` + `bcrypt`
- Payments: Razorpay Python SDK (test mode)
- Frontend: React 18, TypeScript, Vite, React Router v6
- Styling: Tailwind CSS v3, shadcn/ui, next-themes
- State and forms: TanStack Query v5, Zustand, React Hook Form, Zod
- Charts and motion: Recharts, Framer Motion

## Prerequisites

- PostgreSQL 16
- Python 3.11 or newer
- Node.js 18 or newer
- npm

## Backend Setup

1. Create and activate a virtual environment:

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create `backend/.env`:

```env
DATABASE_URL=postgresql://subsplit_user:subsplit_password@localhost:5432/subsplit_db
SECRET_KEY=your-super-secret-jwt-key-minimum-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

4. Run database migrations:

```bash
alembic upgrade head
```

5. Seed demo data:

```bash
python -m app.seed
```

6. Start the API server:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend runs at `http://localhost:8000`.

## Frontend Setup

1. Install frontend dependencies:

```bash
cd frontend
npm install
```

2. Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

Optional for loading-state verification:

```env
VITE_API_DELAY_MS=800
```

3. Start the frontend:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Demo Credentials

- Admin: `admin@subsplit.com` / `admin123`
- User 1: `arjun@example.com` / `password123`
- User 2: `priya@example.com` / `password123`
- User 3: `karan@example.com` / `password123`
- User 4: `neha@example.com` / `password123`
- User 5: `vivek@example.com` / `password123`

## API Documentation

- Swagger UI: `http://localhost:8000/docs`

## Key Features

- User authentication with signup, login, JWT session persistence, and protected routes
- Browseable subscription catalog with per-slot pricing, availability, and plan detail pages
- Razorpay test-mode payment flow for slot purchase and payment history tracking
- Waitlist management with score-based queue ordering
- SubSplit Score tracking based on score events instead of stored aggregates
- User dashboard with active slots, payment history, and waitlist visibility
- Admin dashboard for plan creation, slot lapse checks, utilization monitoring, and analytics

## Local Development Notes

- Backend CORS allows `http://localhost:5173`
- All monetary values are stored as integer paise and displayed in rupees
- Seed data includes demo users, plans, slots, payments, waitlist entries, and demand signals
