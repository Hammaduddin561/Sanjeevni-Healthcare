#!/usr/bin/env python3
"""
Database seed script for Sanjeevni Healthcarer.
Creates 3 demo accounts:
1. Health Worker (ASHA): worker@sanjeevni.org
2. Doctor (PHC): doctor@phc.org
3. Administrator: admin@hospital.org

Passwords must be supplied via SEED_WORKER_PASSWORD, SEED_DOCTOR_PASSWORD,
SEED_ADMIN_PASSWORD environment variables (dev defaults allowed ONLY when
APP_ENV is explicitly set to "development").
"""
import os
import sys

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

APP_ENV = (os.getenv("APP_ENV") or "").strip().lower()


def _resolve_seed_password(env_var: str, dev_default: str) -> str:
    val = os.getenv(env_var)
    if val:
        return val
    if APP_ENV == "development":
        return dev_default
    raise RuntimeError(
        f"Missing {env_var}: seed passwords must come from environment variables unless APP_ENV=development."
    )


def seed():
    from backend.database import Base, engine, SessionLocal
    from backend.models.user import User
    from backend.auth import get_password_hash

    worker_pw = _resolve_seed_password("SEED_WORKER_PASSWORD", "Password@123")
    doctor_pw = _resolve_seed_password("SEED_DOCTOR_PASSWORD", "Password@123")
    admin_pw = _resolve_seed_password("SEED_ADMIN_PASSWORD", "password123")

    print("🌱 Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    demo_users = [
        {
            "email": "worker@sanjeevni.org",
            "name": "Sunita Devi (ASHA Worker)",
            "role": "worker",
            "password": worker_pw,
            "specialty": "Community Health",
            "hospital": "Sub-Health Centre Rampur",
        },
        {
            "email": "doctor@phc.org",
            "name": "Dr. Ramesh Gupta (MO)",
            "role": "doctor",
            "password": doctor_pw,
            "specialty": "Primary Care Medicine",
            "hospital": "Primary Health Centre Rampur",
        },
        {
            "email": "admin@hospital.org",
            "name": "System Administrator",
            "role": "admin",
            "password": admin_pw,
            "specialty": "Clinical Informatics",
            "hospital": "District Hospital",
        },
    ]

    try:
        # Remove legacy duplicate demo account doc@hospital.com if present
        removed = db.query(User).filter(User.email == "doc@hospital.com").delete()
        if removed:
            print(f"🧹 Removed legacy duplicate demo user: doc@hospital.com")

        created_count = 0
        updated_count = 0
        for u in demo_users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            hashed = get_password_hash(u["password"])
            if existing:
                existing.name = u["name"]
                existing.role = u["role"]
                existing.hashed_password = hashed
                existing.specialty = u["specialty"]
                existing.hospital = u["hospital"]
                updated_count += 1
            else:
                user = User(
                    email=u["email"],
                    name=u["name"],
                    role=u["role"],
                    hashed_password=hashed,
                    specialty=u["specialty"],
                    hospital=u["hospital"],
                )
                db.add(user)
                created_count += 1
        db.commit()
        print(f"✅ Seeding completed: {created_count} users created, {updated_count} updated.")
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
