import requests
import time
import json

url = "http://localhost:8001/report"
data = {
    "age": 45,
    "gender": "Male",
    "bmi": 28.5,
    "HbA1c_level": 7.2,
    "blood_glucose_level": 140,
    "hypertension": 1,
    "heart_disease": 0,
    "smoking_history": "former"
}

print("⏳ Sending request to LLM (Optimized)...")
start = time.time()
try:
    response = requests.post(url, json=data)
    duration = time.time() - start
    
    if response.status_code == 200:
        print(f"✅ Success! Report generated in {duration:.2f} seconds.")
        print("-" * 20)
        print(response.json()['report'])
        print("-" * 20)
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")

except Exception as e:
    print(f"❌ Error: {e}")
