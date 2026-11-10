#!/usr/bin/env python3
"""
Fairness audit script using Fairlearn.
Evaluates both the Full-Lab model and No-Lab screening model across gender and age bands.
Outputs metrics and dynamically generated honest summaries to backend/models/fairness.json.
"""

import json
import logging
from pathlib import Path
import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score
from fairlearn.metrics import (
    MetricFrame,
    selection_rate,
    false_positive_rate,
    true_positive_rate,
    demographic_parity_difference,
    equalized_odds_difference,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("audit_fairness")

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "diabetes_dataset.csv"
MODEL_PATH = BASE_DIR / "backend" / "models" / "risk_pipeline_v1.joblib"
NOLAB_MODEL_PATH = BASE_DIR / "backend" / "models" / "risk_pipeline_nolab_v1.joblib"
OUTPUT_PATH = BASE_DIR / "backend" / "models" / "fairness.json"


def categorize_age(age: float) -> str:
    if age < 30:
        return "<30"
    elif age < 45:
        return "30-44"
    elif age < 60:
        return "45-59"
    else:
        return "60+"


def _audit_single_model(pipeline_path: Path, X_input: pd.DataFrame, y_true, df_meta: pd.DataFrame) -> dict:
    """Computes Fairlearn subgroup metrics and honest dynamic summaries for one pipeline."""
    pipeline = joblib.load(pipeline_path)
    y_pred = pipeline.predict(X_input)

    metrics = {
        "accuracy": accuracy_score,
        "precision": precision_score,
        "recall_tpr": true_positive_rate,
        "false_positive_rate": false_positive_rate,
        "selection_rate": selection_rate,
    }

    mf_gender = MetricFrame(metrics=metrics, y_true=y_true, y_pred=y_pred, sensitive_features=df_meta["gender"])
    gender_by_group = mf_gender.by_group.to_dict(orient="index")
    gender_overall = mf_gender.overall.to_dict()
    dp_diff_gender = float(demographic_parity_difference(y_true, y_pred, sensitive_features=df_meta["gender"]))
    eo_diff_gender = float(equalized_odds_difference(y_true, y_pred, sensitive_features=df_meta["gender"]))

    mf_age = MetricFrame(metrics=metrics, y_true=y_true, y_pred=y_pred, sensitive_features=df_meta["age_group"])
    age_by_group = mf_age.by_group.to_dict(orient="index")
    dp_diff_age = float(demographic_parity_difference(y_true, y_pred, sensitive_features=df_meta["age_group"]))
    eo_diff_age = float(equalized_odds_difference(y_true, y_pred, sensitive_features=df_meta["age_group"]))

    f_m = gender_by_group.get("Female", {})
    m_m = gender_by_group.get("Male", {})
    gender_summary = (
        f"Across {len(df_meta):,} records from the public Kaggle diabetes benchmark dataset: "
        f"Female recall is {f_m.get('recall_tpr', 0)*100:.1f}% (FPR {f_m.get('false_positive_rate', 0)*100:.1f}%, selection {f_m.get('selection_rate', 0)*100:.1f}%) and "
        f"Male recall is {m_m.get('recall_tpr', 0)*100:.1f}% (FPR {m_m.get('false_positive_rate', 0)*100:.1f}%, selection {m_m.get('selection_rate', 0)*100:.1f}%). "
        f"Demographic parity difference: {dp_diff_gender:.4f}; equalized odds difference: {eo_diff_gender:.4f}."
    )

    u30 = age_by_group.get("<30", {})
    b30_44 = age_by_group.get("30-44", {})
    b45_59 = age_by_group.get("45-59", {})
    b60 = age_by_group.get("60+", {})
    age_summary = (
        f"Performance varies strongly by age band: recall is low for <30 ({u30.get('recall_tpr', 0)*100:.1f}%, FPR {u30.get('false_positive_rate', 0)*100:.1f}%) "
        f"and {('low' if b30_44.get('recall_tpr', 0) < 0.7 else 'moderate')} for 30-44 ({b30_44.get('recall_tpr', 0)*100:.1f}%, FPR {b30_44.get('false_positive_rate', 0)*100:.1f}%), "
        f"rising to {b45_59.get('recall_tpr', 0)*100:.1f}% for 45-59 (FPR {b45_59.get('false_positive_rate', 0)*100:.1f}%) and "
        f"{b60.get('recall_tpr', 0)*100:.1f}% for 60+ with a high false-positive rate of {b60.get('false_positive_rate', 0)*100:.1f}% (selection {b60.get('selection_rate', 0)*100:.1f}%). "
        f"Age demographic parity difference is {dp_diff_age:.4f} and equalized odds difference is {eo_diff_age:.4f}."
    )
    age_limitation_note = (
        f"Limitation: False-negative risk is higher in adults under 45 (<30 recall {u30.get('recall_tpr', 0)*100:.1f}%, 30-44 recall {b30_44.get('recall_tpr', 0)*100:.1f}%), "
        f"while adults 60+ experience a high false-positive rate ({b60.get('false_positive_rate', 0)*100:.1f}%). Symptomatic younger adults must still receive confirmatory blood glucose testing."
    )

    return {
        "model_file": pipeline_path.name,
        "overall_metrics": {k: round(float(v), 4) for k, v in gender_overall.items()},
        "gender_audit": {
            "by_group": {
                g: {m: round(float(val), 4) for m, val in sc.items()}
                for g, sc in gender_by_group.items()
            },
            "demographic_parity_difference": round(dp_diff_gender, 4),
            "equalized_odds_difference": round(eo_diff_gender, 4),
            "summary": gender_summary,
        },
        "age_audit": {
            "by_group": {
                g: {m: round(float(val), 4) for m, val in sc.items()}
                for g, sc in age_by_group.items()
            },
            "demographic_parity_difference": round(dp_diff_age, 4),
            "equalized_odds_difference": round(eo_diff_age, 4),
            "summary": age_summary,
            "limitation_note": age_limitation_note,
        },
    }


def run_fairness_audit():
    logger.info("Loading dataset from %s", DATA_PATH)
    df = pd.read_csv(DATA_PATH)
    df_clean = df[df["gender"].isin(["Male", "Female"])].copy()
    df_clean["age_group"] = df_clean["age"].apply(categorize_age)

    df_clean['BMI_Age_Interaction'] = df_clean['bmi'] * df_clean['age']
    df_clean['Glucose_HbA1c_Interaction'] = df_clean['blood_glucose_level'] * df_clean['HbA1c_level']
    df_clean['Age_Category'] = pd.cut(df_clean['age'], bins=[0, 30, 45, 60, 120], labels=['Young', 'Middle', 'Senior', 'Elderly'])
    df_clean['BMI_Category'] = pd.cut(df_clean['bmi'], bins=[0, 18.5, 25, 30, 100], labels=['Underweight', 'Normal', 'Overweight', 'Obese'])

    y_true = df_clean["diabetes"]
    X_full = df_clean.drop(columns=["diabetes", "age_group"])

    logger.info("Auditing Full-Lab model: %s", MODEL_PATH.name)
    full_audit = _audit_single_model(MODEL_PATH, X_full, y_true, df_clean)

    audit_results = {
        "dataset_source": "public Kaggle diabetes benchmark dataset",
        "dataset_sample_size": int(len(df_clean)),
        **full_audit,
        "disclaimer": (
            "Fairness metrics are computed on the public Kaggle diabetes benchmark dataset and represent "
            "baseline subgroup parity evaluations. Screening results must be confirmed clinically."
        ),
    }

    if NOLAB_MODEL_PATH.exists():
        logger.info("Auditing No-Lab model: %s", NOLAB_MODEL_PATH.name)
        nolab_cols = ['age', 'hypertension', 'heart_disease', 'bmi', 'BMI_Age_Interaction', 'gender', 'smoking_history', 'Age_Category', 'BMI_Category']
        X_nolab = df_clean[nolab_cols]
        audit_results["no_lab_fairness"] = _audit_single_model(NOLAB_MODEL_PATH, X_nolab, y_true, df_clean)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(audit_results, f, indent=2)

    logger.info("Fairness audit successfully written to %s", OUTPUT_PATH)


if __name__ == "__main__":
    run_fairness_audit()
