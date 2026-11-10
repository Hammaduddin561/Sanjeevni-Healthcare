#!/usr/bin/env python3
"""
Fits lightweight Logistic Regression models (Full-Lab and No-Lab) on the real
public Kaggle diabetes benchmark dataset (data/diabetes_dataset.csv) and exports
weights alongside ALL shared safety triage thresholds to shared/triage_thresholds.json.
"""
import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, brier_score_loss
from sklearn.model_selection import train_test_split

RANDOM_SEED = 42
ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "diabetes_dataset.csv"
OUT_PATH = ROOT / "shared" / "triage_thresholds.json"


def fit_and_export():
    df = pd.read_csv(DATA_PATH)
    y = df["diabetes"].astype(int)

    full_cols = ["age", "bmi", "hypertension", "heart_disease", "blood_glucose_level", "HbA1c_level"]
    nolab_cols = ["age", "bmi", "hypertension", "heart_disease"]

    X_train, X_test, y_train, y_test = train_test_split(
        df[full_cols], y, test_size=0.20, random_state=RANDOM_SEED, stratify=y
    )

    # Full-Lab Logistic (class_weight="balanced" aligns probability threshold parity with scale_pos_weight XGBoost)
    lr_full = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=RANDOM_SEED)
    lr_full.fit(X_train[full_cols], y_train)
    p_full = lr_full.predict_proba(X_test[full_cols])[:, 1]
    full_auc = float(roc_auc_score(y_test, p_full))
    full_brier = float(brier_score_loss(y_test, p_full))

    # No-Lab Logistic
    lr_nolab = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=RANDOM_SEED)
    lr_nolab.fit(X_train[nolab_cols], y_train)
    p_nolab = lr_nolab.predict_proba(X_test[nolab_cols])[:, 1]
    nolab_auc = float(roc_auc_score(y_test, p_nolab))
    nolab_brier = float(brier_score_loss(y_test, p_nolab))

    config = {
        "thresholds": {
            "ml_red_threshold": 0.65,
            "ml_yellow_threshold": 0.35,
            "severe_glucose_critical": 300.0,
            "elevated_glucose_warning": 200.0,
            "severe_hba1c_critical": 12.0,
            "elevated_hba1c_warning": 8.5,
            "hypertensive_crisis_systolic": 180.0,
            "hypertensive_crisis_diastolic": 120.0,
            "stage2_hypertension_systolic": 140.0,
            "stage2_hypertension_diastolic": 90.0,
            "phq9_self_harm_item_index": 8,
            "phq9_severe_threshold": 20,
            "phq9_moderate_threshold": 10
        },
        "offline_logistic_full_lab": {
            "features": full_cols,
            "intercept": round(float(lr_full.intercept_[0]), 6),
            "coefficients": {col: round(float(coef), 6) for col, coef in zip(full_cols, lr_full.coef_[0])},
            "test_roc_auc": round(full_auc, 4),
            "test_brier_score": round(full_brier, 4)
        },
        "offline_logistic_no_lab": {
            "features": nolab_cols,
            "intercept": round(float(lr_nolab.intercept_[0]), 6),
            "coefficients": {col: round(float(coef), 6) for col, coef in zip(nolab_cols, lr_nolab.coef_[0])},
            "test_roc_auc": round(nolab_auc, 4),
            "test_brier_score": round(nolab_brier, 4)
        }
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    print(f"✅ Wrote {OUT_PATH}")
    print(f"   Full-Lab Logistic AUC={full_auc:.4f}, Brier={full_brier:.4f}")
    print(f"   No-Lab   Logistic AUC={nolab_auc:.4f}, Brier={nolab_brier:.4f}")


if __name__ == "__main__":
    fit_and_export()
