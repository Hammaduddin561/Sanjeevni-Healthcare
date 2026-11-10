import sys
import os
sys.path.append(os.getcwd())

from backend.models.pdf_service import PDFService

pdf_service = PDFService()

# Mock Data
patient = {
    "age": 55,
    "gender": "Male",
    "bmi": 29.5,
    "HbA1c_level": 7.8,
    "blood_glucose_level": 160,
    "smoking_history": "former",
    "hypertension": 1,
    "heart_disease": 0
}

risk_score = 0.75
risk_level = "High"

# Mock Explanations (SHAP-like)
explanations = [
    {"feature": "HbA1c_level", "value": 7.8, "impact": 0.15},
    {"feature": "BMI", "value": 29.5, "impact": 0.12},
    {"feature": "Glucose_HbA1c_Interaction", "value": 1200, "impact": 0.11}, # Should be filtered
    {"feature": "Age_Category", "value": "Middle", "impact": 0.09}, # Should be filtered
    {"feature": "blood_glucose_level", "value": 160, "impact": 0.10},
    {"feature": "hypertension", "value": 1, "impact": 0.08}
]

summary = """
**Clinical Assessment:**
The patient presents with high cardiovascular risk factors. Key drivers include elevated HbA1c (7.8%) and BMI (29.5).

**Recommendations:**
1. Immediate lifestyle intervention focusing on weight management.
2. Pharmacological review for glycemic control.
3. Schedule follow-up in 3 months.
"""

print(f"Generating PDF report in {pdf_service.output_dir}...")
filename = pdf_service.generate_report(patient, risk_score, risk_level, summary, explanations)
print(f"✅ PDF Generated: {filename}")
print(f"Full Path: {os.path.join(pdf_service.output_dir, filename)}")
