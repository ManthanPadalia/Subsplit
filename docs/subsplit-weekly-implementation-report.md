# SubSplit — Weekly Project Reports

| Field | Details |
|---|---|
| **Project ID** | CoEPJ-0054 |
| **Student Name** | Manthan Padalia |
| **Program Name** | CSE-GEN |
| **USN** | 22BTRCN196 |
| **Guide Name** | Prof. Abhishek Midya |

---

## Week 1 — Weekly Report 1
**Jan 5th – Jan 10th**

This week our team focused on ideation and problem research for the project. We identified a real-world pain point around subscription sharing platforms — existing platforms rely on user-to-user credential sharing which is unreliable, untrustworthy, and often violates the Terms of Service of platforms like Netflix and Spotify. We researched existing solutions in this space to understand their shortcomings and gaps in the market.

After the research phase, we finalized the core concept for **SubSplit**: a subscription sharing platform where the platform itself purchases and owns the subscription plans and sells individual slots to users. This removes the trust problem entirely since users never rely on other random users for account access.

We created a rough feature list covering the key user roles — Guest, User, and Admin — and drafted an initial problem statement document. We also discussed the platform's core business logic, specifically the slot pricing formula where the user pays the full subscription cost divided by the number of slots plus a small platform fee. We presented this concept to our guide Prof. Abhishek Midya for initial feedback and received suggestions to define the target audience and user flows more concretely before moving into technical planning.

---

## Week 2 — Weekly Report 2
**Jan 12th – Jan 17th**

This week we completed the **Product Requirements Document (PRD)** for SubSplit. The PRD covers all 13 planned features across 3 user roles (Guest, Authenticated User, and Admin), with detailed acceptance criteria written for each feature. We also documented all major user flows including the new user purchase flow, the slot full and waitlist flow, the payment lapse and grace period flow, and the admin plan creation flow.

We defined the business logic rules for the **SubSplit Score** system — a reliability score assigned to each user that starts at 50, increases with on-time payments, and decreases during grace periods or slot revocations. We also mapped out the slot status state machine covering all transitions between `AVAILABLE`, `OCCUPIED`, `GRACE`, and `REVOKED` states.

We finalized the technology stack after evaluating multiple options:

- **Backend:** FastAPI with PostgreSQL, SQLAlchemy ORM, and Alembic for migrations
- **Frontend:** React 18 with TypeScript, Vite, Tailwind CSS, and shadcn/ui components
- **Payments:** Razorpay in test and demo mode

We initialized the GitHub mono-repo with the planned folder structure for both backend and frontend, set up the `.gitignore` and `README`, and discussed the PRD with our guide, incorporating feedback around clearly defining what is out of scope for the MVP.

---

## Week 3 — Weekly Report 3
**Jan 19th – Jan 24th**

This week we focused on design and database planning. We created **low-fidelity wireframes** for all major pages of the platform: the Homepage with a savings calculator, the Browse Plans page, Plan Detail page, User Dashboard, Slot Checkout page, Admin Dashboard, Admin Plan Management, Admin Slot Management, and the Admin Analytics page. These wireframes were used to align the team on layout and navigation before any code was written.

We then designed the complete **PostgreSQL database schema**. The key tables we designed are:

| Table | Description |
|---|---|
| `users` | Role enum for USER and ADMIN, score tracking via a ScoreEvents table |
| `plans` | Name, category, logo URL, total slots, monthly cost, platform fee |
| `slots` | Linked to a plan, with a status enum covering AVAILABLE, OCCUPIED, GRACE, and REVOKED |
| `subscriptions` | Linking users to their active slot |
| `waitlist` | User and plan, sorted by score and join time |
| `payments` | Storing Razorpay order ID, payment ID, signature, amount, and status |
| `score_events` | User, score delta, reason, and timestamp |

An important design decision we made this week was to **store all monetary values in paise** (₹1 = 100 paise) in the database to avoid floating point precision errors, converting to rupees only for display purposes. We also confirmed the slot state machine design covers all edge cases including late payment during grace period, user cancellation, and admin-triggered revocation.

---

## Week 4 — Weekly Report 4
**Jan 26th – Jan 31st**

This week we set up the complete **FastAPI backend project structure** and implemented the database layer. We created the Python virtual environment and installed all backend dependencies:

- FastAPI, Uvicorn
- SQLAlchemy 2.x, Alembic
- Pydantic v2
- `python-jose` for JWT
- `passlib` with `bcrypt` for password hashing
- Razorpay Python SDK
- `python-dotenv` for environment variable management
- Ruff as the linter for the backend codebase

