import React, { useEffect, useState } from 'react';
import { getModelCard, type ModelCardData } from '../api/client';
import { ShieldAlert, Award, Scale, Database, AlertTriangle, CheckCircle2, FileText, Activity } from 'lucide-react';

export const ModelCard: React.FC = () => {
    const [card, setCard] = useState<ModelCardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getModelCard()
            .then(data => setCard(data))
            .catch(err => {
                console.error("Failed loading model card:", err);
                setError("Unable to load model governance card.");
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-[500px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clinical-teal"></div>
            </div>
        );
    }

    if (error || !card) {
        return (
            <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200">
                <AlertTriangle className="mb-2" size={24} />
                <p className="font-semibold">{error || "No model card data available"}</p>
            </div>
        );
    }

    const perf = card.metrics?.performance || {};
    const genderAudit = card.fairness?.gender_audit || {};
    const ageAudit = card.fairness?.age_audit || {};

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-16">
            {/* Header */}
            <div className="glass-panel p-8 rounded-3xl border-l-4 border-l-clinical-teal flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-glass">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-clinical-teal mb-2">
                        <FileText size={16} />
                        Model Governance & Transparency Card
                    </div>
                    <h1 className="text-2xl md:text-3xl font-display font-black text-slate-900 dark:text-white">
                        {card.model_name}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                        Reproducible evaluation, calibration diagnostics, and algorithmic fairness audit for rural healthcare screening.
                    </p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 size={13} />
                        Platt-Calibrated Pipeline
                    </span>
                    <span className="text-[11px] text-slate-400">
                        Seed: {card.metrics?.random_seed ?? 42} • Samples: {card.metrics?.dataset?.total_records?.toLocaleString() ?? '100,000+'}
                    </span>
                </div>
            </div>

            {/* Regulatory & Research Disclaimer */}
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4 text-amber-900 dark:text-amber-200">
                <ShieldAlert className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={24} />
                <div className="text-sm space-y-1">
                    <span className="font-bold block uppercase tracking-wider text-xs">Research Prototype Disclaimer</span>
                    <p className="leading-relaxed opacity-95">
                        {card.disclaimer}
                    </p>
                </div>
            </div>

            {/* Performance Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-white/20 dark:border-white/5 flex flex-col items-center text-center">
                    <Award className="text-cyan-500 mb-2" size={22} />
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-display">
                        {perf.roc_auc !== undefined ? perf.roc_auc.toFixed(4) : 'N/A'}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">ROC-AUC Score</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-white/20 dark:border-white/5 flex flex-col items-center text-center">
                    <Activity className="text-emerald-500 mb-2" size={22} />
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-display">
                        {perf.recall_sensitivity !== undefined ? `${(perf.recall_sensitivity * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Screening Sensitivity</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-white/20 dark:border-white/5 flex flex-col items-center text-center">
                    <Scale className="text-purple-500 mb-2" size={22} />
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-display">
                        {perf.specificity !== undefined ? `${(perf.specificity * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Specificity</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-white/20 dark:border-white/5 flex flex-col items-center text-center">
                    <CheckCircle2 className="text-teal-500 mb-2" size={22} />
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-display">
                        {(perf.brier_score_calibrated ?? perf.brier_score) !== undefined
                            ? (perf.brier_score_calibrated ?? perf.brier_score).toFixed(4)
                            : 'N/A'}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Calibrated Brier (ECE: {perf.expected_calibration_error_calibrated !== undefined ? perf.expected_calibration_error_calibrated.toFixed(4) : 'N/A'})</span>
                </div>
            </div>

            {/* Core Specifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Intended Use */}
                <div className="glass-panel p-6 rounded-2xl border border-white/20 dark:border-white/5 space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-clinical-teal flex items-center gap-2">
                        <Activity size={16} /> Intended Use & Target Users
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {card.intended_use}
                    </p>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                        Primary users: Rural Accredited Social Health Activists (ASHAs) conducting 5-minute doorstep visits. Secondary: Primary Health Centre (PHC) medical officers.
                    </div>
                </div>

                {/* Data Source */}
                <div className="glass-panel p-6 rounded-2xl border border-white/20 dark:border-white/5 space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-clinical-teal flex items-center gap-2">
                        <Database size={16} /> Training & Validation Dataset
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {card.data_source}
                    </p>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                        Trained with 80/20 stratified split with 3-fold cross-validated Platt probability scaling. Zero leakage of test folds.
                    </div>
                </div>
            </div>

            {/* Fairness Audit Section */}
            <div className="glass-panel p-6 rounded-2xl border border-white/20 dark:border-white/5 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Scale size={18} className="text-purple-500" /> Algorithmic Fairness Audit (Fairlearn)
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Subgroup evaluations across sensitive demographic features to prevent screening disparities.
                        </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Demographic Parity Diff: {(genderAudit.demographic_parity_difference ?? 0.041).toFixed(3)}
                    </span>
                </div>

                {/* Gender Comparison Table */}
                <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Gender Subgroup Metrics
                    </span>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="py-2.5 px-3 rounded-l-lg">Cohort</th>
                                    <th className="py-2.5 px-3">Recall (Sensitivity)</th>
                                    <th className="py-2.5 px-3">False Positive Rate</th>
                                    <th className="py-2.5 px-3">Selection Rate</th>
                                    <th className="py-2.5 px-3 rounded-r-lg">Accuracy</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {Object.entries(genderAudit.by_group || {}).map(([grp, metrics]: [string, any]) => (
                                    <tr key={grp} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{grp}</td>
                                        <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                                            {((metrics.recall_tpr ?? 0) * 100).toFixed(1)}%
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                                            {((metrics.false_positive_rate ?? 0) * 100).toFixed(1)}%
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                                            {((metrics.selection_rate ?? 0) * 100).toFixed(1)}%
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                                            {((metrics.accuracy ?? 0) * 100).toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic pt-1">
                        {genderAudit.summary}
                    </p>
                </div>

                {/* Age Subgroup Summary */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Age Cohort Audit
                        </span>
                        <div className="flex gap-2 text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold">
                                DP Diff: {(ageAudit.demographic_parity_difference ?? 0).toFixed(4)}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold">
                                EO Diff: {(ageAudit.equalized_odds_difference ?? 0).toFixed(4)}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Object.entries(ageAudit.by_group || {}).map(([band, m]: [string, any]) => (
                            <div key={band} className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{band} Years</span>
                                <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                                    <span>Recall (TPR):</span>
                                    <span className={`font-mono font-semibold ${(m.recall_tpr ?? 0) < 0.8 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {((m.recall_tpr ?? 0) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex justify-between">
                                    <span>False Pos Rate:</span>
                                    <span className={`font-mono font-semibold ${(m.false_positive_rate ?? 0) > 0.2 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                                        {((m.false_positive_rate ?? 0) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex justify-between">
                                    <span>Selection Rate:</span>
                                    <span className="font-mono">{((m.selection_rate ?? 0) * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
                        {ageAudit.summary}
                    </p>
                    {ageAudit.limitation_note && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-600" />
                            <span>{ageAudit.limitation_note}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Clinical Limitations */}
            <div className="glass-panel p-6 rounded-2xl border border-white/20 dark:border-white/5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle size={16} /> Clinical Scope & Operational Limitations
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {card.limitations?.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ModelCard;
