from fastapi.testclient import TestClient
from backend.api import app
import pytest

client = TestClient(app)

SAMPLE_PATIENT = {
    "gender": "Female",
    "age": 40,
    "hypertension": 0,
    "heart_disease": 0,
    "smoking_history": "never",
    "bmi": 24.5,
    "HbA1c_level": 5.8,
    "blood_glucose_level": 110.0,
}

def login_as(email: str, password: str):
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_all_patient_endpoints_reject_unauthenticated():
    endpoints = [
        ("POST", "/visit", SAMPLE_PATIENT),
        ("POST", "/screen", SAMPLE_PATIENT),
        ("GET", "/visits", None),
        ("GET", "/patients/P_GREEN_01/timeline", None),
        ("POST", "/fhir/bundle", SAMPLE_PATIENT),
        ("POST", "/predict", SAMPLE_PATIENT),
        ("POST", "/explain", SAMPLE_PATIENT),
        ("POST", "/report", SAMPLE_PATIENT),
        ("POST", "/report/stream", SAMPLE_PATIENT),
        ("POST", "/counterfactuals", SAMPLE_PATIENT),
        ("POST", "/simulate", {"patient": SAMPLE_PATIENT, "modifications": {"bmi": 22.0}}),
        ("POST", "/simulate/report", {"patient": SAMPLE_PATIENT, "modifications": {"bmi": 22.0}}),
        ("POST", "/cohort/analysis", SAMPLE_PATIENT),
        ("POST", "/cohort/twins", SAMPLE_PATIENT),
        ("POST", "/chat", {"message": "diabetes cutoff"}),
        ("POST", "/chat/stream", {"message": "diabetes cutoff"}),
        ("GET", "/history", None),
        ("GET", "/audit", None),
        ("POST", "/mental-health-screen", {"scores": [0]*9}),
    ]

    for method, path, payload in endpoints:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.post(path, json=payload)
        assert res.status_code == 401, f"{method} {path} returned {res.status_code} instead of 401"


def test_public_endpoints_stay_accessible():
    assert client.get("/").status_code == 200
    assert client.get("/health").status_code == 200
    assert client.get("/model-card").status_code == 200
    assert client.get("/llm/health").status_code == 200


def test_audit_endpoint_rbac():
    worker_headers = login_as("worker@sanjeevni.org", "Password@123")
    doctor_headers = login_as("doctor@phc.org", "Password@123")
    admin_headers = login_as("admin@hospital.org", "password123")

    # Worker -> 403
    assert client.get("/audit", headers=worker_headers).status_code == 403
    # Doctor -> 403
    assert client.get("/audit", headers=doctor_headers).status_code == 403
    # Admin -> 200 with real audit events
    res = client.get("/audit", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "events" in data
    assert len(data["events"]) > 0
    ev = data["events"][0]
    assert "actor_email" in ev
    assert "action" in ev
    assert "timestamp" in ev


def test_worker_sees_only_own_visits_while_doctor_sees_all():
    worker_headers = login_as("worker@sanjeevni.org", "Password@123")
    doctor_headers = login_as("doctor@phc.org", "Password@123")

    # Doctor creates a visit directly
    doc_visit = {
        **SAMPLE_PATIENT,
        "patient_id": "P_DOC_PRIVATE_99",
        "patient_name": "Confidential Doc Patient",
        "village": "District HQ",
    }
    r_doc = client.post("/visit", json=doc_visit, headers=doctor_headers)
    assert r_doc.status_code == 200

    # Doctor sees all visits including P_DOC_PRIVATE_99
    r_doc_list = client.get("/visits?limit=200", headers=doctor_headers)
    assert r_doc_list.status_code == 200
    doc_pids = [v["patient_id"] for v in r_doc_list.json()["visits"]]
    assert "P_DOC_PRIVATE_99" in doc_pids

    # Worker list must ONLY contain worker@sanjeevni.org visits (never doctor@phc.org)
    r_worker_list = client.get("/visits?limit=200", headers=worker_headers)
    assert r_worker_list.status_code == 200
    for v in r_worker_list.json()["visits"]:
        assert v["worker_id"] == "worker@sanjeevni.org"

    # Worker trying to read doctor's patient timeline gets 403 Forbidden
    r_tl = client.get("/patients/P_DOC_PRIVATE_99/timeline", headers=worker_headers)
    assert r_tl.status_code == 403
    assert client.get("/patients/P_DOC_PRIVATE_99/timeline", headers=doctor_headers).status_code == 200
