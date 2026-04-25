"""
SubSplit database seed script.
Run with: python -m app.seed
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.demand_signal import DemandSignal
from app.models.payment import Payment, PaymentStatus
from app.models.plan import Plan, PlanCategory
from app.models.score_event import SCORE_DELTAS, ScoreEvent, ScoreEventType
from app.models.slot import Slot, SlotStatus
from app.models.user import User, UserRole
from app.models.waitlist import WaitlistEntry
from app.services.slot_service import create_plan_slots, transition_slot


def seed_database() -> None:
    db: Session = SessionLocal()
    try:
        existing_admin = db.query(User).filter(User.email == "admin@subsplit.com").first()
        if existing_admin:
            print("Database already seeded.")
            return

        print("Seeding SubSplit database...")

        counts = {
            "users": 0,
            "score_events": 0,
            "plans": 0,
            "slots": 0,
            "payments": 0,
            "waitlist_entries": 0,
            "demand_signals": 0,
        }

        admin = User(
            name="SubSplit Admin",
            email="admin@subsplit.com",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
        )
        db.add(admin)
        counts["users"] += 1

        users_data = [
            ("Arjun Rao", "arjun@example.com", 90),
            ("Priya Sharma", "priya@example.com", 75),
            ("Karan Mehta", "karan@example.com", 38),
            ("Neha Singh", "neha@example.com", 55),
            ("Vivek Kumar", "vivek@example.com", 88),
        ]
        users: list[tuple[User, int]] = []
        for name, email, target_score in users_data:
            user = User(
                name=name,
                email=email,
                hashed_password=get_password_hash("password123"),
                role=UserRole.USER,
            )
            db.add(user)
            users.append((user, target_score))
            counts["users"] += 1

        db.flush()

        for user, target_score in users:
            delta_needed = target_score - 100
            if delta_needed > 0:
                event_delta = SCORE_DELTAS[ScoreEventType.ON_TIME_PAYMENT]
                for _ in range(delta_needed // event_delta):
                    db.add(
                        ScoreEvent(
                            user_id=user.id,
                            event_type=ScoreEventType.ON_TIME_PAYMENT,
                            delta=SCORE_DELTAS[ScoreEventType.ON_TIME_PAYMENT],
                            description="On-time payment",
                        )
                    )
                    counts["score_events"] += 1
            elif delta_needed < 0:
                if delta_needed <= SCORE_DELTAS[ScoreEventType.SLOT_REVOKED]:
                    db.add(
                        ScoreEvent(
                            user_id=user.id,
                            event_type=ScoreEventType.SLOT_REVOKED,
                            delta=SCORE_DELTAS[ScoreEventType.SLOT_REVOKED],
                            description="Slot revoked due to non-payment",
                        )
                    )
                    counts["score_events"] += 1
                    remaining = delta_needed - SCORE_DELTAS[ScoreEventType.SLOT_REVOKED]
                    late_delta = abs(SCORE_DELTAS[ScoreEventType.LATE_PAYMENT])
                    late_payments_needed = (abs(remaining) + late_delta - 1) // late_delta
                    for _ in range(late_payments_needed):
                        db.add(
                            ScoreEvent(
                                user_id=user.id,
                                event_type=ScoreEventType.LATE_PAYMENT,
                                delta=SCORE_DELTAS[ScoreEventType.LATE_PAYMENT],
                                description="Late payment during grace period",
                            )
                        )
                        counts["score_events"] += 1
                else:
                    late_delta = abs(SCORE_DELTAS[ScoreEventType.LATE_PAYMENT])
                    late_payments_needed = (abs(delta_needed) + late_delta - 1) // late_delta
                    for _ in range(late_payments_needed):
                        db.add(
                            ScoreEvent(
                                user_id=user.id,
                                event_type=ScoreEventType.LATE_PAYMENT,
                                delta=SCORE_DELTAS[ScoreEventType.LATE_PAYMENT],
                                description="Late payment during grace period",
                            )
                        )
                        counts["score_events"] += 1

        plans_data = [
            {
                "name": "Netflix Premium",
                "category": PlanCategory.STREAMING,
                "description": (
                    "4K Ultra HD streaming on 4 screens simultaneously. "
                    "Includes all Netflix originals and movies."
                ),
                "logo_url": (
                    "https://upload.wikimedia.org/wikipedia/commons/0/08/"
                    "Netflix_2015_logo.svg"
                ),
                "total_slots": 4,
                "subscription_cost_paise": 64900,
                "platform_fee_paise": 3700,
                "access_instructions": (
                    "You will receive a profile invite email from SubSplit within 10 "
                    "minutes of purchase. Accept the invite and set your profile PIN. "
                    "Do not change the account email or password."
                ),
                "uptime_percentage": Decimal("99.20"),
            },
            {
                "name": "Spotify Family",
                "category": PlanCategory.MUSIC,
                "description": (
                    "Individual Spotify Premium accounts for up to 6 family members. "
                    "Full features, separate libraries."
                ),
                "logo_url": (
                    "https://upload.wikimedia.org/wikipedia/commons/1/19/"
                    "Spotify_logo_without_text.svg"
                ),
                "total_slots": 6,
                "subscription_cost_paise": 17900,
                "platform_fee_paise": 2100,
                "access_instructions": (
                    "You will receive an invite to join the SubSplit Spotify Family "
                    "plan. Accept via email. Your music library and playlists remain "
                    "completely separate."
                ),
                "uptime_percentage": Decimal("99.80"),
            },
            {
                "name": "Amazon Prime",
                "category": PlanCategory.STREAMING,
                "description": (
                    "Prime Video access including Prime originals, fast delivery "
                    "benefits, and Prime Music."
                ),
                "logo_url": None,
                "total_slots": 2,
                "subscription_cost_paise": 29900,
                "platform_fee_paise": 5000,
                "access_instructions": (
                    "You will get access to a shared Amazon Prime account. Use only "
                    "the Prime Video and Music features. Do not make purchases on "
                    "the account."
                ),
                "uptime_percentage": Decimal("98.90"),
            },
            {
                "name": "Adobe Creative Cloud",
                "category": PlanCategory.PRODUCTIVITY,
                "description": (
                    "Full Adobe Creative Cloud Teams plan. Access Photoshop, "
                    "Illustrator, Premiere Pro, After Effects, and all 20+ apps."
                ),
                "logo_url": None,
                "total_slots": 3,
                "subscription_cost_paise": 423000,
                "platform_fee_paise": 27000,
                "access_instructions": (
                    "You will receive an Adobe Teams invitation email. Create your "
                    "personal Adobe ID and accept. All your work is saved to your "
                    "personal Creative Cloud storage."
                ),
                "uptime_percentage": Decimal("99.50"),
            },
            {
                "name": "Microsoft 365 Family",
                "category": PlanCategory.PRODUCTIVITY,
                "description": (
                    "Word, Excel, PowerPoint, Outlook, Teams, and 1TB OneDrive for "
                    "each user. Desktop and web versions included."
                ),
                "logo_url": None,
                "total_slots": 6,
                "subscription_cost_paise": 48900,
                "platform_fee_paise": 3100,
                "access_instructions": (
                    "You will receive a Microsoft 365 Family sharing invitation. "
                    "Sign in with your personal Microsoft account to activate your "
                    "subscription."
                ),
                "uptime_percentage": Decimal("99.90"),
            },
            {
                "name": "Coursera Plus",
                "category": PlanCategory.EDUCATION,
                "description": (
                    "Unlimited access to 7,000+ courses, professional certificates, "
                    "and guided projects from top universities."
                ),
                "logo_url": None,
                "total_slots": 3,
                "subscription_cost_paise": 380000,
                "platform_fee_paise": 20000,
                "access_instructions": (
                    "You will receive login credentials for your dedicated Coursera "
                    "account under the SubSplit team plan. All your course progress "
                    "and certificates are saved to your profile."
                ),
                "uptime_percentage": Decimal("99.10"),
            },
            {
                "name": "Xbox Game Pass Ultimate",
                "category": PlanCategory.GAMING,
                "description": (
                    "100+ high-quality games, EA Play membership, Xbox Live Gold, "
                    "and cloud gaming included."
                ),
                "logo_url": None,
                "total_slots": 2,
                "subscription_cost_paise": 49900,
                "platform_fee_paise": 8000,
                "access_instructions": (
                    "SubSplit uses Xbox home sharing. You need to set the SubSplit "
                    "account as your Home Xbox. Detailed setup instructions will be "
                    "sent after purchase."
                ),
                "uptime_percentage": Decimal("97.80"),
            },
        ]

        plans: list[Plan] = []
        for plan_data in plans_data:
            plan = Plan(**plan_data)
            db.add(plan)
            plans.append(plan)
            counts["plans"] += 1

        db.flush()

        now = datetime.now(timezone.utc)
        slot_assignments: list[tuple[Slot, User]] = []
        demo_users = [user for user, _ in users]

        for plan in plans:
            slots = create_plan_slots(db=db, plan=plan)
            counts["slots"] += len(slots)

            if len(slots) >= 1 and len(demo_users) >= 1:
                first_slot = slots[0]
                first_user = demo_users[0]
                first_slot.user_id = first_user.id
                transition_slot(db=db, slot=first_slot, new_status=SlotStatus.OCCUPIED)
                first_slot.assigned_at = now - timedelta(days=15)
                first_slot.expires_at = now + timedelta(days=15)
                slot_assignments.append((first_slot, first_user))

            if len(slots) >= 2 and len(demo_users) >= 2:
                second_slot = slots[1]
                second_user = demo_users[1]
                second_slot.user_id = second_user.id
                transition_slot(db=db, slot=second_slot, new_status=SlotStatus.OCCUPIED)
                second_slot.assigned_at = now - timedelta(days=10)
                second_slot.expires_at = now + timedelta(days=20)
                slot_assignments.append((second_slot, second_user))

        db.flush()

        for slot, user in slot_assignments:
            plan = db.query(Plan).filter(Plan.id == slot.plan_id).first()
            db.add(
                Payment(
                    user_id=user.id,
                    slot_id=slot.id,
                    amount_paise=plan.user_pays_paise,
                    status=PaymentStatus.SUCCESS,
                    razorpay_order_id=f"order_demo_{uuid.uuid4().hex[:16]}",
                    razorpay_payment_id=f"pay_demo_{uuid.uuid4().hex[:16]}",
                    razorpay_signature="demo_signature_verified",
                )
            )
            counts["payments"] += 1

        netflix = next(plan for plan in plans if plan.name == "Netflix Premium")
        for user, _ in users[2:4]:
            db.add(
                WaitlistEntry(
                    user_id=user.id,
                    plan_id=netflix.id,
                )
            )
            counts["waitlist_entries"] += 1

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
            counts["demand_signals"] += 1

        db.commit()

        print("Database seeded successfully.")
        print("  Admin: admin@subsplit.com / admin123")
        print("  Users: arjun@example.com / password123 (and 4 others)")
        print("  Created counts:")
        print(f"    Users: {counts['users']}")
        print(f"    Score events: {counts['score_events']}")
        print(f"    Plans: {counts['plans']}")
        print(f"    Slots: {counts['slots']}")
        print(f"    Payments: {counts['payments']}")
        print(f"    Waitlist entries: {counts['waitlist_entries']}")
        print(f"    Demand signals: {counts['demand_signals']}")
    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
