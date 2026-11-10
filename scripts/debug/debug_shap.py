import sys
import os

# Add project root to sys.path
sys.path.append(os.getcwd())

try:
    from backend.models.risk_engine import RiskEngine
    print("Initializing RiskEngine...")
    engine = RiskEngine()
    print("RiskEngine initialized.")
    
    dummy_data = {
        "gender": "Male",
        "age": 45,
        "hypertension": 0,
        "heart_disease": 0,
        "smoking_history": "never",
        "bmi": 28.5,
        "HbA1c_level": 5.7,
        "blood_glucose_level": 140
    }
    
    print("Predicting risk...")
    risk = engine.predict_risk(dummy_data)
    print(f"Risk: {risk}")
    
    print("Explaining risk...")
    explanations = engine.explain_risk(dummy_data)
    print(f"Explanations: {explanations}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
