# 🌿 Sanjeevni Healthcarer
### AI-Powered Health Platform for Holistic Patient Care

> **DSH Hacks V2 — AI × Healthcare Track**  
> An intelligent health companion that predicts clinical risk, screens mental health, and guides wellness — all in one unified platform.

---

## 🩺 What is Sanjeevni?

**Sanjeevni Healthcarer** is a full-stack AI health platform designed to transform fragmented patient data into actionable clinical intelligence. Built for clinicians and patients alike, it combines cutting-edge machine learning with intuitive design to deliver:

- 🔬 **Multi-model Diabetes & Cardiac Risk Prediction** using an ensemble of XGBoost, CatBoost, LightGBM + BioMistral-7B LLM
- 🧠 **Mental Health Screening** with clinically validated PHQ-9 questionnaire and crisis support
- 💬 **AI Wellness Guide** — a smart chatbot for diabetes, nutrition, exercise, and lifestyle queries
- 📊 **Explainable AI** — SHAP values, counterfactual analysis, and digital twin simulation
- 📄 **FHIR-compatible PDF Reports** for clinical documentation
- 🏥 **Cohort Analytics Engine** — population-level health trend analysis

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🎯 Risk Prediction | Ensemble ML (XGBoost + CatBoost + LightGBM) + BioMistral-7B NLP |
| 🧠 Mental Health | PHQ-9 depression screening with Indian crisis helplines |
| 💬 Wellness Chatbot | Rule-based health Q&A — diabetes, BMI, nutrition, posture |
| 📈 Digital Twin | 3D patient model with what-if simulation |
| 🔍 SHAP Explanations | Feature importance & counterfactual reasoning |
| 📄 PDF Reports | FHIR-compatible clinical summary generation |
| 🏥 Cohort Engine | Population risk analytics on 100K+ records |
| 🔒 Audit Logs | Admin-only compliance and access tracking |

---

## 🚀 Tech Stack

**Backend:**
- FastAPI (Python 3.11+)
- Scikit-learn, XGBoost, CatBoost, LightGBM, SHAP
- BioMistral-7B (GGUF, local inference via GPT4All)
- FPDF2 for PDF generation
- Pandas, NumPy for data processing

**Frontend:**
- React 18 + TypeScript
- Vite 8
- Tailwind CSS + custom glassmorphism design system
- Framer Motion (animations)
- Three.js (3D Digital Twin)
- Recharts (data visualization)
- Howler.js (ambient UI audio)

---

## ⚙️ Local Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- Git

### Backend Setup

```bash
cd clinical-risk-predictor

# Create and activate virtual environment
~/.local/bin/virtualenv backend/venv
source backend/venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start the API server
uvicorn backend.api:app --port 8001 --host 0.0.0.0 --reload
```

API will be live at: `http://localhost:8001`  
Swagger docs: `http://localhost:8001/docs`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Copy environment config
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:8001

# Start dev server
npm run dev
```

Frontend live at: `http://localhost:5173`

---

## 🧪 Verify Installation

```bash
# From project root (with venv active)
python backend/verify_features.py
# Expected: ✅ ALL TESTS PASSED
```

---

## 🌐 Application Tabs

| Tab | Description |
|---|---|
| **Dashboard** | Main clinical risk assessment with patient vitals input |
| **Mental Health** | PHQ-9 screening, severity scoring, helpline cards |
| **Wellness Guide** | Health Q&A chatbot for lifestyle & disease queries |
| **Audit Logs** | Admin-only system access and event log |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/predict` | Run risk prediction on patient data |
| POST | `/explain` | Get SHAP explanation for a prediction |
| POST | `/simulate` | Digital twin what-if simulation |
| POST | `/report` | Generate FHIR PDF report |
| GET | `/cohort/stats` | Cohort-level population analytics |
| GET | `/health` | System health check |

---

## 🔑 Demo Login

Any email/password combination works in the demo mode.  
Admin features (Audit Logs): use `admin@hospital.org`

---

## 🏆 Built For

**DSH Hacks V2** — Theme: AI × Healthcare  
Deadline: November 14, 2026

Sanjeevni Healthcarer addresses the DSH Hacks challenge by:
1. Using AI to reduce diagnostic time for clinicians
2. Making mental health screening accessible and de-stigmatized
3. Providing explainable, transparent AI decisions (not black-box)
4. Targeting underserved communities with India-specific health helplines

---

## 📁 Project Structure

```
sanjeevni-healthcarer/
├── backend/
│   ├── api.py                  # FastAPI app & routes
│   ├── models/
│   │   ├── risk_engine.py      # Ensemble ML engine
│   │   ├── clinical_llm.py     # BioMistral-7B interface
│   │   ├── pdf_service.py      # FHIR PDF generator
│   │   └── risk_pipeline_v1.joblib  # Trained model weights
│   ├── routes/                 # cohort, fhir, feedback
│   └── schemas/                # Pydantic request/response models
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── PatientInputs.tsx       # Risk input form
│       │   ├── ClinicianDashboard.tsx  # Prediction results
│       │   ├── MentalHealthScreening.tsx  # PHQ-9 screening ✨
│       │   ├── WellnessChatbot.tsx     # Health Q&A bot ✨
│       │   ├── DigitalTwinModel.tsx    # 3D twin viewer
│       │   └── layout/AppShell.tsx    # Nav + layout
│       └── api/client.ts       # Backend API client
└── README.md
```

---

## ⚠️ Disclaimer

This platform is intended for research and educational purposes. Clinical risk predictions should be validated by qualified medical professionals. The PHQ-9 screening is not a substitute for professional mental health diagnosis.

---

*Sanjeevni — Sanskrit for "life-giving" 🌿*
