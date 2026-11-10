import uuid
from datetime import datetime

class FHIRConverter:
    @staticmethod
    def to_patient(patient_data: dict) -> dict:
        """
        Converts internal patient data to HL7 FHIR R4 Patient resource.
        """
        patient_id = str(uuid.uuid4()) # Generate ephemeral ID
        
        return {
            "resourceType": "Patient",
            "id": patient_id,
            "active": True,
            "gender": patient_data.get("gender", "").lower(),
            "birthDate": str(datetime.now().year - int(patient_data.get("age", 30))), # Approximate DOB
            "extension": [
                {
                    "url": "http://hl7.org/fhir/StructureDefinition/patient-birthPlace",
                    "valueAddress": {"text": "Unknown"}
                }
            ]
        }

    @staticmethod
    def to_risk_assessment(patient_data: dict, risk_score: float, risk_level: str) -> dict:
        """
        Converts risk prediction to HL7 FHIR R4 RiskAssessment resource.
        """
        assessment_id = str(uuid.uuid4())
        
        return {
            "resourceType": "RiskAssessment",
            "id": assessment_id,
            "status": "final",
            "date": datetime.now().isoformat(),
            "prediction": [
                {
                    "outcome": {
                        "text": "Diabetes Risk"
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
                    "reference": f"Patient/generated-id-{datetime.now().timestamp()}" 
                }
            ],
            "note": [
                {
                    "text": f"HbA1c: {patient_data.get('HbA1c_level')}, BMI: {patient_data.get('bmi')}"
                }
            ]
        }
