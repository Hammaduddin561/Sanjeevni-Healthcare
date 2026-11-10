import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.models.clinical_llm import ClinicalLLM

def test_init():
    print("Starting ClinicalLLM initialization test...")
    llm = ClinicalLLM()
    
    if llm.model is not None:
        print("✅ SUCCESS: ClinicalLLM initialized successfully.")
        # Try a small generation
        print("Testing generation...")
        try:
            # We use a dummy patient data
            patient_data = {"age": 45, "gender": "Male", "bmi": 28, "HbA1c_level": 6.5, "blood_glucose_level": 150, "smoking_history": "never", "hypertension": 0, "heart_disease": 0}
            risk_score = 0.75
            risk_level = "High"
            explanations = [{"feature": "HbA1c_level", "impact_score": 0.2}]
            patient_name = "John Doe"
            
            # Use non-streaming for test
            report = llm.generate_report(patient_data, risk_score, risk_level, explanations, patient_name=patient_name)
            print(f"Report length: {len(report)}")
            print("--- Report Snippet ---")
            print(report[:300])
            print("----------------------")
            if "John Doe" in report or "John" in report:
                print("✅ Name check: SUCCESS (Name found in report)")
            else:
                print("❌ Name check: FAILURE (Name not found in report)")
        except Exception as e:
            print(f"❌ Error during generation test: {e}")
    else:
        print("❌ FAILURE: ClinicalLLM.model is None.")

if __name__ == "__main__":
    test_init()
