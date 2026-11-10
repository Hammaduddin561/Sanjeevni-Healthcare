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

NOLAB_LABEL_EN = "Estimated without lab tests: confirm with a glucometer or lab test"
NOLAB_LABEL_HI = "बिना लैब जांच के अनुमान: ग्लूकोमीटर या लैब जांच से पुष्टि करें"
NOLAB_RECOMMENDATION_EN = "Recommended: Confirm with a blood glucose (glucometer/fasting) or HbA1c lab check."


def build_bilingual_plain_explanations(explanations: list, patient_data: dict, no_lab: bool = False):
    """Generates plain language sentences in English and Hindi from SHAP values."""
    increasing = [e for e in explanations if e.get("impact_score", 0) > 0.02]
    decreasing = [e for e in explanations if e.get("impact_score", 0) < -0.02]

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

    if no_lab:
        summary_en = f"{NOLAB_LABEL_EN}. {summary_en} {NOLAB_RECOMMENDATION_EN}"
        summary_hi = f"{NOLAB_LABEL_HI}। {summary_hi} सलाह: रक्त शर्करा (ग्लूकोमीटर/लैब) की जांच अवश्य कराएं।"

    return summary_en, summary_hi


class RiskEngine:
    def __init__(self, model_dir="backend/models"):
        self.model_path = os.path.join(model_dir, "risk_pipeline_v1.joblib")
        self.nolab_path = os.path.join(model_dir, "risk_pipeline_nolab_v1.joblib")
        self.nolab_cal_path = os.path.join(model_dir, "calibrated_nolab_v1.joblib")
        self.bg_path = os.path.join(model_dir, "background_data.joblib")

        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found at {self.model_path}. Run scripts/train.py first.")

        self.pipeline = joblib.load(self.model_path)
        self.preprocessor = self.pipeline.named_steps['preprocessor']
        self.classifier = self.pipeline.named_steps['classifier']
        self.feature_names = self._extract_feature_names(self.preprocessor, include_labs=True)

        try:
            self.explainer = shap.TreeExplainer(self.classifier)
            logger.info("✅ Full-Lab TreeExplainer initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not initialize TreeExplainer: {e}")
            self.explainer = None

        # Optional No-Lab Mode pipeline (used whenever HbA1c or Blood Glucose is absent)
        self.nolab_pipeline = joblib.load(self.nolab_path) if os.path.exists(self.nolab_path) else None
        self.nolab_cal_pipeline = joblib.load(self.nolab_cal_path) if os.path.exists(self.nolab_cal_path) else None
        self.nolab_explainer = None
        self.nolab_feature_names = None
        if self.nolab_pipeline is not None:
            nl_pre = self.nolab_pipeline.named_steps['preprocessor']
            nl_clf = self.nolab_pipeline.named_steps['classifier']
            self.nolab_feature_names = self._extract_feature_names(nl_pre, include_labs=False)
            try:
                self.nolab_explainer = shap.TreeExplainer(nl_clf)
                logger.info("✅ No-Lab TreeExplainer initialized successfully.")
            except Exception as e:
                logger.warning(f"Could not initialize No-Lab TreeExplainer: {e}")

    def _extract_feature_names(self, preprocessor, include_labs: bool = True):
        try:
            if include_labs:
                numeric_cols = [
                    'age', 'hypertension', 'heart_disease', 'bmi', 'HbA1c_level',
                    'blood_glucose_level', 'BMI_Age_Interaction', 'Glucose_HbA1c_Interaction'
                ]
            else:
                numeric_cols = ['age', 'hypertension', 'heart_disease', 'bmi', 'BMI_Age_Interaction']
            categorical_cols = ['gender', 'smoking_history', 'Age_Category', 'BMI_Category']
            cat_encoder = preprocessor.named_transformers_['cat'].named_steps['onehot']
            cat_names = cat_encoder.get_feature_names_out(categorical_cols).tolist()
            return numeric_cols + cat_names
        except Exception as e:
            logger.warning(f"Failed extracting feature names: {e}")
            return None

    @staticmethod
    def is_no_lab(patient_data: dict) -> bool:
        """Returns True if HbA1c or Blood Glucose is missing."""
        return patient_data.get("HbA1c_level") is None or patient_data.get("blood_glucose_level") is None

    def _preprocess(self, data: dict, no_lab: bool = False) -> pd.DataFrame:
        clean = data.copy()
        # Derive hypertension flag from BP if provided and hypertension not set
        if clean.get("hypertension") in (None, 0):
            s_bp = clean.get("systolic_bp")
            d_bp = clean.get("diastolic_bp")
            if (s_bp is not None and float(s_bp) >= 140) or (d_bp is not None and float(d_bp) >= 90):
                clean["hypertension"] = 1

        df = pd.DataFrame([clean])
        if 'bmi' in df.columns and 'age' in df.columns:
            df['BMI_Age_Interaction'] = df['bmi'] * df['age']
        else:
            df['BMI_Age_Interaction'] = 0.0

        if not no_lab:
            if 'blood_glucose_level' in df.columns and 'HbA1c_level' in df.columns:
                df['Glucose_HbA1c_Interaction'] = df['blood_glucose_level'] * df['HbA1c_level']
            else:
                df['Glucose_HbA1c_Interaction'] = 0.0

        if 'age' in df.columns:
            df['Age_Category'] = pd.cut(df['age'], bins=[0, 30, 45, 60, 120], labels=['Young', 'Middle', 'Senior', 'Elderly'])
        if 'bmi' in df.columns:
            df['BMI_Category'] = pd.cut(df['bmi'], bins=[0, 18.5, 25, 30, 100], labels=['Underweight', 'Normal', 'Overweight', 'Obese'])

        if no_lab:
            cols = ['age', 'hypertension', 'heart_disease', 'bmi', 'BMI_Age_Interaction', 'gender', 'smoking_history', 'Age_Category', 'BMI_Category']
            return df[cols]
        return df

    def predict_risk(self, patient_data: dict) -> float:
        """Routes automatically between Full-Lab and Calibrated No-Lab XGBoost pipelines."""
        use_nolab = self.is_no_lab(patient_data)
        if use_nolab and self.nolab_cal_pipeline is not None:
            df = self._preprocess(patient_data, no_lab=True)
            return float(self.nolab_cal_pipeline.predict_proba(df)[0, 1])
        if use_nolab and self.nolab_pipeline is not None:
            df = self._preprocess(patient_data, no_lab=True)
            return float(self.nolab_pipeline.predict_proba(df)[0, 1])

        df = self._preprocess(patient_data, no_lab=False)
        return float(self.pipeline.predict_proba(df)[0, 1])

    def explain_risk(self, patient_data: dict) -> list:
        """Returns TreeExplainer SHAP contributions (<20ms) for Full-Lab or No-Lab path."""
        use_nolab = self.is_no_lab(patient_data) and self.nolab_pipeline is not None and self.nolab_explainer is not None
        explainer = self.nolab_explainer if use_nolab else self.explainer
        preprocessor = self.nolab_pipeline.named_steps['preprocessor'] if use_nolab else self.preprocessor
        feature_names = self.nolab_feature_names if use_nolab else self.feature_names

        if not explainer:
            return []

        df = self._preprocess(patient_data, no_lab=use_nolab)
        try:
            X_trans = preprocessor.transform(df)
            shap_values = explainer.shap_values(X_trans)

            if isinstance(shap_values, list):
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

            names = feature_names if feature_names else [f"f{i}" for i in range(len(risk_shap))]
            agg_explanations = {}
            for name, val in zip(names, risk_shap):
                feature_label = name
                if name.startswith("cat__"):
                    feature_label = name.replace("cat__", "").split("_")[0]
                elif name.startswith("num__"):
                    feature_label = name.replace("num__", "")
                agg_explanations[feature_label] = agg_explanations.get(feature_label, 0.0) + float(val)

            explanations = []
            for f_name, impact_score in agg_explanations.items():
                impact_desc = "Neutral"
                if impact_score > 0.01:
                    impact_desc = "Increase Risk"
                elif impact_score < -0.01:
                    impact_desc = "Decrease Risk"
                explanations.append({
                    "feature": f_name,
                    "value": patient_data.get(f_name, "-"),
                    "impact_score": round(float(impact_score), 4),
                    "impact_description": impact_desc
                })

            explanations.sort(key=lambda x: abs(x['impact_score']), reverse=True)
            build_bilingual_plain_explanations(explanations, patient_data, no_lab=use_nolab)
            return explanations
        except Exception as e:
            logger.warning(f"TreeExplainer calculation warning: {e}")
            return []
