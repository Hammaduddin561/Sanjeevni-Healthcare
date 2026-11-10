import os
import re
import glob
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Generator
from openai import OpenAI

logger = logging.getLogger("sanjeevni.llm")

# Emergency escalation keywords in English and Hindi
EMERGENCY_KEYWORDS = [
    "chest pain", "heart attack", "shortness of breath", "difficulty breathing",
    "can't breathe", "suicide", "kill myself", "end my life", "want to die",
    "hurt myself", "unconscious", "collapsed", "severe bleeding", "paralysis",
    "slurred speech", "सीने में दर्द", "दिल का दौरा", "सांस लेने में तकलीफ",
    "सांस फूलना", "आत्महत्या", "मरना चाहता", "बेहोश", "खून बहना"
]

EMERGENCY_RESPONSE_EN = (
    "⚠️ EMERGENCY ALERT: Your message indicates a potentially life-threatening medical or mental health situation.\n\n"
    "Please take immediate action:\n"
    "1. Call National Emergency 112 or local ambulance immediately.\n"
    "2. If experiencing thoughts of self-harm or distress, call the 24/7 Toll-Free Mental Health Helpline Tele-MANAS at 14416 or KIRAN at 1800-599-0019.\n"
    "3. Go to the nearest Hospital Emergency Department or Primary Health Centre without delay.\n\n"
    "Source: National Health Mission & Emergency Guidelines (Govt of India)"
)

EMERGENCY_RESPONSE_HI = (
    "⚠️ आपातकालीन चेतावनी (Emergency Alert): आपका संदेश एक गंभीर या आपातकालीन स्वास्थ्य स्थिति का संकेत देता है।\n\n"
    "कृपया तुरंत कदम उठाएं:\n"
    "1. तत्काल राष्ट्रीय आपातकालीन नंबर 112 या स्थानीय एम्बुलेंस को कॉल करें।\n"
    "2. मानसिक परेशानी या संकट के समय सरकार की 24/7 निःशुल्क हेल्पलाइन Tele-MANAS (14416) या KIRAN (1800-599-0019) पर कॉल करें।\n"
    "3. तुरंत नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) या अस्पताल के आपातकालीन विभाग में जाएं।\n\n"
    "स्रोत: राष्ट्रीय स्वास्थ्य मिशन एवं आपातकालीन दिशानिर्देश (भारत सरकार)"
)


STOPWORDS = {
    "the", "a", "an", "is", "in", "it", "to", "of", "and", "or", "for", "on", "at",
    "by", "with", "from", "as", "about", "who", "what", "where", "when", "how", "why",
    "can", "could", "should", "would", "do", "does", "did", "this", "that", "these",
    "those", "be", "been", "being", "have", "has", "had", "me", "my", "you", "your"
}


class KnowledgeRetriever:
    """Retrieves grounded guideline snippets from backend/knowledge/*.txt."""

    def __init__(self, knowledge_dir: Optional[str] = None):
        if not knowledge_dir:
            base_dir = Path(__file__).resolve().parent.parent
            knowledge_dir = str(base_dir / "knowledge")
        self.knowledge_dir = knowledge_dir
        self.documents: List[Dict[str, str]] = []
        self._load_documents()

    def _load_documents(self):
        txt_files = glob.glob(os.path.join(self.knowledge_dir, "*.txt"))
        for fpath in txt_files:
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                # Extract source line if present
                lines = content.split("\n")
                source = "Clinical Guidelines"
                for line in lines[:3]:
                    if line.lower().startswith("source:"):
                        source = line.split(":", 1)[1].strip()
                        break
                self.documents.append({
                    "file": os.path.basename(fpath),
                    "source": source,
                    "content": content
                })
            except Exception as e:
                logger.warning("Failed loading knowledge file %s: %s", fpath, e)

    def retrieve(self, query: str) -> Optional[Tuple[str, str]]:
        """
        Returns (content, source_name) for the best matching guideline snippet.
        If no relevance is found, returns None.
        """
        if not self.documents:
            return None

        q_lower = query.lower()
        query_words = set(re.findall(r"\w+", q_lower))
        meaningful_words = {w for w in query_words if w not in STOPWORDS and len(w) > 2}
        if not meaningful_words:
            return None

        best_doc = None
        max_matches = 0

        for doc in self.documents:
            doc_lower = doc["content"].lower()
            doc_words = set(re.findall(r"\w+", doc_lower))
            common = len(meaningful_words.intersection(doc_words))
            if common > max_matches:
                max_matches = common
                best_doc = doc

        # Require at least 2 relevant clinical keyword matches
        if max_matches >= 2 and best_doc is not None:
            return best_doc["content"], best_doc["source"]
        return None


