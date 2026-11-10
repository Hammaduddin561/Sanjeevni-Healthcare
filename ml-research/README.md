# SOTA ML Model Overhaul

This directory contains the logic for the "Ultimate ML Model Overhaul" trained on the local diabetes dataset.

## Architecture: Ensemble-of-Ensembles (Stacking)
We implemented a 2-stage Stacking Ensemble to maximize F1 score and Robustness.

### Level 1: Diverse Base Learners
- **XGBoost**: Gradient boosting with histogram-based splitting.
- **LightGBM**: Leaf-wise growth for speed and accuracy.
- **CatBoost**: Ordered boosting, handling categorical features natively.

### Level 2: Meta-Learner
- **Logistic Regression**: Calibrates the probabilities from Level 1 models.

## Feature Engineering (Novelty)
1.  **Cross-Domain Interactions**:
    -   `BMI_Age_Interaction`: Captures compounding risk of age and weight.
    -   `Glucose_HbA1c_Interaction`: Models metabolic load synergy.
2.  **Binning**:
    -   `BMI_Category`: (Underweight, Normal, Overweight, Obese) derived from WHO standards.

## Model Architecture Diagram

```mermaid
graph TD
    subgraph Input
        Raw[Raw Patient Data] --> Clean[Cleaning & Imputation]
    end

    subgraph FeatureEngineering [Feature Engineering Pipeline]
        Clean --> Inter[Interaction Creation]
        Inter --> Scaling[Standard Scaling]
        Scaling --> Encoding[One-Hot Encoding]
    end

    subgraph Ensemble [Stacking Ensemble]
        Encoding --> XGB[XGBoost (Gradient Boosting)]
        Encoding --> LGBM[LightGBM (Leaf-wise)]
        Encoding --> Cat[CatBoost (Ordered Boosting)]
        
        XGB -- Probabilities --> Meta[Meta-Learner]
        LGBM -- Probabilities --> Meta
        Cat -- Probabilities --> Meta
        
        Meta[Logistic Regression] --> Final[Final Calibrated Risk Score]
    end
    
    subgraph Explanation
        Final -.-> SHAP[SHAP Explainer]
        SHAP --> LocalExp[Local Feature Importance]
    end
```


## Results
- **Optimization**: Hyperparameters tuned via `Optuna` (simulated/defaults for speed).
- **Validation**: 5-Fold Stratified Cross-Validation.
- **Metric**: Optimized for **F1 Score** and **ROC AUC**.

## Reproducibility
Run the training pipeline:
```bash
python ml-research/train_sota.py
```
This will:
1. Load `data/diabetes_dataset.csv`.
2. Apply feature engineering.
3. Train the ensemble.
4. Save the artifact to `backend/models/risk_pipeline_v1.joblib`.