We created the core project structure inside the backend `app` folder — `config.py` for environment variables using Pydantic `BaseSettings`, `database.py` for the SQLAlchemy engine and session factory, and `security.py` for password hashing utilities. We then implemented all SQLAlchemy ORM models — `User`, `Plan`, `Slot`, `Subscription`, `WaitlistEntry`, `Payment`, and `ScoreEvent` — mapping exactly to the schema we designed in Week 3.

We wrote the initial Alembic migration and successfully ran it against a local PostgreSQL 16 database, confirming all tables were created correctly. During this process we encountered and resolved a migration issue where the slot status enum type was not being created correctly in PostgreSQL, which required adding an explicit type creation step before the table migration. We verified the full database structure using pgAdmin 4. The backend server runs successfully on localhost and the Swagger UI is accessible at `/docs` with all routes visible.

---

## Week 5 — Weekly Report 5
**Feb 2nd – Feb 7th**

This week we implemented the complete **authentication system** for SubSplit — covering user registration, login, and JWT-based route protection.

We built the **registration endpoint** which accepts a name, email, and password. It validates that the email is not already registered and returns an appropriate error if it is. The password is hashed using bcrypt via passlib before being stored. On successful registration, a ScoreEvent of `+50` is inserted for the new user, establishing their starting SubSplit Score.

We built the **login endpoint** which accepts email and password, verifies the bcrypt hash, and on success generates a signed JWT token containing the user ID, role, and a 24-hour expiry. The token is returned to the client along with the token type.

We then implemented the `get_current_user` dependency which extracts and validates the Bearer token from the Authorization header on every protected request. Any endpoint in the project can use this as a FastAPI dependency to require authentication. We also implemented a separate `require_admin` dependency that additionally checks that the user's role is `ADMIN`, used to protect all admin-only endpoints.

We tested all authentication flows manually via the Swagger UI — successful registration, duplicate email rejection, successful login, invalid password rejection, and protected endpoint access both with and without a valid token. We also verified token expiry behavior by testing with a manually expired token. All cases are working correctly. This auth layer will serve as the security foundation for all remaining backend features.

---

## Week 6 — Weekly Report 6
**Feb 9th – Feb 14th**

This week we implemented the core **Plans and Slots API endpoints** — the heart of the SubSplit platform's backend functionality.

We built the **Plans API** covering three endpoints:

- A public `GET` endpoint that returns all active plans with slot availability counts
- A public `GET` endpoint for full plan detail including the occupied vs total slot breakdown and price breakdown
- An admin-only `POST` endpoint to create a new plan

An important piece of logic we implemented here is that when a new plan is created, the backend **automatically generates** the correct number of Slot records in the database. For example, if a plan has 4 total slots, four Slot rows are immediately created with status `AVAILABLE` and linked to that plan. This means slot creation is never manual — it is always derived from the plan definition at creation time.

We built the **Slots API** with endpoints to list all slots for a plan (admin only, returning status, assigned user, and dates), and an endpoint for authenticated users to fetch all slots currently assigned to them. We also implemented the slot pricing calculation helper that computes the per-slot cost and the final user-facing price, storing and returning values in both paise and formatted rupee strings.

We built the **Categories API** which returns a distinct list of all plan categories present in the database, which the frontend browse page will use for its filter tabs. During testing we identified and fixed an edge case where deactivating a plan was incorrectly hiding slots that were still `OCCUPIED` by active users. We resolved this by ensuring deactivation only removes the plan from public browse without affecting existing active slot assignments.

---

## Week 7 — Weekly Report 7
**Feb 16th – Feb 21st**

This week we implemented the **Razorpay payment integration** and the **SubSplit Score system** — two of the most business-critical features of the entire platform.

For payments, we integrated the Razorpay Python SDK and built two endpoints:

- The **create-order endpoint** accepts a plan ID, checks that an `AVAILABLE` slot exists for that plan, creates a Razorpay order using our test API key with the correct amount in paise, stores a pending Payment record in the database, and returns the order ID and amount to the frontend.
- The **verify endpoint** receives the order ID, payment ID, and Razorpay signature from the frontend after the user completes payment. It verifies the signature using HMAC-SHA256. Only on successful signature verification does the backend mark the payment as successful, assign the first `AVAILABLE` slot to the user by changing its status to `OCCUPIED`, create a Subscription record, and add a ScoreEvent of `+10` for the on-time payment.

For the **SubSplit Score system**, we implemented the score computation as a pure function that reads all ScoreEvents for a user and sums the deltas, clamped between 0 and 100. The score is never stored as a mutable column — it is always computed fresh on read. Score event constants are defined as follows:

