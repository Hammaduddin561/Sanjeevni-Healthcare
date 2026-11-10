from fastapi.testclient import TestClient
from backend.api import app

client = TestClient(app)


def _worker_headers():
    res = client.post("/auth/login", json={"email": "worker@sanjeevni.org", "password": "Password@123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_predict_no_lab_routing():
    headers = _worker_headers()
    payload = {
        "gender": "Female",
        "age": 55,
        "hypertension": 1,
        "heart_disease": 0,
        "smoking_history": "never",
        "bmi": 31.2
    }
    res = client.post("/predict", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["lab_mode"] == "no_lab"
    assert "Estimated without lab tests: confirm with a glucometer or lab test" in data["model_mode_label"]
    assert "glucose" in data["recommended_followup"].lower()
    assert 0.0 <= data["risk_score"] <= 1.0


def test_visit_no_lab_with_safety_layer():
    headers = _worker_headers()
    payload = {
        "gender": "Male",
        "age": 38,
        "hypertension": 0,
        "heart_disease": 0,
        "smoking_history": "never",
        "bmi": 24.0,
        "systolic_bp": 186.0,
        "diastolic_bp": 121.0,
        "phq9_scores": [0]*9,
        "patient_id": "P_NOLAB_CRISIS",
        "patient_name": "NoLab Crisis Test",
        "village": "Rampur Sub-Centre"
    }
    res = client.post("/visit", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["lab_mode"] == "no_lab"
    assert "Estimated without lab tests: confirm with a glucometer or lab test" in data["model_mode_label"]
    assert data["HbA1c_level"] is None
    assert data["blood_glucose_level"] is None
    # Deterministic safety guardrail MUST still escalate crisis BP to RED in no-lab mode
    assert data["traffic_light"] == "RED"
    assert data["safety_escalated"] is True
