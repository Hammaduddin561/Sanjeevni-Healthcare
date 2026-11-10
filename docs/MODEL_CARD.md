# Model Card: Diabetes Risk Predictor

## Model Details
*   **Name**: CRP-Diabetes-v1
*   **Version**: 1.0 (Prototype)
*   **Type**: Binary Classification (High Risk / Low Risk) & Probability Estimation
*   **Frameworks**: Scikit-learn, XGBoost

## Intended Use
*   **Primary Use Case**: Screening tool to identify patients at high risk of diabetes based on routine clinical records.
*   **Users**: General Practitioners (GPs), Nurses, and Clinical Staff.
*   **Out of Scope**: Diagnosing patients without confirmatory lab tests (e.g., HbA1c).

## Data
*   **Source**: Curated `diabetes_dataset.csv`.
*   **Features Used**: BMI, Age, Glucose Levels, Blood Pressure, Insulin, etc.
*   **Preprocessing**: Standardization of continuous variables, imputation of missing values.

## Performance Metrics
*   **Target Metric**: AUC-ROC (Area Under the Receiver Operating Characteristic Curve).
*   **Secondary Metrics**: Precision, Recall, F1-Score (focused on minimizing False Negatives for screening).

## Interoperability
*   **Input**: JSON object with patient vitals.
*   **Output**: Risk Score (0-100), Risk Tier (Low/Medium/High), SHAP contribution values.