| Event | Delta |
|---|---|
| Registration | +50 |
| Successful payment | +10 |
| Entering grace period | -5 |
| Slot revocation | -20 |

We also implemented the full **waitlist feature** this week: endpoints for joining a waitlist, viewing the user's waitlist positions, and the internal waitlist promotion logic that triggers whenever a slot becomes `AVAILABLE`. The promotion logic queries the waitlist ordered by SubSplit Score descending and join date ascending as a tiebreaker, automatically assigning the slot to the highest priority waiting user.

---

## Week 8 — Weekly Report 8
**Feb 23rd – Feb 28th**

This week we set up the complete **React frontend project** and established all foundational infrastructure before building any pages.

We initialized the frontend using Vite with the React and TypeScript template and installed all planned dependencies:

- Tailwind CSS v3 with shadcn/ui components
- TanStack Query v5 for server state management
- Axios for HTTP requests
- Zustand for global auth state
- React Router v6 for client-side routing
- React Hook Form with Zod for form validation
- Framer Motion for animations
- Recharts for admin charts
- Lucide React for icons
- next-themes for dark and light mode support

We set up the complete project folder structure with dedicated folders for API modules, shared components, pages, Zustand stores, custom hooks, and TypeScript type definitions that mirror the backend Pydantic schemas. We configured the Axios instance with the backend base URL and a request interceptor that automatically attaches the JWT token from Zustand state to every outgoing request's Authorization header. We also configured TanStack Query's `QueryClient` with appropriate stale time and retry settings.

We set up **React Router** with all planned routes across three categories:

- **Public routes:** Homepage, Browse page, Plan Detail page
- **Protected user routes:** Dashboard, Subscriptions, Payments, Checkout
- **Protected admin routes:** Admin Dashboard, Plan Management, Slot Management, Analytics

We implemented a `ProtectedRoute` wrapper component that reads authentication state from Zustand and redirects unauthenticated users to the login page. We also implemented a separate `AdminRoute` wrapper that additionally checks for the admin role. We verified that all routing and redirect behavior works correctly both with and without a valid token in state.

---

## Week 9 — Weekly Report 9
**Mar 2nd – Mar 7th**

This week we built all the **public-facing frontend pages**: the Homepage, Browse Plans page, and Plan Detail page.

For the **Homepage**, we built the hero section with SubSplit's tagline and a primary call-to-action button. We implemented the **Savings Calculator** — a functional interactive widget where users can select multiple subscription services from a checklist and the calculator displays the total cost if purchased individually versus the estimated SubSplit slot cost, showing the rupee savings amount and savings percentage in real time. We also built the "How it works" section as a three-step visual explainer, a featured plans grid that fetches the top plans from the backend, and a categories section. We applied Framer Motion entrance animations on scroll for all major sections.

For the **Browse Plans page**, we fetch all active plans from the backend and display them as a responsive card grid. We implemented category filter tabs using the categories fetched from the backend — clicking a tab filters the displayed cards. Each plan card shows the logo, name, category badge, a slot availability indicator showing slots taken out of total, and the per-slot monthly price. Plans that are fully occupied show a "Join Waitlist" label instead. We also added a search bar that filters plan cards by name on the client side without an additional API call.

For the **Plan Detail page**, we fetch full plan data and display the plan logo, name, description, and category alongside a pricing breakdown card. The breakdown card shows what SubSplit pays for the full subscription, the number of slots it is divided into, the per-slot cost, the SubSplit platform fee, and the final price the user pays per month. Slot availability is shown with a visual progress bar. If slots are available the page shows a "Get this slot" button that redirects unauthenticated users to login. If the plan is full it shows a "Join Waitlist" button instead. We confirmed all three pages render correctly and pull live data from the running backend.

---

## Week 10 — Weekly Report 10
**Mar 9th – Mar 14th**

This week we built the **authentication pages** and the **full user dashboard**.

For the **Login and Signup pages**, we used React Hook Form with Zod validation schemas. The Signup form collects name, email, password, and confirm password, validating email format, minimum password length, and password match on the client side before any API call is made. On successful registration it automatically logs the user in and stores the token in Zustand. The Login form stores the JWT token and user object in both Zustand and `localStorage` on success so the session persists across page refreshes. Both forms display inline field-level validation error messages and show a loading spinner during submission. On successful login the user is redirected to the dashboard.

For the **User Dashboard**, the main page displays a welcome header with the user's name and their current SubSplit Score shown as a color-coded badge:

