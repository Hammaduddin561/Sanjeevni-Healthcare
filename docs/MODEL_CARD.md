# Model Card — Sanjeevni Healthcarer

> **Auto-generated from `backend/models/metrics.json` and `backend/models/fairness.json`. Do not edit metrics by hand.**

## Disclaimer
Sanjeevni Healthcarer is a research prototype for clinical screening support. It is not a diagnostic medical device and must never replace a qualified doctor.

## Model Details & Data Source
- **Model Name**: Sanjeevni Tabular XGBoost Ensemble
- **Data Source**: public Kaggle diabetes benchmark dataset (`data/diabetes_dataset.csv`)
- **Dataset Records**: 100,992 (Train: 80,793, Test: 20,199, Positive Prevalence: 8.5%)
- **Random Seed**: 42

## Performance Metrics (Full-Lab Model)
- **ROC-AUC**: 0.9773
- **Sensitivity (Recall)**: 91.61%
- **Specificity**: 90.02%
- **Precision**: 46.02%
- **F1 Score**: 0.6127
- **Brier Score (Calibrated / Uncalibrated)**: 0.0258 / 0.0598
- **Expected Calibration Error (Calibrated / Uncalibrated)**: 0.0232 / 0.0961
- **Confusion Matrix (Test Set)**: TP=1573, FP=1845, TN=16637, FN=144

## Performance Metrics (No-Lab Screening Model — Without Glucose or HbA1c)
- **Features Used**: age, bmi, hypertension, heart_disease, smoking_history, gender
- **ROC-AUC**: 0.8324
- **Sensitivity (Recall)**: 78.45%
- **Specificity**: 72.69%
- **Precision**: 21.06%
- **Brier Score (Calibrated / Uncalibrated)**: 0.0667 / 0.1697
- **Expected Calibration Error (Calibrated / Uncalibrated)**: 0.0076 / 0.2612
- **Confusion Matrix (Test Set)**: TP=1347, FP=5048, TN=13434, FN=370

## Fairness Audit (Fairlearn)

### Gender Subgroups
- **Demographic Parity Difference**: 0.0406
- **Equalized Odds Difference**: 0.0228
- **Summary**: Across 100,974 records from the public Kaggle diabetes benchmark dataset: Female recall is 91.5% (FPR 8.7%, selection 15.0%) and Male recall is 93.7% (FPR 11.0%, selection 19.0%). Demographic parity difference: 0.0406; equalized odds difference: 0.0228.

| Gender | Recall (TPR) | FPR | Selection Rate | Accuracy |
|---|---|---|---|---|
| Female | 91.5% | 8.7% | 15.0% | 91.3% |
| Male | 93.7% | 11.0% | 19.0% | 89.5% |

### Age Band Subgroups
- **Demographic Parity Difference**: 0.4094
- **Equalized Odds Difference**: 0.3128
- **Summary**: Performance varies strongly by age band: recall is low for <30 (66.1%, FPR 0.1%) and moderate for 30-44 (78.1%, FPR 3.2%), rising to 90.8% for 45-59 (FPR 12.8%) and 97.3% for 60+ with a high false-positive rate of 27.9% (selection 41.6%). Age demographic parity difference is 0.4094 and equalized odds difference is 0.3128.
- **Limitation Note**: Limitation: False-negative risk is higher in adults under 45 (<30 recall 66.1%, 30-44 recall 78.1%), while adults 60+ experience a high false-positive rate (27.9%). Symptomatic younger adults must still receive confirmatory blood glucose testing.

| Age Band | Recall (TPR) | FPR | Selection Rate | Accuracy |
|---|---|---|---|---|
| 30-44 | 78.1% | 3.1% | 6.3% | 96.1% |
| 45-59 | 90.8% | 12.8% | 21.4% | 87.6% |
| 60+ | 97.3% | 27.9% | 41.5% | 77.1% |
| <30 | 66.1% | 0.1% | 0.6% | 99.7% |

### No-Lab Model Fairness Summary
- **Gender**: Across 100,974 records from the public Kaggle diabetes benchmark dataset: Female recall is 76.6% (FPR 23.6%, selection 27.7%) and Male recall is 84.2% (FPR 32.2%, selection 37.3%). Demographic parity difference: 0.0962; equalized odds difference: 0.0857.
- **Age Bands**: Performance varies strongly by age band: recall is low for <30 (3.6%, FPR 0.1%) and low for 30-44 (41.1%, FPR 10.0%), rising to 73.9% for 45-59 (FPR 37.8%) and 94.3% for 60+ with a high false-positive rate of 76.1% (selection 79.7%). Age demographic parity difference is 0.7952 and equalized odds difference is 0.9066.
