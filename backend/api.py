from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import sys
import os
import json

# Ensure backend module can be imported
sys.path.append(os.getcwd())

from backend.utils.logger import app_logger, audit_logger
from backend.models.risk_engine import RiskEngine
from backend.models.cohort_engine import CohortEngine
from backend.models.counterfactuals import Counterfactuals
from backend.models.clinical_llm import ClinicalLLM
from backend.services.history import HistoryService

# Import Schemas
from backend.schemas.patient import (
    PatientRequest, RiskResponse, ExplanationResponse, 
    ReportResponse, SimulationRequest, SimulationResponse,
    ReportGenerationRequest
)

# Import Routes
from backend.routes import auth, cohort, feedback, fhir

from fastapi.staticfiles import StaticFiles
from backend.models.pdf_service import PDFService
from fastapi.responses import StreamingResponse

app = FastAPI(title="Sanjeevni Healthcarer API", version="1.0")

# Mount PDF directory
pdf_dir = os.path.join(os.getcwd(), "backend", "pdfs")
os.makedirs(pdf_dir, exist_ok=True)
app.mount("/pdfs", StaticFiles(directory=pdf_dir), name="pdfs")

# 1. CORS Setup from Environment Variables
allowed_origins_env = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8001,http://127.0.0.1:8001"
)
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Singleton Engine Initialization & App State Attachment
try:
    risk_engine = RiskEngine()
    app.state.risk_engine = risk_engine
    app_logger.info("Risk Engine initialized successfully.")
except Exception as e:
    app_logger.error(f"Failed to load Risk Engine: {e}")
    risk_engine = None
    app.state.risk_engine = None

try:
    cohort_engine = CohortEngine()
    app.state.cohort_engine = cohort_engine
    app_logger.info("Cohort Engine initialized successfully.")
except Exception as e:
    app_logger.error(f"Failed to load Cohort Engine: {e}")
    cohort_engine = None
    app.state.cohort_engine = None

clinical_llm = ClinicalLLM()
pdf_service = PDFService()

# 3. Include Routers
app.include_router(auth.router)
app.include_router(cohort.router)
app.include_router(feedback.router)
app.include_router(fhir.router)

def get_shared_risk_engine(request: Request) -> RiskEngine:
    engine = getattr(request.app.state, "risk_engine", None)
    if engine is None:
        raise HTTPException(status_code=503, detail="Risk Engine not initialized")
    return engine

# --- Endpoints ---

@app.get("/health")
def health_check(request: Request):
    engine = getattr(request.app.state, "risk_engine", None)
    c_engine = getattr(request.app.state, "cohort_engine", None)
    return {
        "status": "healthy" if engine is not None else "degraded",
        "model_loaded": engine is not None,
        "cohort_engine_loaded": c_engine is not None,
        "environment": os.getenv("APP_ENV", "development")
    }

@app.get("/")
def root():
    return {
        "message": "Sanjeevni Healthcarer API is running", 
        "docs": "/docs",
        "role_guide": {
            "worker": "ASHA Community Health Worker screening",
            "doctor": "Primary Health Centre triage dashboard",
            "admin": "System audit and compliance logs"
        }
    }

@app.post("/predict", response_model=RiskResponse)
def predict_risk(patient: PatientRequest, engine: RiskEngine = Depends(get_shared_risk_engine)):
    try:
        data = patient.model_dump()
        # Remove metadata before passing to ML model
        data.pop('clinician_id', None)
        data.pop('clinician_name', None)
        patient_name = data.pop('patient_name', None)
        village = data.pop('village', None)
        systolic = data.pop('systolic_bp', None)
        diastolic = data.pop('diastolic_bp', None)
        phq9 = data.pop('phq9_scores', None)

        score = engine.predict_risk(data)
        level = get_risk_level(score)
        explanations = engine.explain_risk(data)
        
        # Save to JSON History
        try:
            HistoryService.save_record(
                patient_data=data, 
                risk_score=score, 
                risk_level=level
            )
        except Exception as hist_e:
            app_logger.warning(f"Failed to record patient history: {hist_e}")

        # Structured audit log (zero patient identifiers)
        audit_logger.info(
            "Prediction generated",
            extra={"audit_event": {"action": "PREDICT", "risk_level": level, "score": score}}
        )

        return {"risk_score": score, "risk_level": level, "explanations": explanations}
    except Exception as e:
        app_logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history", response_model=Dict[str, Any])
