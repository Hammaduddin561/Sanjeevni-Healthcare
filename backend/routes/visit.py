import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, case

from backend.database import get_db, Base, engine
from backend.models.visit import Visit
from backend.models.user import User
from backend.models.audit import record_audit_event
from backend.models.risk_engine import RiskEngine, build_bilingual_plain_explanations
from backend.models.safety_layer import SafetyLayer
from backend.services.history import HistoryService
from backend.schemas.patient import VisitCreateRequest, VisitResponse, PatientTimelineResponse
from backend.utils.logger import app_logger, audit_logger
from backend.auth import get_current_user

# Ensure table exists
Base.metadata.create_all(bind=engine)

router = APIRouter(tags=["Visits & Screening Flow"])


def get_risk_engine(request: Request):
    from backend.api import get_shared_risk_engine
    return get_shared_risk_engine(request)


@router.post("/visit", response_model=VisitResponse)
@router.post("/screen", response_model=VisitResponse)
def conduct_screening_visit(
    request: VisitCreateRequest,
    db: Session = Depends(get_db),
    engine: RiskEngine = Depends(get_risk_engine),
    current_user: User = Depends(get_current_user)
):
    """
    Core ASHA 5-Minute Screening Visit endpoint.
    Processes: (a) Basic Vitals, (b) BP & Hypertension, (c) PHQ-9 Screener.
    Applies deterministic Safety Layer above Calibrated XGBoost ML model.
    Saves visit to persistent database with idempotent visit_id.
    """
    try:
        p_dict = request.model_dump()
        client_visit_id = request.visit_id or f"vis_{uuid.uuid4().hex[:12]}"
        patient_id = request.patient_id or f"P_{uuid.uuid4().hex[:8].upper()}"
        worker_id = current_user.email
        worker_name = current_user.name or current_user.email

        # Check idempotency for offline retries
        existing_visit = db.query(Visit).filter(Visit.visit_id == client_visit_id).first()
        if existing_visit:
            app_logger.info("Idempotent visit recall: %s", client_visit_id)
            reasons = json.loads(existing_visit.escalation_reasons) if existing_visit.escalation_reasons else []
            return VisitResponse(
                visit_id=existing_visit.visit_id,
                patient_id=existing_visit.patient_id,
                patient_name=existing_visit.patient_name,
                worker_id=existing_visit.worker_id,
                worker_name=existing_visit.worker_name,
                village=existing_visit.village,
                timestamp=existing_visit.timestamp.isoformat(),
                traffic_light=existing_visit.final_triage,
                ml_triage=existing_visit.ml_triage,
                ml_risk_score=existing_visit.ml_risk_score,
                safety_escalated=existing_visit.safety_escalated,
                escalation_reasons=reasons,
                action_headline=existing_visit.action_headline,
                action_details=existing_visit.action_details or "",
                bmi=existing_visit.bmi,
                blood_glucose_level=existing_visit.blood_glucose_level,
                HbA1c_level=existing_visit.HbA1c_level,
                systolic_bp=existing_visit.systolic_bp,
                diastolic_bp=existing_visit.diastolic_bp,
                hypertension_flag=existing_visit.hypertension_flag,
                phq9_total=existing_visit.phq9_total,
                phq9_severity=existing_visit.phq9_severity,
                phq9_crisis_flag=existing_visit.phq9_crisis_flag
            )

        # 1. Clean data for ML risk engine
        ml_input = p_dict.copy()
        for k in ["visit_id", "patient_id", "worker_id", "worker_name", "clinician_id", 
                  "clinician_name", "patient_name", "village", "notes", "systolic_bp", 
                  "diastolic_bp", "phq9_scores"]:
            ml_input.pop(k, None)

        # 2. Predict calibrated ML risk
        ml_risk_score = engine.predict_risk(ml_input)

        # 3. Generate SHAP explanations & bilingual plain-language summaries
        explanations = engine.explain_risk(ml_input)
        summary_en, summary_hi = build_bilingual_plain_explanations(explanations, ml_input)

        # 4. Deterministic Safety Layer evaluation (Strict non-downgrade)
        safety_eval = SafetyLayer.evaluate_triage(p_dict, ml_risk_score)

        # 5. Save to database
        db_visit = Visit(
            visit_id=client_visit_id,
            patient_id=patient_id,
            patient_name=request.patient_name,
            worker_id=worker_id,
            worker_name=worker_name,
            village=request.village or "Rampur Sub-Centre",
            timestamp=datetime.utcnow(),
            gender=request.gender,
            age=request.age,
            bmi=request.bmi,
            systolic_bp=request.systolic_bp,
            diastolic_bp=request.diastolic_bp,
            hypertension_flag=safety_eval.hypertension_flag,
            blood_glucose_level=request.blood_glucose_level,
            HbA1c_level=request.HbA1c_level,
            smoking_history=request.smoking_history,
            heart_disease=request.heart_disease,
            phq9_scores=json.dumps(request.phq9_scores) if request.phq9_scores else None,
            phq9_total=safety_eval.phq9_total,
            phq9_severity=safety_eval.phq9_severity,
            phq9_crisis_flag=safety_eval.phq9_crisis_flag,
            ml_risk_score=safety_eval.ml_risk_score,
            ml_triage=safety_eval.ml_triage,
            final_triage=safety_eval.final_triage,
            safety_escalated=safety_eval.safety_escalated,
            escalation_reasons=json.dumps(safety_eval.escalation_reasons),
            action_headline=safety_eval.action_headline,
            action_details=safety_eval.action_details,
            notes=request.notes
        )
        db.add(db_visit)
        db.commit()
        db.refresh(db_visit)

        # Sync to history service
        HistoryService.save_record(
            patient_data=p_dict,
            risk_score=safety_eval.ml_risk_score,
            risk_level=safety_eval.final_triage
        )

        record_audit_event(
            db=db,
            actor_email=current_user.email,
            actor_role=current_user.role,
            action="VISIT_SCREEN",
            resource="/visit",
            outcome="success",
            details={
                "visit_id": client_visit_id,
                "triage": safety_eval.final_triage,
                "safety_escalated": safety_eval.safety_escalated,
                "village": db_visit.village
            }
        )

        return VisitResponse(
            visit_id=db_visit.visit_id,
            patient_id=db_visit.patient_id,
            patient_name=db_visit.patient_name,
            worker_id=db_visit.worker_id,
            worker_name=db_visit.worker_name,
            village=db_visit.village,
            timestamp=db_visit.timestamp.isoformat(),
            traffic_light=db_visit.final_triage,
            ml_triage=db_visit.ml_triage,
            ml_risk_score=db_visit.ml_risk_score,
            safety_escalated=db_visit.safety_escalated,
            escalation_reasons=safety_eval.escalation_reasons,
            action_headline=db_visit.action_headline,
            action_details=db_visit.action_details,
            bmi=db_visit.bmi,
            blood_glucose_level=db_visit.blood_glucose_level,
            HbA1c_level=db_visit.HbA1c_level,
            systolic_bp=db_visit.systolic_bp,
            diastolic_bp=db_visit.diastolic_bp,
            hypertension_flag=db_visit.hypertension_flag,
            phq9_total=db_visit.phq9_total,
            phq9_severity=db_visit.phq9_severity,
            phq9_crisis_flag=db_visit.phq9_crisis_flag,
            emergency_helpline_required=safety_eval.emergency_helpline_required,
            helplines=safety_eval.helplines,
            explanations=explanations,
            summary_en=summary_en,
            summary_hi=summary_hi
        )
    except Exception as e:
        db.rollback()
        app_logger.exception("Screening visit failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patients/{patient_id}/timeline", response_model=PatientTimelineResponse)
