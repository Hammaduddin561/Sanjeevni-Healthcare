import json
import os
import numpy as np
from datetime import datetime

class HistoryService:
    HISTORY_FILE = os.path.join("data", "history.json")
    
    @staticmethod
    def _load_db():
        if not os.path.exists(HistoryService.HISTORY_FILE):
            return []
        try:
            with open(HistoryService.HISTORY_FILE, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []

    @staticmethod
    def _save_db(data):
        os.makedirs(os.path.dirname(HistoryService.HISTORY_FILE), exist_ok=True)
        with open(HistoryService.HISTORY_FILE, "w") as f:
            json.dump(data, f, indent=4)

    @staticmethod
    def save_record(patient_data: dict, risk_score: float, risk_level: str):
        history = HistoryService._load_db()
        
        record = {
            "id": len(history) + 1,
            "timestamp": datetime.now().isoformat(),
            "patient_data": patient_data,
            "risk_assessment": {
                "score": risk_score,
                "level": risk_level
            }
        }
        
        history.append(record)
        HistoryService._save_db(history)
        return record

    @staticmethod
    def get_history(limit: int = 10):
        try:
            full_history = HistoryService._load_db()
            # Sort by timestamp desc
            full_history.sort(key=lambda x: x['timestamp'], reverse=True)
            
            # Limit
            history_list = full_history[:limit]
            
            # Determine Trend
            velocity, alert = HistoryService.calculate_risk_velocity(history_list)
            
            return {
                "history": history_list,
                "trend_analysis": {
                    "velocity": velocity,
                    "status": alert
                }
            }
                
        except Exception as e:
            print(f"Error fetching history: {e}")
            return {"history": [], "trend_analysis": {"velocity": 0, "status": "Error"}}

    @staticmethod
    def calculate_risk_velocity(history: list) -> tuple:
        if len(history) < 2:
            return 0.0, "Insufficient Data"
        
        # Get last 5 data points (they are sorted new->old, so reverse them for calc)
        data_points = history[:5][::-1]
        scores = [r['risk_assessment']['score'] for r in data_points]
        x = range(len(scores))
        
        try:
            if len(scores) < 2:
                 return 0.0, "Insufficient Data"

            slope = float(np.polyfit(x, scores, 1)[0])
            
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
