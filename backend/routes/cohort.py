import logging
from fastapi import APIRouter, HTTPException, Request, Depends
from backend.schemas.patient import PatientRequest, CohortAnalysisResponse, DigitalTwinResponse
from backend.models.cohort_engine import CohortEngine
from backend.models.user import User
from backend.auth import get_current_user

logger = logging.getLogger("sanjeevni.cohort")
router = APIRouter(prefix="/cohort", tags=["Cohort"])

def get_shared_cohort_engine(request: Request) -> CohortEngine:
    engine = getattr(request.app.state, "cohort_engine", None)
    if engine is None:
        logger.error("CohortEngine instance not initialized in app.state")
        raise HTTPException(status_code=503, detail="Cohort Engine not ready")
    return engine

@router.post("/analysis", response_model=CohortAnalysisResponse)
def get_cohort_analysis(
    patient: PatientRequest,
    engine: CohortEngine = Depends(get_shared_cohort_engine),
    current_user: User = Depends(get_current_user)
):
    percentiles = engine.get_percentiles(patient.model_dump())
    return {"percentiles": percentiles}

@router.post("/twins", response_model=DigitalTwinResponse)
def get_digital_twins(
    patient: PatientRequest,
    engine: CohortEngine = Depends(get_shared_cohort_engine),
    current_user: User = Depends(get_current_user)
):
    twins = engine.find_digital_twins(patient.model_dump())
    return {"twins": twins}

