# Ethics & Limitations

## 🛡️ Responsible AI Framework

At **Clinical Risk Predictor**, we prioritize patient safety, data privacy, and algorithmic fairness. This document outlines our approach to responsible AI.

### 1. Bias Detection & Mitigation
*   **Dataset Analysis**: We analyze the training data for representation gaps across age, gender, and socioeconomic factors.
*   **Fairness Metrics**: We evaluate model performance (False Positive Rates) across different demographic groups to ensure no group is unfairly penalized.

### 2. Clinical Guardrails
*   **Human-in-the-Loop**: Our system is a *Decision Support* tool, not a diagnostic device. All final decisions must be made by a qualified clinician.
*   **Uncertainty Quantification**: We do not present risk scores as absolute facts. We provide confidence intervals (e.g., "Risk: 45% ± 5%") to reflect model uncertainty.

### 3. Data Privacy
*   **De-identification**: All patient data processing happens locally or in a compliant environment. No PII is sent to external LLM APIs; only anonymized clinical features are used for prompt generation.

### 4. Limitations
*   **Synthetic Training Data**: The current model is trained on a curated diabetes dataset. This dataset may not fully reflect the complexity of real-world patient populations.
*   **GenAI Hallucinations**: While we use prompt engineering to ground LLM outputs in data, there is a non-zero risk of hallucination. Clinicians are warned to verify generated recommendations.
