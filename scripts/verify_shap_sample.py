import sys
import os
import time
import shap

# Add project root to sys.path
sys.path.append(os.getcwd())

try:
    from backend.models.risk_engine import RiskEngine
    print("Initializing RiskEngine...")
    engine = RiskEngine()
    print("RiskEngine initialized.")
    
    if engine.background_data is not None:
        print(f"Original background data shape: {engine.background_data.shape}")
        
        # Optimize with sampling
        start_time = time.time()
        print("Sampling background data...")
        # shap.sample works on pandas dataframes
        small_bg = shap.utils.sample(engine.background_data, 10)
        print(f"Sampled background data shape: {small_bg.shape}")
        
        print("Re-initializing explainer with sampled data...")
        explainer = shap.KernelExplainer(
            engine._predict_for_shap, 
            small_bg,
            link="identity"
        )
        print("Explainer re-initialized.")
        
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
        
        print("Explaining risk with optimized explainer...")
        # Need to preprocess dummy_data first as KernelExplainer expects preprocessed input format
        # but _predict_for_shap handles it? 
        # Wait, KernelExplainer expects the same format as background_data.
        # background_data is DataFrame.
        # engine.explain_risk uses _preprocess(dummy_data) -> DataFrame.
        
        df = engine._preprocess(dummy_data)
        shap_values = explainer.shap_values(df)
        print("Explanation generation complete.")
        print(f"Time taken: {time.time() - start_time:.2f}s")
        
    else:
        print("No background data found.")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
