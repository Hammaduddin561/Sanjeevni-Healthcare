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

def test_validation_error():
    # Missing required field 'age'
    invalid_data = SAMPLE_PATIENT.copy()
    del invalid_data['age']
    
    response = client.post("/predict", json=invalid_data)
    assert response.status_code == 422
