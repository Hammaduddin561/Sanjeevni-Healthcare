import json
import os
from datetime import datetime
from typing import Dict, Any, List
import numpy as np

class HistoryEngine:
    def __init__(self, storage_file="data/patient_history.json"):
        """
        Initialize the History Engine with a JSON storage file.
        """
        self.storage_file = storage_file
        self.history = self._load_history()

    def _load_history(self) -> List[Dict[str, Any]]:
        """
        Load history from the JSON file.
        """
        if not os.path.exists(self.storage_file):
            return []
        
        try:
            with open(self.storage_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []

    def _save_history(self):
        """
        Save current history to the JSON file.
        """
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.storage_file), exist_ok=True)
        
        with open(self.storage_file, 'w') as f:
            json.dump(self.history, f, indent=4)

    def save_record(self, patient_data: Dict[str, Any], risk_score: float, risk_level: str, clinician_id: str = None, clinician_name: str = None):
        """
        Save a new prediction record.
        """
        record = {
            "timestamp": datetime.now().isoformat(),
            "patient_data": patient_data,
            "risk_assessment": {
                "score": risk_score,
                "level": risk_level
            },
            "clinician": {
                "id": clinician_id,
                "name": clinician_name
            }
        }
        self.history.append(record)
        self._save_history()
        return record

    def get_history(self, limit: int = 10) -> Dict[str, Any]:
        """
        Get the most recent history records + trend analysis.
        """
        # Return last N records, reversed (newest first)
        recent = self.history[-limit:][::-1]
        velocity, alert = self.calculate_risk_velocity()
        
        return {
            "history": recent,
            "trend_analysis": {
                "velocity": velocity,
                "status": alert
            }
        }

    def calculate_risk_velocity(self) -> tuple:
        """
        Calculates the rate of change of risk scores (Risk Velocity).
        Returns: (slope, status_message)
        """
        if len(self.history) < 2:
            return 0.0, "Insufficient Data"
        
        # Get last 5 data points
        data_points = self.history[-5:]
        scores = [r['risk_assessment']['score'] for r in data_points]
        x = range(len(scores))
        
        try:
            # Simple linear regression (slope)
            slope = float(np.polyfit(x, scores, 1)[0])
            
            # Determine Alert Status
            if slope > 0.05:
                status = "Critical: Rapid Risk Increase 🔺"
            elif slope > 0.01:
                status = "Warning: Rising Risk ⚠️"
            elif slope < -0.01:
                status = "Positive: Risk Decreasing 📉"
            else:
                status = "Stable 🔵"
                
            return round(slope, 4), status
        except Exception:
            return 0.0, "Error"
