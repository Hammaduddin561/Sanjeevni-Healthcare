import requests
import json
import random

def random_patient_data():
    return {
        "gender": "Male",
        "age": 45,
        "hypertension": 0,
        "heart_disease": 0,
        "smoking_history": "never",
        "bmi": 25.5,
        "HbA1c_level": 5.5,
        "blood_glucose_level": 100,
        "clinician_id": "debug_user",
        "clinician_name": "Debug User"
    }

url = "http://localhost:8001/predict"
data = random_patient_data()

print(f"Sending POST to {url}")
print(f"Payload: {json.dumps(data, indent=2)}")

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
