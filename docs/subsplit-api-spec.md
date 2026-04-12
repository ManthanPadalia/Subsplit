# SubSplit — API Specification Document

**Version:** 1.0  
**Status:** Final — MVP  
**Framework:** FastAPI  
**Base URL:** `http://localhost:8000/api`  
**API Docs (auto-generated):** `http://localhost:8000/docs` (Swagger UI)  
**Last Updated:** April 2026

---

## Table of Contents

1. [Global Conventions](#1-global-conventions)
2. [Authentication](#2-authentication)
3. [Auth Endpoints](#3-auth-endpoints)
4. [Plan Endpoints](#4-plan-endpoints)
5. [Slot Endpoints](#5-slot-endpoints)
6. [Payment Endpoints](#6-payment-endpoints)
7. [Waitlist Endpoints](#7-waitlist-endpoints)
8. [SubSplit Score Endpoints](#8-subsplit-score-endpoints)
9. [Admin Endpoints](#9-admin-endpoints)
10. [FastAPI App Entry Point](#10-fastapi-app-entry-point)
11. [Dependencies and Security](#11-dependencies-and-security)
12. [Error Code Reference](#12-error-code-reference)

---

## 1. Global Conventions

### Base URL
All endpoints are prefixed with `/api`. The FastAPI app runs on `http://localhost:8000`.

### Request Format
- All request bodies are JSON (`Content-Type: application/json`).
- All datetime values are ISO 8601 strings in UTC (`2026-04-15T10:30:00Z`).
- Monetary values in **responses** are returned in **both paise and rupees**:
  ```json
  {
    "amount_paise": 19900,
    "amount_rupees": 199.00
  }
  ```

### Response Format
All responses follow this envelope structure:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { }
  }
}
```

### HTTP Status Codes Used

| Code | Meaning |
|---|---|
| `200` | Success — GET, PUT, PATCH |
| `201` | Created — POST that creates a resource |
| `204` | No content — DELETE |
| `400` | Bad request — validation error or invalid input |
| `401` | Unauthorized — missing or invalid JWT token |
| `403` | Forbidden — authenticated but insufficient role |
| `404` | Not found — resource does not exist |
| `409` | Conflict — duplicate resource (e.g. email already exists) |
| `422` | Unprocessable entity — Pydantic validation failure |
| `500` | Internal server error |

### Pagination
List endpoints that return multiple items support optional pagination:
```
GET /api/plans?skip=0&limit=20
```
Default: `skip=0`, `limit=20`, max `limit=100`.

---

## 2. Authentication

### JWT Bearer Token
Protected endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

Tokens are issued on login and expire after **1440 minutes (24 hours)**.

### Token Payload Structure
```json
{
  "sub": "user-uuid-here",
  "role": "USER",
  "exp": 1713189600
}
```

### Role Levels
| Role | Access |
|---|---|
| `GUEST` | Public endpoints only (no token required) |
| `USER` | All public endpoints + user-scoped endpoints |
| `ADMIN` | All endpoints including admin-only endpoints |

In the endpoint specs below:
- **Auth: None** — no token required
- **Auth: User** — valid JWT required, any role
- **Auth: Admin** — valid JWT required, role must be `ADMIN`

---

## 3. Auth Endpoints

Router file: `backend/app/routers/auth.py`  
Router prefix: `/api/auth`  
Tags: `["Authentication"]`

---

### POST `/api/auth/register`

Register a new user account.

**Auth:** None

**Request Body:**
```json
{
  "name": "Arjun Rao",
  "email": "arjun@example.com",
  "password": "securepassword123"
}
```

**Validation Rules:**
- `name`: required, 1–100 characters
- `email`: required, valid email format, must be unique
- `password`: required, minimum 8 characters

**Success Response — `201 Created`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Arjun Rao",
      "email": "arjun@example.com",
      "role": "USER",
      "is_active": true,
      "created_at": "2026-04-15T10:30:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  },
  "message": "Account created successfully"
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `409` | `EMAIL_ALREADY_EXISTS` | Email is already registered |
| `422` | `VALIDATION_ERROR` | Missing fields or invalid email format |
| `422` | `PASSWORD_TOO_SHORT` | Password under 8 characters |

---

### POST `/api/auth/login`

Authenticate a user and receive a JWT token.

**Auth:** None

**Request Body:**
```json
{
  "email": "arjun@example.com",
  "password": "securepassword123"
}
```

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Arjun Rao",
      "email": "arjun@example.com",
      "role": "USER",
      "is_active": true,
      "created_at": "2026-04-15T10:30:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  },
  "message": "Login successful"
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `INVALID_CREDENTIALS` | Email not found or password incorrect |
| `403` | `ACCOUNT_INACTIVE` | User account has been deactivated |
| `422` | `VALIDATION_ERROR` | Missing or malformed fields |

---

### GET `/api/auth/me`

Get the currently authenticated user's profile.

**Auth:** User

**Request Body:** None

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Arjun Rao",
    "email": "arjun@example.com",
    "role": "USER",
    "is_active": true,
    "subsplit_score": 85,
    "created_at": "2026-04-15T10:30:00Z"
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No token or invalid token |

---

### PUT `/api/auth/me`

Update the current user's profile (name only for MVP).

**Auth:** User

**Request Body:**
```json
{
  "name": "Arjun Kumar Rao"
}
```

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Arjun Kumar Rao",
    "email": "arjun@example.com",
    "role": "USER",
    "is_active": true,
    "subsplit_score": 85,
    "created_at": "2026-04-15T10:30:00Z"
  },
  "message": "Profile updated successfully"
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No token or invalid token |
| `422` | `VALIDATION_ERROR` | Name too long or empty |

---

## 4. Plan Endpoints

Router file: `backend/app/routers/plans.py`  
Router prefix: `/api/plans`  
Tags: `["Plans"]`

---

### GET `/api/plans`

Get all active subscription plans. Supports filtering by category.

**Auth:** None

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `category` | string | No | Filter by category: `STREAMING`, `EDUCATION`, `GAMING`, `PRODUCTIVITY`, `MUSIC` |
| `skip` | integer | No | Pagination offset. Default: `0` |
| `limit` | integer | No | Items per page. Default: `20`, max: `100` |

**Example:** `GET /api/plans?category=STREAMING&skip=0&limit=10`

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "plan-uuid-here",
        "name": "Netflix Premium",
        "category": "STREAMING",
        "description": "4K Ultra HD streaming on 4 screens simultaneously.",
        "logo_url": "https://example.com/netflix-logo.svg",
        "total_slots": 4,
        "subscription_cost_paise": 64900,
        "subscription_cost_rupees": 649.00,
        "platform_fee_paise": 3700,
        "platform_fee_rupees": 37.00,
        "slot_cost_paise": 16225,
        "slot_cost_rupees": 162.25,
        "user_pays_paise": 19900,
        "user_pays_rupees": 199.00,
        "available_slots": 2,
        "occupied_slots": 2,
        "uptime_percentage": 99.20,
        "is_active": true,
        "created_at": "2026-04-01T00:00:00Z"
      }
    ],
    "total": 7,
    "skip": 0,
    "limit": 20
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `400` | `INVALID_CATEGORY` | Category value is not a valid enum |

---

### GET `/api/plans/:id`

Get full details of a single plan including slot grid data.

**Auth:** None

**Path Parameters:**
- `id` — UUID of the plan

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "plan-uuid-here",
    "name": "Netflix Premium",
    "category": "STREAMING",
    "description": "4K Ultra HD streaming on 4 screens simultaneously.",
    "logo_url": "https://example.com/netflix-logo.svg",
    "total_slots": 4,
    "subscription_cost_paise": 64900,
    "subscription_cost_rupees": 649.00,
    "platform_fee_paise": 3700,
    "platform_fee_rupees": 37.00,
    "slot_cost_paise": 16225,
    "slot_cost_rupees": 162.25,
    "user_pays_paise": 19900,
    "user_pays_rupees": 199.00,
    "available_slots": 2,
    "occupied_slots": 2,
    "uptime_percentage": 99.20,
    "access_instructions": "You will receive a profile invite email from SubSplit...",
    "is_active": true,
    "created_at": "2026-04-01T00:00:00Z",
    "slots": [
      {
        "id": "slot-uuid-1",
        "slot_number": 1,
        "status": "OCCUPIED",
        "user_initials": "AR"
      },
      {
        "id": "slot-uuid-2",
        "slot_number": 2,
        "status": "OCCUPIED",
        "user_initials": "PS"
      },
      {
        "id": "slot-uuid-3",
        "slot_number": 3,
        "status": "AVAILABLE",
        "user_initials": null
      },
      {
        "id": "slot-uuid-4",
        "slot_number": 4,
        "status": "AVAILABLE",
        "user_initials": null
      }
    ]
  }
}
```

**Notes:**
- `user_initials` is derived from the first letter of the user's first and last name. Never expose the user's full name or ID on this public endpoint.
- `access_instructions` is included only for authenticated users who hold a slot on this plan (see slot detail endpoint for full instructions).

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `404` | `PLAN_NOT_FOUND` | Plan with given ID does not exist |
| `404` | `PLAN_INACTIVE` | Plan exists but is deactivated |

---

## 5. Slot Endpoints

Router file: `backend/app/routers/slots.py`  
Router prefix: `/api/slots`  
Tags: `["Slots"]`

---

### GET `/api/slots/my`

Get all slots currently held by the authenticated user (their active subscriptions).

**Auth:** User

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `status` | string | No | Filter by slot status: `OCCUPIED`, `GRACE`, `REVOKED` |

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "slots": [
      {
        "id": "slot-uuid-here",
        "slot_number": 1,
        "status": "OCCUPIED",
        "assigned_at": "2026-04-01T10:00:00Z",
        "expires_at": "2026-05-01T10:00:00Z",
        "plan": {
          "id": "plan-uuid-here",
          "name": "Netflix Premium",
          "category": "STREAMING",
          "logo_url": "https://example.com/netflix-logo.svg",
          "user_pays_paise": 19900,
          "user_pays_rupees": 199.00,
          "access_instructions": "You will receive a profile invite email from SubSplit..."
        }
      }
    ]
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No or invalid token |

---

### GET `/api/slots/:id`

Get details of a specific slot. User can only access their own slots. Admins can access any slot.

**Auth:** User

**Path Parameters:**
- `id` — UUID of the slot

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "slot-uuid-here",
    "slot_number": 1,
    "status": "OCCUPIED",
    "assigned_at": "2026-04-01T10:00:00Z",
    "expires_at": "2026-05-01T10:00:00Z",
    "plan": {
      "id": "plan-uuid-here",
      "name": "Netflix Premium",
      "category": "STREAMING",
      "logo_url": "https://example.com/netflix-logo.svg",
      "user_pays_paise": 19900,
      "user_pays_rupees": 199.00,
      "access_instructions": "You will receive a profile invite email from SubSplit..."
    },
    "payment_history": [
      {
        "id": "payment-uuid",
        "amount_paise": 19900,
        "amount_rupees": 199.00,
        "status": "SUCCESS",
        "created_at": "2026-04-01T10:00:00Z"
      }
    ]
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No or invalid token |
| `403` | `FORBIDDEN` | Slot belongs to a different user (non-admin) |
| `404` | `SLOT_NOT_FOUND` | Slot with given ID does not exist |

---

### DELETE `/api/slots/:id/cancel`

Cancel an active slot. The slot is released back to AVAILABLE and waitlist promotion runs.

**Auth:** User

**Path Parameters:**
- `id` — UUID of the slot to cancel

**Request Body:** None

**Business Logic on Cancel:**
1. Verify the slot belongs to the current user and status is `OCCUPIED`.
2. Set `slot.user_id = NULL`, `slot.status = AVAILABLE`, `slot.assigned_at = NULL`, `slot.expires_at = NULL`.
3. Run waitlist promotion for the plan.
4. No refund is issued (out of scope for MVP).

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": null,
  "message": "Slot cancelled successfully. No refund is issued for partial months."
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No or invalid token |
| `403` | `FORBIDDEN` | Slot belongs to a different user |
| `404` | `SLOT_NOT_FOUND` | Slot does not exist |
| `409` | `SLOT_NOT_CANCELLABLE` | Slot status is not OCCUPIED (e.g. already REVOKED) |

---

## 6. Payment Endpoints

Router file: `backend/app/routers/payments.py`  
Router prefix: `/api/payments`  
Tags: `["Payments"]`

---

### POST `/api/payments/create-order`

Create a Razorpay order for purchasing an available slot. This is step 1 of the payment flow.

**Auth:** User

**Request Body:**
```json
{
  "plan_id": "plan-uuid-here"
}
```

**Business Logic:**
1. Verify the plan exists and is active.
2. Find the first available slot for that plan (`status = AVAILABLE`).
3. If no available slot exists, return `PLAN_FULL` error.
4. Verify the user does not already hold a slot on this plan.
5. Calculate `amount = plan.user_pays_paise`.
6. Create a Razorpay order via the SDK: `razorpay.order.create({ amount, currency: "INR", receipt: payment_uuid })`.
7. Create a `Payment` record with `status = PENDING` and `razorpay_order_id` from Razorpay.
8. Return the Razorpay order details to the frontend.

**Success Response — `201 Created`:**
```json
{
  "success": true,
  "data": {
    "payment_id": "payment-uuid-here",
    "razorpay_order_id": "order_AbCdEfGhIjKl1234",
    "amount_paise": 19900,
    "amount_rupees": 199.00,
    "currency": "INR",
    "plan_name": "Netflix Premium",
    "slot_number": 3
  },
  "message": "Order created. Complete payment to activate your slot."
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No or invalid token |
| `404` | `PLAN_NOT_FOUND` | Plan does not exist or is inactive |
| `409` | `PLAN_FULL` | No available slots for this plan |
| `409` | `ALREADY_SUBSCRIBED` | User already holds a slot on this plan |
| `500` | `PAYMENT_GATEWAY_ERROR` | Razorpay API call failed |

---

### POST `/api/payments/verify`

Verify the Razorpay payment signature and activate the slot. This is step 2 of the payment flow.

**Auth:** User

**Request Body:**
```json
{
  "razorpay_order_id": "order_AbCdEfGhIjKl1234",
  "razorpay_payment_id": "pay_XyZAbCdEfGh5678",
  "razorpay_signature": "hmac_sha256_signature_string"
}
```

**Business Logic:**
1. Find the `Payment` record by `razorpay_order_id`. Verify it belongs to the current user.
2. Verify the payment has `status = PENDING` (prevent double-processing).
3. Compute HMAC-SHA256 signature:
   ```python
   import hmac, hashlib
   expected = hmac.new(
       key=RAZORPAY_KEY_SECRET.encode(),
       msg=f"{order_id}|{payment_id}".encode(),
       digestmod=hashlib.sha256
   ).hexdigest()
   ```
4. If signatures do not match, set `payment.status = FAILED` and return error.
5. If signatures match:
   - Set `payment.status = SUCCESS`, `payment.razorpay_payment_id`, `payment.razorpay_signature`.
   - Find the slot associated with this payment's plan.
   - Set `slot.user_id = current_user.id`, `slot.status = OCCUPIED`.
   - Set `slot.assigned_at = now()`, `slot.expires_at = now() + 30 days`.
   - Create a `ScoreEvent` with `event_type = ON_TIME_PAYMENT`, `delta = +5`.
6. Return success with slot details.

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "payment_id": "payment-uuid-here",
    "status": "SUCCESS",
    "slot": {
      "id": "slot-uuid-here",
      "slot_number": 3,
      "status": "OCCUPIED",
      "assigned_at": "2026-04-15T10:30:00Z",
      "expires_at": "2026-05-15T10:30:00Z",
      "plan": {
        "id": "plan-uuid-here",
        "name": "Netflix Premium",
        "category": "STREAMING",
        "access_instructions": "You will receive a profile invite email from SubSplit..."
      }
    }
  },
  "message": "Payment verified. Your slot is now active!"
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No or invalid token |
| `400` | `INVALID_SIGNATURE` | HMAC verification failed — payment is fraudulent |
| `404` | `PAYMENT_NOT_FOUND` | No payment found for this order ID |
| `403` | `FORBIDDEN` | Payment belongs to a different user |
| `409` | `PAYMENT_ALREADY_PROCESSED` | Payment status is not PENDING |

---

### GET `/api/payments/my`

Get the payment history of the authenticated user.

**Auth:** User

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `status` | string | No | Filter: `PENDING`, `SUCCESS`, `FAILED` |
| `skip` | integer | No | Default: `0` |
| `limit` | integer | No | Default: `20` |

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "payment-uuid-here",
        "amount_paise": 19900,
        "amount_rupees": 199.00,
        "status": "SUCCESS",
        "razorpay_order_id": "order_AbCdEfGhIjKl1234",
        "razorpay_payment_id": "pay_XyZAbCdEfGh5678",
        "failure_reason": null,
        "created_at": "2026-04-15T10:30:00Z",
        "plan": {
          "id": "plan-uuid-here",
          "name": "Netflix Premium",
          "category": "STREAMING"
        }
      }
    ],
    "total": 3,
    "skip": 0,
    "limit": 20
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No or invalid token |

---

## 7. Waitlist Endpoints

Router file: `backend/app/routers/waitlist.py`  
Router prefix: `/api/waitlist`  
Tags: `["Waitlist"]`

---

### POST `/api/waitlist/join`

Join the waitlist for a fully occupied plan.

**Auth:** User

**Request Body:**
```json
{
  "plan_id": "plan-uuid-here"
}
```

**Business Logic:**
1. Verify the plan exists and is active.
2. Verify the plan has no available slots (if slots are available, return `SLOTS_AVAILABLE` — user should buy directly).
3. Verify the user does not already hold a slot on this plan.
4. Verify the user is not already on the waitlist for this plan.
5. Create a `WaitlistEntry` record.
6. Return the user's position in the queue.

**Waitlist position query:**
```sql
SELECT COUNT(*) + 1 AS position
FROM waitlist_entries we
JOIN users u ON u.id = we.user_id
WHERE we.plan_id = :plan_id
  AND we.notified = false
  AND (
    SELECT LEAST(100, GREATEST(0, 100 + COALESCE(SUM(se.delta), 0)))
    FROM score_events se WHERE se.user_id = we.user_id
  ) > (
    SELECT LEAST(100, GREATEST(0, 100 + COALESCE(SUM(se2.delta), 0)))
    FROM score_events se2 WHERE se2.user_id = :current_user_id
  );
```

**Success Response — `201 Created`:**
```json
{
  "success": true,
  "data": {
    "waitlist_entry_id": "entry-uuid-here",
    "plan_id": "plan-uuid-here",
    "plan_name": "Netflix Premium",
    "queue_position": 3,
    "joined_at": "2026-04-15T10:30:00Z"
  },
  "message": "You are #3 in the waitlist for Netflix Premium."
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No or invalid token |
| `404` | `PLAN_NOT_FOUND` | Plan does not exist or is inactive |
| `409` | `SLOTS_AVAILABLE` | Plan still has available slots — purchase instead |
| `409` | `ALREADY_SUBSCRIBED` | User already holds a slot on this plan |
| `409` | `ALREADY_ON_WAITLIST` | User is already on this plan's waitlist |

---

### DELETE `/api/waitlist/leave/:planId`

Leave the waitlist for a plan.

**Auth:** User

**Path Parameters:**
- `planId` — UUID of the plan

**Request Body:** None

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": null,
  "message": "You have been removed from the waitlist for Netflix Premium."
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No or invalid token |
| `404` | `WAITLIST_ENTRY_NOT_FOUND` | User is not on this plan's waitlist |

---

### GET `/api/waitlist/my`

Get all waitlist entries for the authenticated user with their queue positions.

**Auth:** User

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "waitlist_entries": [
      {
        "id": "entry-uuid-here",
        "plan": {
          "id": "plan-uuid-here",
          "name": "Netflix Premium",
          "category": "STREAMING",
          "logo_url": "https://example.com/netflix-logo.svg",
          "user_pays_paise": 19900,
          "user_pays_rupees": 199.00
        },
        "queue_position": 3,
        "joined_at": "2026-04-15T10:30:00Z"
      }
    ]
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No or invalid token |

---

## 8. SubSplit Score Endpoints

Router file: `backend/app/routers/scores.py`  
Router prefix: `/api/scores`  
Tags: `["SubSplit Score"]`

---

### GET `/api/scores/my`

Get the authenticated user's current SubSplit Score and full score event history.

**Auth:** User

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "subsplit_score": 85,
    "score_breakdown": {
      "base": 100,
      "total_delta": -15,
      "final_score": 85
    },
    "events": [
      {
        "id": "event-uuid-1",
        "event_type": "ON_TIME_PAYMENT",
        "delta": 5,
        "description": "On-time payment for Netflix Premium",
        "created_at": "2026-04-01T10:00:00Z"
      },
      {
        "id": "event-uuid-2",
        "event_type": "LATE_PAYMENT",
        "delta": -5,
        "description": "Late payment during grace period for Spotify Family",
        "created_at": "2026-03-20T08:00:00Z"
      }
    ]
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No or invalid token |

---

## 9. Admin Endpoints

Router file: `backend/app/routers/admin.py`  
Router prefix: `/api/admin`  
Tags: `["Admin"]`

**All endpoints in this section require `Auth: Admin`.**  
Non-admin authenticated users receive a `403 FORBIDDEN` response on all `/api/admin/*` routes.

---

### GET `/api/admin/dashboard`

Get platform-wide summary metrics for the admin dashboard.

**Auth:** Admin

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "total_monthly_revenue_paise": 4823000,
      "total_monthly_revenue_rupees": 48230.00,
      "platform_fee_earned_paise": 1154000,
      "platform_fee_earned_rupees": 11540.00,
      "total_slots": 340,
      "occupied_slots": 312,
      "available_slots": 28,
      "utilization_percentage": 91.76,
      "total_users": 289,
      "new_users_this_month": 24,
      "grace_period_slots": 5,
      "at_risk_users": 28
    },
    "plans_summary": [
      {
        "id": "plan-uuid-here",
        "name": "Netflix Premium",
        "category": "STREAMING",
        "total_slots": 4,
        "occupied_slots": 2,
        "available_slots": 2,
        "utilization_percentage": 50.00,
        "user_pays_paise": 19900,
        "user_pays_rupees": 199.00,
        "monthly_revenue_paise": 39800,
        "monthly_revenue_rupees": 398.00,
        "subscription_cost_paise": 64900,
        "subscription_cost_rupees": 649.00,
        "monthly_margin_paise": -24900,
        "monthly_margin_rupees": -249.00,
        "is_active": true
      }
    ],
    "at_risk_slots": [
      {
        "slot_id": "slot-uuid",
        "slot_number": 2,
        "status": "GRACE",
        "expires_at": "2026-04-18T10:00:00Z",
        "plan_name": "Spotify Family",
        "user_name": "Karan Mehta",
        "user_email": "karan@example.com",
        "subsplit_score": 38
      }
    ]
  }
}
```

---

### POST `/api/admin/plans`

Create a new subscription plan. Automatically creates the corresponding slot records.

**Auth:** Admin

**Request Body:**
```json
{
  "name": "YouTube Premium Family",
  "category": "STREAMING",
  "description": "Ad-free YouTube for up to 5 family members. Includes YouTube Music Premium.",
  "logo_url": "https://example.com/youtube-logo.svg",
  "total_slots": 5,
  "subscription_cost_paise": 18900,
  "platform_fee_paise": 2100,
  "access_instructions": "You will receive a YouTube Premium Family invite. Accept via email.",
  "uptime_percentage": 99.50
}
```

**Business Logic on Create:**
1. Validate all fields.
2. Create the `Plan` record.
3. Loop from 1 to `total_slots` and create one `Slot` record per iteration with `status = AVAILABLE`.
4. All slot creation must succeed or the entire transaction rolls back.

**Success Response — `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "new-plan-uuid",
    "name": "YouTube Premium Family",
    "category": "STREAMING",
    "total_slots": 5,
    "subscription_cost_paise": 18900,
    "subscription_cost_rupees": 189.00,
    "platform_fee_paise": 2100,
    "platform_fee_rupees": 21.00,
    "slot_cost_paise": 3780,
    "slot_cost_rupees": 37.80,
    "user_pays_paise": 5880,
    "user_pays_rupees": 58.80,
    "available_slots": 5,
    "occupied_slots": 0,
    "uptime_percentage": 99.50,
    "is_active": true,
    "created_at": "2026-04-15T10:30:00Z"
  },
  "message": "Plan created with 5 slots."
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `401` | `NOT_AUTHENTICATED` | No or invalid token |
| `403` | `FORBIDDEN` | User is not an admin |
| `422` | `VALIDATION_ERROR` | Missing or invalid fields |

---

### GET `/api/admin/plans`

Get all plans (including inactive). Admin version includes full cost/margin data.

**Auth:** Admin

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `is_active` | boolean | No | Filter by active status |
| `category` | string | No | Filter by category |
| `skip` | integer | No | Default: `0` |
| `limit` | integer | No | Default: `50` |

**Success Response — `200 OK`:**

Same shape as `GET /api/plans` but includes `subscription_cost_paise`, `monthly_margin_paise`, and inactive plans.

---

### GET `/api/admin/plans/:id`

Get full plan details including all slot records and their current holders.

**Auth:** Admin

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "plan-uuid-here",
    "name": "Netflix Premium",
    "category": "STREAMING",
    "total_slots": 4,
    "subscription_cost_paise": 64900,
    "platform_fee_paise": 3700,
    "user_pays_paise": 19900,
    "available_slots": 2,
    "occupied_slots": 2,
    "is_active": true,
    "slots": [
      {
        "id": "slot-uuid-1",
        "slot_number": 1,
        "status": "OCCUPIED",
        "assigned_at": "2026-04-01T10:00:00Z",
        "expires_at": "2026-05-01T10:00:00Z",
        "user": {
          "id": "user-uuid",
          "name": "Arjun Rao",
          "email": "arjun@example.com",
          "subsplit_score": 85
        }
      },
      {
        "id": "slot-uuid-3",
        "slot_number": 3,
        "status": "AVAILABLE",
        "assigned_at": null,
        "expires_at": null,
        "user": null
      }
    ],
    "waitlist_count": 2
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `404` | `PLAN_NOT_FOUND` | Plan does not exist |

---

### PUT `/api/admin/plans/:id`

Update a plan's details or toggle its active status.

**Auth:** Admin

**Request Body (all fields optional):**
```json
{
  "name": "Netflix Premium 4K",
  "description": "Updated description",
  "logo_url": "https://example.com/new-logo.svg",
  "platform_fee_paise": 4000,
  "access_instructions": "Updated access instructions",
  "uptime_percentage": 99.80,
  "is_active": false
}
```

**Note:** `total_slots`, `subscription_cost_paise`, and `category` cannot be changed after creation to preserve data integrity. If these need to change, deactivate the plan and create a new one.

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": { "...updated plan object..." },
  "message": "Plan updated successfully."
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `404` | `PLAN_NOT_FOUND` | Plan does not exist |
| `422` | `VALIDATION_ERROR` | Invalid field values |

---

### POST `/api/admin/slots/:id/revoke`

Manually revoke a slot. Triggers waitlist promotion.

**Auth:** Admin

**Path Parameters:**
- `id` — UUID of the slot to revoke

**Request Body:**
```json
{
  "reason": "User requested account termination"
}
```

**Business Logic:**
1. Find the slot. Verify status is `OCCUPIED` or `GRACE`.
2. Set `slot.status = REVOKED`.
3. Create a `ScoreEvent` for the slot holder: `event_type = SLOT_REVOKED`, `delta = -20`.
4. Set `slot.user_id = NULL`.
5. Set `slot.status = AVAILABLE`.
6. Run waitlist promotion for the plan.

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "slot_id": "slot-uuid",
    "new_status": "AVAILABLE",
    "waitlist_promoted": true,
    "promoted_user_id": "user-uuid-or-null"
  },
  "message": "Slot revoked. Waitlist user notified."
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `404` | `SLOT_NOT_FOUND` | Slot does not exist |
| `409` | `SLOT_NOT_REVOKABLE` | Slot is already AVAILABLE or REVOKED |

---

### GET `/api/admin/users`

Get all registered users with their SubSplit Scores.

**Auth:** Admin

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `role` | string | No | Filter: `USER`, `ADMIN` |
| `score_max` | integer | No | Return users with score ≤ this value (e.g. `39` for at-risk users) |
| `skip` | integer | No | Default: `0` |
| `limit` | integer | No | Default: `50` |

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid",
        "name": "Arjun Rao",
        "email": "arjun@example.com",
        "role": "USER",
        "is_active": true,
        "subsplit_score": 85,
        "active_slot_count": 2,
        "created_at": "2026-01-10T00:00:00Z"
      }
    ],
    "total": 289,
    "skip": 0,
    "limit": 50
  }
}
```

---

### GET `/api/admin/users/:id`

Get full profile of a specific user including score history and active slots.

**Auth:** Admin

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "name": "Arjun Rao",
    "email": "arjun@example.com",
    "role": "USER",
    "is_active": true,
    "subsplit_score": 85,
    "created_at": "2026-01-10T00:00:00Z",
    "active_slots": [
      {
        "slot_id": "slot-uuid",
        "plan_name": "Netflix Premium",
        "status": "OCCUPIED",
        "expires_at": "2026-05-01T10:00:00Z"
      }
    ],
    "score_events": [
      {
        "event_type": "ON_TIME_PAYMENT",
        "delta": 5,
        "description": "On-time payment for Netflix Premium",
        "created_at": "2026-04-01T10:00:00Z"
      }
    ],
    "payment_history": [
      {
        "amount_paise": 19900,
        "status": "SUCCESS",
        "created_at": "2026-04-01T10:00:00Z",
        "plan_name": "Netflix Premium"
      }
    ]
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| `404` | `USER_NOT_FOUND` | User does not exist |

---

### PATCH `/api/admin/users/:id/deactivate`

Deactivate a user account. The user can no longer log in.

**Auth:** Admin

**Request Body:** None

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": null,
  "message": "User account deactivated."
}
```

---

### GET `/api/admin/analytics`

Get comprehensive analytics data for the admin analytics page. This is the main data source for the analytics dashboard.

**Auth:** Admin

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "revenue_by_category": [
      { "category": "STREAMING", "revenue_paise": 2140000, "revenue_rupees": 21400.00 },
      { "category": "PRODUCTIVITY", "revenue_paise": 1420000, "revenue_rupees": 14200.00 },
      { "category": "EDUCATION", "revenue_paise": 760000, "revenue_rupees": 7600.00 },
      { "category": "MUSIC", "revenue_paise": 310000, "revenue_rupees": 3100.00 },
      { "category": "GAMING", "revenue_paise": 193000, "revenue_rupees": 1930.00 }
    ],
    "slot_utilization_by_category": [
      { "category": "STREAMING", "utilization_percentage": 96.00 },
      { "category": "MUSIC", "utilization_percentage": 90.00 },
      { "category": "GAMING", "utilization_percentage": 85.00 },
      { "category": "PRODUCTIVITY", "utilization_percentage": 78.00 },
      { "category": "EDUCATION", "utilization_percentage": 62.00 }
    ],
    "users_by_category": [
      { "category": "STREAMING", "user_count": 142 },
      { "category": "MUSIC", "user_count": 98 },
      { "category": "EDUCATION", "user_count": 67 },
      { "category": "GAMING", "user_count": 54 },
      { "category": "PRODUCTIVITY", "user_count": 39 }
    ],
    "revenue_trend": [
      { "month": "2025-11", "revenue_paise": 2840000, "revenue_rupees": 28400.00 },
      { "month": "2025-12", "revenue_paise": 3120000, "revenue_rupees": 31200.00 },
      { "month": "2026-01", "revenue_paise": 3570000, "revenue_rupees": 35700.00 },
      { "month": "2026-02", "revenue_paise": 3910000, "revenue_rupees": 39100.00 },
      { "month": "2026-03", "revenue_paise": 4380000, "revenue_rupees": 43800.00 },
      { "month": "2026-04", "revenue_paise": 4823000, "revenue_rupees": 48230.00 }
    ],
    "score_distribution": {
      "high": { "range": "75-100", "count": 187 },
      "medium": { "range": "40-74", "count": 74 },
      "low": { "range": "0-39", "count": 28 }
    },
    "demand_signals": [
      {
        "id": "demand-uuid-1",
        "name": "YouTube Premium",
        "category": "STREAMING",
        "request_count": 89,
        "estimated_margin_paise": 3100,
        "estimated_margin_rupees": 31.00
      },
      {
        "id": "demand-uuid-2",
        "name": "LinkedIn Learning",
        "category": "EDUCATION",
        "request_count": 67,
        "estimated_margin_paise": 21000,
        "estimated_margin_rupees": 210.00
      },
      {
        "id": "demand-uuid-3",
        "name": "PlayStation Plus",
        "category": "GAMING",
        "request_count": 54,
        "estimated_margin_paise": 12000,
        "estimated_margin_rupees": 120.00
      },
      {
        "id": "demand-uuid-4",
        "name": "Notion AI",
        "category": "PRODUCTIVITY",
        "request_count": 41,
        "estimated_margin_paise": 8900,
        "estimated_margin_rupees": 89.00
      },
      {
        "id": "demand-uuid-5",
        "name": "Disney+ Hotstar",
        "category": "STREAMING",
        "request_count": 38,
        "estimated_margin_paise": 4400,
        "estimated_margin_rupees": 44.00
      },
      {
        "id": "demand-uuid-6",
        "name": "Duolingo Max",
        "category": "EDUCATION",
        "request_count": 29,
        "estimated_margin_paise": 6700,
        "estimated_margin_rupees": 67.00
      }
    ],
    "recent_activity": [
      {
        "user_name": "Arjun Rao",
        "user_initials": "AR",
        "subsplit_score": 92,
        "action": "Purchased slot on Netflix Premium",
        "action_type": "SLOT_PURCHASE",
        "timestamp": "2026-04-15T10:30:00Z"
      },
      {
        "user_name": "Karan Mehta",
        "user_initials": "KM",
        "subsplit_score": 38,
        "action": "Slot revoked — Xbox Game Pass",
        "action_type": "SLOT_REVOKED",
        "timestamp": "2026-04-14T08:15:00Z"
      }
    ]
  }
}
```

**Note:** `demand_signals` and `revenue_trend` data is seeded into the database via the seed script. These are not dynamically calculated for the MVP.

---

### GET `/api/admin/waitlist/:planId`

Get the full waitlist for a specific plan, sorted by SubSplit Score descending.

**Auth:** Admin

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "plan_id": "plan-uuid",
    "plan_name": "Netflix Premium",
    "waitlist": [
      {
        "position": 1,
        "entry_id": "entry-uuid-1",
        "user": {
          "id": "user-uuid",
          "name": "Vivek Kumar",
          "email": "vivek@example.com",
          "subsplit_score": 88
        },
        "joined_at": "2026-04-10T09:00:00Z",
        "notified": false
      },
      {
        "position": 2,
        "user": {
          "id": "user-uuid-2",
          "name": "Neha Singh",
          "email": "neha@example.com",
          "subsplit_score": 55
        },
        "joined_at": "2026-04-12T14:00:00Z",
        "notified": false
      }
    ],
    "total_waiting": 2
  }
}
```