class LLMEngine:
    """
    OpenAI-compatible LLM client configured via environment variables.
    Provides grounded wellness chatting, doctor summary generation with
    strict numerical verification, and deterministic fallbacks.
    """

    def __init__(self):
        self.base_url = os.getenv("LLM_BASE_URL", "http://localhost:11434/v1")
        self.model = os.getenv("LLM_MODEL", "llama3")
        self.api_key = os.getenv("LLM_API_KEY", "ollama")
        self.mock_mode = os.getenv("MOCK_LLM", "false").lower() in ["true", "1", "yes"]

        self.retriever = KnowledgeRetriever()

        try:
            self.client = OpenAI(base_url=self.base_url, api_key=self.api_key)
        except Exception as e:
            logger.warning("Could not initialize OpenAI client: %s", e)
            self.client = None

    def is_available(self) -> bool:
        """Health check for external LLM endpoint."""
        if self.mock_mode:
            return True
        if not self.client:
            return False
        try:
            import httpx
            res = httpx.get(f"{self.base_url.rstrip('/v1')}/", timeout=1.0)
            return res.status_code in [200, 404]
        except Exception:
            return False

    def check_emergency(self, text: str) -> Optional[str]:
        """Detects high-risk emergency keywords and returns immediate crisis protocol."""
        lower = text.lower()
        for kw in EMERGENCY_KEYWORDS:
            if kw in lower:
                is_hindi = any(ord(char) >= 0x0900 and ord(char) <= 0x097F for char in text)
                return EMERGENCY_RESPONSE_HI if is_hindi else EMERGENCY_RESPONSE_EN
        return None

    def stream_chat(self, user_message: str, history: Optional[List[Dict[str, str]]] = None) -> Generator[str, None, None]:
        """
        Streaming chat response generator.
        Enforces:
        1. Emergency escalation
        2. Knowledge grounding with source citations
        3. No prescribing / no definitive diagnostic claims
        4. Assistant offline fallback
        """
        # Step 1: Emergency Guardrail
        emergency_msg = self.check_emergency(user_message)
        if emergency_msg:
            yield emergency_msg
            return

        # Step 2: Grounding Retrieval
        grounded_context = self.retriever.retrieve(user_message)
        if grounded_context is None:
            yield (
                "I do not have sufficient clinical guidelines in my local knowledge base on this specific topic. "
                "Please consult a Medical Officer at your nearest Primary Health Centre for accurate clinical guidance.\n\n"
                "— Sanjeevni Safety Protocol"
            )
            return

        context_text, source_name = grounded_context

        # Step 3: Check endpoint availability or Mock
        if self.mock_mode or not self.client or not self.is_available():
            yield (
                f"Health Guidance Summary:\n\n"
                f"{context_text[:350]}...\n\n"
                f"Source: {source_name}\n"
                f"(Note: Assistant running in offline/grounded reference mode)."
            )
            return

        # Step 4: Stream from OpenAI-compatible endpoint
        system_prompt = (
            "You are Sanjeevni Assistant, a healthcare screening support assistant for rural community health workers.\n"
            "RULES:\n"
            "1. STRICTLY DO NOT diagnose conditions or prescribe specific drug dosages.\n"
            "2. Provide only general preventive, dietary, and lifestyle guidance based on the given guideline.\n"
            "3. Answer in the same language as the user (English or Hindi).\n"
            "4. Always cite the provided source name at the bottom of your answer.\n\n"
            f"CLINICAL GUIDELINE TO USE:\n{context_text}\n"
            f"SOURCE: {source_name}"
        )

        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history[-4:])
        messages.append({"role": "user", "content": user_message})

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.3,
                max_tokens=300,
                stream=True
            )
            for chunk in response:
                content = chunk.choices[0].delta.content if chunk.choices else None
                if content:
                    yield content
            # Append citation
            yield f"\n\nSource: {source_name}"
        except Exception as e:
            logger.warning("Streaming LLM failed: %s; falling back to template", e)
            yield (
                f"Guideline Reference:\n\n{context_text[:300]}...\n\n"
                f"Source: {source_name}"
            )

    def generate_doctor_summary(
        self,
        patient_data: Dict[str, Any],
        ml_risk_score: float,
        final_triage: str,
        escalation_reasons: List[str]
    ) -> str:
        """
        Generates a 1-paragraph clinical summary for the PHC doctor.
        Strict verification: Extracts every number in output and checks it exists
        in patient input. If any invented number is found, falls back to deterministic template!
        """
        age = patient_data.get("age", "-")
        gender = patient_data.get("gender", "-")
        bmi = patient_data.get("bmi", "-")
        glucose = patient_data.get("blood_glucose_level", "-")
        hba1c = patient_data.get("HbA1c_level", "-")
        systolic = patient_data.get("systolic_bp", "-")
        diastolic = patient_data.get("diastolic_bp", "-")
        phq9_scores = patient_data.get("phq9_scores", [])
        phq9_total = sum(phq9_scores) if phq9_scores else 0
        risk_pct = round(ml_risk_score * 100, 1)

        # Template summary (guaranteed hallucination-free)
        template_summary = (
            f"Patient is a {age}-year-old {gender} screened by community health worker. "
            f"Triage status is {final_triage} with an estimated diabetes screening probability of {risk_pct}%. "
            f"Vitals: BMI {bmi} kg/m², Blood Glucose {glucose} mg/dL, HbA1c {hba1c}%, "
            f"BP {systolic}/{diastolic} mmHg. PHQ-9 depression score is {phq9_total}/27. "
            + (f"Key clinical triggers: {'; '.join(escalation_reasons)}. " if escalation_reasons else "")
            + f"Action required: {'Emergency physician evaluation' if final_triage == 'RED' else 'Scheduled PHC outpatient review' if final_triage == 'YELLOW' else 'Routine monitoring & lifestyle advice'}."
        )

        if self.mock_mode or not self.client or not self.is_available():
            return template_summary

        prompt = (
            f"Write a 1-paragraph clinical summary for a PHC Doctor. "
            f"DO NOT invent or round any numbers. Use ONLY these exact numbers:\n"
            f"Age: {age}, BMI: {bmi}, Glucose: {glucose}, HbA1c: {hba1c}, "
            f"BP: {systolic}/{diastolic}, PHQ-9: {phq9_total}, Risk: {risk_pct}%, Triage: {final_triage}."
        )

        try:
            resp = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a clinical assistant. Use only numbers given in the prompt."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                max_tokens=200
            )
            candidate = resp.choices[0].message.content.strip()

            # Number validation: extract all numeric tokens from candidate
            input_numbers = {
                str(age), str(bmi), str(glucose), str(hba1c), str(systolic),
                str(diastolic), str(phq9_total), str(risk_pct), "1", "2", "3", "4", "5", "9"
            }
            # Find floating/integer numbers in candidate
            candidate_numbers = set(re.findall(r"\b\d+(?:\.\d+)?\b", candidate))

            # Check if any candidate number is not in input
            invented = [n for n in candidate_numbers if n not in input_numbers and float(n) not in [0.0, 1.0, 2.0, 3.0, 100.0]]
            if invented:
                logger.warning("LLM hallucinated numbers: %s; falling back to template summary", invented)
                return template_summary

            return candidate
        except Exception as e:
            logger.warning("Summary generation error: %s; returning template", e)
            return template_summary
