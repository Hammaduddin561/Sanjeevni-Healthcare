import os
import sys
from typing import Dict, Any, List, Optional
try:
    from gpt4all import GPT4All
    from huggingface_hub import hf_hub_download
except ImportError:
    GPT4All = None
    hf_hub_download = None

class ClinicalLLM:
    def __init__(self, model_repo="MaziyarPanahi/BioMistral-7B-GGUF", model_file="BioMistral-7B.Q4_K_M.gguf"):
        """
        Initialize the Clinical LLM model using GPT4All.
        Automatically downloads the GGUF model if not present locally.
        
        Args:
            model_repo (str): HuggingFace repository ID.
            model_file (str): Specific GGUF file name to download.
        """
        self.model = None
        # Store models in backend/models/weights
        self.weights_dir = os.path.join(os.getcwd(), "backend", "models", "weights")
        self.model_path = os.path.join(self.weights_dir, model_file)
        self.repo_id = model_repo
        self.filename = model_file
        
        if GPT4All is None:
            print("❌ Error: gpt4all not installed. Cannot run ClinicalLLM.")
            return

        self._load_model()

    def _load_model(self):
        """Downloads (if needed) and loads the model into memory."""
        os.makedirs(self.weights_dir, exist_ok=True)

        if not os.path.exists(self.model_path):
            print(f"⬇️ Clinical Model not found. Downloading {self.filename} from {self.repo_id}...")
            print("This is a one-time download (~4-5GB). Please be patient.")
            try:
                # Download to the specific path
                downloaded_path = hf_hub_download(
                    repo_id=self.repo_id,
                    filename=self.filename,
                    local_dir=self.weights_dir,
                    local_dir_use_symlinks=False
                )
                print(f"✅ Download complete: {downloaded_path}")
            except Exception as e:
                print(f"❌ Failed to download model: {e}")
                return

        print(f"🧠 Loading Clinical Model: {self.filename}...")
        try:
            # Suppress CUDA DLL loading warnings by redirecting stderr temporarily
            import io
            import contextlib
            
            # Capture stderr to suppress CUDA DLL warnings
            stderr_capture = io.StringIO()
            with contextlib.redirect_stderr(stderr_capture):
                # Initialize GPT4All model
                # allow_download=False because we manually downloaded it
                # model_path=self.weights_dir tells GPT4All where to look for self.filename
                # Reduced threads to 2 to match typical container limits and prevent thrashing
                # Increased threads to 8 as system has 12 cores, balanced with gunicorn workers
                self.model = GPT4All(model_name=self.filename, model_path=self.weights_dir, allow_download=False, device='cpu', n_threads=8)
            
            print("✅ Clinical Model loaded successfully.")
        except Exception as e:
            print(f"❌ Failed to load model execution: {e}")
            if "Unsupported file format" in str(e) or "failed to open" in str(e):
                print("⚠️ Model file might be corrupt or incompatible. Deleting and retrying...")
                try:
                    os.remove(self.model_path)
                    print("✅ Corrupt model file deleted. Please restart the application to re-download.")
                    # Optionally, could call _load_model() recursively, but safer to let orchestration handle restart
                    # or just return None and let next request try?
                    # Let's try to clear it so next init tries download
                except Exception as del_e:
                    print(f"❌ Failed to delete corrupt file: {del_e}")
            
            self.model = None

    def stream_report(self, patient_data: Dict[str, Any], risk_score: float, risk_level: str, explanations: list, patient_name: str = None):
        """
        Streams a clinical report for the patient.
        Yields tokens as they are generated.
        """
        if not self.model:
            yield "⚠️ Clinical LLM is not active. Report cannot be generated."
            return

        # 1. Prepare Features Text
        key_factors = []
        if explanations:
            sorted_exp = sorted(explanations, key=lambda x: abs(x.get('impact_score', 0)), reverse=True)
            for exp in sorted_exp[:3]:
                feature = exp.get('feature', 'Unknown')
                impact = "increases" if exp.get('impact_score', 0) > 0 else "decreases"
                key_factors.append(f"- {feature}: {impact} risk")
        
        factors_text = "\n".join(key_factors) if key_factors else "No specific key factors."

        # 2. Construct Prompt (BioMistral friendly)
        prompt = f"""
### Instruction:
You are an expert Chief Medical Officer. Generate a detailed, evidence-based clinical assessment and care plan for the following patient.

**Patient Profile:**
- Name: {patient_name if patient_name else 'N/A'}
- Age: {patient_data.get('age')} | Gender: {patient_data.get('gender')}
- BMI: {patient_data.get('bmi')} (Classification: {'Obese' if patient_data.get('bmi') >= 30 else 'Overweight' if patient_data.get('bmi') >= 25 else 'Normal'})
- HbA1c: {patient_data.get('HbA1c_level')}%
- Glucose: {patient_data.get('blood_glucose_level')} mg/dL
- History: {patient_data.get('smoking_history')} smoker, {'Hypertensive' if patient_data.get('hypertension') else 'Normotensive'}, {'Heart Disease History' if patient_data.get('heart_disease') else 'No Heart Disease'}

**Risk Model Output:**
- Risk Score: {risk_score:.2f} / 1.00
- Category: {risk_level.upper()} RISK
- Key Drivers: {factors_text}

**Task:**
Provide a professional medical report in two distinct sections as follows:

**1. Clinical Assessment**
Provide a descriptive analysis of the patient's health status. Do not just list the data; interpret it. Explain *why* the risk score is {risk_level}. Discuss the interplay between their vitals (e.g., impact of BMI on metabolic markers). Use **bold** for key medical terms.

**2. Recommendations**
Provide 3-4 specific, actionable steps based on standard clinical guidelines (ADA/ACC).
- Suggest specific lifestyle targets (e.g., "Target BMI < 25").
- Mention relevant screening tests or referrals.
- Suggest pharmacological classes to *consider* (do not prescribe, just suggest classes like "Consider statin therapy" or "Metformin initiation" if appropriate for the profile).

**Format:**
- Use **Bold** for headers.
- Use bullet points for recommendations.
- Keep the total response under 250 words but ensure it is high-density info.

### Response:
"""

        # 3. Generate (Streaming)
        try:
            # GPT4All generate method with streaming=True returns a generator
            for token in self.model.generate(prompt, max_tokens=400, temp=0.2, streaming=True):
                yield token
        except Exception as e:
            yield f"Error during generation: {e}"

    def generate_report(self, patient_data: Dict[str, Any], risk_score: float, risk_level: str, explanations: list, patient_name: str = None) -> str:
        """
        Generates a clinical report for the patient (Non-streaming).
        """
        # Reuse stream_report logic for DRY if possible, but keep separate for safety for now
        # Actually, let's just use non-streaming for now as fallback
        return "".join(list(self.stream_report(patient_data, risk_score, risk_level, explanations, patient_name=patient_name)))

    def generate_simulation_report(self, original_data: Dict[str, Any], modified_data: Dict[str, Any], original_risk: float, new_risk: float) -> str:
        """
        Generates a comparative report for a 'What-If' simulation.
        """
        if not self.model:
            return "⚠️ Clinical LLM is not active. Report cannot be generated."

        # Identify what changed
        changes = []
        for key, val in modified_data.items():
            if val != original_data.get(key):
                orig_val = original_data.get(key)
                changes.append(f"- {key.replace('_', ' ').title()}: Changed from {orig_val} to {val}")
        
        changes_text = "\n".join(changes) if changes else "No specific changes detected."
        risk_reduction_pct = (original_risk - new_risk) * 100

        prompt = f"""
### Instruction:
You are an expert medical AI assistant. Analyze the result of a clinical simulation where a patient's risk factors were modified to see the impact on their health risk.

**Patient Context:**
- Age: {original_data.get('age')}
- Gender: {original_data.get('gender')}

**Simulation Results:**
- Original Risk Score: {original_risk:.2f}
- New Risk Score: {new_risk:.2f}
- Absolute Risk Reduction: {risk_reduction_pct:.1f}%

**Modifications Made:**
{changes_text}

**Task:**
Write a short, motivating clinical explanation of WHY these specific changes led to a risk reduction.
- Explain the medical benefit of the changes (e.g. creating lower blood glucose).
- Provide positive reinforcement.
- Keep it under 100 words.

### Response:
"""
        try:
            # Optimized for speed
            output = self.model.generate(prompt, max_tokens=100, temp=0.1)
            return output.strip()
        except Exception as e:
            return f"Error during generation: {e}"
