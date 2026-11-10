import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export const handleUnauthorized = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('sanjeevniUser');
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sanjeevni:unauthorized'));
    }
};

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Auth Interceptors ---
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            const reqUrl: string = error?.config?.url || '';
            if (!reqUrl.includes('/auth/login') && !reqUrl.includes('/auth/register')) {
                handleUnauthorized();
            }
        }
        return Promise.reject(error);
    }
);

// --- Auth Types & Functions ---

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user_name: string;
    user_email: string;
    role?: string;
    user_specialty?: string;
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
    // OAuth2PasswordRequestForm expects form data usually, but our backend expects JSON by default unless changed. 
    // Wait, backend auth.py used `UserLogin` Pydantic model which expects JSON body.
    const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    if (response.data.access_token) {
        localStorage.setItem('authToken', response.data.access_token);
    }
    return response.data;
};

export const register = async (userData: {
    email: string;
    password: string;
    name: string;
    specialty?: string;
    hospital?: string;
}): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', userData);
    if (response.data.access_token) {
        localStorage.setItem('authToken', response.data.access_token);
    }
    return response.data;
};

export const loginWithGoogle = async (credential: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/google/', { credential });
    if (response.data.access_token) {
        localStorage.setItem('authToken', response.data.access_token);
    }
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('authToken');
};

// --- Existing Types ---

export interface PredictionInput {
    gender: string;
    age: number;
    hypertension: number;
    heart_disease: number;
    smoking_history: string;
    bmi: number;
    HbA1c_level?: number | null;
    blood_glucose_level?: number | null;
    clinician_id?: string;
    clinician_name?: string;
    patient_name?: string;
}

export interface PredictionResponse {
    risk_score: number;
    risk_level: string;
    lab_mode?: 'full_lab' | 'no_lab';
    model_mode_label?: string | null;
    recommended_followup?: string | null;
    is_offline_estimate?: boolean;
    shap_values?: Record<string, number>;
    explanations?: Array<{
        feature: string;
        impact_score: number;
        impact_description: string;
        value?: any;
        plain_text_en?: string;
        plain_text_hi?: string;
    }>;
    summary_en?: string;
    summary_hi?: string;
}

export interface CounterfactualScenario {
    name: string;
    change_description: string;
    original_risk: number;
    new_risk: number;
    risk_reduction: number;
    actionable_targets?: Record<string, any>;
}

export interface ModelCardData {
    model_name: string;
    intended_use: string;
    data_source: string;
    limitations: string[];
    metrics: Record<string, any>;
    fairness: Record<string, any>;
    disclaimer: string;
}

export const getModelCard = async (): Promise<ModelCardData> => {
    const res = await apiClient.get<ModelCardData>('/model-card');
    return res.data;
};

export const getCounterfactuals = async (patient: PredictionInput): Promise<{ scenarios: CounterfactualScenario[] }> => {
    const res = await apiClient.post<{ scenarios: CounterfactualScenario[] }>('/counterfactuals', patient);
    return res.data;
};

export interface ScreeningVisitInput extends PredictionInput {
    visit_id?: string;
    patient_id?: string;
    worker_id?: string;
    worker_name?: string;
    village?: string;
    systolic_bp?: number;
    diastolic_bp?: number;
    phq9_scores?: number[];
    notes?: string;
}

export interface ScreeningVisitResponse {
    visit_id: string;
    patient_id: string;
    patient_name?: string;
    worker_id: string;
    worker_name?: string;
    village?: string;
    timestamp: string;
    traffic_light: 'GREEN' | 'YELLOW' | 'RED';
    ml_triage: string;
    ml_risk_score: number;
    safety_escalated: boolean;
    escalation_reasons: string[];
    action_headline: string;
    action_details: string;
    bmi: number;
    blood_glucose_level?: number | null;
    HbA1c_level?: number | null;
    lab_mode?: 'full_lab' | 'no_lab';
    model_mode_label?: string | null;
    recommended_followup?: string | null;
    is_offline_estimate?: boolean;
    systolic_bp?: number;
    diastolic_bp?: number;
    hypertension_flag: number;
    phq9_total: number;
    phq9_severity: string;
    phq9_crisis_flag: boolean;
    emergency_helpline_required: boolean;
    helplines: Array<{ name: string; number: string; hours?: string }>;
    explanations: PredictionResponse['explanations'];
    summary_en?: string;
    summary_hi?: string;
}

