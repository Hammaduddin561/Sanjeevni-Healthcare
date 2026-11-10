import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from backend.schemas.patient import PatientRequest
from backend.utils.fhir_converter import FHIRConverter
from backend.models.risk_engine import RiskEngine
from backend.models.user import User
from backend.models.audit import record_audit_event
from backend.database import get_db
from backend.auth import get_current_user
from sqlalchemy.orm import Session

logger = logging.getLogger("sanjeevni.fhir")
router = APIRouter(prefix="/fhir", tags=["FHIR Interoperability"])

def get_shared_risk_engine(request: Request) -> RiskEngine:
    """Retrieve the singleton RiskEngine instance stored in FastAPI app state."""
    engine = getattr(request.app.state, "risk_engine", None)
    if engine is None:
        logger.error("RiskEngine instance not found in FastAPI app.state")
        raise HTTPException(status_code=503, detail="Risk Engine not initialized on server")
    return engine

@router.post("/bundle")
def convert_to_fhir(
    patient: PatientRequest,
    engine: RiskEngine = Depends(get_shared_risk_engine),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        data = patient.model_dump()
        score = engine.predict_risk(data)
        level = "High" if score >= 0.6 else "Moderate" if score >= 0.2 else "Low"
        
        # 1. Patient Resource
        fhir_patient = FHIRConverter.to_patient(data)
        patient_id = fhir_patient["id"]

        # 2. Vital & Clinical Observations (Glucose, HbA1c, BMI, BP, PHQ-9)
        fhir_observations = FHIRConverter.to_observations(data, patient_ref=patient_id)

        # 3. Risk Assessment Resource
        fhir_assessment = FHIRConverter.to_risk_assessment(data, score, level, patient_ref=patient_id)

        record_audit_event(
            db, current_user.email, current_user.role, "FHIR_BUNDLE", "/fhir/bundle", "success", {"risk_level": level}
        )
        
        entries = [{"resource": fhir_patient}]
        for obs in fhir_observations:
            entries.append({"resource": obs})
        entries.append({"resource": fhir_assessment})

        return {
            "resourceType": "Bundle",
            "type": "collection",
            "entry": entries
        }
    except ValueError as ve:
        logger.warning(f"Validation error generating FHIR bundle: {ve}")
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        logger.exception("Unexpected failure during FHIR bundle conversion")
        raise HTTPException(status_code=500, detail=f"FHIR conversion error: {str(e)}")
