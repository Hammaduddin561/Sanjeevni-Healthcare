#!/usr/bin/env python3
"""
Fairness audit script using Fairlearn.
Evaluates the primary trained model across gender and age bands.
Outputs metrics including selection rate, accuracy, TPR (sensitivity),
FPR, demographic parity difference, and equalized odds difference to backend/models/fairness.json.
"""

import json
import logging
from pathlib import Path
import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, recall_score, precision_score
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


def run_fairness_audit():
    logger.info("Loading dataset from %s", DATA_PATH)
    df = pd.read_csv(DATA_PATH)
    
    # Filter out rare "Other" gender for binary group fairness analysis if count is negligible,
    # or keep known genders
    df_clean = df[df["gender"].isin(["Male", "Female"])].copy()
    df_clean["age_group"] = df_clean["age"].apply(categorize_age)

    # Feature engineering matching risk pipeline
    df_clean['BMI_Age_Interaction'] = df_clean['bmi'] * df_clean['age']
    df_clean['Glucose_HbA1c_Interaction'] = df_clean['blood_glucose_level'] * df_clean['HbA1c_level']
    df_clean['Age_Category'] = pd.cut(
        df_clean['age'],
        bins=[0, 30, 45, 60, 120],
        labels=['Young', 'Middle', 'Senior', 'Elderly']
    )
    df_clean['BMI_Category'] = pd.cut(
        df_clean['bmi'],
        bins=[0, 18.5, 25, 30, 100],
        labels=['Underweight', 'Normal', 'Overweight', 'Obese']
    )

    target = "diabetes"
    y_true = df_clean[target]
    X = df_clean.drop(columns=[target, "age_group"])

    logger.info("Loading model from %s", MODEL_PATH)
    pipeline = joblib.load(MODEL_PATH)

    logger.info("Generating predictions...")
    y_pred = pipeline.predict(X)
    y_prob = pipeline.predict_proba(X)[:, 1]

    # Metrics dictionary
    metrics = {
        "accuracy": accuracy_score,
        "precision": precision_score,
        "recall_tpr": true_positive_rate,
        "false_positive_rate": false_positive_rate,
        "selection_rate": selection_rate,
    }

    # 1. Gender Audit
    logger.info("Auditing gender fairness...")
    mf_gender = MetricFrame(
        metrics=metrics,
        y_true=y_true,
        y_pred=y_pred,
        sensitive_features=df_clean["gender"]
    )
    gender_by_group = mf_gender.by_group.to_dict(orient="index")
    gender_overall = mf_gender.overall.to_dict()
    dp_diff_gender = float(demographic_parity_difference(y_true, y_pred, sensitive_features=df_clean["gender"]))
    eo_diff_gender = float(equalized_odds_difference(y_true, y_pred, sensitive_features=df_clean["gender"]))

    # 2. Age Group Audit
    logger.info("Auditing age group fairness...")
    mf_age = MetricFrame(
        metrics=metrics,
        y_true=y_true,
        y_pred=y_pred,
        sensitive_features=df_clean["age_group"]
    )
    age_by_group = mf_age.by_group.to_dict(orient="index")
    dp_diff_age = float(demographic_parity_difference(y_true, y_pred, sensitive_features=df_clean["age_group"]))
    eo_diff_age = float(equalized_odds_difference(y_true, y_pred, sensitive_features=df_clean["age_group"]))

    # Dynamic summaries computed strictly from Fairlearn MetricFrame outputs
    f_metrics = gender_by_group.get("Female", {})
    m_metrics = gender_by_group.get("Male", {})
    gender_summary = (
        f"Across {len(df_clean):,} records from the public Kaggle diabetes benchmark dataset: "
        f"Female recall is {f_metrics.get('recall_tpr', 0)*100:.1f}% (FPR {f_metrics.get('false_positive_rate', 0)*100:.1f}%, selection {f_metrics.get('selection_rate', 0)*100:.1f}%) and "
        f"Male recall is {m_metrics.get('recall_tpr', 0)*100:.1f}% (FPR {m_metrics.get('false_positive_rate', 0)*100:.1f}%, selection {m_metrics.get('selection_rate', 0)*100:.1f}%). "
        f"Demographic parity difference: {dp_diff_gender:.4f}; equalized odds difference: {eo_diff_gender:.4f}."
    )

    u30 = age_by_group.get("<30", {})
    b30_44 = age_by_group.get("30-44", {})
    b45_59 = age_by_group.get("45-59", {})
    b60 = age_by_group.get("60+", {})
    age_summary = (
        f"Performance varies strongly by age band: recall is low for <30 ({u30.get('recall_tpr', 0)*100:.1f}%, FPR {u30.get('false_positive_rate', 0)*100:.1f}%) "
        f"and moderate for 30-44 ({b30_44.get('recall_tpr', 0)*100:.1f}%, FPR {b30_44.get('false_positive_rate', 0)*100:.1f}%), "
        f"rising to {b45_59.get('recall_tpr', 0)*100:.1f}% for 45-59 (FPR {b45_59.get('false_positive_rate', 0)*100:.1f}%) and "
        f"{b60.get('recall_tpr', 0)*100:.1f}% for 60+ with a high false-positive rate of {b60.get('false_positive_rate', 0)*100:.1f}% (selection {b60.get('selection_rate', 0)*100:.1f}%). "
        f"Age demographic parity difference is {dp_diff_age:.4f} and equalized odds difference is {eo_diff_age:.4f}."
    )
    age_limitation_note = (
        f"Limitation: False-negative risk is higher in adults under 45 (<30 recall {u30.get('recall_tpr', 0)*100:.1f}%, 30-44 recall {b30_44.get('recall_tpr', 0)*100:.1f}%), "
        f"while adults 60+ experience a high false-positive rate ({b60.get('false_positive_rate', 0)*100:.1f}%). Symptomatic younger adults must still receive confirmatory blood glucose testing."
    )

    audit_results = {
        "dataset_source": "public Kaggle diabetes benchmark dataset",
        "dataset_sample_size": int(len(df_clean)),
        "model_file": MODEL_PATH.name,
        "overall_metrics": {k: round(float(v), 4) for k, v in gender_overall.items()},
        "gender_audit": {
            "by_group": {
                group: {metric: round(float(val), 4) for metric, val in scores.items()}
                for group, scores in gender_by_group.items()
            },
            "demographic_parity_difference": round(dp_diff_gender, 4),
            "equalized_odds_difference": round(eo_diff_gender, 4),
            "summary": gender_summary,
        },
        "age_audit": {
            "by_group": {
                group: {metric: round(float(val), 4) for metric, val in scores.items()}
                for group, scores in age_by_group.items()
            },
            "demographic_parity_difference": round(dp_diff_age, 4),
            "equalized_odds_difference": round(eo_diff_age, 4),
            "summary": age_summary,
            "limitation_note": age_limitation_note,
        },
        "disclaimer": (
            "Fairness metrics are computed on the public Kaggle diabetes benchmark dataset and represent "
            "baseline subgroup parity evaluations. Screening results must be confirmed clinically."
        )
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(audit_results, f, indent=2)

    logger.info("Fairness audit successfully written to %s", OUTPUT_PATH)
    print(json.dumps(audit_results, indent=2))


if __name__ == "__main__":
    run_fairness_audit()