def get_history(limit: int = 10):
    return HistoryService.get_history(limit)

@app.post("/explain", response_model=ExplanationResponse)
def explain_risk(patient: PatientRequest, engine: RiskEngine = Depends(get_shared_risk_engine)):
    try:
        data = patient.model_dump()
        data.pop('clinician_id', None)
        data.pop('clinician_name', None)
        data.pop('patient_name', None)
        data.pop('village', None)
        data.pop('systolic_bp', None)
        data.pop('diastolic_bp', None)
        data.pop('phq9_scores', None)
        
        explanations = engine.explain_risk(data)
        return {"explanations": explanations}
    except Exception as e:
        app_logger.exception("Explain failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulate", response_model=SimulationResponse)
def simulate_risk(request: SimulationRequest, engine: RiskEngine = Depends(get_shared_risk_engine)):
    try:
        cf = Counterfactuals(engine)
        p_dict = request.patient.model_dump()
        result = cf.predict_simulation(p_dict, request.modifications)
        
        original_risk = engine.predict_risk(p_dict)
        new_risk = result['new_risk']
        
        return {
            "original_risk": original_risk,
            "new_risk": new_risk,
            "risk_reduction": original_risk - new_risk
        }
    except Exception as e:
        app_logger.exception("Simulation failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/simulate/report", response_model=ReportResponse)
def generate_simulation_report(request: SimulationRequest, engine: RiskEngine = Depends(get_shared_risk_engine)):
    try:
        p_dict = request.patient.model_dump()
        original_risk = engine.predict_risk(p_dict)
        
        cf = Counterfactuals(engine)
        result = cf.predict_simulation(p_dict, request.modifications)
        new_risk = result['new_risk']
        
        # Fallback to Mock if LLM is down
        if clinical_llm is None or clinical_llm.model is None:
             report = f"Simulated Analysis: Reducing risk factors has improved the projected outcome by {((original_risk - new_risk)*100):.1f}%. Sustained adherence to these targets is expected to yield long-term benefits. (AI Offline)"
        else:
            report = clinical_llm.generate_simulation_report(
                request.patient.model_dump(), 
                result['modified_data'], 
                original_risk, 
                new_risk
            )
        return {"report": report}
    except Exception as e:
        app_logger.exception("Simulation report generation failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/report", response_model=ReportResponse)
def generate_report(patient: PatientRequest, engine: RiskEngine = Depends(get_shared_risk_engine)):
    try:
        data = patient.model_dump()
        data.pop('clinician_id', None)
        data.pop('clinician_name', None)
        patient_name = data.pop('patient_name', None)
        data.pop('village', None)
        data.pop('systolic_bp', None)
        data.pop('diastolic_bp', None)
        data.pop('phq9_scores', None)

        score = engine.predict_risk(data)
        level = get_risk_level(score)
        explanations = engine.explain_risk(data)
        
        if clinical_llm is None or clinical_llm.model is None:
            app_logger.info("Using standard template report (LLM offline).")
            report = f"""
            **Clinical Validation Summary:**
            Based on the assessment, the patient is classified as **{level.upper()} RISK** (Score: {score:.2f}). 
            
            **Key Drivers:**
            The primary contributing factors appear to be {explanations[0]['feature'] if explanations else 'metabolic indicators'}.
            
            **Actionable Community Care Advice:**
            1. Initiation of standard lifestyle interventions is recommended.
            2. Follow-up testing for HbA1c and vitals monitoring.
            3. Consider clinical review at Primary Health Centre if risk factors persist.
            
            *Research prototype disclaimer: For clinical screening assistance only; not a diagnostic replacement.*
            """
        else:
            report = clinical_llm.generate_report(data, score, level, explanations, patient_name=patient_name)
        
        pdf_filename = None
        pdf_url = None
        
        if pdf_service:
            try:
                pdf_filename = pdf_service.generate_report(data, score, level, report, explanations, patient_name=patient_name)
                pdf_url = f"/pdfs/{pdf_filename}"
            except Exception as pdf_e:
                app_logger.error(f"Error generating PDF: {pdf_e}")

        return {"report": report.strip(), "pdf_url": pdf_url}
    except Exception as e:
        app_logger.exception("Report generation failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/report/stream")
