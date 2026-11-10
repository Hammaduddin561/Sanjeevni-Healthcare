import random
from locust import HttpUser, task, between

def random_patient_data():
    return {
        "gender": random.choice(["Male", "Female"]),
        "age": random.randint(18, 90),
        "hypertension": random.choice([0, 1]),
        "heart_disease": random.choice([0, 1]),
        "smoking_history": random.choice(["never", "current", "former", "No Info"]),
        "bmi": round(random.uniform(18.5, 40.0), 1),
        "HbA1c_level": round(random.uniform(4.0, 9.0), 1),
        "blood_glucose_level": random.randint(80, 200),
        "clinician_id": "locust_tester",
        "clinician_name": "Locust Bot"
    }

class StandardUser(HttpUser):
    wait_time = between(1, 3)
    weight = 3
    
    @task(3)
    def predict_risk(self):
        self.client.post("/predict", json=random_patient_data())

    @task(1)
    def get_history(self):
        self.client.get("/history")

class AnalystUser(HttpUser):
    wait_time = between(2, 5)
    weight = 1

    @task(2)
    def explain_risk(self):
         self.client.post("/explain", json=random_patient_data())

    @task(1)
    def simulate_risk(self):
        # Simulate reducing BMI to a healthy level
        data = {
            "patient": random_patient_data(),
            "modifications": {"bmi": 22.0}
        }
        self.client.post("/simulate", json=data)

class LLMUser(HttpUser):
    # LLM inference is slow and CPU intensive, so we simulate a user who waits a long time
    wait_time = between(10, 30) 
    weight = 1

    @task
    def generate_report(self):
        self.client.post("/report", json=random_patient_data())
