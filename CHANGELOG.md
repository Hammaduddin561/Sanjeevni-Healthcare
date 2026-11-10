# Changelog — Sanjeevni Healthcarer

All notable upgrades transforming Sanjeevni Healthcarer into a safe, explainable, offline-capable AI rural healthcare screening platform.

---

## [v2.0.0] — Comprehensive 10-Phase Engineering Upgrade

### Phase 1: Cleanup & Security Hardening
- Removed hardcoded secrets; `SECRET_KEY` and CORS `ALLOWED_ORIGINS` strictly loaded from environment variables (`.env.example` documented).
- Enforced bcrypt hashed passwords and seeded role-based access (`worker`, `doctor`, `admin`) via `scripts/seed_users.py`.
- Replaced bare `except:` blocks with specific exception handling and structured zero-PII audit logging.
- Added strict physiological clinical range validation in Pydantic V2 schemas.
- Shared singleton `RiskEngine` across FastAPI lifecycle `app.state`.

### Phase 2: Calibrated Model, SHAP TreeExplainer, DiCE & Fairness Audit
- Built reproducible training script (`scripts/train.py`) producing calibrated XGBoost classifier with Platt scaling (**ROC-AUC: 0.9778**, **Sensitivity: 91.61%**, **Specificity: 90.02%**, **Calibrated Brier Score: 0.0258**, **Uncalibrated Brier: 0.0598**, **Calibrated ECE: 0.0232**) trained on the public Kaggle diabetes benchmark dataset.
- Replaced slow SHAP KernelExplainer with `TreeExplainer` (<50ms runtime) + bilingual English/Hindi plain-language explanations.
- Integrated `DiCE` counterfactuals strictly constrained to actionable targets (`bmi`, `HbA1c_level`, `smoking_history`) with `FeatureEngineeringWrapper`.
- Performed subgroup fairness audit with `Fairlearn` (`scripts/audit_fairness.py`) across gender and age cohorts.
- Built interactive **Model Card** (`/model-card`) exposing live metrics, fairness statistics, data provenance, and research disclaimers.

### Phase 3: 5-Minute Guided Visit Flow & Deterministic Safety Guardrails
- Built deterministic non-downgradable safety layer (`backend/models/safety_layer.py`) citing ADA 2024, AHA/ACC 2017, and Kroenke PHQ-9 criteria.
- Added SQLite persistence (`Visit` ORM) linking doorstep visits, workers, and idempotent `visit_id`.
- Built **Guided Visit Flow** (Vitals -> BP -> PHQ-9 -> Traffic Light triage summary with emergency crisis helplines: Tele-MANAS 14416, Emergency 112).
- Implemented longitudinal **Patient Timeline** with risk velocity calculation.

### Phase 4: Grounded OpenAI-Compatible LLM Layer
- Replaced legacy CPU GGUF downloads with decoupled OpenAI-compatible SSE client (`LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`).
- Built local guideline retriever (`backend/knowledge/*.txt`) citing ADA/AHA/WHO sources and enforcing "do not know" bounds on out-of-scope topics.
- Added bilingual English/Hindi emergency keyword detection and strict numerical hallucination verification on doctor summaries.

### Phase 5: Bilingual i18n (English & हिन्दी) & Web Speech Voice UI
- Configured `i18next` and `react-i18next` with complete English and Hindi (`en.json`, `hi.json`) translations.
- Added Web Speech API microphone voice input for numeric screening inputs (`SpeechHandler`).
- Added "Read Result Aloud" using browser speech synthesis for accessible doorstep counseling.
- Added Research Prototype UI disclaimer footer.

### Phase 6: Offline-First PWA & Calibrated Logistic Fallback
- Added installable PWA manifest and Service Worker (`/sw.js`, `/manifest.json`).
- Created IndexedDB offline sync queue (`offlineSync.ts`) automatically synchronizing pending visits when network returns.
- Added client-side calibrated logistic fallback + Safety Layer parity clearly marked **"Offline Estimate"**.

### Phase 7 & 8: PHC Doctor Triage Dashboard, HL7 FHIR R4 & Performance Polish
- Built **Doctor Clinical Triage Queue** (`DoctorDashboard.tsx`) displaying GREEN/YELLOW/RED summary KPIs, village filtering, **RED-first ordering**, and 1-click patient modals with WhatsApp referral sharing.
- Extended HL7 **FHIR R4** bundle endpoint (`POST /fhir/bundle`) to emit LOINC-coded `Patient`, `Observation` (Glucose, HbA1c, BMI, BP, PHQ-9), and `RiskAssessment` resources.
- Applied `React.lazy` code-splitting on 3D Digital Twin to keep low-spec CPU/RAM responsive.

### Phase 9 & 10: Demo Personas, Testing & Documentation
- Created `scripts/seed_demo_data.py` populating 3 rich patient personas (Sunita Sharma 🟢, Ramesh Patel 🟡, Kamla Bai 🔴) + 12 rural screening encounters.
- Expanded test suite to **32 pytest unit/integration tests** + **Playwright E2E tests** covering auth, safety layer, FHIR R4, LLM guardrails, and PHC doctor triage queues.
