import copy
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from .risk_engine import RiskEngine

logger = logging.getLogger("counterfactuals")


class FeatureEngineeringWrapper:
    """Wrapper that applies feature engineering before delegating to the pipeline."""

    def __init__(self, risk_engine: RiskEngine):
        self.risk_engine = risk_engine

    def predict_proba(self, X):
        if not isinstance(X, pd.DataFrame):
            df = pd.DataFrame(X)
        else:
            df = X.copy()
        
        # Ensure numerical casting
        for col in ["age", "bmi", "HbA1c_level", "blood_glucose_level"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

        # Vectorized feature engineering
        df["BMI_Age_Interaction"] = df["bmi"] * df["age"]
        df["Glucose_HbA1c_Interaction"] = df["blood_glucose_level"] * df["HbA1c_level"]
        df["Age_Category"] = pd.cut(
            df["age"],
            bins=[0, 30, 45, 60, 120],
            labels=["Young", "Middle", "Senior", "Elderly"]
        )
        df["BMI_Category"] = pd.cut(
            df["bmi"],
            bins=[0, 18.5, 25, 30, 100],
            labels=["Underweight", "Normal", "Overweight", "Obese"]
        )

        return self.risk_engine.pipeline.predict_proba(df)


class Counterfactuals:
    """
    DiCE (interpretml/DiCE) Counterfactual Engine restricted strictly to
    actionable features (weight/BMI, HbA1c target, smoking status).
    Never modifies immutable attributes (age, gender).
    """

    _dice_exp = None
    _background_df = None

    def __init__(self, risk_engine: RiskEngine):
        self.risk_engine = risk_engine
        self._ensure_dice_initialized()

    @classmethod
    def _ensure_dice_initialized(cls):
        if cls._dice_exp is not None:
            return
        try:
            import dice_ml

            base_dir = Path(__file__).resolve().parent.parent.parent
            data_path = base_dir / "data" / "diabetes_dataset.csv"
            if data_path.exists():
                cls._background_df = pd.read_csv(data_path).sample(250, random_state=42)
            else:
                logger.warning("Dataset not found at %s for DiCE initialization", data_path)
                return

            d = dice_ml.Data(
                dataframe=cls._background_df,
                continuous_features=["age", "bmi", "HbA1c_level", "blood_glucose_level"],
                outcome_name="diabetes"
            )
            # Create dummy model with mock wrapper for initialization
            cls._dice_data = d
            logger.info("DiCE background dataset initialized successfully")
        except Exception as e:
            logger.warning("Failed to pre-initialize DiCE data: %s", e)

    def _get_explainer(self):
        try:
            import dice_ml
            self._ensure_dice_initialized()
            if self._background_df is None or self._dice_data is None:
                return None
            m = dice_ml.Model(model=FeatureEngineeringWrapper(self.risk_engine), backend="sklearn")
            return dice_ml.Dice(self._dice_data, m, method="random")
        except Exception as e:
            logger.warning("Could not construct DiCE explainer: %s", e)
            return None

    def simulate_scenarios(self, patient_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate at most 3 realistic, actionable suggestions using DiCE.
        Restricted to weight/BMI, HbA1c target, and smoking cessation.
        Never alters age or gender.
        """
        original_risk = self.risk_engine.predict_risk(patient_data)
        scenarios: List[Dict[str, Any]] = []

        # If already very low risk, return maintenance advice
        if original_risk < 0.15:
            return [{
                "name": "Maintain Current Lifestyle",
                "change_description": "Current screening vitals indicate low baseline risk. Continue balanced diet and physical activity.",
                "original_risk": round(original_risk, 4),
                "new_risk": round(original_risk, 4),
                "risk_reduction": 0.0
            }]

        explainer = self._get_explainer()
        if explainer is not None:
            try:
                # Prepare single-row query DataFrame
                query_dict = {
                    "gender": patient_data.get("gender", "Female"),
                    "age": float(patient_data.get("age", 45)),
                    "hypertension": int(patient_data.get("hypertension", 0)),
                    "heart_disease": int(patient_data.get("heart_disease", 0)),
                    "smoking_history": str(patient_data.get("smoking_history", "never")),
                    "bmi": float(patient_data.get("bmi", 26.0)),
                    "HbA1c_level": float(patient_data.get("HbA1c_level", 6.0)),
                    "blood_glucose_level": float(patient_data.get("blood_glucose_level", 140.0)),
                }
                query_df = pd.DataFrame([query_dict])

                # Permitted ranges: realistic clinical bounds
                curr_bmi = query_dict["bmi"]
                curr_hba1c = query_dict["HbA1c_level"]
                permitted_range = {
                    "bmi": [max(18.5, round(curr_bmi * 0.85, 1)), curr_bmi],
                    "HbA1c_level": [max(5.0, round(curr_hba1c - 1.5, 1)), curr_hba1c],
                }

                cf = explainer.generate_counterfactuals(
                    query_df,
                    total_CFs=3,
                    desired_class=0,
                    features_to_vary=["bmi", "HbA1c_level", "smoking_history"],
                    permitted_range=permitted_range
                )

                if cf and cf.cf_examples_list and cf.cf_examples_list[0].final_cfs_df is not None:
                    cf_df = cf.cf_examples_list[0].final_cfs_df
                    for _, row in cf_df.iterrows():
                        new_bmi = max(18.5, round(float(row["bmi"]), 1))
                        new_hba1c = max(5.0, round(float(row["HbA1c_level"]), 1))
                        new_smoking = str(row["smoking_history"])

                        new_patient = copy.deepcopy(patient_data)
                        new_patient["bmi"] = new_bmi
                        new_patient["HbA1c_level"] = new_hba1c
                        new_patient["smoking_history"] = new_smoking

                        new_risk = self.risk_engine.predict_risk(new_patient)
                        reduction = max(0.0, original_risk - new_risk)

                        changes = []
                        if abs(new_bmi - curr_bmi) >= 0.5:
                            changes.append(f"Target BMI {new_bmi} (from {curr_bmi})")
                        if abs(new_hba1c - curr_hba1c) >= 0.2:
                            changes.append(f"Target HbA1c {new_hba1c}% (from {curr_hba1c}%)")
                        if new_smoking != query_dict["smoking_history"] and new_smoking == "never":
                            changes.append("Smoking cessation")

                        if changes and reduction > 0.005:
                            scenarios.append({
                                "name": f"DiCE Plan {len(scenarios) + 1}: " + ", ".join(changes[:2]),
                                "change_description": "; ".join(changes),
                                "original_risk": round(original_risk, 4),
                                "new_risk": round(new_risk, 4),
                                "risk_reduction": round(reduction, 4),
                                "actionable_targets": {
                                    "bmi": new_bmi,
                                    "HbA1c_level": new_hba1c,
                                    "smoking_history": new_smoking
                                }
                            })

                        if len(scenarios) >= 3:
                            break
            except Exception as e:
                logger.warning("DiCE generation fallback due to: %s", e)

        # Fallback to deterministic clinical counterfactuals if DiCE produces < 3
        if len(scenarios) < 3:
            # 1. 5% Weight Reduction
            curr_bmi = float(patient_data.get("bmi", 25))
            if curr_bmi > 24.0:
                target_bmi = round(max(18.5, curr_bmi * 0.95), 1)
                p1 = copy.deepcopy(patient_data)
                p1["bmi"] = target_bmi
                r1 = self.risk_engine.predict_risk(p1)
                if original_risk - r1 > 0.005 and not any("Weight" in s["name"] for s in scenarios):
                    scenarios.append({
                        "name": "5% Weight Reduction",
                        "change_description": f"Reduce BMI to {target_bmi} kg/m² through diet and daily 30-min walking",
                        "original_risk": round(original_risk, 4),
                        "new_risk": round(r1, 4),
                        "risk_reduction": round(original_risk - r1, 4),
                        "actionable_targets": {"bmi": target_bmi}
                    })

            # 2. Glycemic Control (HbA1c target)
            curr_hba1c = float(patient_data.get("HbA1c_level", 6.0))
            if curr_hba1c > 6.0 and len(scenarios) < 3:
                target_hba1c = round(max(5.5, curr_hba1c - 0.8), 1)
                p2 = copy.deepcopy(patient_data)
                p2["HbA1c_level"] = target_hba1c
                r2 = self.risk_engine.predict_risk(p2)
                if original_risk - r2 > 0.005 and not any("Glycemic" in s["name"] for s in scenarios):
                    scenarios.append({
                        "name": "Target Glycemic Control",
                        "change_description": f"Lower HbA1c to {target_hba1c}% via refined carb reduction and medication adherence",
                        "original_risk": round(original_risk, 4),
                        "new_risk": round(r2, 4),
                        "risk_reduction": round(original_risk - r2, 4),
                        "actionable_targets": {"HbA1c_level": target_hba1c}
                    })

            # 3. Smoking Cessation
            curr_smoker = str(patient_data.get("smoking_history", "")).lower()
            if curr_smoker in ["current", "ever"] and len(scenarios) < 3:
                p3 = copy.deepcopy(patient_data)
                p3["smoking_history"] = "never"
                r3 = self.risk_engine.predict_risk(p3)
                if not any("Smoking" in s["name"] for s in scenarios):
                    scenarios.append({
                        "name": "Smoking Cessation",
                        "change_description": "Complete tobacco cessation with community health counseling support",
                        "original_risk": round(original_risk, 4),
                        "new_risk": round(r3, 4),
                        "risk_reduction": round(original_risk - r3, 4),
                        "actionable_targets": {"smoking_history": "never"}
                    })

        return scenarios[:3]

    def predict_simulation(self, original_data: Dict[str, Any], modifications: Dict[str, Any]) -> Dict[str, Any]:
        """Predict risk for a specific user-defined modification."""
        new_data = copy.deepcopy(original_data)
        new_data.update(modifications)

        new_risk = self.risk_engine.predict_risk(new_data)
        return {
            "new_risk": new_risk,
            "modified_data": new_data
        }