| Score Range | Color |
|---|---|
| 75 – 100 | 🟢 Green |
| 40 – 74 | 🟡 Amber |
| 0 – 39 | 🔴 Red |

Below the header we show two summary cards displaying the count of active subscriptions and current waitlist positions. The dashboard includes three tabs:

- **Active Subscriptions:** Fetches the user's assigned slots and renders a card for each one showing the plan name, logo, category, slot number, monthly cost, next renewal date, and an expandable Access Details section containing the access instructions entered by the admin. Each card includes a Cancel Subscription button.
- **Payment History:** Renders a table with columns for date, plan name, amount paid, and a payment status badge.
- **Waitlist:** Shows all plans the user is waiting on along with their current position in each waitlist.

We tested the complete login to dashboard to active subscriptions flow end-to-end with the backend running and confirmed everything works as expected.

---

## Week 11 — Weekly Report 11
**Mar 16th – Mar 21st**

This week we built the complete **slot checkout flow** and **Razorpay payment integration** on the frontend — connecting the user-facing purchase experience to the backend payment endpoints we built in Week 7.

The **Checkout page** is accessible at `/checkout/:planId` and is a protected route requiring authentication. On load it fetches the full plan details and displays a clear order summary showing the plan name, logo, slot price breakdown (subscription cost divided by slots, plus the SubSplit platform fee), and the final amount the user will be charged per month. We added a confirmation checkbox where the user acknowledges the monthly recurring nature of the slot before proceeding.

On clicking the Pay button, the frontend calls our `create-order` endpoint, receives the Razorpay order ID and amount, and opens the **Razorpay checkout modal** using the Razorpay JavaScript SDK loaded via script tag. We configured the modal with the order ID, amount, user name, and user email pre-filled. On successful payment completion inside the modal, Razorpay returns the order ID, payment ID, and signature to our success handler. We then call our `verify` endpoint with these three values. On successful verification the user is redirected to the dashboard with a success toast notification and their new active subscription is immediately visible.

We also handled all **failure states**: payment cancelled by user, payment failed inside Razorpay modal, and signature verification failure on the backend. Each case shows an appropriate error message without leaving the user in an inconsistent state. We tested the full purchase flow end-to-end in Razorpay test mode using test card numbers, confirming that slot status correctly changes from `AVAILABLE` to `OCCUPIED` after a successful payment and the user's SubSplit Score increases by 10.

---

## Week 12 — Weekly Report 12
**Mar 23rd – Mar 28th**

This week we built the complete **Admin Panel** — the Admin Dashboard, Admin Plan Management page, and Admin Slot Management page. This was a significant week in terms of frontend scope.

The **Admin Dashboard** at `/admin` is protected by our `AdminRoute` wrapper. The top section displays four metric cards:

- Total monthly revenue
- Total active slots (occupied out of total)
- Total registered users
- Total platform fee earned

Below the metrics we built a plans table showing every subscription plan with columns for plan name, category, total slots, occupied slots, slot price, platform fee, monthly revenue from that plan, and an active/inactive status toggle. Clicking the toggle calls the backend to update the plan's active status and refreshes the table. Clicking a plan row navigates to the slot management view for that plan.

The **Admin Plan Management page** at `/admin/plans` displays the full list of plans and includes a Create New Plan button that opens a modal form. The form has fields for plan name, category dropdown, description, logo URL, total slots, monthly subscription cost, and platform fee. The slot price per user is automatically calculated and displayed live in the form as the admin types. On submission the form calls the backend create plan endpoint, which also auto-generates the correct number of slot records. We also implemented an Edit Plan flow using the same modal form pre-filled with existing values.

The **Admin Slot Management page** at `/admin/slots/:planId` shows all slots for a selected plan in a table with columns for slot number, assigned user name and email, status, assigned date, and expiry date. Slot statuses are color-coded:

| Status | Color |
|---|---|
| OCCUPIED | 🟢 Green |
| AVAILABLE | ⚪ Gray |
| GRACE | 🟡 Amber |
| REVOKED | 🔴 Red |

Each occupied slot has a Revoke button that calls the backend revoke endpoint, which triggers the waitlist promotion logic automatically. We confirmed the full admin plan creation to slot visibility to slot revocation flow works end-to-end.

---

## Week 13 — Weekly Report 13
**Mar 30th – Apr 4th**

This week we built the **Admin Analytics page** and completed the full frontend-to-backend integration across all features.

