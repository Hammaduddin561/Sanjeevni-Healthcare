import sys
import os
import json
import uuid
from datetime import datetime, timedelta

# Add repo root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import SessionLocal, engine, Base
from backend.models.visit import Visit
from backend.models.safety_layer import SafetyLayer


DEMO_PERSONAS = [
    {
        "patient_id": "P_GREEN_01",
        "patient_name": "Sunita Sharma",
        "worker_id": "worker@sanjeevni.org",
        "worker_name": "Sunita Devi (ASHA)",
        "village": "Rampur Sub-Centre",
        "age": 32,
        "gender": "Female",
        "bmi": 22.1,
        "blood_glucose_level": 92.0,
        "HbA1c_level": 5.2,
        "smoking_history": "never",
        "hypertension": 0,
        "heart_disease": 0,
        "systolic_bp": 116.0,
        "diastolic_bp": 74.0,
        "phq9_scores": [0]*9,
        "ml_risk_score": 0.04,
        "notes": "Routine doorstep screening visit. Patient is active and reports healthy appetite.",
        "days_ago": 1
    },
    {
        "patient_id": "P_YELLOW_02",
        "patient_name": "Ramesh Patel",
        "worker_id": "worker@sanjeevni.org",
        "worker_name": "Sunita Devi (ASHA)",
        "village": "Shivpur Sub-Centre",
        "age": 54,
        "gender": "Male",
        "bmi": 27.8,
        "blood_glucose_level": 165.0,
        "HbA1c_level": 6.8,
        "smoking_history": "former",
        "hypertension": 1,
        "heart_disease": 0,
        "systolic_bp": 142.0,
        "diastolic_bp": 92.0,
        "phq9_scores": [1, 1, 1, 1, 1, 1, 0, 0, 0],
        "ml_risk_score": 0.38,
        "notes": "Stage 2 hypertension and borderline diabetes. Advised PHC visit within 7 days.",
        "days_ago": 2
    },
    {
        "patient_id": "P_RED_03",
        "patient_name": "Kamla Bai",
        "worker_id": "worker@sanjeevni.org",
        "worker_name": "Sunita Devi (ASHA)",
        "village": "Kishanpur Sector 2",
        "age": 61,
        "gender": "Female",
        "bmi": 31.4,
        "blood_glucose_level": 315.0,
        "HbA1c_level": 9.4,
        "smoking_history": "never",
        "hypertension": 1,
        "heart_disease": 1,
        "systolic_bp": 184.0,
        "diastolic_bp": 118.0,
        "phq9_scores": [2, 2, 2, 2, 2, 1, 0, 0, 1], # Q9 affirmative
        "ml_risk_score": 0.91,
        "notes": "URGENT CRISIS: Hypertensive crisis, severe hyperglycemia, and active depression distress flag.",
        "days_ago": 0
    }
]

# Additional 12 village screening records
ADDITIONAL_RECORDS = [
    ("P_1004", "Mohan Lal", 48, "Male", 26.1, 135, 6.1, 128, 84, [0]*9, "Rampur Sub-Centre", 0.18, 3),
    ("P_1005", "Geeta Devi", 58, "Female", 29.3, 195, 7.5, 150, 96, [1, 0, 1, 0, 0, 0, 0, 0, 0], "Kishanpur Sector 2", 0.62, 3),
    ("P_1006", "Anand Verma", 38, "Male", 23.5, 105, 5.4, 118, 76, [0]*9, "Shivpur Sub-Centre", 0.06, 4),
    ("P_1007", "Shanti Bai", 67, "Female", 32.0, 320, 9.8, 175, 105, [2, 2, 1, 1, 0, 0, 0, 0, 0], "Rampur Sub-Centre", 0.88, 4),
    ("P_1008", "Rajesh Kumar", 51, "Male", 28.0, 170, 7.1, 144, 92, [1, 1, 0, 0, 0, 0, 0, 0, 0], "Kishanpur Sector 2", 0.44, 5),
    ("P_1009", "Pooja Yadav", 29, "Female", 21.8, 88, 5.0, 112, 72, [0]*9, "Shivpur Sub-Centre", 0.03, 5),
    ("P_1010", "Dinesh Chandra", 63, "Male", 30.5, 240, 8.2, 160, 98, [1, 2, 1, 1, 0, 0, 0, 0, 0], "Rampur Sub-Centre", 0.72, 6),
    ("P_1011", "Meena Kumari", 44, "Female", 25.2, 122, 5.9, 124, 80, [0]*9, "Shivpur Sub-Centre", 0.12, 7),
    ("P_1012", "Bhagwan Das", 72, "Male", 27.4, 185, 7.6, 188, 112, [0]*9, "Kishanpur Sector 2", 0.79, 8),
    ("P_1013", "Sita Ram", 56, "Male", 26.9, 148, 6.4, 136, 88, [0, 1, 0, 0, 0, 0, 0, 0, 0], "Rampur Sub-Centre", 0.28, 9),
    ("P_1014", "Rekha Devi", 35, "Female", 24.0, 98, 5.3, 114, 76, [0]*9, "Shivpur Sub-Centre", 0.05, 10),
    ("P_1015", "Harishankar", 60, "Male", 33.1, 280, 9.0, 168, 102, [2, 1, 1, 1, 1, 0, 0, 0, 0], "Kishanpur Sector 2", 0.84, 11),
]


