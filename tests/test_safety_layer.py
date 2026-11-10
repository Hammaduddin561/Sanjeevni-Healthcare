import pytest
from backend.models.safety_layer import (
    SafetyLayer,
    SEVERE_GLUCOSE_CRITICAL,
    HYPERTENSIVE_CRISIS_SYSTOLIC,
    HYPERTENSIVE_CRISIS_DIASTOLIC,
    STAGE2_HYPERTENSION_SYSTOLIC,
    STAGE2_HYPERTENSION_DIASTOLIC,
    PHQ9_SEVERE_THRESHOLD,
    PHQ9_MODERATE_THRESHOLD,
    CRISIS_HELPLINES
)


def test_phq9_scoring_boundaries():
    """Validates clinical scoring cutoffs for PHQ-9 according to Kroenke et al. (2001)."""
    # Minimal: 0-4
    res0 = SafetyLayer.calculate_phq9([0]*9)
    assert res0["total"] == 0
    assert "Minimal" in res0["severity"]
    assert not res0["crisis_flag"]

    res4 = SafetyLayer.calculate_phq9([1, 1, 1, 1, 0, 0, 0, 0, 0])
    assert res4["total"] == 4
    assert "Minimal" in res4["severity"]

    # Mild: 5-9
    res5 = SafetyLayer.calculate_phq9([1, 1, 1, 1, 1, 0, 0, 0, 0])
    assert res5["total"] == 5
    assert "Mild" in res5["severity"]

    res9 = SafetyLayer.calculate_phq9([1]*9)
    assert res9["total"] == 9
    assert "Mild" in res9["severity"]
    assert res9["crisis_flag"]  # Question 9 is 1

    # Moderate: 10-14
    res10 = SafetyLayer.calculate_phq9([2, 2, 2, 2, 2, 0, 0, 0, 0])
    assert res10["total"] == 10
    assert "Moderate Depression" == res10["severity"]

    res14 = SafetyLayer.calculate_phq9([2, 2, 2, 2, 2, 2, 2, 0, 0])
    assert res14["total"] == 14
    assert "Moderate Depression" == res14["severity"]

    # Moderately Severe: 15-19
    res15 = SafetyLayer.calculate_phq9([2, 2, 2, 2, 2, 2, 2, 1, 0])
    assert res15["total"] == 15
    assert "Moderately Severe" in res15["severity"]

    # Severe: 20-27
    res20 = SafetyLayer.calculate_phq9([3, 3, 3, 3, 3, 3, 2, 0, 0])
    assert res20["total"] == 20
    assert "Severe" in res20["severity"]

    res27 = SafetyLayer.calculate_phq9([3]*9)
    assert res27["total"] == 27
    assert "Severe" in res27["severity"]


def test_phq9_self_harm_item_forces_red():
    """Any affirmative answer on Item 9 must force RED and trigger crisis helplines."""
    # Patient with baseline low ML risk (0.05) and zero other symptoms, but Q9 = 1
    scores = [0, 0, 0, 0, 0, 0, 0, 0, 1]
    patient = {
        "blood_glucose_level": 95,
        "HbA1c_level": 5.2,
        "systolic_bp": 118,
        "diastolic_bp": 78,
        "phq9_scores": scores
    }
    result = SafetyLayer.evaluate_triage(patient, ml_risk_score=0.05)
    assert result.final_triage == "RED"
    assert result.safety_escalated is True
    assert result.emergency_helpline_required is True
    assert len(result.helplines) > 0
    assert any("Question 9" in r for r in result.escalation_reasons)


def test_severe_hyperglycemia_forces_red():
    """Blood glucose >= 300 mg/dL must immediately force RED under ADA guidelines."""
    patient = {
        "blood_glucose_level": 320.0,
        "HbA1c_level": 6.0,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "phq9_scores": [0]*9
    }
    result = SafetyLayer.evaluate_triage(patient, ml_risk_score=0.10)
    assert result.final_triage == "RED"
    assert result.safety_escalated is True
    assert any("Critical hyperglycemia" in r for r in result.escalation_reasons)


def test_hypertensive_crisis_forces_red():
    """BP >= 180/120 mmHg must trigger Hypertensive Crisis RED escalation."""
    patient = {
        "blood_glucose_level": 110,
        "HbA1c_level": 5.5,
        "systolic_bp": 185.0,
        "diastolic_bp": 110.0,
        "phq9_scores": [0]*9
    }
    result = SafetyLayer.evaluate_triage(patient, ml_risk_score=0.12)
    assert result.final_triage == "RED"
    assert result.safety_escalated is True
    assert result.hypertension_flag == 1
    assert any("Hypertensive Crisis" in r for r in result.escalation_reasons)


def test_stage2_hypertension_escalates_to_yellow():
    """BP >= 140/90 mmHg must escalate GREEN to at least YELLOW."""
    patient = {
        "blood_glucose_level": 105,
        "HbA1c_level": 5.4,
        "systolic_bp": 145.0,
        "diastolic_bp": 88.0,
        "phq9_scores": [0]*9
    }
    result = SafetyLayer.evaluate_triage(patient, ml_risk_score=0.10)
    assert result.final_triage == "YELLOW"
    assert result.safety_escalated is True
    assert result.hypertension_flag == 1
    assert any("Stage 2 Hypertension" in r for r in result.escalation_reasons)


def test_strict_non_downgrade_property():
    """The safety layer must NEVER downgrade a high-risk model prediction."""
    # Model predicts RED (0.85), but all safety vitals are normal/optimal
    patient = {
        "blood_glucose_level": 90,
        "HbA1c_level": 5.1,
        "systolic_bp": 115,
        "diastolic_bp": 75,
        "phq9_scores": [0]*9
    }
    result = SafetyLayer.evaluate_triage(patient, ml_risk_score=0.85)
    assert result.final_triage == "RED"
    assert result.ml_triage == "RED"
    assert result.safety_escalated is False


def test_green_pathway_for_optimal_patient():
    """Patient with healthy parameters and low ML score remains GREEN."""
    patient = {
        "blood_glucose_level": 95,
        "HbA1c_level": 5.2,
        "systolic_bp": 118,
        "diastolic_bp": 76,
        "phq9_scores": [0]*9
    }
    result = SafetyLayer.evaluate_triage(patient, ml_risk_score=0.08)
    assert result.final_triage == "GREEN"
    assert result.safety_escalated is False
    assert "HOME ADVICE" in result.action_headline