---

## 10. FastAPI App Entry Point

### `backend/app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, plans, slots, payments, waitlist, scores, admin

app = FastAPI(
    title="SubSplit API",
    description="Subscription sharing platform — SubSplit buys the plan, you buy the slot.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow the React frontend on port 5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router,     prefix="/api/auth",      tags=["Authentication"])
app.include_router(plans.router,    prefix="/api/plans",     tags=["Plans"])
app.include_router(slots.router,    prefix="/api/slots",     tags=["Slots"])
app.include_router(payments.router, prefix="/api/payments",  tags=["Payments"])
app.include_router(waitlist.router, prefix="/api/waitlist",  tags=["Waitlist"])
app.include_router(scores.router,   prefix="/api/scores",    tags=["SubSplit Score"])
app.include_router(admin.router,    prefix="/api/admin",     tags=["Admin"])


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "SubSplit API is running."}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
```

---

## 11. Dependencies and Security

### `backend/app/dependencies.py`
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate JWT. Return the current user."""
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "NOT_AUTHENTICATED", "message": "Invalid or expired token"},
        )
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "NOT_AUTHENTICATED", "message": "User not found or inactive"},
        )
    return user


def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Verify the current user has ADMIN role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Admin access required"},
        )
    return current_user
```

### `backend/app/core/security.py`
```python
import os
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
```

