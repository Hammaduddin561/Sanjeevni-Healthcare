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
  1. Implemented `scripts/audit_fairness.py` using `Fairlearn` auditing 100,000+ benchmark patients across gender (`Male`, `Female`) and four age tiers (`<30`, `30-44`, `45-59`, `60+`). Recorded Demographic Parity Difference (0.0406) and Equalized Odds (0.0228).
  2. Built a comprehensive frontend Model Card (`/model-card`) and backend endpoint (`GET /model-card`) exposing empirical ROC-AUC (0.9778), sensitivity (0.9161), specificity (0.9002), Brier calibration score (0.044), data provenance, intended use, limitations, and the research prototype disclaimer.
  3. Integrated bilingual (English / हिन्दी) plain-language explanations in SHAP feature cards with an expandable technical details toggle.
- **Rationale**: Full compliance with explainability and healthcare AI governance standards (WHO/CDSCO/FDA guidelines on clinical decision support prototypes).

---
*(Additional decisions will be logged in each phase)*
