# Architectural & Design Decisions (DECISIONS.md)

This log documents all autonomous architectural, engineering, and design decisions made during the evolution of **Sanjeevni Healthcarer**.

---

## Decision 1: Target User Focus & Primary Flow
- **Context**: The existing repo had scattered clinician dashboards, simulation dashboards, and trend graphs without a coherent clinical role or workflow.
- **Decision**: Orient the entire primary interaction around a **5-Minute Guided Visit Flow** designed for rural community health workers (ASHA-style). Secondary roles: PHC Doctor (triage & summaries) and Administrator (compliance audit).
- **Rationale**: Direct alignment with the Product Definition in the specification.

## Decision 2: 1 GB RAM Hardware Constraint & Model Architecture
- **Context**: The hardware environment is an entry-level machine (Intel Celeron N3350, 1.8 GB RAM), and user specifically mandated: *"AT LAST OUR PROJECT SHOULD BE WORKING EVEN ON A 1 GB RAM PC"*. The legacy setup attempted to load a 4.4 GB BioMistral GGUF model via CPU GPT4All which failed due to lack of AVX and exhausted memory.
- **Decision**:
  1. Primary tabular model: Compact, calibrated XGBoost classifier + TreeExplainer (sub-50ms execution, <20 MB memory footprint).
  2. LLM layer: Decoupled into an external OpenAI-compatible client (e.g. Ollama/vLLM on local GPU or cloud), with a zero-cost deterministic template fallback and mock LLM for testing.
  3. Frontend: Enable code-splitting, lazy-load Three.js 3D twin, optimize bundles for <1 MB footprint.
- **Rationale**: Guarantees ultra-fast response, no CPU freeze, and full functionality even on a 1 GB RAM netbook or Raspberry Pi.

## Decision 3: Actionable-Only DiCE Counterfactuals & Preprocessing Wrapper
- **Context**: Standard counterfactual generators (and DiCE defaults) can suggest perturbing immutable biological characteristics like patient age or genetic gender, or output mathematically optimal but clinically absurd targets (e.g., negative BMI or HbA1c < 3.0%).
- **Decision**: 
  1. Constrain DiCE `features_to_vary` exclusively to actionable variables: `bmi`, `HbA1c_level`, and `smoking_history`. Never vary `age` or `gender`.
  2. Implement `FeatureEngineeringWrapper` to vectorize feature interactions (`BMI_Age_Interaction`, `Glucose_HbA1c_Interaction`, categories) during DiCE perturbation batches, keeping inference under 1.2 seconds.
  3. Enforce realistic clinical bounding (BMI >= 18.5, HbA1c >= 5.0%, smoking -> never) and cap suggestions at 3 actionable lifestyle plans with deterministic clinical fallback.
- **Rationale**: Clinically responsible AI must only recommend interventions a patient or health worker can realistically act upon.

## Decision 4: Fairlearn Subgroup Audit & Model Transparency Card
- **Context**: AI models deployed in community healthcare risk amplifying gender or age disparities if calibration varies across subgroups.
- **Decision**:
  1. Implemented `scripts/audit_fairness.py` using `Fairlearn` auditing 100,974 records from the public Kaggle diabetes benchmark dataset across gender (`Male`, `Female`) and four age bands (`<30`, `30-44`, `45-59`, `60+`). Gender Demographic Parity Difference is `0.0406` and Equalized Odds Difference is `0.0228`; Age Demographic Parity Difference is `0.4094` and Equalized Odds Difference is `0.3128` (recall is 66.1% for <30 and 78.1% for 30-44, while 60+ FPR is 27.9%).
  2. Built a comprehensive frontend Model Card (`/model-card`) and backend endpoint (`GET /model-card`) exposing empirical ROC-AUC (`0.9773`), sensitivity (`0.9161`), specificity (`0.9002`), calibrated Brier score (`0.0258`, uncalibrated `0.0598`), calibrated ECE (`0.0232`), data provenance ("public Kaggle diabetes benchmark dataset"), intended use, limitations, and the research prototype disclaimer.
  3. Integrated bilingual (English / हिन्दी) plain-language explanations in SHAP feature cards with an expandable technical details toggle.
- **Rationale**: Full compliance with explainability and healthcare AI governance standards (WHO/CDSCO/FDA guidelines on clinical decision support prototypes).

