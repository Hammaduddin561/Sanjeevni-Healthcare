import pytest
from backend.models.llm_engine import LLMEngine, KnowledgeRetriever, EMERGENCY_KEYWORDS


def test_emergency_keyword_detection_en():
    engine = LLMEngine()
    # Chest pain emergency
    resp = engine.check_emergency("The patient has severe chest pain and cannot breathe")
    assert resp is not None
    assert "EMERGENCY ALERT" in resp
    assert "112" in resp
    assert "Tele-MANAS" in resp


def test_emergency_keyword_detection_hi():
    engine = LLMEngine()
    # Hindi suicide distress keyword
    resp = engine.check_emergency("मरीज को बहुत घबराहट है और वह आत्महत्या करना चाहता है")
    assert resp is not None
    assert "आपातकालीन चेतावनी" in resp
    assert "Tele-MANAS" in resp
    assert "14416" in resp


def test_knowledge_retriever_grounding():
    retriever = KnowledgeRetriever()
    result = retriever.retrieve("What is the diagnostic cutoff for HbA1c in diabetes?")
    assert result is not None
    content, source = result
    assert "HbA1c" in content
    assert "ADA" in source or "Diabetes" in source


def test_knowledge_retriever_unrelated_query():
    retriever = KnowledgeRetriever()
    # Completely unrelated query
    result = retriever.retrieve("Who won the cricket world cup in 2011?")
    assert result is None


def test_stream_chat_emergency():
    engine = LLMEngine()
    chunks = list(engine.stream_chat("I want to kill myself"))
    full_text = "".join(chunks)
    assert "EMERGENCY ALERT" in full_text
    assert "Tele-MANAS" in full_text


def test_stream_chat_unknown_topic():
    engine = LLMEngine()
    chunks = list(engine.stream_chat("What is the stock price of Apple?"))
    full_text = "".join(chunks)
    assert "do not have sufficient clinical guidelines" in full_text


def test_doctor_summary_template_fallback_on_invented_number():
    engine = LLMEngine()
    engine.mock_mode = True  # Uses deterministic verified template

    patient = {
        "age": 45,
        "gender": "Female",
        "bmi": 26.2,
        "blood_glucose_level": 140.0,
        "HbA1c_level": 6.1,
        "systolic_bp": 130.0,
        "diastolic_bp": 85.0,
        "phq9_scores": [0]*9
    }
    summary = engine.generate_doctor_summary(
        patient_data=patient,
        ml_risk_score=0.25,
        final_triage="GREEN",
        escalation_reasons=[]
    )
    assert "45" in summary
    assert "26.2" in summary
    assert "140" in summary
    assert "GREEN" in summary
