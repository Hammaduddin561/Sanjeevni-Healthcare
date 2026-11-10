from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Optional

class PatientRequest(BaseModel):
    gender: str = Field(..., description="Patient gender (Male, Female, Other)")
    age: float = Field(..., description="Age in years (1 - 120)")
    hypertension: int = Field(..., description="History of hypertension (0 or 1)")
    heart_disease: int = Field(..., description="History of heart disease (0 or 1)")
    smoking_history: str = Field(..., description="Smoking status (never, current, former, ever, not current, No Info)")
    bmi: float = Field(..., description="Body Mass Index in kg/m² (10.0 - 70.0)")
    HbA1c_level: float = Field(..., description="Glycated hemoglobin percentage (3.5 - 18.0)")
    blood_glucose_level: float = Field(..., description="Blood glucose level in mg/dL (40.0 - 600.0)")
    systolic_bp: Optional[float] = Field(None, description="Systolic Blood Pressure in mmHg (60 - 260)")
    diastolic_bp: Optional[float] = Field(None, description="Diastolic Blood Pressure in mmHg (40 - 160)")
    phq9_scores: Optional[List[int]] = Field(None, description="PHQ-9 screening scores (9 items, 0-3 each)")
    clinician_id: Optional[str] = None
    clinician_name: Optional[str] = None
    patient_name: Optional[str] = None
    village: Optional[str] = Field(None, description="Village or community name")

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        clean = v.strip().capitalize()
        if clean not in ["Male", "Female", "Other"]:
            raise ValueError(f"Gender must be 'Male', 'Female', or 'Other'. Received: '{v}'")
        return clean

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: float) -> float:
        if v < 1.0 or v > 120.0:
            raise ValueError(f"Age must be between 1 and 120 years. Received: {v}")
        return float(v)

    @field_validator("hypertension")
    @classmethod
    def validate_hypertension(cls, v: int) -> int:
        if v not in [0, 1]:
            raise ValueError(f"Hypertension flag must be 0 (No) or 1 (Yes). Received: {v}")
        return int(v)

    @field_validator("heart_disease")
    @classmethod
    def validate_heart_disease(cls, v: int) -> int:
        if v not in [0, 1]:
            raise ValueError(f"Heart disease flag must be 0 (No) or 1 (Yes). Received: {v}")
        return int(v)

    @field_validator("smoking_history")
    @classmethod
    def validate_smoking(cls, v: str) -> str:
        valid_options = ["never", "current", "former", "ever", "not current", "no info"]
        clean = v.strip().lower()
        if clean not in valid_options:
            raise ValueError(f"Smoking history must be one of {valid_options}. Received: '{v}'")
        return clean

    @field_validator("bmi")
    @classmethod
    def validate_bmi(cls, v: float) -> float:
        if v < 10.0 or v > 70.0:
            raise ValueError(f"BMI must be physiologically plausible between 10.0 and 70.0 kg/m². Received: {v}")
        return round(float(v), 2)

    @field_validator("HbA1c_level")
    @classmethod
    def validate_hba1c(cls, v: float) -> float:
        if v < 3.5 or v > 18.0:
            raise ValueError(f"HbA1c level must be between 3.5% and 18.0%. Received: {v}")
        return round(float(v), 2)

    @field_validator("blood_glucose_level")
    @classmethod
    def validate_glucose(cls, v: float) -> float:
        if v < 40.0 or v > 600.0:
            raise ValueError(f"Blood glucose level must be between 40.0 and 600.0 mg/dL. Received: {v}")
        return round(float(v), 1)

    @field_validator("systolic_bp")
    @classmethod
    def validate_systolic(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < 60.0 or v > 260.0):
            raise ValueError(f"Systolic BP must be between 60 and 260 mmHg. Received: {v}")
        return v

    @field_validator("diastolic_bp")
    @classmethod
    def validate_diastolic(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < 40.0 or v > 160.0):
            raise ValueError(f"Diastolic BP must be between 40 and 160 mmHg. Received: {v}")
        return v

    @field_validator("phq9_scores")
    @classmethod
    def validate_phq9(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is not None:
            if len(v) != 9:
                raise ValueError(f"PHQ-9 screening must contain exactly 9 question scores. Received {len(v)}")
            for idx, score in enumerate(v):
                if score not in [0, 1, 2, 3]:
                    raise ValueError(f"PHQ-9 question Q{idx+1} score must be between 0 and 3. Received {score}")
        return v


class ReportGenerationRequest(PatientRequest):
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    explanations: Optional[List[Dict[str, Any]]] = None

class RiskResponse(BaseModel):
    risk_score: float
    risk_level: str

class ExplanationResponse(BaseModel):
    explanations: List[Dict[str, Any]]

class ReportResponse(BaseModel):
    report: str
    pdf_url: Optional[str] = None

class SimulationRequest(BaseModel):
    patient: PatientRequest
    modifications: Dict[str, Any]

class SimulationResponse(BaseModel):
    original_risk: float
    new_risk: float
    risk_reduction: float

class CohortAnalysisResponse(BaseModel):
    percentiles: Dict[str, float]

class DigitalTwin(BaseModel):
    gender: str
    age: float
    hypertension: int
    heart_disease: int
    smoking_history: str
    bmi: float
    HbA1c_level: float
    blood_glucose_level: float
    diabetes: int

class DigitalTwinResponse(BaseModel):
    twins: List[DigitalTwin]

class FeedbackRequest(BaseModel):
    patient_data: PatientRequest
    predicted_risk: float
    actual_diagnosis: int = None
    clinician_notes: str = ""
    agreed: bool

