from fpdf import FPDF
import datetime

class SubmissionPDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 15)
        self.cell(0, 10, 'Clinical Risk Predictor - Submission Documentation', 0, 1, 'C')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

    def chapter_title(self, title):
        self.set_font('Helvetica', 'B', 12)
        self.set_text_color(0, 51, 102)  # Dark Blue
        self.cell(0, 10, title, 0, 1, 'L')
        self.ln(2)
        self.set_text_color(0, 0, 0)  # Reset

    def chapter_body(self, body):
        self.set_font('Helvetica', '', 11)
        self.multi_cell(0, 6, body)
        self.ln(5)

    def bullet_point(self, text):
        self.set_font('Helvetica', '', 11)
        self.cell(5)  # Indent
        self.cell(5, 6, chr(149), 0, 0)  # Bullet char
        self.multi_cell(0, 6, text)
        self.ln(1)

def generate_pdf():
    pdf = SubmissionPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # 1. Overview
    pdf.chapter_title("1. Overview of the Prototype")
    pdf.chapter_body(
        "Sanjeevni Healthcarer is a comprehensive Clinical Decision Support System (CDSS) designed to predict the risk of chronic diseases, specifically focusing on Diabetes Type 2. "
        "Unlike traditional risk calculators, Sanjeevni Healthcarer leverages an advanced ensemble of Machine Learning models (XGBoost, CatBoost, LightGBM) combined with Generative AI "
        "to provide not just a risk score, but a personalized, explainable, and actionable health report. The system features a clinician-facing dashboard for deep analytics "
        "and a patient-facing portal for simplified insights."
    )

    # 2. Goal and Adherence to Problem Statement
    pdf.chapter_title("2. Goal and Adherence to Problem Statement")
    pdf.chapter_body(
        "Goal: To bridge the gap between complex medical data and actionable clinical insights by surfacing early risk signals and empowering shared decision-making.\n\n"
        "Adherence to Problem Statement:"
    )
    pdf.bullet_point("Early Detection: The model identifies subtle patterns in routine health data (e.g., BMI, Glucose, HbA1c) to flag high-risk patients before symptoms escalate.")
    pdf.bullet_point("Reduced Clinician Load: By automating the risk stratification process and generating draft clinical notes, the system saves valuable consultation time.")
    pdf.bullet_point("Patient Empowerment: The clear, visual explanation of risk factors helps patients understand the 'why' behind their diagnosis, improving adherence to lifestyle changes.")
    pdf.ln(3)

    # 3. Utilization of ML + GenAI
    pdf.chapter_title("3. Utilization of ML + GenAI in the Prototype")
    pdf.chapter_body("The prototype employs a dual-engine architecture:")
    
    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 6, "Machine Learning (The Logical Core):", 0, 1)
    pdf.set_font('Helvetica', '', 11)
    pdf.bullet_point("Ensemble Learning: Combines predictions from XGBoost, CatBoost, and LightGBM using a Soft Voting mechanism to maximize accuracy and robustness.")
    pdf.bullet_point("Explainable AI (XAI): Integrates SHAP (SHapley Additive exPlanations) to calculate the exact contribution of each feature (e.g., 'Age adds +12% risk') to the final score.")
    pdf.bullet_point("Counterfactual Analysis: Allows clinicians to simulate 'What-If' scenarios (e.g., 'If BMI drops by 2 points, how does risk change?').")

    pdf.ln(2)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 6, "Generative AI (The Communication Layer):", 0, 1)
    pdf.set_font('Helvetica', '', 11)
    pdf.bullet_point("Clinical Report Generation: Uses a medical Large Language Model (LLM) (e.g., BioMistral-7B) to synthesize the structured risk data and SHAP values into a natural language clinical assessment.")
    pdf.bullet_point("Personalized Recommendations: Generates tailored lifestyle advice and medical follow-up suggestions based on the specific risk drivers identified by the ML engine.")
    pdf.ln(3)

    # 4. Problems Faced
    pdf.chapter_title("4. Problems Faced During Development")
    pdf.bullet_point("Data Imbalance: The clinical dataset had significantly fewer positive cases than negative ones. We addressed this using Synthetic Minority Over-sampling Technique (SMOTE) to ensure the model didn't learn to just predict the majority class.")
    pdf.bullet_point("Model Explainability: Integrating SHAP values into the real-time API response introduced latency. We optimized this by caching SHAP explainers and computing values only for the specific inference instance.")
    pdf.bullet_point("LLM Reliability: Early iterations of the GenAI component occasionally hallucinated medical facts. We solved this by implementing strict prompt engineering and grounding the LLM generation in the structured output of the ML model (Retrieval-Augmented Generation approach).")
    pdf.bullet_point("Docker Configuration: Setting up a multi-container environment where the Python backend could communicate reliably with the React frontend and the ML inference service required careful network configuration in Docker Compose.")
    pdf.ln(3)

    # 5. Business Feasibility
    pdf.chapter_title("5. Business Feasibility")
    pdf.chapter_body(
        "Sanjeevni Healthcarer is designed with commercial viability in mind, targeting the growing Digital Health market."
    )
    pdf.bullet_point("SaaS Model: The platform can be licensed to clinics and telehealth providers on a per-seat or per-patient usage basis.")
    pdf.bullet_point("Operational Efficiency: By partially automating the risk assessment and documentation process, clinics can increase patient throughput by an estimated 20-30%.")
    pdf.bullet_point("Preventative Care Focus: Insurance providers are increasingly incentivizing preventative care. Sanjeevni Healthcarer aligns with this trend by enabling early intervention, potentially reducing long-term treatment costs for chronic conditions.")
    pdf.bullet_point("Scalability: The microservices architecture allows independent scaling of the ML engine to handle high request volumes without degrading frontend performance.")

    # Save
    output_filename = "Submission_Documentation.pdf"
    pdf.output(output_filename)
    return output_filename

if __name__ == "__main__":
    try:
        filename = generate_pdf()
        print(f"Successfully generated PDF: {filename}")
    except Exception as e:
        print(f"Error generating PDF: {e}")