export interface PatientTimelineResponse {
    patient_id: string;
    patient_name?: string;
    visits: Array<{
        visit_id: string;
        timestamp: string;
        traffic_light: 'GREEN' | 'YELLOW' | 'RED';
        ml_risk_score: number;
        safety_escalated: boolean;
        escalation_reasons: string[];
        action_headline: string;
        blood_glucose_level: number;
        HbA1c_level: number;
        systolic_bp?: number;
        diastolic_bp?: number;
        phq9_total: number;
        phq9_severity: string;
        phq9_crisis_flag: boolean;
        village?: string;
    }>;
    total_visits: number;
    velocity: number;
    trend_status: string;
}

import { calculateOfflineRisk } from '../utils/offlineRiskCalculator';
import { saveVisitToIndexedDB } from '../utils/offlineSync';

export const submitScreeningVisit = async (visit: ScreeningVisitInput): Promise<ScreeningVisitResponse> => {
    // Assign a deterministic client visit_id upfront for idempotent online retries / offline sync
    const visitWithId: ScreeningVisitInput = {
        ...visit,
        visit_id: visit.visit_id || `vis_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    };
    try {
        const res = await apiClient.post<ScreeningVisitResponse>('/visit', visitWithId);
        return res.data;
    } catch (err: any) {
        // Never treat HTTP auth/validation errors (401, 403, 422) as offline!
        if (err?.response) {
            throw err;
        }
        console.warn("Backend unreachable; computing offline estimate and queuing to IndexedDB", err);
        const offlineResult = calculateOfflineRisk(visitWithId);
        await saveVisitToIndexedDB(visitWithId, offlineResult);
        return offlineResult;
    }
};

export const getPatientTimeline = async (patientId: string): Promise<PatientTimelineResponse> => {
    const res = await apiClient.get<PatientTimelineResponse>(`/patients/${patientId}/timeline`);
    return res.data;
};

export const predictRisk = async (data: PredictionInput): Promise<PredictionResponse> => {
    const predictionRes = await apiClient.post<{ risk_score: number; risk_level: string }>('/predict', data);

    let explanations: PredictionResponse['explanations'] = [];
    let summary_en: string | undefined;
    let summary_hi: string | undefined;
    try {
        const explainRes = await apiClient.post<{
            explanations: PredictionResponse['explanations'];
            summary_en?: string;
            summary_hi?: string;
        }>('/explain', data);
        explanations = explainRes.data.explanations;
        summary_en = explainRes.data.summary_en;
        summary_hi = explainRes.data.summary_hi;
    } catch (error) {
        console.warn("Could not fetch explanations:", error);
    }

    const shap_values: Record<string, number> = {};
    explanations?.forEach(exp => {
        shap_values[exp.feature] = exp.impact_score;
    });

    return {
        ...predictionRes.data,
        explanations,
        shap_values,
        summary_en,
        summary_hi
    };
};

export interface SimulationResponse {
    original_risk: number;
    new_risk: number;
    risk_reduction: number;
    modified_data?: Record<string, any>;
}

export const simulateRisk = async (
    patient: PredictionInput,
    modifications: Record<string, any>
): Promise<SimulationResponse> => {
    const response = await apiClient.post<SimulationResponse>('/simulate', {
        patient,
        modifications
    });
    return response.data;
};

export interface ReportResponse {
    report: string;
    pdf_url?: string;
}

export const generateReport = async (patient: PredictionInput): Promise<ReportResponse> => {
    const response = await apiClient.post<ReportResponse>('/report', patient);
    return response.data;
};

export const streamReport = async (
    patient: PredictionInput & {
        risk_score?: number;
        risk_level?: string;
        explanations?: Array<{ feature: string; impact_score: number; impact_description: string; }>;
    },
    onChunk: (text: string) => void,
    onRisk: (data: { risk_score: number; risk_level: string }) => void,
    onPdf: (url: string) => void
): Promise<void> => {
    const token = localStorage.getItem('authToken');

    // We need to use fetch directly for streaming, so we manually add the header
    const response = await fetch(`${API_BASE_URL}/report/stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(patient),
    });

    if (response.status === 401) {
        handleUnauthorized();
        return;
    }
    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
            const lines = block.split('\n');
            let eventType = 'message';
            let data = '';

            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    eventType = line.replace('event: ', '').trim();
                } else if (line.startsWith('data: ')) {
                    data = line.replace('data: ', '');
                }
            }

            if (!data) continue;

            if (eventType === 'risk') {
                onRisk(JSON.parse(data));
            } else if (eventType === 'pdf') {
                onPdf(JSON.parse(data).pdf_url);
            } else if (eventType === 'done') {
                // Stream finished
            } else {
                onChunk(data);
            }
        }
    }
};

