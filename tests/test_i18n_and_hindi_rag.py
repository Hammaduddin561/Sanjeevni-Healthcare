import json
import os
import re
from pathlib import Path
from backend.models.llm_engine import KnowledgeRetriever, LLMEngine

ROOT = Path(__file__).resolve().parent.parent
EN_JSON = ROOT / "frontend" / "src" / "i18n" / "locales" / "en.json"
HI_JSON = ROOT / "frontend" / "src" / "i18n" / "locales" / "hi.json"
COMPONENTS_DIR = ROOT / "frontend" / "src" / "components"

LOCALIZED_COMPONENTS = [
    "DoctorDashboard.tsx",
    "ModelCard.tsx",
    "PatientTimeline.tsx",
    "MentalHealthScreening.tsx",
    "PatientInputs.tsx",
    "AuditLog.tsx",
    "ClinicianDashboard.tsx",
    "WellnessChatbot.tsx",
    "Login.tsx",
]


def _flatten_keys(d: dict, prefix: str = "") -> set:
    keys = set()
    for k, v in d.items():
        path = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys |= _flatten_keys(v, path)
        else:
            keys.add(path)
    return keys


def test_en_hi_translation_key_parity():
    en = json.loads(EN_JSON.read_text(encoding="utf-8"))
    hi = json.loads(HI_JSON.read_text(encoding="utf-8"))
    en_keys = _flatten_keys(en)
    hi_keys = _flatten_keys(hi)
    missing_in_hi = sorted(en_keys - hi_keys)
    extra_in_hi = sorted(hi_keys - en_keys)
    assert not missing_in_hi, f"Keys missing in hi.json: {missing_in_hi}"
    assert not extra_in_hi, f"Extra keys in hi.json: {extra_in_hi}"
    assert len(en_keys) >= 150


def test_localized_components_have_no_hardcoded_multiword_english_jsx():
    # Scans direct >Text< spans inside JSX across the 9 localized components
    # allowing punctuation, symbols, Brand, abbreviations (PHQ-9, FHIR, R4, ADA, AHA)
    multiword_english_re = re.compile(r">\s*([A-Z][a-z]+(?:\s+[A-Za-z]+){1,})\s*<")
    allowed_phrases = {"Sanjeevni Healthcarer"}
    for fname in LOCALIZED_COMPONENTS:
        text = (COMPONENTS_DIR / fname).read_text(encoding="utf-8")
        assert "useTranslation" in text, f"{fname} must use useTranslation()"
        matches = [
            m.group(1)
            for m in multiword_english_re.finditer(text)
            if m.group(1) not in allowed_phrases
        ]
        assert not matches, f"Hardcoded multi-word JSX strings in {fname}: {matches}"


def test_hindi_knowledge_retriever_and_rag(monkeypatch):
    monkeypatch.setenv("MOCK_LLM", "true")
    retriever = KnowledgeRetriever()
    hi_docs = [d for d in retriever.documents if d["lang"] == "hi"]
    assert len(hi_docs) == 3

    diabetes_hit = retriever.retrieve("मधुमेह जांच और HbA1c लक्ष्य क्या है?")
    assert diabetes_hit is not None
    assert "मधुमेह" in diabetes_hit[0]

    bp_hit = retriever.retrieve("उच्च रक्तचाप बीपी 180 आपातकाल")
    assert bp_hit is not None
    assert "रक्तचाप" in bp_hit[0]

    phq_hit = retriever.retrieve("अवसाद PHQ-9 स्कोर")
    assert phq_hit is not None
    assert "अवसाद" in phq_hit[0]

    engine = LLMEngine()
    ans = "".join(engine.stream_chat("मधुमेह जांच और HbA1c लक्ष्य क्या है?"))
    assert "Source" in ans or "स्रोत" in ans
    assert "मधुमेह" in ans

    refusal = "".join(engine.stream_chat("क्रिकेट विश्व कप किसने जीता?"))
    assert "जानकारी नहीं है" in refusal
