# 🧠 Professional ML Implementation Plan
**Version**: 1.0 (Enterprise Grade)
**Objective**: Build a competition-winning, clinically calibrated risk prediction engine.

---

## 1. 🏗️ High-Level Architecture
We are moving beyond simple `.fit()` and `.predict()`. The production pipeline consists of:

1.  **Robust Preprocessing**: Handling "hidden missing values" (zeros in medical data).
2.  **Ensemble Modeling**: Integrating Gradient Boosting (performance) with Linear Models (stability).
3.  **Calibration Layer**: Ensuring risk scores match real-world probabilities.
4.  **Explainability Layer**: Generating SHAP values for every prediction.

---

## 2. 🔧 Detailed Technical Specifications

### 2.1 Data Ingestion & Cleaning
**File**: `ml-research/train_pro.py`

*   **Problem**: The Diabetes dataset contains `0` for `Glucose`, `BloodPressure`, `SkinThickness`, `Insulin`, `BMI`. These are physically impossible and represent missing data.
*   **Solution Strategy**:
    1.  **Replace**: Convert `0` -> `np.nan` for these specific columns.
    2.  **Impute**: Use `SimpleImputer(strategy='median')`. We use 'median' because biological markers often have skewed distributions (outliers).
*   **Feature Engineering**:
    *   Create `BMI_Age_Interaction = BMI * Age` (captures compounding risk).

### 2.2 The Model Architecture (Ensemble)
We will use a `VotingClassifier` to combine the strengths of two models:

#### A. XGBoost (The Powerhouse)
*   **Role**: Captures non-linear relationships and complex interactions.
*   **Hyperparameters**:
    *   `n_estimators=100` (Number of trees)
    *   `max_depth=3` (Prevent overfitting, keep it interpretable)
    *   `learning_rate=0.1`

#### B. Logistic Regression (The Anchor)
*   **Role**: Provides a stable linear baseline and prevents the model from "hallucinating" on wild outliers.
*   **Regularization**: `C=1.0` (L2 penalty).

#### C. The Voter
*   `VotingClassifier(estimators=[('xgb', xgb), ('lr', lr)], voting='soft')`
*   *Why Soft Voting?* It averages the predicted probabilities, differentiating a "confident" prediction from a "weak" one.

### 2.3 Probability Calibration (Crucial!)
A raw XGBoost model might output `0.8` for a patient, but in reality, only 60% of such patients have the disease.
*   **Solution**: Wrap the Voter in `CalibratedClassifierCV(method='isotonic', cv=5)`.
*   **Result**: If the model says "70% Risk", there is statistically a 70% chance of the outcome. This is the difference between a "Toy AI" and "Clinical AI".

### 2.4 Explainability (SHAP)
*   **Method**: Since we have an ensemble, we will use `shap.KernelExplainer` (model agnostic) or explain the dominant XGBoost component using `shap.TreeExplainer`.
*   **Output**: For every prediction, we return:
    ```json
    [
      {"feature": "Glucose", "impact": +0.15, "description": "High glucose increases risk"},
      {"feature": "Age", "impact": +0.05, "description": "Age contributes slightly"},
      {"feature": "Insulin", "impact": -0.02, "description": "Normal insulin is protective"}
    ]
    ```

---

## 3. 🧪 Verification & Metrics

### 3.1 Primary Metric: Brier Score
*   Measures the accuracy of *probabilities*.
*   Formula: `Mean((Predicted_Prob - Actual_Outcome)^2)`.
*   **Target**: < 0.15 (Lower is better).

### 3.2 Secondary Metric: AUC-ROC
*   Measures discrimination (ranking).
*   **Target**: > 0.82.

### 3.3 Fairness Check
*   We will calculate the **False Positive Rate (FPR)** for:
    *   Age < 30
    *   Age > 50
*   *Requirement*: The difference in FPR must be < 5%.

---

## 4. 📦 Persistence & API Integration
*   **Format**: The full pipeline (Imputer + Scaler + Model + Calibrator) will be saved as a single object: `backend/models/risk_pipeline_v1.joblib`.
*   **Benefit**: The Backend only needs to load *one file*. No complex preprocessing code needs to be duplicated in FastAPI.

## 5. 🚀 Execution Steps
1.  **Draft** `ml-research/train_pro.py` implementing the above.
2.  **Run** training and inspect metrics.
3.  **Generate** `backend/models/risk_pipeline.pkl`.
4.  **Write** `backend/models/risk_engine.py` wrapper class.
5.  **Write** Unit Test `tests/test_risk_engine.py` to verify calibration bounds.
