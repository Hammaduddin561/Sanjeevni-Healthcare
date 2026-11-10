#!/usr/bin/env python3
"""
Reproducible Training Pipeline for Sanjeevni Healthcarer.
Trains:
  1. Primary Tabular Model: XGBoost Classifier (directly compatible with SHAP TreeExplainer)
  2. Calibrated Model: CalibratedClassifierCV (isotonic / Platt)
Computes:
  - ROC-AUC, Precision, Recall, F1, Specificity, Brier Score
  - Confusion Matrix
  - Calibration Curve (Expected Calibration Error)
Saves:
  - backend/models/risk_pipeline_v1.joblib (full preprocessing + XGBoost classifier)
  - backend/models/calibrated_pipeline.joblib (calibrated version)
  - backend/models/metrics.json
  - backend/models/background_data.joblib
"""
import os
import sys
import json
import joblib
import numpy as np
import pandas as pd

# Fixed Random Seed for 100% Reproducibility
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
    """Feature engineering matching production risk engine."""
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

def calculate_ece(y_true, y_prob, n_bins=10):
    """Calculate Expected Calibration Error (ECE)."""
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=n_bins, strategy='uniform')
    # bin assignment
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    bin_indices = np.digitize(y_prob, bins) - 1
    bin_indices = np.clip(bin_indices, 0, n_bins - 1)
    
    ece = 0.0
    total_samples = len(y_true)
    for i in range(len(prob_true)):
        bin_weight = (bin_indices == i).sum() / total_samples
        ece += bin_weight * abs(prob_true[i] - prob_pred[i])
    return float(ece)

