import React, { useEffect, useState } from 'react';
import SectionCard from './ui/SectionCard';
import { getHistory, type HistoryRecord } from '../api/client';
import { FileText, Loader2, Clock, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';

const AuditLog: React.FC = () => {
    const [logs, setLogs] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const data = await getHistory(50); // Fetch last 50 records
                setLogs(data.history || []); // Handle response structure
            } catch (err) {
                console.error(err);
                setError("Failed to load audit logs.");
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const getRiskBadge = (score: number) => {
        if (score < 0.3) return <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold"><ShieldCheck size={14} /> Low</span>;
        if (score < 0.7) return <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold"><Activity size={14} /> Moderate</span>;
        return <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold"><AlertTriangle size={14} /> High</span>;
    };

    return (
        <SectionCard
            title="Admin Audit Log"
            subtitle="Recent clinical risk assessments and system activity."
            className="shadow-glass dark:shadow-glass-dark min-h-[500px]"
        >
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                        <Loader2 size={32} className="animate-spin mb-3 text-clinical-teal" />
                        <span className="text-xs font-bold uppercase tracking-widest">Loading Logs...</span>
                    </div>
                ) : error ? (
                    <div className="p-10 text-center text-clinical-coral font-medium">
                        {error}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-20 text-center text-slate-400">
                        No logs found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Timestamp</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Clinician</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Patient ID / Profile</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Risk Assessment</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Score</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {logs.map((log, index) => (
                                    <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-slate-400" />
                                                {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-slate-800 dark:text-slate-200 font-medium">{log.clinician?.name || 'Unknown'}</span>
                                                <span className="text-xs text-slate-400">{log.clinician?.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-slate-800 dark:text-white">
                                                    {log.patient_data.age} yrs, {log.patient_data.gender}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    BMI: {log.patient_data.bmi} | HbA1c: {log.patient_data.HbA1c_level}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getRiskBadge(log.risk_assessment.score)}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                                            {(log.risk_assessment.score * 100).toFixed(1)}%
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-blue-500 hover:text-blue-700 text-xs font-bold uppercase tracking-wide flex items-center justify-end gap-1 ml-auto">
                                                <FileText size={14} /> Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </SectionCard>
    );
};

export default AuditLog;