def get_patient_timeline(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches chronological visit timeline for a patient with risk velocity analysis."""
    base_query = db.query(Visit).filter(Visit.patient_id == patient_id)
    user_role = getattr(current_user, "role", "worker")

    if user_role == "worker":
        all_for_patient = base_query.all()
        visits = (
            base_query
            .filter(Visit.worker_id == current_user.email)
            .order_by(Visit.timestamp.asc())
            .all()
        )
        if all_for_patient and not visits:
            raise HTTPException(
                status_code=403,
                detail="Access forbidden: workers can only view timelines for their own screened patients"
            )
    else:
        visits = base_query.order_by(Visit.timestamp.asc()).all()

    if not visits:
        return PatientTimelineResponse(
            patient_id=patient_id,
            patient_name=None,
            visits=[],
            total_visits=0,
            velocity=0.0,
            trend_status="No prior records"
        )

    patient_name = visits[-1].patient_name

    visits_list = []
    history_format = []
    for v in visits:
        reasons = json.loads(v.escalation_reasons) if v.escalation_reasons else []
        item = {
            "visit_id": v.visit_id,
            "timestamp": v.timestamp.isoformat(),
            "traffic_light": v.final_triage,
            "ml_risk_score": v.ml_risk_score,
            "safety_escalated": v.safety_escalated,
            "escalation_reasons": reasons,
            "action_headline": v.action_headline,
            "blood_glucose_level": v.blood_glucose_level,
            "HbA1c_level": v.HbA1c_level,
            "systolic_bp": v.systolic_bp,
            "diastolic_bp": v.diastolic_bp,
            "phq9_total": v.phq9_total,
            "phq9_severity": v.phq9_severity,
            "phq9_crisis_flag": v.phq9_crisis_flag,
            "village": v.village
        }
        visits_list.append(item)
        history_format.append({"risk_assessment": {"score": v.ml_risk_score}})

    velocity, trend_status = HistoryService.calculate_risk_velocity(history_format)

    return PatientTimelineResponse(
        patient_id=patient_id,
        patient_name=patient_name,
        visits=visits_list,
        total_visits=len(visits_list),
        velocity=velocity,
        trend_status=trend_status
    )


@router.get("/visits")
def list_visits(
    village: Optional[str] = Query(None),
    triage: Optional[str] = Query(None),
    worker_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists screening visits for PHC doctor dashboard and health workers.
    Workers see ONLY their own visits; Doctor & Admin see all visits.
    Orders RED patients first to prioritize urgent clinical interventions!
    """
    user_role = getattr(current_user, "role", "worker")
    base_scope = db.query(Visit)
    if user_role == "worker":
        base_scope = base_scope.filter(Visit.worker_id == current_user.email)
    elif worker_id:
        base_scope = base_scope.filter(Visit.worker_id == worker_id)

    query = base_scope
    if village:
        query = query.filter(Visit.village == village)
    if triage:
        query = query.filter(Visit.final_triage == triage.upper())

    # Order RED first, then YELLOW, then GREEN, then timestamp desc
    triage_priority = case(
        (Visit.final_triage == "RED", 0),
        (Visit.final_triage == "YELLOW", 1),
        (Visit.final_triage == "GREEN", 2),
        else_=3
    )

    results = query.order_by(triage_priority, desc(Visit.timestamp)).limit(limit).all()

    visits_out = []
    for v in results:
        reasons = json.loads(v.escalation_reasons) if v.escalation_reasons else []
        visits_out.append({
            "visit_id": v.visit_id,
            "patient_id": v.patient_id,
            "patient_name": v.patient_name,
            "worker_id": v.worker_id,
            "worker_name": v.worker_name,
            "village": v.village,
            "timestamp": v.timestamp.isoformat(),
            "traffic_light": v.final_triage,
            "ml_risk_score": v.ml_risk_score,
            "safety_escalated": v.safety_escalated,
            "escalation_reasons": reasons,
            "action_headline": v.action_headline,
            "blood_glucose_level": v.blood_glucose_level,
            "HbA1c_level": v.HbA1c_level,
            "systolic_bp": v.systolic_bp,
            "diastolic_bp": v.diastolic_bp,
            "hypertension_flag": v.hypertension_flag,
            "phq9_total": v.phq9_total,
            "phq9_severity": v.phq9_severity,
            "phq9_crisis_flag": v.phq9_crisis_flag
        })

    # Summary counts matching caller role scope
    scoped_visits = base_scope.all()
    red_count = sum(1 for v in scoped_visits if v.final_triage == "RED")
    yellow_count = sum(1 for v in scoped_visits if v.final_triage == "YELLOW")
    green_count = sum(1 for v in scoped_visits if v.final_triage == "GREEN")

    return {
        "visits": visits_out,
        "counts": {
            "total": len(scoped_visits),
            "red": red_count,
            "yellow": yellow_count,
            "green": green_count
        }
    }
