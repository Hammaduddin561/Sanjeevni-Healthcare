import sys
import os
sys.path.append(os.getcwd())

from backend.models.cohort_engine import CohortEngine
from backend.models.history_engine import HistoryEngine
from backend.models.pdf_service import PDFService
from backend.utils.fhir_converter import FHIRConverter
import pandas as pd

def test_cohort():
    print("Testing Cohort Engine...")
    ce = CohortEngine()
    if ce.df is None:
        print("SKIP: Dataset not found.")
        return
    
    patient = {"age": 50, "bmi": 30, "HbA1c_level": 7.0, "blood_glucose_level": 160}
    p = ce.get_percentiles(patient)
    print(f"Percentiles: {p}")
    twins = ce.find_digital_twins(patient)
    print(f"Twins found: {len(twins)}")
    assert len(twins) == 5

def test_history_velocity():
    print("\nTesting Risk Velocity...")
    he = HistoryEngine()
    # Mock data
    he.history = [
        {"risk_assessment": {"score": 0.1}},
        {"risk_assessment": {"score": 0.2}},
        {"risk_assessment": {"score": 0.3}},
        {"risk_assessment": {"score": 0.4}},
        {"risk_assessment": {"score": 0.5}}
    ]
    slope, status = he.calculate_risk_velocity()
    print(f"Slope: {slope}, Status: {status}")
    assert slope > 0
    assert "Critical" in status

def test_pdf():
    print("\nTesting PDF Service...")
    ps = PDFService()
    patient = {"age": 50, "gender": "Male", "bmi": 30, "HbA1c_level": 7.0, "blood_glucose_level": 160, "smoking_history": "never"}
    fname = ps.generate_report(patient, 0.5, "Moderate", "This is a test summary.")
    print(f"Generated PDF: {fname}")
    assert os.path.exists(os.path.join(ps.output_dir, fname))

def test_fhir():
    print("\nTesting FHIR Converter...")
    patient = {"age": 50, "gender": "Male", "bmi": 30}
    res = FHIRConverter.to_patient(patient)
    print(f"FHIR Patient: {res['resourceType']}")
    assert res['resourceType'] == "Patient"

if __name__ == "__main__":
    try:
        test_cohort()
        test_history_velocity()
        test_pdf()
        test_fhir()
        print("\n✅ ALL TESTS PASSED")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
