import os
import joblib
import logging
import pandas as pd
import numpy as np
import shap

logger = logging.getLogger("sanjeevni.risk_engine")

FEATURE_MAP = {
    "HbA1c_level": {"en": "HbA1c", "hi": "HbA1c (ग्लाइकेटेड हीमोग्लोबिन)"},
    "blood_glucose_level": {"en": "Blood Glucose", "hi": "रक्त शर्करा (ग्लूकोज)"},
    "bmi": {"en": "BMI (Body Weight)", "hi": "बीएमआई (शरीर का वजन)"},
    "age": {"en": "Age", "hi": "आयु"},
    "hypertension": {"en": "High Blood Pressure", "hi": "उच्च रक्तचाप"},
    "heart_disease": {"en": "Heart Disease History", "hi": "हृदय रोग"},
    "smoking_history": {"en": "Smoking Status", "hi": "धूम्रपान की स्थिति"},
    "BMI_Age_Interaction": {"en": "Weight & Age Synergy", "hi": "वजन और आयु का संयुक्त प्रभाव"},
    "Glucose_HbA1c_Interaction": {"en": "Combined Glycemic Markers", "hi": "ग्लूकोज व HbA1c संयुक्त संकेतक"},
}


def build_bilingual_plain_explanations(explanations: list, patient_data: dict):
    """Generates plain language sentences in English and Hindi from SHAP values."""
    increasing = [e for e in explanations if e.get("impact_score", 0) > 0.02]
    decreasing = [e for e in explanations if e.get("impact_score", 0) < -0.02]

    # Individual sentence tagging
    for item in explanations:
        f = item["feature"]
        score = item["impact_score"]
        val = item.get("value", "-")
        meta = FEATURE_MAP.get(f, {"en": f, "hi": f})
        f_en = meta["en"]
        f_hi = meta["hi"]

        if score > 0.02:
            item["plain_text_en"] = f"Your {f_en} ({val}) is higher than standard targets, pushing risk up."
            item["plain_text_hi"] = f"आपका {f_hi} ({val}) सामान्य सीमा से अधिक है, जिससे जोखिम बढ़ रहा है।"
        elif score < -0.02:
            item["plain_text_en"] = f"Your {f_en} ({val}) is in a favorable range, helping lower risk."
            item["plain_text_hi"] = f"आपका {f_hi} ({val}) सुरक्षित सीमा में है, जिससे जोखिम कम करने में मदद मिलती है।"
        else:
            item["plain_text_en"] = f"Your {f_en} ({val}) has minimal impact on the calculated risk."
            item["plain_text_hi"] = f"आपके {f_hi} ({val}) का अनुमानित जोखिम पर सामान्य प्रभाव है।"

    # Summary sentences
    if increasing:
        top_en = " and ".join([FEATURE_MAP.get(e["feature"], {}).get("en", e["feature"]) for e in increasing[:2]])
        top_hi = " और ".join([FEATURE_MAP.get(e["feature"], {}).get("hi", e["feature"]) for e in increasing[:2]])
        summary_en = f"Your {top_en} are the primary factors elevating your screening risk."
        summary_hi = f"आपका {top_hi} मधुमेह के जोखिम को बढ़ाने वाले मुख्य कारण हैं।"
    else:
        summary_en = "Your screening indicators are currently within favorable or stable reference ranges."
        summary_hi = "आपकी स्वास्थ्य जांच रिपोर्ट के संकेतक फिलहाल सुरक्षित या सामान्य सीमा में हैं।"

    if decreasing and increasing:
        top_dec_en = FEATURE_MAP.get(decreasing[0]["feature"], {}).get("en", decreasing[0]["feature"])
        top_dec_hi = FEATURE_MAP.get(decreasing[0]["feature"], {}).get("hi", decreasing[0]["feature"])
        summary_en += f" On the positive side, your {top_dec_en} provides protective benefit."
        summary_hi += f" अच्छी बात यह है कि आपका {top_dec_hi} जोखिम को नियंत्रित रखने में सहायक है।"

    return summary_en, summary_hi


