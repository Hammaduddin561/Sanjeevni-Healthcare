import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import RiskGauge from './RiskGauge';
import ShapExplainer from './ShapExplainer';
import SimulationDashboard from './SimulationDashboard';
import CohortCard from './CohortCard';
import TrendAnalysis from './TrendAnalysis';
import { type PredictionResponse, type PredictionInput, streamReport, submitFeedback, getFHIRBundle } from '../api/client';
import { FileText, Cpu, Loader2, Download, Code, CheckCircle, XCircle, Share2, AlertTriangle, ShieldCheck } from 'lucide-react';
import SectionCard from './ui/SectionCard';

interface ClinicianDashboardProps {
    prediction: PredictionResponse;
    patientInput: PredictionInput;
    onReset: () => void;
    user: { name: string; email: string };
}

const ClinicianDashboard: React.FC<ClinicianDashboardProps> = ({ prediction, patientInput, user }) => {
    const [report, setReport] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'submitted'>('idle');
    const [fhirVisible, setFhirVisible] = useState(false);
    const [fhirBundle, setFhirBundle] = useState<any>(null);

    // Auto-generate report when prediction is available
    React.useEffect(() => {
        if (prediction) {
            handleGenerateReport();
        }
    }, [prediction]);

    const handleGenerateReport = async () => {
        setLoadingReport(true);
        setReport(""); // Clear previous report
        try {
            // Using streaming API
            await streamReport(
                {
                    ...patientInput,
                    patient_name: user?.name || "Patient",
                    // Pass pre-calculated data to skip backend recalculation (faster!)
                    risk_score: prediction.risk_score,
                    risk_level: prediction.risk_level,
                    explanations: prediction.explanations
                },
                (chunk: string) => {
                    setLoadingReport(false); // Stop loading spinner as soon as first chunk arrives
                    setReport(prev => (prev || "") + chunk);
                },
                (riskData: { risk_score: number; risk_level: string }) => {
                    // Optional: Update risk score if it was recalculated.
                    console.debug("Streamed risk data:", riskData);
                    // UX: Show immediate feedback to user so they know it's working
                    setReport(prev => prev || "AI is analyzing clinical patterns...");
                },
                (url: string) => {
                    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
                    setPdfUrl(`${baseUrl}${url}`);
                }
            );
        } catch (error) {
            console.error("Failed to generate report:", error);
            setReport("Error: Could not generate report.");
        } finally {
            setLoadingReport(false);
        }
    };

    const handleFeedback = async (agreed: boolean) => {
        try {
            await submitFeedback(patientInput, prediction.risk_score, agreed, "Quick feedback from dashboard");
            setFeedbackStatus('submitted');
        } catch (e) {
            console.error("Feedback failed", e);
        }
    };

    const handleDownloadFHIR = async () => {
        const bundle = await getFHIRBundle(patientInput);
        setFhirBundle(bundle);
        setFhirVisible(true);
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
    }

    return (
        <div className="space-y-6 pb-20 animate-in slide-in-from-bottom-4 duration-500">

            {/* 1. Risk Summary Section (Bento Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Main Risk Gauge Card (Span 5) */}
                <SectionCard
                    title="Real-time Risk Profile"
                    subtitle="Ensemble model prediction."
                    className="md:col-span-5 relative overflow-hidden shadow-glass dark:shadow-glass-dark"
                    action={
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${getRiskColor(prediction.risk_score)}`}>
                            {prediction.risk_score < 0.3 ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
                            {getRiskLabel(prediction.risk_score)}
                        </span>
                    }
                >
                    <div className="flex flex-col items-center justify-center p-4">
                        <RiskGauge riskScore={prediction.risk_score} />

                        {/* Validation Widget */}
                        <div className="mt-8 w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm transition-all hover:shadow-md">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clinician Validation</span>
                                <span className="text-[10px] text-slate-400">Agree with AI Assessment?</span>
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
                                        <CheckCircle size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleFeedback(false)}
                                        className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-all transform active:scale-95"
                                        title="Disagree"
                                    >
                                        <XCircle size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </SectionCard>

                {/* Longitudinal Trends (Span 7) */}
                <SectionCard
                    title="Longitudinal Velocity"
                    subtitle="Historical risk trajectory analysis."
                    className="md:col-span-7 shadow-glass dark:shadow-glass-dark"
                    action={
                        <button
                            onClick={handleDownloadFHIR}
                            className="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-2 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                            title="View FHIR Record"
                        >
                            <Code size={16} />
                        </button>
                    }
                >
                    <TrendAnalysis />
                </SectionCard>
            </div>

            {/* 2. Population & AI Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Cohort Analysis (Span 7) */}
                <div className="lg:col-span-7 h-full">
                    <SectionCard title="Cohort Intelligence" subtitle="Population comparison and nearest-neighbor Digital Twins." className="h-full shadow-glass dark:shadow-glass-dark">
                        <CohortCard patientData={patientInput} />
                    </SectionCard>
                </div>

                {/* AI Summary (Span 5) */}
                <div className="lg:col-span-5 flex flex-col h-full">
                    <SectionCard
                        title="AI Clinical Summary"
                        subtitle="Generated by BioMistral-7B."
                        className="flex-1 flex flex-col shadow-glass dark:shadow-glass-dark"
                    >
                        <div className="flex-grow flex flex-col min-h-[300px]">
                            {loadingReport ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3 flex-grow">
                                    <Loader2 className="animate-spin text-clinical-teal" size={32} />
                                    <span className="text-xs font-medium uppercase tracking-widest text-center px-4">Please wait. Summary and PDF report are being generated...</span>
                                </div>
                            ) : report ? (
                                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm leading-7 text-slate-700 dark:text-slate-300 font-medium overflow-y-auto max-h-[300px] shadow-inner custom-scrollbar prose dark:prose-invert max-w-none">
                                    <ReactMarkdown>{report}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="flex-grow flex flex-col justify-center items-center text-center p-6 text-slate-400">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 inner-shadow">
                                        <Cpu size={28} className="text-slate-300" />
                                    </div>
                                    <p className="text-sm font-medium">Generate a report to view AI insights.</p>
                                </div>
                            )}

                            <div className="mt-auto pt-6 flex flex-col gap-3">
                                <button
                                    onClick={handleGenerateReport}
                                    disabled={loadingReport}
                                    className="w-full relative overflow-hidden group flex items-center justify-center space-x-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl transition-all disabled:opacity-50 text-xs font-bold uppercase tracking-wider shadow-lg transform active:scale-[0.98]"
                                >
                                    {loadingReport ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
                                    <span>{report ? 'Regenerate Analysis' : 'Generate Clinical Report'}</span>
                                </button>

                                {pdfUrl && (
                                    <a
                                        href={pdfUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors text-xs font-bold uppercase tracking-wider shadow-sm"
                                    >
                                        <Download size={16} />
                                        <span>Download PDF Report</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </SectionCard>
                </div>
            </div>

            {/* 3. Interactive Simulation */}
            <SectionCard title="Counterfactual Simulation" subtitle="What-If Analysis & Risk Projection" className="shadow-glass dark:shadow-glass-dark">
                <SimulationDashboard originalData={patientInput} />
            </SectionCard>

            {/* 4. Explainability Details */}
            <SectionCard title="Model Explainability" subtitle="SHAP Feature Importance Analysis" className="shadow-glass dark:shadow-glass-dark">
                <ShapExplainer explanations={prediction.explanations || []} />
            </SectionCard>

            {/* FHIR Modal Overlay */}
            {fhirVisible && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4" onClick={() => setFhirVisible(false)}>
                    <div className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 rounded-2xl shadow-2xl border border-white/20" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                                <Code className="text-clinical-teal" size={20} /> <span className="text-clinical-teal">FHIR</span> R4 Bundle
                            </h3>
                            <button onClick={() => setFhirVisible(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-0 overflow-auto bg-[#0d1117]">
                            <pre className="p-6 text-[10px] sm:text-xs font-mono text-emerald-400 leading-relaxed font-medium">
                                {JSON.stringify(fhirBundle, null, 2)}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-white/10 bg-white/50 dark:bg-slate-900/50 flex justify-end gap-3 backdrop-blur-md">
                            <button onClick={() => setFhirVisible(false)} className="px-5 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors">
                                Close
                            </button>
                            <button onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(fhirBundle, null, 2));
                                setFhirVisible(false);
                            }} className="px-5 py-2 bg-clinical-teal text-white text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-clinical-teal-dark transition-colors shadow-lg shadow-clinical-teal/20 flex items-center gap-2">
                                <Share2 size={14} />
                                Copy JSON
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClinicianDashboard;