export const generateSimulationReport = async (
    patient: PredictionInput,
    modifications: Record<string, any>
): Promise<ReportResponse> => {
    const response = await apiClient.post<ReportResponse>('/simulate/report', {
        patient,
        modifications
    });
    return response.data;
};

// --- New Feature Interfaces ---

export interface CohortAnalysis {
    percentiles: Record<string, number>;
}

export interface DigitalTwin {
    gender: string;
    age: number;
    bmi: number;
    HbA1c_level: number;
    blood_glucose_level: number;
    diabetes: number;
}

export const getCohortAnalysis = async (patient: PredictionInput): Promise<CohortAnalysis> => {
    const response = await apiClient.post<CohortAnalysis>('/cohort/analysis', patient);
    return response.data;
};

export const getDigitalTwins = async (patient: PredictionInput): Promise<DigitalTwin[]> => {
    const response = await apiClient.post<{ twins: DigitalTwin[] }>('/cohort/twins', patient);
    return response.data.twins;
};

export interface HistoryRecord {
    timestamp: string;
    patient_data: PredictionInput;
    risk_assessment: {
        score: number;
        level: string;
    };
    clinician?: {
        id: string;
        name: string;
    };
}

export interface HistoryResponse {
    history: HistoryRecord[];
    trend_analysis?: {
        velocity: number;
        status: string;
    };
}

export const getHistory = async (limit: number = 10): Promise<HistoryResponse> => {
    // Determine if the backend returns List or Dict (Velocity update changed it to Dict)
    // We handle the update.
    const response = await apiClient.get<HistoryResponse | HistoryRecord[]>('/history', { params: { limit } });

    // Normalize response if backend is still old version (just in case, though we updated it)
    if (Array.isArray(response.data)) {
        return { history: response.data };
    }
    return response.data;
};

export const submitFeedback = async (
    patient: PredictionInput,
    predicted_risk: number,
    agreed: boolean,
    notes: string,
    actual_diagnosis?: number
): Promise<void> => {
    await apiClient.post('/feedback/', {
        patient_data: patient,
        predicted_risk,
        agreed,
        clinician_notes: notes,
        actual_diagnosis
    });
};

export const getFHIRBundle = async (patient: PredictionInput): Promise<any> => {
    const response = await apiClient.post('/fhir/bundle', patient);
    return response.data;
};

export interface AuditEventRecord {
    id: number;
    timestamp: string;
    actor_email: string;
    actor_role: string;
    action: string;
    resource: string;
    outcome: string;
    details: Record<string, any>;
}

export interface AuditLogResponse {
    events: AuditEventRecord[];
    total: number;
    requested_by: string;
}

export const getAuditLogs = async (limit: number = 100): Promise<AuditLogResponse> => {
    const response = await apiClient.get<AuditLogResponse>('/audit', { params: { limit } });
    return response.data;
};