---

## 12. Error Code Reference

Complete list of all error codes returned by the SubSplit API.

| Code | HTTP Status | Description |
|---|---|---|
| `EMAIL_ALREADY_EXISTS` | 409 | Registration email is already in use |
| `INVALID_CREDENTIALS` | 401 | Email or password is incorrect |
| `ACCOUNT_INACTIVE` | 403 | User account has been deactivated by admin |
| `NOT_AUTHENTICATED` | 401 | No JWT token or token is invalid/expired |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `VALIDATION_ERROR` | 422 | Request body failed Pydantic validation |
| `PLAN_NOT_FOUND` | 404 | Plan ID does not exist in the database |
| `PLAN_INACTIVE` | 404 | Plan exists but has been deactivated |
| `PLAN_FULL` | 409 | No available slots on the requested plan |
| `INVALID_CATEGORY` | 400 | Category value is not a valid enum option |
| `SLOT_NOT_FOUND` | 404 | Slot ID does not exist |
| `SLOT_NOT_CANCELLABLE` | 409 | Slot is not in OCCUPIED status |
| `SLOT_NOT_REVOKABLE` | 409 | Slot is already AVAILABLE or REVOKED |
| `ALREADY_SUBSCRIBED` | 409 | User already holds a slot on this plan |
| `PAYMENT_NOT_FOUND` | 404 | No payment found for the given Razorpay order ID |
| `PAYMENT_ALREADY_PROCESSED` | 409 | Payment is not in PENDING status |
| `INVALID_SIGNATURE` | 400 | Razorpay HMAC signature verification failed |
| `PAYMENT_GATEWAY_ERROR` | 500 | Razorpay API call returned an error |
| `SLOTS_AVAILABLE` | 409 | User tried to join waitlist but slots are still available |
| `ALREADY_ON_WAITLIST` | 409 | User is already on this plan's waitlist |
| `WAITLIST_ENTRY_NOT_FOUND` | 404 | User is not on the specified plan's waitlist |
| `USER_NOT_FOUND` | 404 | Admin requested a user that does not exist |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

