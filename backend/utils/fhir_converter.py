import uuid
from datetime import datetime
from typing import Dict, Any, List

class FHIRConverter:
    @staticmethod
    def to_patient(patient_data: dict) -> dict:
        """
        Converts internal patient data to HL7 FHIR R4 Patient resource.
        """
        patient_id = patient_data.get("patient_id") or str(uuid.uuid4())
        
        return {
            "resourceType": "Patient",
            "id": patient_id,
            "active": True,
            "gender": patient_data.get("gender", "").lower(),
            "birthDate": str(datetime.now().year - int(patient_data.get("age", 30))), # Approximate DOB
            "extension": [
                {
                    "url": "http://hl7.org/fhir/StructureDefinition/patient-birthPlace",
                    "valueAddress": {"text": patient_data.get("village", "Community Sub-Centre")}
                }
            ]
        }

    @staticmethod
    def to_observations(patient_data: dict, patient_ref: str) -> List[Dict[str, Any]]:
        """
        Converts vital signs and PHQ-9 mental health scores to HL7 FHIR R4 Observation resources.
        """
        observations = []

        # 1. Blood Glucose (LOINC 2339-0)
        if "blood_glucose_level" in patient_data and patient_data["blood_glucose_level"] is not None:
            observations.append({
                "resourceType": "Observation",
                "id": str(uuid.uuid4()),
                "status": "final",
                "code": {
                    "coding": [{
                        "system": "http://loinc.org",
                        "code": "2339-0",
                        "display": "Glucose [Mass/volume] in Blood"
                    }]
                },
                "subject": {"reference": f"Patient/{patient_ref}"},
                "valueQuantity": {
                    "value": float(patient_data["blood_glucose_level"]),
                    "unit": "mg/dL",
                    "system": "http://unitsofmeasure.org",
                    "code": "mg/dL"
                }
            })

        # 2. HbA1c (LOINC 4548-4)
        if "HbA1c_level" in patient_data and patient_data["HbA1c_level"] is not None:
            observations.append({
                "resourceType": "Observation",
                "id": str(uuid.uuid4()),
                "status": "final",
                "code": {
                    "coding": [{
                        "system": "http://loinc.org",
                        "code": "4548-4",
                        "display": "Hemoglobin A1c/Hemoglobin.total in Blood"
                    }]
                },
                "subject": {"reference": f"Patient/{patient_ref}"},
                "valueQuantity": {
                    "value": float(patient_data["HbA1c_level"]),
                    "unit": "%",
                    "system": "http://unitsofmeasure.org",
                    "code": "%"
                }
            })

        # 3. BMI (LOINC 39156-5)
        if "bmi" in patient_data and patient_data["bmi"] is not None:
            observations.append({
                "resourceType": "Observation",
                "id": str(uuid.uuid4()),
                "status": "final",
                "code": {
                    "coding": [{
                        "system": "http://loinc.org",
                        "code": "39156-5",
                        "display": "Body mass index (BMI) [Ratio]"
                    }]
                },
                "subject": {"reference": f"Patient/{patient_ref}"},
                "valueQuantity": {
                    "value": float(patient_data["bmi"]),
                    "unit": "kg/m2",
                    "system": "http://unitsofmeasure.org",
                    "code": "kg/m2"
                }
            })

        # 4. Blood Pressure Panel (LOINC 85354-9)
        systolic = patient_data.get("systolic_bp")
        diastolic = patient_data.get("diastolic_bp")
        if systolic is not None or diastolic is not None:
            components = []
            if systolic is not None:
                components.append({
                    "code": {"coding": [{"system": "http://loinc.org", "code": "8480-6", "display": "Systolic blood pressure"}]},
                    "valueQuantity": {"value": float(systolic), "unit": "mmHg"}
                })
            if diastolic is not None:
                components.append({
                    "code": {"coding": [{"system": "http://loinc.org", "code": "8462-4", "display": "Diastolic blood pressure"}]},
                    "valueQuantity": {"value": float(diastolic), "unit": "mmHg"}
                })
            observations.append({
                "resourceType": "Observation",
                "id": str(uuid.uuid4()),
                "status": "final",
                "code": {
                    "coding": [{
                        "system": "http://loinc.org",
                        "code": "85354-9",
                        "display": "Blood pressure panel with all children optional"
                    }]
                },
                "subject": {"reference": f"Patient/{patient_ref}"},
                "component": components
            })

        # 5. PHQ-9 Mental Health (LOINC 44249-1)
        phq9_scores = patient_data.get("phq9_scores")
        if phq9_scores and isinstance(phq9_scores, list):
            observations.append({
                "resourceType": "Observation",
                "id": str(uuid.uuid4()),
                "status": "final",
                "code": {
                    "coding": [{
                        "system": "http://loinc.org",
                        "code": "44249-1",
                        "display": "PHQ-9 quick depression assessment panel"
                    }]
                },
                "subject": {"reference": f"Patient/{patient_ref}"},
                "valueInteger": int(sum(phq9_scores))
            })

        return observations

    @staticmethod
    def to_risk_assessment(patient_data: dict, risk_score: float, risk_level: str, patient_ref: str = "patient-id") -> dict:
        """
        Converts risk prediction to HL7 FHIR R4 RiskAssessment resource.
        """
        assessment_id = str(uuid.uuid4())
        
        return {
            "resourceType": "RiskAssessment",
            "id": assessment_id,
            "status": "final",
            "date": datetime.now().isoformat(),
            "subject": {
                "reference": f"Patient/{patient_ref}"
            },
            "prediction": [
                {
                    "outcome": {
                        "text": "Cardiometabolic & Diabetes Risk"
                    },
                    "probabilityDecimal": risk_score,
                    "qualitativeRisk": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/risk-probability",
                                "code": risk_level.lower(),
                                "display": risk_level
                            }
                        ]
                    }
                }
            ],
            "basis": [
                {
                    "reference": f"Patient/{patient_ref}" 
                }
            ],
            "note": [
                {
                    "text": f"HbA1c: {patient_data.get('HbA1c_level')}, BMI: {patient_data.get('bmi')}, Glucose: {patient_data.get('blood_glucose_level')}"
                }
            ]
        }