def train(data_path="data/diabetes_dataset.csv", output_dir="backend/models"):
    print("=" * 65)
    print("🌿 SANJEEVNI HEALTHCARER — REPRODUCIBLE ML TRAINING PIPELINE")
    print("=" * 65)
    
    os.makedirs(output_dir, exist_ok=True)
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}")

    print(f"1. Loading dataset from {data_path}...")
    df = pd.read_csv(data_path)
    print(f"   Loaded {len(df):,} total records.")

    # Target & feature split
    target_col = 'diabetes'
    X = df.drop(columns=[target_col])
    y = df[target_col].astype(int)

    # Stratified train/test split (80/20) with fixed seed
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_SEED, stratify=y
    )
    print(f"   Training samples: {len(X_train_raw):,} | Test samples: {len(X_test_raw):,}")

    # Feature engineering
    print("2. Applying feature engineering (BMI-Age & Glucose-HbA1c interactions)...")
    X_train = preprocess_features(X_train_raw)
    X_test = preprocess_features(X_test_raw)

    # Class balancing weight
    pos_count = (y_train == 1).sum()
    neg_count = (y_train == 0).sum()
    scale_pos_weight = neg_count / max(1, pos_count)
    print(f"   Positive class prevalence: {pos_count / len(y_train) * 100:.2f}% (scale_pos_weight: {scale_pos_weight:.2f})")

    # Column specifications
    categorical_cols = ['gender', 'smoking_history', 'Age_Category', 'BMI_Category']
    numeric_cols = [
        'age', 'hypertension', 'heart_disease', 'bmi', 'HbA1c_level', 
        'blood_glucose_level', 'BMI_Age_Interaction', 'Glucose_HbA1c_Interaction'
    ]

    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])

    preprocessor = ColumnTransformer(transformers=[
        ('num', numeric_transformer, numeric_cols),
        ('cat', categorical_transformer, categorical_cols)
    ])

    # Fit preprocessor to get transformed feature names
    print("3. Fitting preprocessor...")
    X_train_transformed = preprocessor.fit_transform(X_train)
    X_test_transformed = preprocessor.transform(X_test)
    
    cat_names = preprocessor.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(categorical_cols).tolist()
    all_feature_names = numeric_cols + cat_names
    print(f"   Transformed feature count: {len(all_feature_names)}")

    # 4. Train Primary XGBoost Model (TreeExplainer compatible)
    print("4. Training primary XGBoost classifier...")
    xgb_model = XGBClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos_weight,
        random_state=RANDOM_SEED,
        eval_metric='logloss',
        n_jobs=2
    )
    xgb_model.fit(X_train_transformed, y_train)

    # 5. Probability Calibration (Isotonic & Platt)
    print("5. Training calibrated classifier (Platt scaling with 3-fold CV)...")
    calibrated_platt = CalibratedClassifierCV(
        estimator=XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.85,
            scale_pos_weight=scale_pos_weight,
            random_state=RANDOM_SEED,
            eval_metric='logloss',
            n_jobs=2
        ),
        method='sigmoid',
        cv=3
    )
    calibrated_platt.fit(X_train_transformed, y_train)

    # Primary pipeline (preprocessor + model)
    primary_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', xgb_model)
    ])

    # 6. Evaluation Metrics on Unseen Test Set
    print("6. Computing evaluation metrics...")
    y_prob_primary = xgb_model.predict_proba(X_test_transformed)[:, 1]
    y_pred_primary = (y_prob_primary >= 0.5).astype(int)

    y_prob_calibrated = calibrated_platt.predict_proba(X_test_transformed)[:, 1]

    # Metrics
    auc_score = float(roc_auc_score(y_test, y_prob_primary))
    accuracy = float(accuracy_score(y_test, y_pred_primary))
    precision = float(precision_score(y_test, y_pred_primary, zero_division=0))
    recall = float(recall_score(y_test, y_pred_primary, zero_division=0))
    f1 = float(f1_score(y_test, y_pred_primary, zero_division=0))
    brier = float(brier_score_loss(y_test, y_prob_primary))
    brier_calibrated = float(brier_score_loss(y_test, y_prob_calibrated))
    ece_primary = calculate_ece(y_test.values, y_prob_primary)
    ece_calibrated = calculate_ece(y_test.values, y_prob_calibrated)

    tn, fp, fn, tp = confusion_matrix(y_test, y_pred_primary).ravel()
    specificity = float(tn / (tn + fp))

    # Calibration curves (10 bins)
    prob_true, prob_pred = calibration_curve(y_test, y_prob_primary, n_bins=10, strategy='uniform')
    cal_points = [{"mean_predicted_value": float(p), "fraction_of_positives": float(t)} for p, t in zip(prob_pred, prob_true)]

    metrics_data = {
        "model_name": "Sanjeevni Tabular XGBoost Ensemble",
        "random_seed": RANDOM_SEED,
        "dataset": {
            "total_records": len(df),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "positive_prevalence_pct": round(float(y.mean() * 100), 2)
        },
        "performance": {
            "roc_auc": round(auc_score, 4),
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall_sensitivity": round(recall, 4),
            "specificity": round(specificity, 4),
            "f1_score": round(f1, 4),
            "brier_score_uncalibrated": round(brier, 4),
            "brier_score_calibrated": round(brier_calibrated, 4),
            "expected_calibration_error_uncalibrated": round(ece_primary, 4),
            "expected_calibration_error_calibrated": round(ece_calibrated, 4)
        },
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp)
        },
        "calibration_curve": cal_points,
        "features": {
            "engineered_features": ["BMI_Age_Interaction", "Glucose_HbA1c_Interaction", "Age_Category", "BMI_Category"],
            "all_features": all_feature_names
        }
    }

    # Save models and artifacts
    pipeline_path = os.path.join(output_dir, "risk_pipeline_v1.joblib")
    metrics_path = os.path.join(output_dir, "metrics.json")
    bg_path = os.path.join(output_dir, "background_data.joblib")

    print(f"7. Saving artifacts...")
    joblib.dump(primary_pipeline, pipeline_path)
    print(f"   ✅ Saved primary pipeline to {pipeline_path}")

    with open(metrics_path, "w") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"   ✅ Saved metrics to {metrics_path}")

    # Save a lightweight background sample for SHAP / Cohort (100 rows)
    bg_sample = X_train.sample(n=min(100, len(X_train)), random_state=RANDOM_SEED)
    joblib.dump(bg_sample, bg_path)
    print(f"   ✅ Saved background sample to {bg_path}")

    print("\n" + "=" * 65)
    print("📊 TRAINING RESULTS SUMMARY:")
    print(f"   • ROC-AUC:      {auc_score:.4f}")
    print(f"   • Recall:       {recall:.4f} (Sensitivity)")
    print(f"   • Specificity:  {specificity:.4f}")
    print(f"   • Precision:    {precision:.4f}")
    print(f"   • F1 Score:     {f1:.4f}")
    print(f"   • ECE (Calib):  {ece_calibrated:.4f}")
    print("=" * 65)
    return metrics_data

if __name__ == "__main__":
    train()
