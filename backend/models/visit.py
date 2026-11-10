from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, Text, Boolean
from backend.database import Base


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(String, unique=True, index=True, nullable=False)
    patient_id = Column(String, index=True, nullable=False)
    patient_name = Column(String, nullable=True)
    worker_id = Column(String, index=True, nullable=False)
    worker_name = Column(String, nullable=True)
    village = Column(String, index=True, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Vitals & Screeners
    gender = Column(String, nullable=False)
    age = Column(Float, nullable=False)
    bmi = Column(Float, nullable=False)
    systolic_bp = Column(Float, nullable=True)
    diastolic_bp = Column(Float, nullable=True)
    hypertension_flag = Column(Integer, default=0)
    blood_glucose_level = Column(Float, nullable=True)
    HbA1c_level = Column(Float, nullable=True)
    lab_mode = Column(String, default="full_lab")
    smoking_history = Column(String, default="never")
    heart_disease = Column(Integer, default=0)

    # PHQ-9 Mental Health Screen
    phq9_scores = Column(Text, nullable=True) # JSON list string e.g. "[0,1,0,0,0,0,0,0,0]"
    phq9_total = Column(Integer, default=0)
    phq9_severity = Column(String, default="None-Minimal")
    phq9_crisis_flag = Column(Boolean, default=False)

    # ML & Safety Layer Triage
    ml_risk_score = Column(Float, nullable=False)
    ml_triage = Column(String, nullable=False) # GREEN, YELLOW, RED
    final_triage = Column(String, nullable=False) # GREEN, YELLOW, RED (Traffic light)
    safety_escalated = Column(Boolean, default=False)
    escalation_reasons = Column(Text, nullable=True) # JSON list string
    action_headline = Column(String, nullable=False)
    action_details = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
