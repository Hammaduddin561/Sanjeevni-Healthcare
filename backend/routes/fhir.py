from fastapi import APIRouter, HTTPException
from backend.schemas.patient import PatientRequest
from backend.utils.fhir_converter import FHIRConverter
from backend.models.risk_engine import RiskEngine

router = APIRouter(prefix="/fhir", tags=["FHIR Interoperability"])

# Load Risk Engine (Singleton ideally, but lazy load here for safety or import from api?)
# Circular import if I import from api. 
# Best practice: Dependency Injection or just duplicate instantiation if lightweight (XGBoost is fast).
# But RiskEngine loads model.
# I will assume `RiskEngine` is singleton safe or lightweight enough. 
# Actually, I should use `request.app.state.risk_engine` if I stored it there.
# But `api.py` defined it as global.
# I will lazily instantiate.

risk_engine = None

def get_risk_engine():
    global risk_engine
    if risk_engine is None:
        try:
            risk_engine = RiskEngine()
        except:
            pass
    return risk_engine

@router.post("/bundle")
def convert_to_fhir(patient: PatientRequest):
    engine = get_risk_engine()
    if not engine:
        raise HTTPException(status_code=503, detail="Risk Engine not ready")
        
    try:
        # Predict
        data = patient.dict()
        score = engine.predict_risk(data)
        level = "High" if score >= 0.6 else "Moderate" if score >= 0.2 else "Low"
        
        # Convert
        fhir_patient = FHIRConverter.to_patient(data)
        fhir_assessment = FHIRConverter.to_risk_assessment(data, score, level)
        
        # Bundle
        return {
            "resourceType": "Bundle",
            "type": "collection",
            "entry": [
                {"resource": fhir_patient},
                {"resource": fhir_assessment}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
