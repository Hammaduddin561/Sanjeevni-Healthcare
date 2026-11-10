from fastapi import APIRouter, HTTPException
from backend.schemas.patient import FeedbackRequest
import csv
import os
from datetime import datetime

router = APIRouter(prefix="/feedback", tags=["Feedback"])

FEEDBACK_FILE = "data/clinician_feedback.csv"

@router.post("/")
def submit_feedback(feedback: FeedbackRequest):
    try:
        # Ensure file exists and write header
        file_exists = os.path.exists(FEEDBACK_FILE)
        
        with open(FEEDBACK_FILE, mode='a', newline='') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(["timestamp", "age", "gender", "predicted_risk", "agreed", "actual", "notes"])
            
            # Write data
            writer.writerow([
                datetime.now().isoformat(),
                feedback.patient_data.age,
                feedback.patient_data.gender,
                feedback.predicted_risk,
                feedback.agreed,
                feedback.actual_diagnosis,
                feedback.clinician_notes
            ])
            
        return {"status": "success", "message": "Feedback recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
