import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
import os
import joblib

class CohortEngine:
    def __init__(self, data_path="data/diabetes_dataset.csv"):
        # Fix path to be absolute or relative to project root
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.data_path = os.path.join(project_root, data_path)
        self.df = None
        self.scaler = StandardScaler()
        self.nn_model = NearestNeighbors(n_neighbors=5, algorithm='auto')
        self.feature_cols = ['age', 'bmi', 'HbA1c_level', 'blood_glucose_level']
        self._load_data()

    def _load_data(self):
        try:
            if os.path.exists(self.data_path):
                self.df = pd.read_csv(self.data_path)
                # Ensure columns exist
                missing = [c for c in self.feature_cols if c not in self.df.columns]
                if missing:
                    print(f"CohortEngine Warning: Missing columns {missing} in dataset.")
                    self.df = None
                    return
                
                # Preprocess for NN
                # Handle categorical? For now we focus on numerical for "Digital Twin" distance
                # Ideally we encode 'gender' etc. but let's stick to vitals for simplicity or encode
                
                # Simple encoding for distance calculation
                data_for_clustering = self.df[self.feature_cols].copy()
                self.scaler.fit(data_for_clustering)
                self.nn_model.fit(self.scaler.transform(data_for_clustering))
                print(f"CohortEngine: Loaded {len(self.df)} records for cohort analysis.")
            else:
                print(f"CohortEngine: Dataset not found at {self.data_path}")
        except Exception as e:
            print(f"CohortEngine Error loading data: {e}")
            self.df = None

    def get_percentiles(self, patient_data: dict):
        """
        Calculate percentiles for the patient's vitals against the population.
        """
        if self.df is None:
            return {}

        metrics = ["bmi", "HbA1c_level", "blood_glucose_level", "age"]
        results = {}
        
        for m in metrics:
            if m in patient_data and m in self.df.columns:
                val = patient_data[m]
                # Calculate percentile: what % of population is strictly lower than this value
                # Using scipy.stats.percentileofscore or simple numpy
                less_than = (self.df[m] < val).mean() * 100
                results[f"{m}_percentile"] = round(less_than, 1)
        
        return results

    def find_digital_twins(self, patient_data: dict, k=5):
        """
        Finds 'k' similar patients (Digital Twins) and returns their outcomes (diabetes status).
        """
        if self.df is None:
            return []

        try:
            # Prepare query vector
            query = [[patient_data.get(c, 0) for c in self.feature_cols]]
            query_scaled = self.scaler.transform(query)
            
            distances, indices = self.nn_model.kneighbors(query_scaled, n_neighbors=k)
            
            twins = []
            for idx in indices[0]:
                record = self.df.iloc[idx].to_dict()
                # Clean up numpy types for JSON serialization
                clean_record = {k: (float(v) if isinstance(v, (np.float32, np.float64)) else int(v) if isinstance(v, (np.int64, np.int32)) else v) for k, v in record.items()}
                twins.append(clean_record)
            
            return twins
        except Exception as e:
            print(f"Error finding twins: {e}")
            return []

if __name__ == "__main__":
    # Test
    ce = CohortEngine()
    test_patient = {
        "gender": "Female", "age": 45, "hypertension": 0, "heart_disease": 0, 
        "smoking_history": "never", "bmi": 28.5, "HbA1c_level": 6.2, "blood_glucose_level": 140
    }
    print("Percentiles:", ce.get_percentiles(test_patient))
    print("Twins:", len(ce.find_digital_twins(test_patient)))