The **Admin Analytics page** at `/admin/analytics` is the most data-rich page in the project. The top row shows four metric cards for monthly revenue, slot utilization rate, total users, and total platform fee earned. Below that we built a **Revenue by Category chart** using Recharts — a horizontal bar chart showing revenue broken down by Streaming, Education, Gaming, Productivity, and Music categories. We added a tab switcher above the chart so the admin can toggle the same chart between Revenue, Slot Utilization, and User Count views without a page reload.

We built a **Revenue Trend chart** showing the last 6 months of total platform revenue as a bar chart, using seeded historical data in the database for the demo. We built the **Demand Signals section** as a grid of cards showing subscription services that users have requested. Each card displays the service name, category, number of requests, estimated margin per slot, and an Add Plan button. Clicking Add Plan marks the card as queued in the UI.

We also built the **SubSplit Score distribution section** showing three stat cards for High (75–100), Medium (40–74), and Low (0–39) score user counts, and a Recent Activity table showing the last 10 user actions across the platform.

For integration, we went through every page and verified that all API calls are correctly wired, all loading states show a spinner, all error states show a user-friendly message, and all data refreshes correctly after mutations. We also seeded the database with realistic demo data — multiple plans across all categories, several users with varying SubSplit Scores, payment history, and demand signal entries — so the platform looks complete and realistic during the final review.

---

## Week 14 — Weekly Report 14
**Apr 6th – Apr 11th**

This week we focused entirely on **end-to-end testing, edge case handling, and bug fixing** across the full application.

We systematically tested every user flow defined in the PRD:

- **New user purchase flow:** Tested the complete path from homepage through browse, plan detail, signup, checkout, payment, and dashboard, verifying each step transitions correctly.
- **Slot full flow:** Tested joining the waitlist, then revoking an existing slot from the admin panel and confirming the waitlist user is automatically promoted and their dashboard updates.
- **Payment lapse flow:** Manually triggered grace period status via the database and confirmed the SubSplit Score penalty of `-5` is applied and the slot status changes to `GRACE`.

**Bug fixes completed this week:**

- Fixed an issue where the savings calculator on the homepage was computing incorrect percentages when only one service was selected.
- Fixed a race condition in the checkout flow where double-clicking the Pay button was creating two Razorpay orders — resolved by disabling the button immediately on first click.
- Fixed an issue where the admin plan table was not sorting plans consistently on page refresh — added a stable `ORDER BY` clause to the backend query.
- Fixed the waitlist position display on the user dashboard which was showing positions as zero-indexed instead of one-indexed.

**Edge cases handled:**

- Attempting to purchase a slot for a plan that just became full between page load and checkout (backend now returns a clear "no slots available" error that the frontend displays gracefully).
- Attempting to join a waitlist the user is already on (backend returns a duplicate error, frontend shows an appropriate message instead of crashing).

We ran through the complete demo scenario three times end-to-end without any errors.

---

## Week 15 — Weekly Report 15
**Apr 13th – Apr 18th**

This week was focused on **final UI polish, demo preparation, documentation, and ensuring the project is fully ready for the Final Review on April 18th**.

For **UI polish**, we reviewed every page for visual consistency and made refinements across the application. We ensured dark mode and light mode work correctly on all pages with no hardcoded colors that break on theme switch. We refined the mobile layout on key public pages (homepage, browse, plan detail) to ensure they render cleanly even though desktop is the primary target. We added page transition animations using Framer Motion on all route changes for a more polished feel. We reviewed all empty states — for example when a user has no active subscriptions, no payment history, or no waitlist entries — and replaced blank screens with helpful illustrated empty state components with clear call-to-action prompts.

We finalized and verified the **complete demo seed data** in the database:

| Data Type | Details |
|---|---|
| Subscription plans | 8 plans across 5 categories (Streaming, Education, Gaming, Productivity, Music) |
| Demo user accounts | 6 accounts with varying SubSplit Scores |
| Slots | A mix of OCCUPIED and AVAILABLE slots |
| Payment history | Payment history records |
| Waitlist entries | Waitlist entries |
| Revenue history | 6 months of seeded revenue data for the analytics trend chart |
| Demand signals | 6 demand signal entries for the analytics page |

We prepared the **project README** with setup instructions covering PostgreSQL setup, environment variables, running the backend with Uvicorn, and running the frontend with Vite. We verified the Swagger UI at `/docs` shows all API routes with correct request and response schemas.

We did a full **dry run of the demo flow** — admin login, plan creation, user registration, slot purchase via Razorpay test mode, dashboard view, and admin analytics review — and the entire demo runs smoothly without any errors. The project is fully ready for the Final Review.