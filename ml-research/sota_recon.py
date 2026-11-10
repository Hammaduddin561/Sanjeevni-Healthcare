import pandas as pd
import os
import joblib
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score
from sklearn.model_selection import train_test_split

DATA_PATH = os.path.join("data", "diabetes_dataset.csv")
MODEL_PATH = os.path.join("backend", "models", "risk_pipeline_v1.joblib")

def analyze_data():
    print("--- Phase 1: Data Recon ---")
    if not os.path.exists(DATA_PATH):
        print(f"Error: Dataset not found at {DATA_PATH}")
        return

    df = pd.read_csv(DATA_PATH)
    print(f"Dataset Shape: {df.shape}")
    print("\nClass Balance:")
    print(df['diabetes'].value_counts(normalize=True))
    
    print("\nSample Data:")
    print(df.head())
    
    print("\nMissing Values:")
    print(df.isnull().sum())

    return df

def evaluate_current_model(df):
    print("\n--- Current Model Baseline ---")
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model not found at {MODEL_PATH}")
        return

    model = joblib.load(MODEL_PATH)
    
    target_col = 'diabetes'
    if target_col not in df.columns:
         print(f"Target column '{target_col}' not found.")
         return

    X = df.drop(target_col, axis=1)
    y = df[target_col]

    # Preprocess features manual step from train_pro.py needs to be consistent
    # In train_pro.py:
    # if 'bmi' in df_clean.columns and 'age' in df_clean.columns:
    #    df_clean['BMI_Age_Interaction'] = df_clean['bmi'] * df_clean['age']
    
    # We should apply the same feature engineering if the pipeline doesn't include it.
    # The saved pipeline starts with 'preprocessor', assuming 'BMI_Age_Interaction' exists if trained with it.
    # Let's check if the pipeline expects it.
    
    try:
        # Attempt prediction without interaction first
        model.predict(X.iloc[:5])
        print("Model accepts raw data (preprocessing likely included or not needed).")
    except Exception as e:
        print(f"Raw prediction failed, applying feature engineering: {e}")
        if 'bmi' in X.columns and 'age' in X.columns:
             X['BMI_Age_Interaction'] = X['bmi'] * X['age']

    # Split (using same seed as train_pro.py for fair comparison)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    roc = roc_auc_score(y_test, y_prob)
    f1 = f1_score(y_test, y_pred)

    print(f"\nCurrent Metrics:")
    print(f"Accuracy: {acc:.4f}")
    print(f"ROC AUC:  {roc:.4f}")
    print(f"F1 Score: {f1:.4f}")

if __name__ == "__main__":
    df = analyze_data()
    if df is not None:
        evaluate_current_model(df)
