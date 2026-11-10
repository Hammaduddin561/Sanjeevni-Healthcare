"""
Clinical Safety Layer for Sanjeevni Healthcarer.
Implements a deterministic, rule-based safety hierarchy ABOVE machine learning models.

CORE CLINICAL RULE:
The safety layer can ONLY ESCALATE a patient's triage tier, NEVER DOWNGRADE.
- GREEN (Home Advice) -> can be escalated to YELLOW or RED
- YELLOW (Health Centre Soon) -> can be escalated to RED
- RED (Doctor Now) -> cannot be downgraded under any circumstances.

CLINICAL GUIDELINES CITED:
1. ADA (American Diabetes Association) Standards of Care in Diabetes (2024):
   - Fasting/Random Blood Glucose >= 300 mg/dL or HbA1c >= 12.0%: acute hyperglycemic crisis / DKA risk.
   - Fasting/Random Blood Glucose >= 200 mg/dL: clinical diabetes threshold requiring medical confirmation.
2. AHA/ACC (American Heart Association / American College of Cardiology) 2017 Hypertension Guidelines:
   - Systolic BP >= 180 mmHg and/or Diastolic BP >= 120 mmHg: Hypertensive Crisis.
   - Systolic BP >= 140 mmHg and/or Diastolic BP >= 90 mmHg: Stage 2 Hypertension.
3. WHO Package of Essential Noncommunicable (NCD) Disease Interventions (WHO PEN) for Primary Care.
4. NIMH / APA Clinical Practice Guidelines for Screening Suicidal Ideation in Primary Care:
   - Any affirmative response (score 1, 2, or 3) on PHQ-9 Item 9 indicates active/passive suicidal ideation.
5. Kroenke K, Spitzer RL, Williams JB. "The PHQ-9: Validity of a Brief Depression Severity Measure" (J Gen Intern Med 2001):
   - Score >= 20: Severe major depression.
   - Score 10-19: Moderate to moderately severe depression warranting active clinical consultation.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Threshold Definitions Loaded From Shared JSON Config (shared/triage_thresholds.json)
# ---------------------------------------------------------------------------
_THRESHOLDS_PATH = Path(__file__).resolve().parent.parent.parent / "shared" / "triage_thresholds.json"
with open(_THRESHOLDS_PATH, "r", encoding="utf-8") as _tf:
    _T = json.load(_tf)["thresholds"]

# ADA 2024 Hyperglycemic Emergency Thresholds
SEVERE_GLUCOSE_CRITICAL = float(_T["severe_glucose_critical"])     # 300.0 mg/dL
ELEVATED_GLUCOSE_WARNING = float(_T["elevated_glucose_warning"])   # 200.0 mg/dL
SEVERE_HBA1C_CRITICAL = float(_T["severe_hba1c_critical"])         # 12.0 %
ELEVATED_HBA1C_WARNING = float(_T["elevated_hba1c_warning"])       # 8.5 %

# AHA/ACC 2017 Blood Pressure Thresholds
HYPERTENSIVE_CRISIS_SYSTOLIC = float(_T["hypertensive_crisis_systolic"])    # 180.0 mmHg
HYPERTENSIVE_CRISIS_DIASTOLIC = float(_T["hypertensive_crisis_diastolic"])  # 120.0 mmHg
STAGE2_HYPERTENSION_SYSTOLIC = float(_T["stage2_hypertension_systolic"])    # 140.0 mmHg
STAGE2_HYPERTENSION_DIASTOLIC = float(_T["stage2_hypertension_diastolic"])  # 90.0 mmHg

# PHQ-9 Depression Screener Thresholds (Kroenke et al. 2001)
PHQ9_SELF_HARM_ITEM_INDEX = int(_T["phq9_self_harm_item_index"])    # Question 9: Index 8
PHQ9_SEVERE_THRESHOLD = int(_T["phq9_severe_threshold"])            # 20
PHQ9_MODERATE_THRESHOLD = int(_T["phq9_moderate_threshold"])        # 10

# ML Probability Cutoffs
ML_RED_THRESHOLD = float(_T["ml_red_threshold"])                    # 0.65
ML_YELLOW_THRESHOLD = float(_T["ml_yellow_threshold"])              # 0.35

# National Helpline Directory
CRISIS_HELPLINES = [
    {"name": "Tele-MANAS (Govt of India)", "number": "14416", "hours": "24/7 Toll-Free Mental Health Support"},
    {"name": "KIRAN Mental Health", "number": "1800-599-0019", "hours": "24/7 Toll-Free Support in 13 Languages"},
    {"name": "iCall (TISS)", "number": "9152987821", "hours": "Mon-Sat 10 AM - 8 PM"},
    {"name": "Vandrevala Foundation", "number": "9999 666 555", "hours": "24/7 Free Helpline"},
    {"name": "National Emergency", "number": "112", "hours": "24/7 Emergency Response"}
]


@dataclass
class SafetyResult:
    final_triage: str                     # "GREEN", "YELLOW", "RED"
    ml_triage: str                        # "GREEN", "YELLOW", "RED" before safety checks
    ml_risk_score: float                  # Calibrated ML risk score
    safety_escalated: bool                # True if safety rules bumped the triage
    escalation_reasons: List[str]         # Clinical reasons for escalation
    action_headline: str                  # Short actionable directive for the ASHA worker
    action_details: str                   # Comprehensive step-by-step guidance
    emergency_helpline_required: bool     # True if suicide/crisis helplines must be displayed
    helplines: List[Dict[str, str]] = field(default_factory=list)
    phq9_total: int = 0
    phq9_severity: str = "None-Minimal"
    phq9_crisis_flag: bool = False
    hypertension_flag: int = 0


class SafetyLayer:
    """Deterministic Clinical Safety Guardrails for Triage."""

    @staticmethod
    def calculate_phq9(scores: Optional[List[int]]) -> Dict[str, Any]:
        """Calculates score, severity, and suicide risk from 9 items."""
        if not scores or len(scores) != 9:
            return {
                "total": 0,
                "severity": "Not Screened",
                "crisis_flag": False,
                "has_scores": False
            }

        total = sum(scores)
        q9_score = scores[PHQ9_SELF_HARM_ITEM_INDEX]
        crisis_flag = q9_score > 0

        if total >= 20:
            severity = "Severe Depression"
        elif total >= 15:
            severity = "Moderately Severe Depression"
        elif total >= 10:
            severity = "Moderate Depression"
        elif total >= 5:
            severity = "Mild Depression"
        else:
            severity = "Minimal / No Depression"

        return {
            "total": total,
            "severity": severity,
            "crisis_flag": crisis_flag,
            "q9_score": q9_score,
            "has_scores": True
        }

    @classmethod
    def evaluate_triage(
        cls,
        patient_data: Dict[str, Any],
        ml_risk_score: float
    ) -> SafetyResult:
        """
        Applies safety layer rules above the ML prediction.
        Ensures strict non-downgrade property.
        """
        # Step 1: Base ML Triage
        if ml_risk_score >= ML_RED_THRESHOLD:
            ml_triage = "RED"
        elif ml_risk_score >= ML_YELLOW_THRESHOLD:
            ml_triage = "YELLOW"
        else:
            ml_triage = "GREEN"

        final_triage = ml_triage
        escalation_reasons: List[str] = []
        emergency_helplines = False

        # Extract vitals
        glucose = float(patient_data.get("blood_glucose_level", 0.0) or 0.0)
        hba1c = float(patient_data.get("HbA1c_level", 0.0) or 0.0)
        systolic = patient_data.get("systolic_bp")
        diastolic = patient_data.get("diastolic_bp")
        phq9_list = patient_data.get("phq9_scores")

        # Step 2: PHQ-9 Evaluation
        phq_result = cls.calculate_phq9(phq9_list)
        phq9_total = phq_result["total"]
        phq9_severity = phq_result["severity"]
        phq9_crisis = phq_result["crisis_flag"]

        if phq9_crisis:
            final_triage = "RED"
            emergency_helplines = True
            escalation_reasons.append(
                "PHQ-9 Question 9 positive (thoughts of self-harm or suicide). "
                "Immediate mental health crisis protocol activated."
            )

        if phq9_total >= PHQ9_SEVERE_THRESHOLD:
            final_triage = "RED"
            emergency_helplines = True
            escalation_reasons.append(
                f"Severe depression score on PHQ-9 ({phq9_total}/27). Urgent psychiatric referral required."
            )
        elif phq9_total >= PHQ9_MODERATE_THRESHOLD:
            if final_triage == "GREEN":
                final_triage = "YELLOW"
            escalation_reasons.append(
                f"Moderate depressive symptoms on PHQ-9 ({phq9_total}/27). Counselling and health centre follow-up advised."
            )

        # Step 3: Glycemic Crisis Checks (ADA 2024 Guidelines)
        if glucose >= SEVERE_GLUCOSE_CRITICAL:
            final_triage = "RED"
            escalation_reasons.append(
                f"Critical hyperglycemia: Blood glucose is {glucose:.0f} mg/dL (>= {SEVERE_GLUCOSE_CRITICAL:.0f} mg/dL). "
                "High risk of diabetic ketoacidosis (DKA) or hyperosmolar hyperglycemic state (HHS)."
            )
        elif glucose >= ELEVATED_GLUCOSE_WARNING:
            if final_triage == "GREEN":
                final_triage = "YELLOW"
            escalation_reasons.append(
                f"Marked hyperglycemia: Blood glucose is {glucose:.0f} mg/dL (>= {ELEVATED_GLUCOSE_WARNING:.0f} mg/dL). "
                "Confirmatory testing and clinical evaluation required."
            )

        if hba1c >= SEVERE_HBA1C_CRITICAL:
            final_triage = "RED"
            escalation_reasons.append(
                f"Severe decompensated glycemia: HbA1c is {hba1c:.1f}% (>= {SEVERE_HBA1C_CRITICAL:.1f}%). Urgent specialist management needed."
            )
        elif hba1c >= ELEVATED_HBA1C_WARNING:
            if final_triage == "GREEN":
                final_triage = "YELLOW"
            escalation_reasons.append(
                f"Elevated HbA1c: {hba1c:.1f}% indicates uncontrolled glycemic trajectory."
            )

        # Step 4: Blood Pressure / Hypertensive Crisis Checks (AHA/ACC 2017)
        htn_flag = 0
        if systolic is not None or diastolic is not None:
            s_val = float(systolic or 0.0)
            d_val = float(diastolic or 0.0)

            if s_val >= HYPERTENSIVE_CRISIS_SYSTOLIC or d_val >= HYPERTENSIVE_CRISIS_DIASTOLIC:
                final_triage = "RED"
                htn_flag = 1
                escalation_reasons.append(
                    f"Hypertensive Crisis: Blood pressure reading is {s_val:.0f}/{d_val:.0f} mmHg "
                    f"(>= {HYPERTENSIVE_CRISIS_SYSTOLIC:.0f}/{HYPERTENSIVE_CRISIS_DIASTOLIC:.0f} mmHg). "
                    "Emergency evaluation to evaluate end-organ damage."
                )
            elif s_val >= STAGE2_HYPERTENSION_SYSTOLIC or d_val >= STAGE2_HYPERTENSION_DIASTOLIC:
                htn_flag = 1
                if final_triage == "GREEN":
                    final_triage = "YELLOW"
                escalation_reasons.append(
                    f"Stage 2 Hypertension: Blood pressure is {s_val:.0f}/{d_val:.0f} mmHg "
                    f"(>= {STAGE2_HYPERTENSION_SYSTOLIC:.0f}/{STAGE2_HYPERTENSION_DIASTOLIC:.0f} mmHg). "
                    "Medical officer consultation required for antihypertensive therapy."
                )
        elif int(patient_data.get("hypertension", 0)) == 1:
            htn_flag = 1

        # Check if safety escalated
        tier_ranks = {"GREEN": 0, "YELLOW": 1, "RED": 2}
        safety_escalated = tier_ranks[final_triage] > tier_ranks[ml_triage]

        # Action Headlines & Details
        if final_triage == "RED":
            action_headline = "SEE A DOCTOR NOW (Emergency / Urgent Referral)"
            action_details = (
                "Refer immediately to the nearest Primary Health Centre (PHC) Medical Officer or Hospital Emergency. "
                "Do not delay referral. Accompany or arrange community transport for patient."
            )
        elif final_triage == "YELLOW":
            action_headline = "SEE HEALTH CENTRE SOON (Scheduled Medical Evaluation)"
            action_details = (
                "Advise the patient to visit the Primary Health Centre within 3 to 7 days. "
                "Provide lifestyle counselling on low-salt, balanced diet, and active routine."
            )
        else:
            action_headline = "HOME ADVICE & MONITORING (Low Immediate Risk)"
            action_details = (
                "Patient is currently within stable reference parameters. "
                "Provide guidance on balanced local nutrition, daily hydration, physical activity, and rescreen in 6-12 months."
            )

        return SafetyResult(
            final_triage=final_triage,
            ml_triage=ml_triage,
            ml_risk_score=round(ml_risk_score, 4),
            safety_escalated=safety_escalated,
            escalation_reasons=escalation_reasons,
            action_headline=action_headline,
            action_details=action_details,
            emergency_helpline_required=emergency_helplines,
            helplines=CRISIS_HELPLINES if emergency_helplines else [],
            phq9_total=phq9_total,
            phq9_severity=phq9_severity,
            phq9_crisis_flag=phq9_crisis,
            hypertension_flag=htn_flag
        )