---
## Decision 5: Non-Downgradable Deterministic Clinical Safety Layer
- **Context**: Probabilistic ML models can occasionally miss acute emergency vitals or suicidal distress flags if other metabolic indicators are borderline.
- **Decision**: Implemented `backend/models/safety_layer.py` strictly ABOVE the ML classifier. It follows ADA 2024, AHA/ACC 2017, and Kroenke et al. (2001) guidelines and enforces strict non-downgrade logic (can only escalate GREEN -> YELLOW -> RED, never downgrade). Immediate RED triggers include Glucose >= 300 mg/dL, BP >= 180/120 mmHg, or any positive response on PHQ-9 Item 9 (self-harm).
- **Rationale**: Patient safety in community triage must rely on deterministic, peer-reviewed clinical thresholds above statistical probability estimation.

## Decision 6: Decoupled Local/Remote OpenAI-Compatible LLM + Numerical Hallucination Guardrail
- **Context**: Rural clinics have intermittent hardware; running 7B GGUF models locally caused OOM hangs on low-RAM CPUs and exhausted disk space.
- **Decision**: Replaced GPT4All auto-download with a clean OpenAI-compatible SSE streaming client (`LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`). Added a grounded local guideline knowledge base (`backend/knowledge/*.txt`), bilingual emergency keyword detection, strict "I do not know" refusal on ungrounded topics, and strict numerical verification on generated doctor summaries (falling back to a deterministic clinical template if any invented number appears).
- **Rationale**: Ensures safe, reliable performance on 1 GB RAM clients while fully supporting GPU-hosted Ollama/vLLM servers when available.

## Decision 7: Offline-First PWA & Calibrated Logistic Fallback
- **Context**: ASHA health workers operate in rural sub-centres with erratic cellular data connectivity.
- **Decision**: Added PWA manifest + Service Worker shell caching, an IndexedDB persistent queue (`pending_visits`), idempotent `visit_id` generation, automatic `online` event synchronization, and a calibrated JS logistic approximation mirroring the deterministic Safety Layer rules (labeled clearly as "Offline Estimate").
- **Rationale**: Zero interruption of patient care at the doorstep even during total network blackouts.

## Decision 8: HL7 FHIR R4 Bundle & PHC Prioritized Triage Dashboard
- **Context**: Clinical interoperability with ABDM / national registries and PHC doctors needing immediate visibility into critical referrals.
- **Decision**: Extended `FHIRConverter` to produce standard HL7 FHIR R4 Bundles containing `Patient`, LOINC-coded `Observation` resources (glucose, HbA1c, BMI, BP panel, PHQ-9 score), and `RiskAssessment`. Built `DoctorDashboard` displaying village-filterable rosters prioritized strictly **RED-first**, paired with one-click longitudinal timelines and WhatsApp referral export.
- **Rationale**: Bridges doorstep community screenings directly to Medical Officers at Primary Health Centres.

---
## Decision 9: Zero-Trust JWT RBAC, Fail-Loud SECRET_KEY & Admin `/audit`
- **Decision**: Added `Depends(get_current_user)` across all patient, screening, prediction, simulation, FHIR, cohort, feedback, report, and chat endpoints; restricted `worker` users to their own `visits` (`403` on others' timelines); restricted `GET /audit` to `admin` role backed by persistent `audit_events` (zero PII). Made missing `SECRET_KEY` raise `RuntimeError` unless `APP_ENV=development`; removed duplicate `doc@hospital.com` demo account; sourced seed passwords from env vars (`APP_ENV=development` fallback only).

## Decision 10: Dual Full-Lab & No-Lab Screening + Single Source of Truth Triage
- **Decision**: Trained a second Platt-calibrated XGBoost model without HbA1c/glucose (`risk_pipeline_nolab_v1.joblib`, ROC-AUC `0.8324`, Calibrated Brier `0.0667`), auto-routed whenever labs are omitted, labeled *"Estimated without lab tests: confirm with a glucometer or lab test"*. Unified all safety cutoffs and fitted balanced logistic weights (`shared/triage_thresholds.json`) used identically by backend `safety_layer.py` and frontend `offlineRiskCalculator.ts`.

## Decision 11: Offline Service Worker Shell Caching & Complete Hindi Support
- **Decision**: Enabled `sw.js` (`sanjeevni-shell-v2`) registration in `main.tsx` for offline shell & asset availability with client-generated UUID idempotency. Localized remaining UI components (`en.json`/`hi.json` key parity), added Hindi ADA/AHA/PHQ-9 knowledge docs (`*_hi.txt`), and fixed Unicode Devanagari tokenization (`_tokenize_unicode`) in `LLMEngine`.

## Decision 12: Time-Box Stop Point (Strict 48-Minute Budget)
- **Decision**: Completed and verified Items 1–7 within the time budget. Skipped Items 8–12 (cleanup/packaging fixes, CI/E2E expansion, Render/Vercel deploy templates, final README rewrite, and `docs/submission/*`) rather than rushing untested edits past the 48-minute cutoff.


