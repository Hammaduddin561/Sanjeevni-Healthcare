import pytest
from backend.utils.fhir_converter import FHIRConverter


def test_fhir_converter_patient():
    patient_data = {
        "patient_id": "P_1001",
        "gender": "Female",
        "age": 45,
        "village": "Rampur Sub-Centre"
    }
    patient_res = FHIRConverter.to_patient(patient_data)
    assert patient_res["resourceType"] == "Patient"
    assert patient_res["id"] == "P_1001"
    assert patient_res["gender"] == "female"
    assert "birthDate" in patient_res


def test_fhir_converter_observations():
    patient_data = {
        "patient_id": "P_1001",
        "blood_glucose_level": 140.0,
        "HbA1c_level": 6.2,
        "bmi": 26.5,
        "systolic_bp": 130,
        "diastolic_bp": 85,
        "phq9_scores": [1, 0, 1, 0, 0, 0, 0, 0, 0]
    }
    obs = FHIRConverter.to_observations(patient_data, patient_ref="P_1001")
    assert len(obs) >= 4

    types = [o["resourceType"] for o in obs]
    assert all(t == "Observation" for t in types)

    # Check LOINC codes present
    loinc_codes = []
    for o in obs:
        codings = o["code"]["coding"]
        for c in codings:
            loinc_codes.append(c["code"])

    assert "2339-0" in loinc_codes  # Glucose
    assert "4548-4" in loinc_codes  # HbA1c
    assert "39156-5" in loinc_codes # BMI
    assert "85354-9" in loinc_codes # BP Panel


def test_fhir_converter_risk_assessment():
    patient_data = {
        "HbA1c_level": 6.2,
        "bmi": 26.5,
        "blood_glucose_level": 140.0
    }
    assessment = FHIRConverter.to_risk_assessment(patient_data, risk_score=0.45, risk_level="Moderate", patient_ref="P_1001")
    assert assessment["resourceType"] == "RiskAssessment"
    assert assessment["prediction"][0]["probabilityDecimal"] == 0.45
    assert assessment["prediction"][0]["qualitativeRisk"]["coding"][0]["code"] == "moderate"
