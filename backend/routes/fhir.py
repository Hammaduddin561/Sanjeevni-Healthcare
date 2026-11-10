import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from backend.schemas.patient import PatientRequest
from backend.utils.fhir_converter import FHIRConverter
from backend.models.risk_engine import RiskEngine

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
def convert_to_fhir(patient: PatientRequest, engine: RiskEngine = Depends(get_shared_risk_engine)):
    try:
        data = patient.model_dump()
        score = engine.predict_risk(data)
        level = "High" if score >= 0.6 else "Moderate" if score >= 0.2 else "Low"
        
        # Convert resources
        fhir_patient = FHIRConverter.to_patient(data)
        fhir_assessment = FHIRConverter.to_risk_assessment(data, score, level)
        
        return {
            "resourceType": "Bundle",
            "type": "collection",
            "entry": [
                {"resource": fhir_patient},
                {"resource": fhir_assessment}
            ]
        }
    except ValueError as ve:
        logger.warning(f"Validation error generating FHIR bundle: {ve}")
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        logger.exception("Unexpected failure during FHIR bundle conversion")
        raise HTTPException(status_code=500, detail=f"FHIR conversion error: {str(e)}")

