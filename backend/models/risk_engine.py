import joblib
import os
import pandas as pd
import numpy as np
import shap

class RiskEngine:
    def __init__(self, model_dir="backend/models"):
        self.model_path = os.path.join(model_dir, "risk_pipeline_v1.joblib")
        self.bg_path = os.path.join(model_dir, "background_data.joblib")
        
        # Load pipeline
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found at {self.model_path}. Run train_pro.py first.")
            
        self.pipeline = joblib.load(self.model_path)
        
        # Initialize SHAP Explainer
        self.explainer = None
        self.background_data = None
        self.feature_columns = None
        
        # Try to load background data for SHAP (optional, not critical)
        if os.path.exists(self.bg_path):
            try:
                self.background_data = joblib.load(self.bg_path)
                # Store columns for reconstruction
                self.feature_columns = self.background_data.columns.tolist()
                
                # Optimize: Use a sample of background data for faster inference
                # 50 samples (default) -> 10 samples = ~5x speedup
                if len(self.background_data) > 10:
                    print(f"Sampling background data from {len(self.background_data)} to 10...")
                    self.background_data = shap.utils.sample(self.background_data, 10)

                # Initialize SHAP KernelExplainer
                print("Initializing SHAP explainer...")
                self.explainer = shap.KernelExplainer(
                    self._predict_for_shap, 
                    self.background_data,
                    link="identity"  # We're already working with probabilities
                )
                print("✅ SHAP explainer initialized successfully.")
            except Exception as bg_e:
                print(f"Warning: Could not initialize SHAP explainer: {bg_e}")
                self.explainer = None
                self.background_data = None


    def _preprocess(self, data: dict) -> pd.DataFrame:
        """
        Replicates the preprocessing steps from training.
        """
        # Convert single dict to DataFrame
        df = pd.DataFrame([data])
        
        # Feature Engineering: BMI * Age (matches train_pro.py)
        if 'bmi' in df.columns and 'age' in df.columns:
            df['BMI_Age_Interaction'] = df['bmi'] * df['age']
            
        # Interaction: Glucose * HbA1c
        if 'blood_glucose_level' in df.columns and 'HbA1c_level' in df.columns:
            df['Glucose_HbA1c_Interaction'] = df['blood_glucose_level'] * df['HbA1c_level']
            
        # Age Categories (risk zones)
        if 'age' in df.columns:
            df['Age_Category'] = pd.cut(df['age'], 
                                        bins=[0, 30, 45, 60, 100],
                                        labels=['Young', 'Middle', 'Senior', 'Elderly'])
        
        # BMI Categories (WHO classification)
        if 'bmi' in df.columns:
            df['BMI_Category'] = pd.cut(df['bmi'],
                                        bins=[0, 18.5, 25, 30, 100],
                                        labels=['Underweight', 'Normal', 'Overweight', 'Obese'])
        
        # Ensure columns match background data (if available) to prevent shape mismatch (13 vs 12)
        if self.feature_columns:
            # Add missing columns with 0/default
            for col in self.feature_columns:
                if col not in df.columns:
                    df[col] = 0
            
            # Select and reorder columns to match exactly
            df = df[self.feature_columns]
            
        return df

    def _predict_for_shap(self, data):
        """
        Wrapper for SHAP that handles prediction on preprocessed data.
        Background data is already preprocessed, so we work directly with it.
        """
        # Handle different input types
        if isinstance(data, np.ndarray):
            # Convert numpy array back to DataFrame using stored column names
            data = pd.DataFrame(data, columns=self.feature_columns)
        
        # Data is already preprocessed (has engineered features)
        # Just pass it directly to the pipeline
        probs = self.pipeline.predict_proba(data)
        
        # Return probability of positive class (diabetes)
        return probs[:, 1]

    def predict_risk(self, patient_data: dict) -> float:
        """
        Returns probability of diabetes (0.0 to 1.0)
        """
        df = self._preprocess(patient_data)
        
        try:
            prob = self.pipeline.predict_proba(df)[0, 1]
            return float(prob)
        except Exception as e:
            print(f"Prediction error: {e}")
            raise

    def explain_risk(self, patient_data: dict) -> list:
        """
        Returns list of feature contributions.
        """
        if not self.explainer:
            return []
            
        df = self._preprocess(patient_data)
        
        # SHAP values for binary classification (nsamples, nfeatures)
        try:
            shap_values = self.explainer.shap_values(df)
        except Exception as e:
            print(f"❌ SHAP generation failed: {e}")
            return []
        
        # Handle different SHAP output formats
        if isinstance(shap_values, list):
            # List of arrays [class0_matrix, class1_matrix]
            # Take class 1, sample 0
            risk_shap = shap_values[1][0]
        elif isinstance(shap_values, np.ndarray) and len(shap_values.shape) == 3:
            # 3D Array (samples, features, classes)
            # Take sample 0, all features, class 1
            risk_shap = shap_values[0, :, 1]
        elif isinstance(shap_values, np.ndarray) and len(shap_values.shape) == 2:
            # 2D Array (samples, features) - KernelExplainer output
            # Take sample 0, all features
            risk_shap = shap_values[0]
        elif isinstance(shap_values, np.ndarray) and len(shap_values.shape) == 1:
            # 1D Array (features) - single sample
            risk_shap = shap_values
        else:
            # Unexpected format, fallback to printing shape and returning empty
            print(f"Unexpected SHAP output format: {type(shap_values)}, shape: {shap_values.shape if hasattr(shap_values, 'shape') else 'N/A'}")
            return []
        
        explanations = []
        feature_names = df.columns
        
        for name, value in zip(feature_names, risk_shap):
            impact = "Neutral"
            if value > 0.01: impact = "Increase Risk"
            elif value < -0.01: impact = "Decrease Risk"
            
            try:
                val = df.iloc[0][name]
                # Convert numpy types to native Python
                if hasattr(val, 'item'): val = val.item()
            except:
                val = "-"

            explanations.append({
                "feature": name,
                "value": val, # Add this
                "impact_score": float(value),
                "impact_description": impact
            })
            
        # Sort by absolute impact
        explanations.sort(key=lambda x: abs(x['impact_score']), reverse=True)
        return explanations
