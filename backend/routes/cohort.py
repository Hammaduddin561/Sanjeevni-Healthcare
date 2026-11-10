from fastapi import APIRouter, HTTPException
from backend.schemas.patient import PatientRequest, CohortAnalysisResponse, DigitalTwinResponse
from backend.models.cohort_engine import CohortEngine

router = APIRouter(prefix="/cohort", tags=["Cohort"])

# Initialize Engine
try:
    cohort_engine = CohortEngine()
except Exception as e:
    print(f"Failed to initialize CohortEngine: {e}")
    cohort_engine = None

@router.post("/analysis", response_model=CohortAnalysisResponse)
def get_cohort_analysis(patient: PatientRequest):
    if not cohort_engine or cohort_engine.df is None:
        raise HTTPException(status_code=503, detail="Cohort Engine not ready")
    
    percentiles = cohort_engine.get_percentiles(patient.dict())
    return {"percentiles": percentiles}

@router.post("/twins", response_model=DigitalTwinResponse)
def get_digital_twins(patient: PatientRequest):
    if not cohort_engine or cohort_engine.df is None:
        raise HTTPException(status_code=503, detail="Cohort Engine not ready")
    
    twins = cohort_engine.find_digital_twins(patient.dict())
    return {"twins": twins}
