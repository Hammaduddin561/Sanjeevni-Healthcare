import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Auth Interceptor ---
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// --- Auth Types & Functions ---

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user_name: string;
    user_email: string;
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
    HbA1c_level: number;
    blood_glucose_level: number;
    clinician_id?: string;
    clinician_name?: string;
    patient_name?: string;
}

export interface PredictionResponse {
    risk_score: number;
    risk_level: string;
    shap_values?: Record<string, number>;
    explanations?: Array<{
        feature: string;
        impact_score: number;
        impact_description: string;
    }>;
}

export const predictRisk = async (data: PredictionInput): Promise<PredictionResponse> => {
    const predictionRes = await apiClient.post<{ risk_score: number; risk_level: string }>('/predict', data);

    let explanations: PredictionResponse['explanations'] = [];
    try {
        const explainRes = await apiClient.post<{ explanations: PredictionResponse['explanations'] }>('/explain', data);
        explanations = explainRes.data.explanations;
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
        shap_values
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
