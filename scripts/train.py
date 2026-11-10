#!/usr/bin/env python3
"""
Reproducible Training Pipeline for Sanjeevni Healthcarer.
Trains on the public Kaggle diabetes benchmark dataset (data/diabetes_dataset.csv) with RANDOM_SEED = 42:
  1. Primary Full-Lab Model: XGBoost Classifier + Platt Calibration (uses HbA1c & Glucose + vitals/demographics)
  2. No-Lab Screening Model: Calibrated XGBoost Classifier (works WITHOUT HbA1c & Glucose using age, BMI, BP/hypertension, heart disease, smoking, gender)
Saves:
  - backend/models/risk_pipeline_v1.joblib
  - backend/models/risk_pipeline_nolab_v1.joblib
  - backend/models/calibrated_nolab_v1.joblib
  - backend/models/metrics.json
  - backend/models/background_data.joblib
"""
import os
import json
import joblib
import numpy as np
import pandas as pd

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import (
    roc_auc_score, precision_score, recall_score, f1_score,
    confusion_matrix, brier_score_loss, accuracy_score
)
from xgboost import XGBClassifier


def preprocess_features(df: pd.DataFrame) -> pd.DataFrame:
    """Feature engineering shared across training and inference."""
    df_clean = df.copy()
    if 'bmi' in df_clean.columns and 'age' in df_clean.columns:
        df_clean['BMI_Age_Interaction'] = df_clean['bmi'] * df_clean['age']
    if 'blood_glucose_level' in df_clean.columns and 'HbA1c_level' in df_clean.columns:
        df_clean['Glucose_HbA1c_Interaction'] = df_clean['blood_glucose_level'] * df_clean['HbA1c_level']
    if 'age' in df_clean.columns:
        df_clean['Age_Category'] = pd.cut(
            df_clean['age'],
            bins=[0, 30, 45, 60, 120],
            labels=['Young', 'Middle', 'Senior', 'Elderly']
        )
    if 'bmi' in df_clean.columns:
        df_clean['BMI_Category'] = pd.cut(
            df_clean['bmi'],
            bins=[0, 18.5, 25, 30, 100],
            labels=['Underweight', 'Normal', 'Overweight', 'Obese']
        )
    return df_clean


def calculate_ece(y_true, y_prob, n_bins=10) -> float:
    """Calculate Expected Calibration Error (ECE)."""
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=n_bins, strategy='uniform')
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    bin_indices = np.clip(np.digitize(y_prob, bins) - 1, 0, n_bins - 1)

    ece = 0.0
    total_samples = len(y_true)
    for i in range(len(prob_true)):
        bin_weight = (bin_indices == i).sum() / total_samples
        ece += bin_weight * abs(prob_true[i] - prob_pred[i])
    return float(ece)


def evaluate_model(y_test, y_prob_uncal, y_prob_cal):
    """Computes classification + calibration diagnostics on the unseen test split."""
    y_pred = (y_prob_uncal >= 0.5).astype(int)
    auc_score = float(roc_auc_score(y_test, y_prob_cal))
    accuracy = float(accuracy_score(y_test, y_pred))
    precision = float(precision_score(y_test, y_pred, zero_division=0))
    recall = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    brier_uncal = float(brier_score_loss(y_test, y_prob_uncal))
    brier_cal = float(brier_score_loss(y_test, y_prob_cal))
    ece_uncal = calculate_ece(y_test.values, y_prob_uncal)
    ece_cal = calculate_ece(y_test.values, y_prob_cal)

    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    specificity = float(tn / (tn + fp))

    prob_true, prob_pred = calibration_curve(y_test, y_prob_cal, n_bins=10, strategy='uniform')
    cal_points = [{"mean_predicted_value": float(p), "fraction_of_positives": float(t)} for p, t in zip(prob_pred, prob_true)]

    return {
        "performance": {
            "roc_auc": round(auc_score, 4),
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall_sensitivity": round(recall, 4),
            "specificity": round(specificity, 4),
            "f1_score": round(f1, 4),
            "brier_score_uncalibrated": round(brier_uncal, 4),
            "brier_score_calibrated": round(brier_cal, 4),
            "expected_calibration_error_uncalibrated": round(ece_uncal, 4),
            "expected_calibration_error_calibrated": round(ece_cal, 4),
        },
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp),
        },
        "calibration_curve": cal_points,
    }


def _build_preprocessor(numeric_cols, categorical_cols):
    return ColumnTransformer(transformers=[
        ('num', Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ]), numeric_cols),
        ('cat', Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ]), categorical_cols)
    ])