class RiskEngine:
    def __init__(self, model_dir="backend/models"):
        self.model_path = os.path.join(model_dir, "risk_pipeline_v1.joblib")
        self.bg_path = os.path.join(model_dir, "background_data.joblib")
        
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found at {self.model_path}. Run scripts/train.py first.")
            
        self.pipeline = joblib.load(self.model_path)
        self.preprocessor = self.pipeline.named_steps['preprocessor']
        self.classifier = self.pipeline.named_steps['classifier']
        
        # Extract feature names from preprocessor
        self.feature_names = self._extract_feature_names()
        
        # Fast TreeExplainer for sub-100ms inference
        try:
            self.explainer = shap.TreeExplainer(self.classifier)
            logger.info("✅ Fast TreeExplainer initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not initialize TreeExplainer: {e}")
            self.explainer = None

    def _extract_feature_names(self):
        try:
            numeric_cols = [
                'age', 'hypertension', 'heart_disease', 'bmi', 'HbA1c_level', 
                'blood_glucose_level', 'BMI_Age_Interaction', 'Glucose_HbA1c_Interaction'
            ]
            categorical_cols = ['gender', 'smoking_history', 'Age_Category', 'BMI_Category']
            cat_encoder = self.preprocessor.named_transformers_['cat'].named_steps['onehot']
            cat_names = cat_encoder.get_feature_names_out(categorical_cols).tolist()
            return numeric_cols + cat_names
        except Exception as e:
            logger.warning(f"Failed extracting feature names: {e}")
            return None

    def _preprocess(self, data: dict) -> pd.DataFrame:
        df = pd.DataFrame([data])
        
        # BMI * Age
        if 'bmi' in df.columns and 'age' in df.columns:
            df['BMI_Age_Interaction'] = df['bmi'] * df['age']
        else:
            df['BMI_Age_Interaction'] = 0.0
            
        # Glucose * HbA1c
        if 'blood_glucose_level' in df.columns and 'HbA1c_level' in df.columns:
            df['Glucose_HbA1c_Interaction'] = df['blood_glucose_level'] * df['HbA1c_level']
        else:
            df['Glucose_HbA1c_Interaction'] = 0.0
            
        # Age Category
        if 'age' in df.columns:
            df['Age_Category'] = pd.cut(
                df['age'], 
                bins=[0, 30, 45, 60, 120],
                labels=['Young', 'Middle', 'Senior', 'Elderly']
            )
            
        # BMI Category
        if 'bmi' in df.columns:
            df['BMI_Category'] = pd.cut(
                df['bmi'],
                bins=[0, 18.5, 25, 30, 100],
                labels=['Underweight', 'Normal', 'Overweight', 'Obese']
            )
            
        return df

    def predict_risk(self, patient_data: dict) -> float:
        """Returns calibrated diabetes probability (0.0 to 1.0)."""
        df = self._preprocess(patient_data)
        try:
            prob = self.pipeline.predict_proba(df)[0, 1]
            return float(prob)
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            raise

    def explain_risk(self, patient_data: dict) -> list:
        """Returns list of feature contributions in under 10ms using TreeExplainer."""
        if not self.explainer:
            return []
            
        df = self._preprocess(patient_data)
        try:
            # Transform features through ColumnTransformer
            X_trans = self.preprocessor.transform(df)
            shap_values = self.explainer.shap_values(X_trans)
            
            # Format handling
            if isinstance(shap_values, list):
                # binary classification [class 0, class 1]
                risk_shap = shap_values[1][0]
            elif isinstance(shap_values, np.ndarray):
                if len(shap_values.shape) == 3:
                    risk_shap = shap_values[0, :, 1]
                elif len(shap_values.shape) == 2:
                    risk_shap = shap_values[0]
                else:
                    risk_shap = shap_values
            else:
                return []
                
            names = self.feature_names if self.feature_names else [f"f{i}" for i in range(len(risk_shap))]
            
            # Aggregate one-hot encoded categories back to main readable concept
            agg_explanations = {}
            for name, val in zip(names, risk_shap):
                # Clean prefix
                feature_label = name
                if name.startswith("cat__"):
                    feature_label = name.replace("cat__", "").split("_")[0]
                elif name.startswith("num__"):
                    feature_label = name.replace("num__", "")
                
                # Group
                if feature_label not in agg_explanations:
                    agg_explanations[feature_label] = 0.0
                agg_explanations[feature_label] += float(val)
                
            explanations = []
            for f_name, impact_score in agg_explanations.items():
                impact_desc = "Neutral"
                if impact_score > 0.01:
                    impact_desc = "Increase Risk"
                elif impact_score < -0.01:
                    impact_desc = "Decrease Risk"
                    
                val_display = patient_data.get(f_name, "-")
                explanations.append({
                    "feature": f_name,
                    "value": val_display,
                    "impact_score": round(float(impact_score), 4),
                    "impact_description": impact_desc
                })
                
            # Sort by absolute impact
            explanations.sort(key=lambda x: abs(x['impact_score']), reverse=True)
            build_bilingual_plain_explanations(explanations, patient_data)
            return explanations
        except Exception as e:
            logger.warning(f"TreeExplainer calculation warning: {e}")
            return []
