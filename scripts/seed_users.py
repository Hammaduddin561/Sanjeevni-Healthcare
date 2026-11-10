#!/usr/bin/env python3
"""
Database seed script for Sanjeevni Healthcarer.
Creates 3 primary demo accounts:
1. Health Worker (ASHA): worker@sanjeevni.org
2. Doctor (PHC): doctor@phc.org (and doc@hospital.com for legacy compatibility)
3. Administrator: admin@hospital.org
"""
import os
import sys

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import Base, engine, SessionLocal
from backend.models.user import User
from backend.auth import get_password_hash

def seed():
    print("🌱 Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    demo_users = [
        {
            "email": "worker@sanjeevni.org",
            "name": "Sunita Devi (ASHA Worker)",
            "role": "worker",
            "password": "Password@123",
            "specialty": "Community Health",
            "hospital": "Sub-Health Centre Rampur"
        },
        {
            "email": "doctor@phc.org",
            "name": "Dr. Ramesh Gupta (MO)",
            "role": "doctor",
            "password": "Password@123",
            "specialty": "Primary Care Medicine",
            "hospital": "Primary Health Centre Rampur"
        },
        {
            "email": "doc@hospital.com",
            "name": "Dr. Ramesh Gupta (MO)",
            "role": "doctor",
            "password": "password123",
            "specialty": "Primary Care Medicine",
            "hospital": "Primary Health Centre Rampur"
        },
        {
            "email": "admin@hospital.org",
            "name": "System Administrator",
            "role": "admin",
            "password": "password123",
            "specialty": "Clinical Informatics",
            "hospital": "District Hospital"
        }
    ]

    try:
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
                    hospital=u["hospital"]
                )
                db.add(user)
                created_count += 1
        db.commit()
        print(f"✅ Seeding completed: {created_count} users created, {updated_count} updated.")
        print("\nDemo Credentials:")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("  1. Health Worker:  worker@sanjeevni.org   / Password@123")
        print("  2. PHC Doctor:     doctor@phc.org         / Password@123")
        print("     (Legacy Doc):   doc@hospital.com       / password123")
        print("  3. Admin:          admin@hospital.org     / password123")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