def train(data_path="data/diabetes_dataset.csv", output_dir="backend/models"):
    print("=" * 65)
    print("🌿 SANJEEVNI HEALTHCARER — TRAINING FULL-LAB & NO-LAB MODELS")
    print("=" * 65)

    os.makedirs(output_dir, exist_ok=True)
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}")

    df = pd.read_csv(data_path)
    X = df.drop(columns=['diabetes'])
    y = df['diabetes'].astype(int)

    # Shared stratified 80/20 split with RANDOM_SEED=42
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_SEED, stratify=y
    )

    X_train = preprocess_features(X_train_raw)
    X_test = preprocess_features(X_test_raw)

    pos_count = (y_train == 1).sum()
    neg_count = (y_train == 0).sum()
    scale_pos_weight = neg_count / max(1, pos_count)

    # --- PATH A: FULL-LAB MODEL ---
    print("1. Training Full-Lab XGBoost Model...")
    cat_full = ['gender', 'smoking_history', 'Age_Category', 'BMI_Category']
    num_full = [
        'age', 'hypertension', 'heart_disease', 'bmi', 'HbA1c_level',
        'blood_glucose_level', 'BMI_Age_Interaction', 'Glucose_HbA1c_Interaction'
    ]
    pre_full = _build_preprocessor(num_full, cat_full)
    X_tr_full = pre_full.fit_transform(X_train)
    X_te_full = pre_full.transform(X_test)
    full_feat_names = num_full + pre_full.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(cat_full).tolist()

    xgb_full = XGBClassifier(
        n_estimators=150, max_depth=4, learning_rate=0.08,
        subsample=0.85, colsample_bytree=0.85, scale_pos_weight=scale_pos_weight,
        random_state=RANDOM_SEED, eval_metric='logloss', n_jobs=2
    )
    xgb_full.fit(X_tr_full, y_train)

    cal_full = CalibratedClassifierCV(
        estimator=XGBClassifier(
            n_estimators=100, max_depth=4, learning_rate=0.08,
            subsample=0.85, scale_pos_weight=scale_pos_weight,
            random_state=RANDOM_SEED, eval_metric='logloss', n_jobs=2
        ),
        method='sigmoid', cv=3
    )
    cal_full.fit(X_tr_full, y_train)

    full_pipeline = Pipeline([('preprocessor', pre_full), ('classifier', xgb_full)])
    full_eval = evaluate_model(y_test, xgb_full.predict_proba(X_te_full)[:, 1], cal_full.predict_proba(X_te_full)[:, 1])

    # --- PATH B: NO-LAB MODEL (No HbA1c, No Glucose) ---
    print("2. Training No-Lab Screening Model (without HbA1c & blood glucose)...")
    cat_nolab = ['gender', 'smoking_history', 'Age_Category', 'BMI_Category']
    num_nolab = ['age', 'hypertension', 'heart_disease', 'bmi', 'BMI_Age_Interaction']
    X_train_nl_df = X_train[num_nolab + cat_nolab]
    X_test_nl_df = X_test[num_nolab + cat_nolab]

    pre_nolab = _build_preprocessor(num_nolab, cat_nolab)
    X_tr_nl = pre_nolab.fit_transform(X_train_nl_df)
    X_te_nl = pre_nolab.transform(X_test_nl_df)
    nolab_feat_names = num_nolab + pre_nolab.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(cat_nolab).tolist()

    xgb_nolab = XGBClassifier(
        n_estimators=150, max_depth=4, learning_rate=0.08,
        subsample=0.85, colsample_bytree=0.85, scale_pos_weight=scale_pos_weight,
        random_state=RANDOM_SEED, eval_metric='logloss', n_jobs=2
    )
    xgb_nolab.fit(X_tr_nl, y_train)

    cal_nolab = CalibratedClassifierCV(
        estimator=XGBClassifier(
            n_estimators=100, max_depth=4, learning_rate=0.08,
            subsample=0.85, scale_pos_weight=scale_pos_weight,
            random_state=RANDOM_SEED, eval_metric='logloss', n_jobs=2
        ),
        method='sigmoid', cv=3
    )
    cal_nolab.fit(X_tr_nl, y_train)

    nolab_tree_pipeline = Pipeline([('preprocessor', pre_nolab), ('classifier', xgb_nolab)])
    nolab_cal_pipeline = Pipeline([('preprocessor', pre_nolab), ('classifier', cal_nolab)])
    nolab_eval = evaluate_model(y_test, xgb_nolab.predict_proba(X_te_nl)[:, 1], cal_nolab.predict_proba(X_te_nl)[:, 1])

    metrics_data = {
        "model_name": "Sanjeevni Tabular XGBoost Ensemble",
        "data_source": "public Kaggle diabetes benchmark dataset",
        "random_seed": RANDOM_SEED,
        "dataset": {
            "total_records": len(df),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "positive_prevalence_pct": round(float(y.mean() * 100), 2),
        },
        "performance": full_eval["performance"],
        "confusion_matrix": full_eval["confusion_matrix"],
        "calibration_curve": full_eval["calibration_curve"],
        "features": {
            "engineered_features": ["BMI_Age_Interaction", "Glucose_HbA1c_Interaction", "Age_Category", "BMI_Category"],
            "all_features": full_feat_names,
        },
        "no_lab": {
            "model_name": "Sanjeevni No-Lab Screening XGBoost (Platt-Calibrated)",
            "description": "Fallback screening model operating without HbA1c or Blood Glucose.",
            "features": ["age", "bmi", "hypertension", "heart_disease", "smoking_history", "gender"],
            "all_transformed_features": nolab_feat_names,
            "performance": nolab_eval["performance"],
            "confusion_matrix": nolab_eval["confusion_matrix"],
            "calibration_curve": nolab_eval["calibration_curve"],
        },
    }

    joblib.dump(full_pipeline, os.path.join(output_dir, "risk_pipeline_v1.joblib"))
    joblib.dump(nolab_tree_pipeline, os.path.join(output_dir, "risk_pipeline_nolab_v1.joblib"))
    joblib.dump(nolab_cal_pipeline, os.path.join(output_dir, "calibrated_nolab_v1.joblib"))

    bg_sample = X_train.sample(n=min(100, len(X_train)), random_state=RANDOM_SEED)
    joblib.dump(bg_sample, os.path.join(output_dir, "background_data.joblib"))

    with open(os.path.join(output_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)

    print("Full-Lab AUC:", full_eval["performance"]["roc_auc"], "Brier(Cal):", full_eval["performance"]["brier_score_calibrated"])
    print("No-Lab   AUC:", nolab_eval["performance"]["roc_auc"], "Brier(Cal):", nolab_eval["performance"]["brier_score_calibrated"])
    print("✅ Training complete.")
    return metrics_data


if __name__ == "__main__":
    train()
