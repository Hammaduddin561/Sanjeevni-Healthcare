import type { ScreeningVisitInput, ScreeningVisitResponse } from '../api/client';

export const calculateOfflineRisk = (input: ScreeningVisitInput): ScreeningVisitResponse => {
  const isNoLab = input.blood_glucose_level == null || input.HbA1c_level == null;
  const age = input.age || 40;
  const bmi = input.bmi || 24;
  const glucose = input.blood_glucose_level ?? 0;
  const hba1c = input.HbA1c_level ?? 0;
  const systolic = input.systolic_bp || 120;
  const diastolic = input.diastolic_bp || 80;
  const heartDisease = input.heart_disease || 0;
  const phq9 = input.phq9_scores || [0, 0, 0, 0, 0, 0, 0, 0, 0];

  // Logistic regression equation
  const z = -9.2
    + (0.042 * age)
    + (0.085 * bmi)
    + (0.018 * glucose)
    + (0.82 * (hba1c - 5.0))
    + (systolic >= 140 || diastolic >= 90 ? 0.55 : 0.0)
    + (heartDisease ? 0.65 : 0.0);

  const mlRiskScore = 1.0 / (1.0 + Math.exp(-z));
  const roundedRisk = Math.round(mlRiskScore * 1000) / 1000;

  // Initial base triage from model
  let trafficLight: "GREEN" | "YELLOW" | "RED" = "GREEN";
  if (roundedRisk >= 0.50) {
    trafficLight = "RED";
  } else if (roundedRisk >= 0.20) {
    trafficLight = "YELLOW";
  }

  // Deterministic Safety Guardrail (Never downgrades)
  const escalationReasons: string[] = [];
  let safetyEscalated = false;
  let emergencyHelpline = false;

  // Rule 1: Hypertensive Crisis (AHA/ACC 2017)
  if (systolic >= 180 || diastolic >= 120) {
    trafficLight = "RED";
    safetyEscalated = true;
    escalationReasons.push(`Hypertensive Crisis: BP ${systolic}/${diastolic} mmHg (>=180/120) requires urgent care`);
  }

  // Rule 2: Hyperglycemic Emergency (ADA 2024)
  if (glucose >= 300) {
    trafficLight = "RED";
    safetyEscalated = true;
    escalationReasons.push(`Severe Hyperglycemia: Blood glucose ${glucose} mg/dL (>=300) requires emergency evaluation`);
  }

  // Rule 3: PHQ-9 Item 9 Self-Harm Crisis
  if (phq9.length >= 9 && phq9[8] > 0) {
    trafficLight = "RED";
    safetyEscalated = true;
    emergencyHelpline = true;
    escalationReasons.push(`Active Distress Flag: PHQ-9 Item 9 positive (${phq9[8]}/3) — immediate psychosocial support required`);
  }

  // Rule 4: Stage 2 Hypertension escalation
  if (trafficLight === "GREEN" && (systolic >= 140 || diastolic >= 90)) {
    trafficLight = "YELLOW";
    safetyEscalated = true;
    escalationReasons.push(`Elevated Blood Pressure: Stage 2 Hypertension (${systolic}/${diastolic} mmHg)`);
  }

  // Rule 5: Moderate PHQ-9 depression
  const phqTotal = phq9.reduce((a, b) => a + b, 0);
  if (trafficLight === "GREEN" && phqTotal >= 10) {
    trafficLight = "YELLOW";
    safetyEscalated = true;
    escalationReasons.push(`Elevated Mental Health Risk: PHQ-9 score ${phqTotal}/27 indicates moderate depression`);
  }

  // Headlines and actions
  let actionHeadline = "";
  let actionDetails = "";
  if (trafficLight === "RED") {
    actionHeadline = "SEE DOCTOR IMMEDIATELY (उच्च जोखिम - तत्काल डॉक्टर को दिखाएं)";
    actionDetails = "Critical thresholds exceeded. Safely escort patient to Primary Health Centre (PHC) or Community Health Centre emergency room now.";
  } else if (trafficLight === "YELLOW") {
    actionHeadline = "VISIT HEALTH CENTRE SOON (मध्यम जोखिम - 7 दिनों में पीएचसी जाएं)";
    actionDetails = "Elevated risk profile detected. Refer patient to Medical Officer at PHC within 7 days for confirmation, medication, and lifestyle counselling.";
  } else {
    actionHeadline = "ROUTINE CARE & HOME ADVICE (कम जोखिम - स्वस्थ खानपान एवं व्यायाम जारी रखें)";
    actionDetails = "Parameters are within safe baseline ranges. Encourage 30 min daily walking, low refined carbohydrate diet, and re-screen in 6 months.";
  }

  return {
    visit_id: input.visit_id || `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    patient_id: input.patient_id || 'P_UNKNOWN',
    patient_name: input.patient_name || 'Community Patient',
    worker_id: input.worker_id || 'offline_worker',
    worker_name: input.worker_name || 'Health Worker',
    village: input.village || 'Community Sub-Centre',
    timestamp: new Date().toISOString(),
    traffic_light: trafficLight,
    ml_triage: roundedRisk >= 0.50 ? 'RED' : roundedRisk >= 0.20 ? 'YELLOW' : 'GREEN',
    ml_risk_score: roundedRisk,
    safety_escalated: safetyEscalated,
    escalation_reasons: escalationReasons,
    action_headline: actionHeadline,
    action_details: actionDetails,
    bmi,
    blood_glucose_level: input.blood_glucose_level ?? null,
    HbA1c_level: input.HbA1c_level ?? null,
    lab_mode: isNoLab ? 'no_lab' : 'full_lab',
    model_mode_label: isNoLab ? 'Estimated without lab tests: confirm with a glucometer or lab test' : null,
    recommended_followup: isNoLab ? 'Recommended: Confirm with a blood glucose (glucometer/fasting) or HbA1c lab check.' : null,
    systolic_bp: systolic,
    diastolic_bp: diastolic,
    hypertension_flag: (systolic >= 140 || diastolic >= 90) ? 1 : 0,
    phq9_total: phqTotal,
    phq9_severity: phqTotal >= 20 ? 'Severe' : phqTotal >= 15 ? 'Moderately Severe' : phqTotal >= 10 ? 'Moderate' : phqTotal >= 5 ? 'Mild' : 'None-Minimal',
    phq9_crisis_flag: phq9.length >= 9 && phq9[8] > 0,
    emergency_helpline_required: emergencyHelpline,
    helplines: emergencyHelpline ? [
      { name: "Tele-MANAS (Govt of India)", number: "14416", hours: "24/7 Toll-Free" },
      { name: "National Emergency Ambulance", number: "112", hours: "24/7" },
      { name: "KIRAN Mental Health", number: "1800-599-0019", hours: "24/7" }
    ] : [],
    summary_en: `Offline Screening Estimate: Patient is triaged as ${trafficLight}. Key factors: Glucose ${glucose} mg/dL, BP ${systolic}/${diastolic} mmHg, BMI ${bmi}.`,
    summary_hi: `ऑफ़लाइन अनुमान: रोगी को ${trafficLight === 'RED' ? 'लाल' : trafficLight === 'YELLOW' ? 'पीला' : 'हरा'} श्रेणी में आंका गया है। ग्लूकोज: ${glucose} mg/dL, बीपी: ${systolic}/${diastolic} mmHg।`,
    explanations: [
      { feature: "blood_glucose_level", impact_score: glucose > 140 ? 0.35 : -0.1, impact_description: `Blood glucose level (${glucose} mg/dL)` },
      { feature: "HbA1c_level", impact_score: hba1c > 6.0 ? 0.30 : -0.1, impact_description: `Glycated hemoglobin (${hba1c}%)` },
      { feature: "bmi", impact_score: bmi > 25 ? 0.20 : -0.05, impact_description: `Body Mass Index (${bmi} kg/m²)` },
      { feature: "age", impact_score: age > 50 ? 0.15 : -0.05, impact_description: `Patient age (${age} yrs)` }
    ]
  };
};