def seed_demo_data():
    print("Initializing database...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if Kamla Bai already seeded
        existing = db.query(Visit).filter(Visit.patient_id == "P_RED_03").first()
        if existing:
            print("Demo data already seeded in database.")
            return

        total_seeded = 0

        # Seed 3 primary personas
        for p in DEMO_PERSONAS:
            patient_dict = {
                "systolic_bp": p["systolic_bp"],
                "diastolic_bp": p["diastolic_bp"],
                "blood_glucose_level": p["blood_glucose_level"],
                "HbA1c_level": p["HbA1c_level"],
                "phq9_scores": p["phq9_scores"]
            }
            safety = SafetyLayer.evaluate_triage(
                patient_data=patient_dict,
                ml_risk_score=p["ml_risk_score"]
            )

            visit_time = datetime.utcnow() - timedelta(days=p["days_ago"], hours=2)

            visit = Visit(
                visit_id=f"visit_{p['patient_id'].lower()}",
                patient_id=p["patient_id"],
                patient_name=p["patient_name"],
                worker_id=p["worker_id"],
                worker_name=p["worker_name"],
                village=p["village"],
                timestamp=visit_time,
                age=p["age"],
                gender=p["gender"],
                bmi=p["bmi"],
                blood_glucose_level=p["blood_glucose_level"],
                HbA1c_level=p["HbA1c_level"],
                smoking_history=p["smoking_history"],
                hypertension_flag=p["hypertension"],
                heart_disease=p["heart_disease"],
                systolic_bp=p["systolic_bp"],
                diastolic_bp=p["diastolic_bp"],
                phq9_scores=json.dumps(p["phq9_scores"]),
                phq9_total=safety.phq9_total,
                phq9_severity=safety.phq9_severity,
                phq9_crisis_flag=safety.phq9_crisis_flag,
                ml_risk_score=p["ml_risk_score"],
                ml_triage=safety.ml_triage,
                final_triage=safety.final_triage,
                safety_escalated=safety.safety_escalated,
                escalation_reasons=json.dumps(safety.escalation_reasons),
                action_headline=safety.action_headline,
                action_details=safety.action_details,
                notes=p["notes"]
            )
            db.add(visit)
            total_seeded += 1

        # Seed additional records
        for pid, name, age, gender, bmi, glu, a1c, s_bp, d_bp, phq, village, ml_risk, days in ADDITIONAL_RECORDS:
            patient_dict = {
                "systolic_bp": s_bp,
                "diastolic_bp": d_bp,
                "blood_glucose_level": glu,
                "HbA1c_level": a1c,
                "phq9_scores": phq
            }
            safety = SafetyLayer.evaluate_triage(
                patient_data=patient_dict,
                ml_risk_score=ml_risk
            )
            v_time = datetime.utcnow() - timedelta(days=days, hours=4)
            v = Visit(
                visit_id=f"visit_{pid.lower()}_{uuid.uuid4().hex[:6]}",
                patient_id=pid,
                patient_name=name,
                worker_id="worker@sanjeevni.org",
                worker_name="Sunita Devi (ASHA)",
                village=village,
                timestamp=v_time,
                age=age,
                gender=gender,
                bmi=bmi,
                blood_glucose_level=glu,
                HbA1c_level=a1c,
                smoking_history="never",
                hypertension_flag=1 if (s_bp >= 140 or d_bp >= 90) else 0,
                heart_disease=0,
                systolic_bp=s_bp,
                diastolic_bp=d_bp,
                phq9_scores=json.dumps(phq),
                phq9_total=safety.phq9_total,
                phq9_severity=safety.phq9_severity,
                phq9_crisis_flag=safety.phq9_crisis_flag,
                ml_risk_score=ml_risk,
                ml_triage=safety.ml_triage,
                final_triage=safety.final_triage,
                safety_escalated=safety.safety_escalated,
                escalation_reasons=json.dumps(safety.escalation_reasons),
                action_headline=safety.action_headline,
                action_details=safety.action_details,
                notes=f"Doorstep visit in {village}."
            )
            db.add(v)
            total_seeded += 1

        db.commit()
        print(f"✅ Successfully seeded {total_seeded} clinical screening visits into SQLite.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding demo data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
