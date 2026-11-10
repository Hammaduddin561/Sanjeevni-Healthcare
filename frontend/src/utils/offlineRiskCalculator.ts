import type { ScreeningVisitInput, ScreeningVisitResponse } from '../api/client';
import sharedConfig from '../../../shared/triage_thresholds.json';

const T = sharedConfig.thresholds;

export const calculateOfflineRisk = (input: ScreeningVisitInput): ScreeningVisitResponse => {
  const isNoLab = input.blood_glucose_level == null || input.HbA1c_level == null;
  const age = input.age || 40;
  const bmi = input.bmi || 24;
  const systolic = input.systolic_bp ?? 120;
  const diastolic = input.diastolic_bp ?? 80;
  const hypertension =
    input.hypertension === 1 ||
    systolic >= T.stage2_hypertension_systolic ||
    diastolic >= T.stage2_hypertension_diastolic
      ? 1
      : 0;
  const heartDisease = input.heart_disease || 0;
  const glucose = input.blood_glucose_level ?? 0;
  const hba1c = input.HbA1c_level ?? 0;
  const phq9 = input.phq9_scores || [0, 0, 0, 0, 0, 0, 0, 0, 0];

  // Offline logistic approximation fitted via scripts/fit_offline_logistic.py on public Kaggle dataset
  let z: number;
  if (isNoLab) {
    const w = sharedConfig.offline_logistic_no_lab;
    z =
      w.intercept +
      w.coefficients.age * age +
      w.coefficients.bmi * bmi +
      w.coefficients.hypertension * hypertension +
      w.coefficients.heart_disease * heartDisease;
  } else {
    const w = sharedConfig.offline_logistic_full_lab;
    z =
      w.intercept +
      w.coefficients.age * age +
      w.coefficients.bmi * bmi +
      w.coefficients.hypertension * hypertension +
      w.coefficients.heart_disease * heartDisease +
      w.coefficients.blood_glucose_level * glucose +
      w.coefficients.HbA1c_level * hba1c;
  }

  const mlRiskScore = 1.0 / (1.0 + Math.exp(-z));
  const roundedRisk = Math.round(mlRiskScore * 1000) / 1000;

  // Base ML Triage using identical cutoffs to backend SafetyLayer
  let trafficLight: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
  if (roundedRisk >= T.ml_red_threshold) {
    trafficLight = 'RED';
  } else if (roundedRisk >= T.ml_yellow_threshold) {
    trafficLight = 'YELLOW';
  }
  const baseMlTriage = trafficLight;

  // Deterministic Clinical Safety Guardrails mirroring backend/models/safety_layer.py
  const escalationReasons: string[] = [];
  let emergencyHelpline = false;

  // 1. PHQ-9 Self-Harm & Severity Rules
  const phqTotal = phq9.reduce((a, b) => a + b, 0);
  const q9Score = phq9.length > T.phq9_self_harm_item_index ? phq9[T.phq9_self_harm_item_index] : 0;
  const phqCrisis = q9Score > 0;

  if (phqCrisis) {
    trafficLight = 'RED';
    emergencyHelpline = true;
    escalationReasons.push(
      'PHQ-9 Question 9 positive (thoughts of self-harm or suicide). Immediate mental health crisis protocol activated.'
    );
  }

  if (phqTotal >= T.phq9_severe_threshold) {
    trafficLight = 'RED';
    emergencyHelpline = true;
    escalationReasons.push(
      `Severe depression score on PHQ-9 (${phqTotal}/27). Urgent psychiatric referral required.`
    );
  } else if (phqTotal >= T.phq9_moderate_threshold) {
    if (trafficLight === 'GREEN') {
      trafficLight = 'YELLOW';
    }
    escalationReasons.push(
      `Moderate depressive symptoms on PHQ-9 (${phqTotal}/27). Counselling and health centre follow-up advised.`
    );
  }

  // 2. Glycemic Emergency Rules (when lab values present)
  if (!isNoLab) {
    if (glucose >= T.severe_glucose_critical) {
      trafficLight = 'RED';
      escalationReasons.push(
        `Critical hyperglycemia: Blood glucose is ${glucose} mg/dL (>= ${T.severe_glucose_critical} mg/dL).`
      );
    } else if (glucose >= T.elevated_glucose_warning) {
      if (trafficLight === 'GREEN') {
        trafficLight = 'YELLOW';
      }
      escalationReasons.push(
        `Marked hyperglycemia: Blood glucose is ${glucose} mg/dL (>= ${T.elevated_glucose_warning} mg/dL).`
      );
    }

    if (hba1c >= T.severe_hba1c_critical) {
      trafficLight = 'RED';
      escalationReasons.push(
        `Severe decompensated glycemia: HbA1c is ${hba1c}% (>= ${T.severe_hba1c_critical}%). Urgent specialist management needed.`
      );
    } else if (hba1c >= T.elevated_hba1c_warning) {
      if (trafficLight === 'GREEN') {
        trafficLight = 'YELLOW';
      }
      escalationReasons.push(
        `Elevated HbA1c: ${hba1c}% (>= ${T.elevated_hba1c_warning}%) indicates uncontrolled glycemic trajectory.`
      );
    }
  }

  // 3. Blood Pressure Rules (AHA/ACC 2017)
  if (input.systolic_bp != null || input.diastolic_bp != null) {
    if (systolic >= T.hypertensive_crisis_systolic || diastolic >= T.hypertensive_crisis_diastolic) {
      trafficLight = 'RED';
      escalationReasons.push(
        `Hypertensive Crisis: BP ${systolic}/${diastolic} mmHg (>= ${T.hypertensive_crisis_systolic}/${T.hypertensive_crisis_diastolic} mmHg).`
      );
    } else if (systolic >= T.stage2_hypertension_systolic || diastolic >= T.stage2_hypertension_diastolic) {
      if (trafficLight === 'GREEN') {
        trafficLight = 'YELLOW';
      }
      escalationReasons.push(
        `Stage 2 Hypertension flagged: BP ${systolic}/${diastolic} mmHg (>= ${T.stage2_hypertension_systolic}/${T.stage2_hypertension_diastolic} mmHg).`
      );
    }
  }

  const safetyEscalated = trafficLight !== baseMlTriage;

  let actionHeadline = '';
  let actionDetails = '';
  if (trafficLight === 'RED') {
    actionHeadline = 'SEE DOCTOR IMMEDIATELY (उच्च जोखिम - तत्काल डॉक्टर को दिखाएं)';
    actionDetails =
      'High-risk indicators or safety alert triggered. Arrange immediate transport or urgent consultation at Primary Health Centre / hospital emergency.';
  } else if (trafficLight === 'YELLOW') {
    actionHeadline = 'VISIT HEALTH CENTRE SOON (मध्यम जोखिम - 7 दिनों में पीएचसी जाएं)';
    actionDetails =
      'Moderate screening risk or elevated vitals. Schedule PHC Medical Officer evaluation within 1-2 weeks.';
  } else {
    actionHeadline = 'HOME ADVICE & FOLLOW-UP (कम जोखिम - स्वस्थ खानपान एवं व्यायाम)';
    actionDetails =
      'Low screening risk. Encourage balanced nutrition, 30 min daily walking, and repeat community screening in 6 months.';
  }

  if (isNoLab) {
    actionDetails = `Estimated without lab tests: confirm with a glucometer or lab test. ${actionDetails}`;
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
    ml_triage: baseMlTriage,
    ml_risk_score: roundedRisk,
    safety_escalated: safetyEscalated,
    escalation_reasons: escalationReasons,
    action_headline: actionHeadline,
    action_details: actionDetails,
    bmi,
    blood_glucose_level: input.blood_glucose_level ?? null,
    HbA1c_level: input.HbA1c_level ?? null,
    lab_mode: isNoLab ? 'no_lab' : 'full_lab',
    model_mode_label: isNoLab
      ? 'Estimated without lab tests: confirm with a glucometer or lab test'
      : null,
    recommended_followup: isNoLab
      ? 'Recommended: Confirm with a blood glucose (glucometer/fasting) or HbA1c lab check.'
      : null,
    is_offline_estimate: true,
    systolic_bp: input.systolic_bp,
    diastolic_bp: input.diastolic_bp,
    hypertension_flag: hypertension,
    phq9_total: phqTotal,
    phq9_severity:
      phqTotal >= 20
        ? 'Severe Depression'
        : phqTotal >= 15
        ? 'Moderately Severe Depression'
        : phqTotal >= 10
        ? 'Moderate Depression'
        : phqTotal >= 5
        ? 'Mild Depression'
        : 'Minimal / No Depression',
    phq9_crisis_flag: phqCrisis,
    emergency_helpline_required: emergencyHelpline,
    helplines: emergencyHelpline
      ? [
          { name: 'Tele-MANAS (Govt of India)', number: '14416', hours: '24/7 Toll-Free Mental Health Support' },
          { name: 'National Emergency', number: '112', hours: '24/7 Emergency Response' },
          { name: 'KIRAN Mental Health', number: '1800-599-0019', hours: '24/7 Toll-Free' }
        ]
      : [],
    summary_en: isNoLab
      ? `Offline screening estimate without lab tests (Age ${age}, BMI ${bmi}, BP ${systolic}/${diastolic}): triaged ${trafficLight}. Confirm with blood glucose check.`
      : `Offline screening estimate (Glucose ${glucose} mg/dL, HbA1c ${hba1c}%, BP ${systolic}/${diastolic}): triaged ${trafficLight}.`,
    summary_hi: isNoLab
      ? `ऑफ़लाइन जांच अनुमान (बिना लैब जांच, आयु ${age}, बीएमआई ${bmi}, बीपी ${systolic}/${diastolic}): श्रेणी ${trafficLight}। ग्लूकोमीटर या लैब जांच से पुष्टि करें।`
      : `ऑफ़लाइन जांच अनुमान (ग्लूकोज ${glucose} mg/dL, HbA1c ${hba1c}%, बीपी ${systolic}/${diastolic}): श्रेणी ${trafficLight}।`,
    explanations: [
      {
        feature: isNoLab ? 'bmi' : 'blood_glucose_level',
        impact_score: isNoLab ? (bmi >= 25 ? 0.25 : -0.05) : glucose >= 140 ? 0.35 : -0.1,
        impact_description: isNoLab ? `BMI (${bmi} kg/m²)` : `Blood glucose (${glucose} mg/dL)`
      },
      {
        feature: isNoLab ? 'age' : 'HbA1c_level',
        impact_score: isNoLab ? (age >= 45 ? 0.2 : -0.05) : hba1c >= 6.0 ? 0.3 : -0.1,
        impact_description: isNoLab ? `Age (${age} yrs)` : `HbA1c (${hba1c}%)`
      }
    ]
  };
};
