import json
import subprocess
from pathlib import Path
from backend.models.risk_engine import RiskEngine
from backend.models.safety_layer import SafetyLayer

ROOT = Path(__file__).resolve().parent.parent


def _run_frontend_offline_batch(cases: list[dict]) -> list[str]:
    """Executes the TypeScript offlineRiskCalculator.ts directly via Node v22 strip-types."""
    import tempfile
    ts_code = (ROOT / "frontend" / "src" / "utils" / "offlineRiskCalculator.ts").read_text(encoding="utf-8")
    shared_json = (ROOT / "shared" / "triage_thresholds.json").read_text(encoding="utf-8")
    lines = []
    for line in ts_code.splitlines():
        if line.startswith("import type "):
            continue
        if "triage_thresholds.json" in line:
            lines.append(f"const sharedConfig = {shared_json};")
            continue
        lines.append(line.replace("export const calculateOfflineRisk", "const calculateOfflineRisk"))

    # Replace unknown type identifiers since we stripped the import
    body = "\n".join(lines).replace(": ScreeningVisitInput", ": any").replace(": ScreeningVisitResponse", ": any")
    script = body + f"\nconst cases = {json.dumps(cases)};\nconsole.log(JSON.stringify(cases.map(c => calculateOfflineRisk(c).traffic_light)));\n"

    with tempfile.NamedTemporaryFile("w", suffix=".ts", delete=False, encoding="utf-8") as tf:
        tf.write(script)
        tmp_path = tf.name

    try:
        res = subprocess.run(
            ["node", "--experimental-strip-types", tmp_path],
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(res.stdout.strip().splitlines()[-1])
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def test_online_and_offline_triage_parity_on_demo_personas_and_rules():
    engine = RiskEngine()

    test_cases = [
        # 1. Green Persona: Sunita Sharma
        {
            "name": "Green Persona (Sunita Sharma)",
            "gender": "Female", "age": 32, "bmi": 22.1, "blood_glucose_level": 92.0,
            "HbA1c_level": 5.2, "smoking_history": "never", "hypertension": 0, "heart_disease": 0,
            "systolic_bp": 116.0, "diastolic_bp": 74.0, "phq9_scores": [0]*9
        },
        # 2a. Yellow Persona (Ramesh Patel with borderline HbA1c 6.0 & Stage 2 BP 142/92)
        {
            "name": "Yellow Persona (Pre-diabetic + Stage 2 BP)",
            "gender": "Male", "age": 54, "bmi": 27.8, "blood_glucose_level": 140.0,
            "HbA1c_level": 6.0, "smoking_history": "former", "hypertension": 1, "heart_disease": 0,
            "systolic_bp": 142.0, "diastolic_bp": 92.0, "phq9_scores": [1, 1, 1, 1, 1, 1, 0, 0, 0]
        },
        # 2b. Seeded Ramesh Patel (HbA1c 6.8 + HTN + Age 54 -> high risk RED in both)
        {
            "name": "Seeded Ramesh Patel (HbA1c 6.8)",
            "gender": "Male", "age": 54, "bmi": 27.8, "blood_glucose_level": 165.0,
            "HbA1c_level": 6.8, "smoking_history": "former", "hypertension": 1, "heart_disease": 0,
            "systolic_bp": 142.0, "diastolic_bp": 92.0, "phq9_scores": [1, 1, 1, 1, 1, 1, 0, 0, 0]
        },
        # 3. Red Persona: Kamla Bai
        {
            "name": "Red Persona (Kamla Bai)",
            "gender": "Female", "age": 61, "bmi": 31.4, "blood_glucose_level": 315.0,
            "HbA1c_level": 9.4, "smoking_history": "never", "hypertension": 1, "heart_disease": 1,
            "systolic_bp": 184.0, "diastolic_bp": 118.0, "phq9_scores": [2, 2, 2, 2, 2, 1, 0, 0, 1]
        },
        # 4. Critical HbA1c >= 12.0 safety rule
        {
            "name": "HbA1c >= 12.0 Critical Rule",
            "gender": "Female", "age": 35, "bmi": 23.0, "blood_glucose_level": 130.0,
            "HbA1c_level": 12.2, "smoking_history": "never", "hypertension": 0, "heart_disease": 0,
            "systolic_bp": 118.0, "diastolic_bp": 76.0, "phq9_scores": [0]*9
        },
        # 5. Moderate Glucose >= 200 warning rule
        {
            "name": "Glucose >= 200 Warning Rule",
            "gender": "Male", "age": 36, "bmi": 22.5, "blood_glucose_level": 210.0,
            "HbA1c_level": 5.5, "smoking_history": "never", "hypertension": 0, "heart_disease": 0,
            "systolic_bp": 118.0, "diastolic_bp": 76.0, "phq9_scores": [0]*9
        },
        # 6. Severe PHQ-9 >= 20 rule
        {
            "name": "PHQ-9 Severe >= 20 Rule",
            "gender": "Female", "age": 28, "bmi": 21.0, "blood_glucose_level": 90.0,
            "HbA1c_level": 5.0, "smoking_history": "never", "hypertension": 0, "heart_disease": 0,
            "systolic_bp": 110.0, "diastolic_bp": 70.0, "phq9_scores": [3, 3, 3, 3, 3, 3, 2, 0, 0]
        },
        # 7. No-Lab Hypertensive Crisis
        {
            "name": "No-Lab Crisis BP",
            "gender": "Female", "age": 40, "bmi": 24.0, "blood_glucose_level": None,
            "HbA1c_level": None, "smoking_history": "never", "hypertension": 0, "heart_disease": 0,
            "systolic_bp": 182.0, "diastolic_bp": 120.0, "phq9_scores": [0]*9
        },
    ]

    offline_results = _run_frontend_offline_batch(test_cases)

    for case, offline_light in zip(test_cases, offline_results):
        ml_score = engine.predict_risk(case)
        online_light = SafetyLayer.evaluate_triage(case, ml_score).final_triage
        assert offline_light == online_light, (
            f"Parity mismatch on '{case['name']}': online={online_light}, offline={offline_light}"
        )