def generate_report_stream(patient: ReportGenerationRequest, engine: RiskEngine = Depends(get_shared_risk_engine)):
    data = patient.model_dump()
    # Extract optional pre-calculated data
    pre_score = data.pop('risk_score', None)
    pre_level = data.pop('risk_level', None)
    pre_explanations = data.pop('explanations', None)

    # Remove metadata
    data.pop('clinician_id', None)
    data.pop('clinician_name', None)
    patient_name = data.pop('patient_name', None)
    data.pop('village', None)
    data.pop('systolic_bp', None)
    data.pop('diastolic_bp', None)
    data.pop('phq9_scores', None)

    # Use pre-calculated data if available, otherwise calculate
    if pre_score is not None and pre_explanations is not None:
        score = pre_score
        level = pre_level if pre_level else get_risk_level(score)
        explanations = pre_explanations
    else:
        score = engine.predict_risk(data)
        level = get_risk_level(score)
        explanations = engine.explain_risk(data)

    def event_generator():
        # 1. Yield Risk Data first (fast)
        yield f"event: risk\ndata: {json.dumps({'risk_score': score, 'risk_level': level})}\n\n"
        
        full_report = ""
        
        # 2. Yield LLM tokens
        if clinical_llm is None or clinical_llm.model is None:
            mock_text = f"Clinical Screening Summary: Patient is {level} Risk with score {score:.2f}. Advise lifestyle monitoring and standard primary care follow-up."
            for word in mock_text.split():
                yield f"data: {word} \n\n"
                full_report += word + " "
        else:
            for token in clinical_llm.stream_report(data, score, level, explanations, patient_name=patient_name):
                yield f"data: {token}\n\n"
                if isinstance(token, str):
                    full_report += token
        
        # 3. Generate PDF in background
        pdf_url = None
        if pdf_service:
            try:
                pdf_filename = pdf_service.generate_report(data, score, level, full_report, explanations, patient_name=patient_name)
                pdf_url = f"/pdfs/{pdf_filename}"
            except Exception as e:
                app_logger.error(f"Error generating PDF: {e}")
        
        # 4. Yield Final PDF URL
        if pdf_url:
            yield f"event: pdf\ndata: {json.dumps({'pdf_url': pdf_url})}\n\n"
            
        yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def get_risk_level(score):
    if score < 0.3: return "Low"
    if score < 0.7: return "Moderate"
    return "High"


# ── Mental Health Screening Endpoint ──────────────────────────────────────────
from pydantic import BaseModel
from typing import List as TypingList

class PHQ9Request(BaseModel):
    scores: TypingList[int]  # 9 scores, each 0-3

class PHQ9Response(BaseModel):
    total_score: int
    severity: str
    advice: str
    crisis_recommended: bool

@app.post("/mental-health-screen", response_model=PHQ9Response)
def mental_health_screen(request: PHQ9Request):
    """PHQ-9 Mental Health Screening — pure Python, no ML needed."""
    if len(request.scores) != 9:
        raise HTTPException(status_code=400, detail="Exactly 9 scores required (0-3 each)")
    for s in request.scores:
        if s not in [0, 1, 2, 3]:
            raise HTTPException(status_code=400, detail="Each score must be 0, 1, 2, or 3")

    total = sum(request.scores)
    crisis = request.scores[8] > 0  # Q9 — self-harm thoughts

    if total <= 4:
        severity, advice = "Minimal", "Minimal depressive symptoms. Maintain healthy habits and self-care."
    elif total <= 9:
        severity, advice = "Mild", "Mild symptoms. Consider speaking to a counsellor for guidance."
    elif total <= 14:
        severity, advice = "Moderate", "Moderate depression. We recommend consulting a mental health professional."
    elif total <= 19:
        severity, advice = "Moderately Severe", "Please reach out to a mental health professional or crisis helpline immediately."
    else:
        severity, advice = "Severe", "URGENT: Severe depression. Contact crisis helpline or emergency services now."

    return PHQ9Response(total_score=total, severity=severity, advice=advice, crisis_recommended=crisis)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
