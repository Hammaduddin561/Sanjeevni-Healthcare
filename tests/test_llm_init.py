import sys
import os

sys.path.append(os.getcwd())

from backend.models.llm_engine import LLMEngine


def test_llm_engine_init():
    engine = LLMEngine()
    assert engine is not None
    # Verify mock or offline mode works seamlessly
    assert engine.retriever is not None
    docs = engine.retriever.documents
    assert len(docs) >= 3


def test_llm_emergency_direct():
    engine = LLMEngine()
    resp = engine.check_emergency("Patient having severe chest pain")
    assert resp is not None
    assert "EMERGENCY ALERT" in resp
