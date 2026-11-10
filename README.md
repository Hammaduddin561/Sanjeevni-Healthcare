# 🌿 Sanjeevni Healthcarer
### Safe, Explainable AI Decision-Support Platform for Rural Primary Care

> **Research Prototype Disclaimer**: Sanjeevni Healthcarer is an investigational clinical research prototype designed to support Community Health Workers (e.g. ASHA workers) and Primary Health Centre (PHC) clinicians with standardized screening and risk stratification. It is **not** an automated diagnostic system, does not prescribe medication, and must never replace clinical assessment by a licensed physician.

---

## 🎯 Product Definition & Core Clinical Story

In rural and peri-urban India and similar resource-constrained regions, community health workers conduct home visits with limited diagnostic infrastructure. **Sanjeevni Healthcarer** enables a **5-Minute Guided Visit Flow**:

1. **Vitals & Metabolic Screening**: Age, Gender, BMI (computed from Height/Weight), Fasting Blood Glucose, and HbA1c.
2. **Blood Pressure & Hypertension Check**: Systolic and Diastolic blood pressure assessment.
3. **PHQ-9 Depression Screener**: Clinically validated 9-item Patient Health Questionnaire.
4. **Deterministic Clinical Safety Layer**: Immediate escalation to **RED (Emergency Doctor Referral)** on critical flags (e.g., Blood Glucose > 300 mg/dL, Hypertensive crisis BP > 180/120, or positive PHQ-9 Item 9).
5. **Actionable Community Triaging**:
   - 🟢 **GREEN**: Home health & lifestyle guidance (diet, exercise, sleep hygiene).
   - 🟡 **YELLOW**: Non-emergency referral to Primary Health Centre within 1–2 weeks.
   - 🔴 **RED**: Immediate referral to doctor / emergency healthcare facility.

---

## 👥 User Roles & Access Control

- 👩‍⚕️ **Community Health Worker (ASHA)**: Conducts 5-minute guided visits, collects vitals and PHQ-9, views plain-language explanation and triage action. Works online and offline.
- 🩺 **PHC Medical Officer (Doctor)**: Reviews escalated (RED / YELLOW) patient summaries, monitors village-level risk cohorts, generates FHIR R4 clinical summaries.
- 🛡️ **System Administrator**: Compliance audits, user management, and read-only structured event logs (zero patient-identifiable data in logs).

---

## 🏗️ Architecture & Technical Stack

- **Backend**: FastAPI (Python 3.11+), SQLite / SQLAlchemy, Pydantic V2 input validation with physiological clinical ranges.
- **Machine Learning**: Calibrated XGBoost classifier trained on validated diabetes datasets (`data/diabetes_dataset.csv`).
- **Explainability**: SHAP TreeExplainer for sub-100ms explanations, plain-language English & Hindi risk driver translations, and actionable counterfactual recommendations (DiCE).
- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS, Framer Motion, PWA offline sync (IndexedDB).
- **Interoperability**: HL7 FHIR R4 standard Bundles (Patient, Observation, RiskAssessment).

---

## ⚙️ Quickstart & Local Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 20+
- Linux / macOS / Windows WSL

### 2. Backend Setup
```bash
# Clone or navigate to the repository
cd sanjeevni-healthcarer

# Activate virtual environment
source backend/venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Copy environment file
cp backend/.env.example backend/.env

# Seed the database with demo users (ASHA, Doctor, Admin)
python scripts/seed_users.py

# Start FastAPI backend server
python -m uvicorn backend.api:app --port 8001 --host 0.0.0.0 --reload
```
API runs at: `http://localhost:8001`  
Interactive Swagger Documentation: `http://localhost:8001/docs`

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start Vite dev server
npm run dev
```
Application interface runs at: `http://localhost:5173`

---

## 🔑 Demo Credentials

| Role | Email | Password | Primary Workflow |
|---|---|---|---|
| **ASHA Health Worker** | `worker@sanjeevni.org` | `Password@123` | Guided 5-min visit screening |
| **PHC Doctor** | `doctor@phc.org` | `Password@123` | Triage dashboard & summaries |
| **Administrator** | `admin@hospital.org` | `password123` | Audit logs & compliance |

---

## 🧪 Testing

```bash
# Run backend test suite
PYTHONPATH=. ./backend/venv/bin/pytest tests/

# Run frontend build & lint
cd frontend && npm run build
```

---

## 🛡️ Ethics, Safety & Limitations

- **No Medical Substitution**: Recommendations are advisory. All high-risk cases must be evaluated by a certified medical practitioner.
- **Privacy First**: Structured logs and audit records strip all direct patient identifiers (`patient_name`, `email`, phone).
- **Fairness & Audit**: Tested for algorithmic performance consistency across demographic subgroups.
