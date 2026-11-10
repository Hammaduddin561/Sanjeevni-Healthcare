import React, { useState } from 'react';
import TrendAnalysis from '../TrendAnalysis';
import CohortCard from '../CohortCard';
import SectionCard from '../ui/SectionCard';
import { type PredictionResponse, type PredictionInput, streamReport, getFHIRBundle } from '../../api/client';
import { FileText, Cpu, Loader2, Download, Code, Share2, XCircle } from 'lucide-react';

interface AnalysisRailProps {
    prediction: PredictionResponse;
    patientInput: PredictionInput;
}

const AnalysisRail: React.FC<AnalysisRailProps> = ({ prediction: _prediction, patientInput }) => {
    const [report, setReport] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [fhirVisible, setFhirVisible] = useState(false);
    const [fhirBundle, setFhirBundle] = useState<any>(null);

    // Auto-generate report when prediction is available
    React.useEffect(() => {
        if (_prediction) {
            handleGenerateReport();
        }
    }, [_prediction]);

    const handleGenerateReport = async () => {
        setLoadingReport(true);
        setReport("");
        try {
            await streamReport(
                {
                    ...patientInput,
                    // Pass pre-calculated data
                    risk_score: _prediction.risk_score,
                    risk_level: _prediction.risk_level,
                    explanations: _prediction.explanations
                },
                (chunk: string) => {
                    setLoadingReport(false);
                    setReport(prev => (prev || "") + chunk);
                },
                (_riskData: { risk_score: number; risk_level: string }) => {
                    // Update risk data if needed
                },
                (url: string) => {
                    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
                    setPdfUrl(`${baseUrl}${url}`);
                }
            );
        } catch (error) {
            console.error("Failed to generate report:", error);
            setReport("Error: Could not generate report.");
            setLoadingReport(false);
        }
    };

    const handleDownloadFHIR = async () => {
        const bundle = await getFHIRBundle(patientInput);
        setFhirBundle(bundle);
        setFhirVisible(true);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">

            {/* 1. Longitudinal Trends */}
            <SectionCard
                title="Trends"
                subtitle="Risk Velocity"
                className="shadow-glass dark:shadow-glass-dark"
                action={
                    <button
                        onClick={handleDownloadFHIR}
                        className="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                        title="View FHIR Record"
                    >
                        <Code size={14} />
                    </button>
                }
            >
                {/* Compact Trend Analysis if possible, otherwise standard */}
                <div className="h-[200px] overflow-hidden">
                    <TrendAnalysis />
                </div>
            </SectionCard>

            {/* 2. AI Clinical Summary */}
            <SectionCard
                title="AI Summary"
                subtitle="BioMistral-7B"
                className="flex-1 flex flex-col shadow-glass dark:shadow-glass-dark min-h-[400px]"
            >
                <div className="flex-grow flex flex-col h-full">
                    {loadingReport ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3 flex-grow">
                            <Loader2 className="animate-spin text-clinical-teal" size={32} />
                            <span className="text-xs font-medium uppercase tracking-widest text-center px-4">Please wait. Summary and PDF report are being generated...</span>
                        </div>
                    ) : report ? (
                        <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs leading-6 text-slate-700 dark:text-slate-300 font-medium overflow-y-auto flex-grow shadow-inner custom-scrollbar relative">
                            {report}
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col justify-center items-center text-center p-6 text-slate-400">
                            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 inner-shadow">
                                <Cpu size={20} className="text-slate-300" />
                            </div>
                            <p className="text-xs font-medium">Generate AI clinical report.</p>
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                        <button
                            onClick={handleGenerateReport}
                            disabled={loadingReport}
                            className="w-full relative overflow-hidden group flex items-center justify-center space-x-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl transition-all disabled:opacity-50 text-xs font-bold uppercase tracking-wider shadow-lg transform active:scale-[0.98]"
                        >
                            {loadingReport ? <Loader2 className="animate-spin" size={14} /> : <FileText size={14} />}
                            <span>{report ? 'Regenerate' : 'Generate Report'}</span>
                        </button>

                        {pdfUrl && (
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-wider shadow-sm"
                            >
                                <Download size={12} />
                                <span>PDF Download</span>
                            </a>
                        )}
                    </div>
                </div>
            </SectionCard>

            {/* 3. Cohort Analysis */}
            <SectionCard title="Cohort" subtitle="Population Twins" className="shadow-glass dark:shadow-glass-dark">
                <div className="h-[250px] overflow-hidden relative">
                    {/* Scale down CohortCard slightly to fit column */}
                    <CohortCard patientData={patientInput} />
                </div>
            </SectionCard>

            {/* FHIR Modal (Local to Rail now) */}
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

export default AnalysisRail;
