from fastapi.testclient import TestClient
from backend.api import app
import pytest

client = TestClient(app)

SAMPLE_PATIENT = {
    "gender": "Male",
    "age": 45,
    "hypertension": 0,
    "heart_disease": 1,
    "smoking_history": "former",
    "bmi": 28.5,
    "HbA1c_level": 6.2,
    "blood_glucose_level": 140
}

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_predict_endpoint():
    response = client.post("/predict", json=SAMPLE_PATIENT)
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "risk_level" in data
    assert 0.0 <= data["risk_score"] <= 1.0

def test_explain_endpoint():
    response = client.post("/explain", json=SAMPLE_PATIENT)
    assert response.status_code == 200
    data = response.json()
    assert "explanations" in data
    assert isinstance(data["explanations"], list)
    assert "summary_en" in data
    assert "summary_hi" in data
    if len(data["explanations"]) > 0:
        assert "feature" in data["explanations"][0]
        assert "impact_score" in data["explanations"][0]
        assert "plain_text_en" in data["explanations"][0]
        assert "plain_text_hi" in data["explanations"][0]

def test_counterfactuals_endpoint():
    high_risk_patient = SAMPLE_PATIENT.copy()
    high_risk_patient.update({"bmi": 32.5, "HbA1c_level": 7.4, "smoking_history": "current"})
    response = client.post("/counterfactuals", json=high_risk_patient)
    assert response.status_code == 200
    data = response.json()
    assert "scenarios" in data
    assert len(data["scenarios"]) <= 3
    for s in data["scenarios"]:
        assert "name" in s
        assert "change_description" in s
        assert "risk_reduction" in s
        # Ensure immutable features age/gender are never modified
        if "actionable_targets" in s:
            assert "age" not in s["actionable_targets"]
            assert "gender" not in s["actionable_targets"]

def test_model_card_endpoint():
    response = client.get("/model-card")
    assert response.status_code == 200
    data = response.json()
    assert "model_name" in data
    assert "intended_use" in data
    assert "limitations" in data
    assert "metrics" in data
    assert "fairness" in data
    assert "disclaimer" in data
    assert "performance" in data["metrics"]
    assert "roc_auc" in data["metrics"]["performance"]
    assert "gender_audit" in data["fairness"]

def test_visit_screening_endpoint():
    visit_payload = {
        "gender": "Female",
        "age": 35,
        "hypertension": 0,
        "heart_disease": 0,
        "smoking_history": "never",
        "bmi": 22.4,
        "HbA1c_level": 5.2,
        "blood_glucose_level": 92.0,
        "systolic_bp": 118.0,
        "diastolic_bp": 76.0,
        "phq9_scores": [0, 0, 0, 0, 0, 0, 0, 0, 0],
        "patient_name": "Meera Devi",
        "patient_id": "P_RAMPUR_01",
        "village": "Rampur"
    }
    response = client.post("/visit", json=visit_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["traffic_light"] in ["GREEN", "YELLOW", "RED"]
    assert data["patient_id"] == "P_RAMPUR_01"
    assert "action_headline" in data
    assert "explanations" in data
    assert "summary_en" in data
    assert data["phq9_total"] == 0

def test_visit_screening_emergency_escalation():
    # Young patient with low diabetes risk (ML predicts GREEN), but crisis BP and self-harm positive
    crisis_payload = {
        "gender": "Male",
        "age": 25,
        "hypertension": 0,
        "heart_disease": 0,
        "smoking_history": "never",
        "bmi": 21.5,
        "HbA1c_level": 5.0,
        "blood_glucose_level": 92.0,
        "systolic_bp": 185.0,
        "diastolic_bp": 122.0,
        "phq9_scores": [0, 0, 0, 0, 0, 0, 0, 0, 2],
        "patient_name": "Rajesh Kumar",
        "patient_id": "P_RAMPUR_02",
        "village": "Rampur"
    }
    response = client.post("/visit", json=crisis_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["traffic_light"] == "RED"
    assert data["ml_triage"] == "GREEN"
    assert data["safety_escalated"] is True
    assert data["phq9_crisis_flag"] is True
    assert data["emergency_helpline_required"] is True
    assert len(data["helplines"]) > 0

def test_patient_timeline_endpoint():
    response = client.get("/patients/P_RAMPUR_01/timeline")
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == "P_RAMPUR_01"
    assert "visits" in data
    assert data["total_visits"] >= 1
    assert "trend_status" in data

def test_validation_error():
    # Missing required field 'age'
    invalid_data = SAMPLE_PATIENT.copy()
    del invalid_data['age']
    
    response = client.post("/predict", json=invalid_data)
    assert response.status_code == 422