---

## Endpoint Summary Table

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login and get JWT |
| GET | `/api/auth/me` | User | Get current user profile |
| PUT | `/api/auth/me` | User | Update current user profile |
| GET | `/api/plans` | None | List all active plans |
| GET | `/api/plans/:id` | None | Get single plan detail |
| GET | `/api/slots/my` | User | Get user's active slots |
| GET | `/api/slots/:id` | User | Get single slot detail |
| DELETE | `/api/slots/:id/cancel` | User | Cancel an active slot |
| POST | `/api/payments/create-order` | User | Create Razorpay order |
| POST | `/api/payments/verify` | User | Verify payment and activate slot |
| GET | `/api/payments/my` | User | Get payment history |
| POST | `/api/waitlist/join` | User | Join a plan waitlist |
| DELETE | `/api/waitlist/leave/:planId` | User | Leave a plan waitlist |
| GET | `/api/waitlist/my` | User | Get all user's waitlist entries |
| GET | `/api/scores/my` | User | Get SubSplit Score and history |
| GET | `/api/admin/dashboard` | Admin | Platform overview metrics |
| POST | `/api/admin/plans` | Admin | Create new plan |
| GET | `/api/admin/plans` | Admin | List all plans (incl. inactive) |
| GET | `/api/admin/plans/:id` | Admin | Full plan detail with slots |
| PUT | `/api/admin/plans/:id` | Admin | Update plan |
| POST | `/api/admin/slots/:id/revoke` | Admin | Manually revoke a slot |
| GET | `/api/admin/users` | Admin | List all users |
| GET | `/api/admin/users/:id` | Admin | Full user profile |
| PATCH | `/api/admin/users/:id/deactivate` | Admin | Deactivate user account |
| GET | `/api/admin/analytics` | Admin | Full analytics data |
| GET | `/api/admin/waitlist/:planId` | Admin | Get plan waitlist |

**Total endpoints: 26**

---

*End of API Specification Document — SubSplit v1.0 MVP*
