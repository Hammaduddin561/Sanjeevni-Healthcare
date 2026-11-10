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

---
*(Additional decisions will be logged in each phase)*
