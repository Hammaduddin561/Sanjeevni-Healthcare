import React, { useState } from 'react';
import RiskGauge from '../RiskGauge';
import ShapExplainer from '../ShapExplainer';
import DigitalTwinModel from '../DigitalTwinModel';
import SectionCard from '../ui/SectionCard';
import SimulationDashboard from '../SimulationDashboard';
import { type PredictionResponse, type PredictionInput, submitFeedback } from '../../api/client';
import { CheckCircle, XCircle, ShieldCheck, AlertTriangle, Brain } from 'lucide-react';

interface CentralHubProps {
    prediction: PredictionResponse;
    patientInput: PredictionInput;
}

const CentralHub: React.FC<CentralHubProps> = ({ prediction, patientInput }) => {
    const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'submitted'>('idle');

    const handleFeedback = async (agreed: boolean) => {
        try {
            await submitFeedback(patientInput, prediction.risk_score, agreed, "Quick feedback from dashboard");
            setFeedbackStatus('submitted');
        } catch (e) {
            console.error("Feedback failed", e);
        }
    };

    // Determine risk color for badges
    const getRiskColor = (score: number) => {
        if (score < 0.3) return 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50 ring-1 ring-emerald-500/20';
        if (score < 0.7) return 'bg-amber-500/10 text-amber-600 border-amber-200/50 ring-1 ring-amber-500/20';
        return 'bg-rose-500/10 text-rose-600 border-rose-200/50 ring-1 ring-rose-500/20';
    };

    const getRiskLabel = (score: number) => {
        if (score < 0.3) return 'Low Risk';
        if (score < 0.7) return 'Moderate Risk';
        return 'High Risk';
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* 1. Hero Section: Digital Twin + Risk Gauge */}
            <div className="relative min-h-[500px] flex-1 flex flex-col gap-6">

                {/* 3D Digital Twin (Hero) */}
                <div className="relative h-[350px] w-full rounded-3xl overflow-hidden glass-panel border border-white/20 dark:border-white/10 shadow-glass-lg group">
                    <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-100/50 to-slate-200/50 dark:from-slate-900/50 dark:to-slate-950/50">
                        <DigitalTwinModel />
                    </div>

                    {/* Overlay Stats */}
                    <div className="absolute top-4 left-4 z-10">
                        <div className={`px-4 py-2 rounded-xl backdrop-blur-md flex items-center gap-2 ${getRiskColor(prediction.risk_score)}`}>
                            {prediction.risk_score < 0.3 ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
                            <span className="text-xs font-black uppercase tracking-widest">{getRiskLabel(prediction.risk_score)}</span>
                        </div>
                    </div>

                    <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end">
                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 text-slate-600 dark:text-slate-300">
                            <Brain size={24} className="text-clinical-teal" />
                            <div className="text-[10px] font-bold uppercase mt-1">BioMistral-7B</div>
                            <div className="text-[8px] opacity-70">Active</div>
                        </div>
                    </div>
                </div>

                {/* Risk Gauge & Feedback Control */}
                <SectionCard
                    title="Risk Analysis"
                    subtitle="Ensemble Model Confidence"
                    className="shadow-glass dark:shadow-glass-dark"
                >
                    <div className="flex flex-col items-center justify-center p-4">
                        <RiskGauge riskScore={prediction.risk_score} />

                        {/* Validation Widget */}
                        <div className="mt-6 w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm transition-all hover:shadow-md">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clinician Validation</span>
                                <span className="text-[10px] text-slate-400">Agree with AI?</span>
                            </div>

                            {feedbackStatus === 'submitted' ? (
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1.5 text-xs font-bold border border-emerald-100">
                                    <CheckCircle size={14} /> VERIFIED
                                </span>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleFeedback(true)}
                                        className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-all transform active:scale-95"
                                        title="Agree"
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleFeedback(false)}
                                        className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-all transform active:scale-95"
                                        title="Disagree"
                                    >
                                        <XCircle size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* 2. Simulation (Counterfactuals) */}
            <SectionCard title="Simulation" subtitle="What-If Analysis" className="shadow-glass dark:shadow-glass-dark">
                <SimulationDashboard originalData={patientInput} />
            </SectionCard>

            {/* 3. SHAP Explainability */}
            <SectionCard title="Explainability" subtitle="Global Feature Importance" className="shadow-glass dark:shadow-glass-dark">
                <ShapExplainer explanations={prediction.explanations || []} />
            </SectionCard>
        </div>
    );
};

export default CentralHub;
