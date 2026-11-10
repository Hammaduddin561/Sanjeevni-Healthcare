import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getPatientTimeline, type PatientTimelineResponse } from '../api/client';
import { History, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PatientTimelineProps {
    patientId: string;
}

export const PatientTimeline: React.FC<PatientTimelineProps> = ({ patientId }) => {
    const [timeline, setTimeline] = useState<PatientTimelineResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!patientId) return;
        setLoading(true);
        getPatientTimeline(patientId)
            .then(data => setTimeline(data))
            .catch(err => console.error("Failed loading timeline:", err))
            .finally(() => setLoading(false));
    }, [patientId]);

    if (loading) {
        return (
            <div className="p-8 text-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clinical-teal mx-auto mb-2"></div>
                <span className="text-xs">Loading longitudinal patient history...</span>
            </div>
        );
    }

    if (!timeline || timeline.visits.length === 0) {
        return (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400">
                <History size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold">First recorded visit for patient {patientId}.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Subsequent visits will display trajectory & risk velocity curves.</p>
            </div>
        );
    }

    const chartData = timeline.visits.map((v, i) => ({
        index: i + 1,
        date: new Date(v.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        risk: Number((v.ml_risk_score * 100).toFixed(1)),
        triage: v.traffic_light,
        glucose: v.blood_glucose_level,
        phq9: v.phq9_total
    }));

    const isRising = timeline.velocity > 0.01;
    const isFalling = timeline.velocity < -0.01;

    return (
        <div className="glass-panel p-6 rounded-3xl space-y-6 border border-white/20 dark:border-white/5 shadow-glass">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <History className="text-clinical-teal" size={18} />
                        Longitudinal Risk Timeline: {timeline.patient_name || timeline.patient_id}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {timeline.total_visits} recorded screening visits across community health rounds.
                    </p>
                </div>

                {/* Velocity Badge */}
                <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${isRising
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-700 dark:text-rose-300'
                    : isFalling
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'
                }`}>
                    {isRising ? <TrendingUp size={15} /> : isFalling ? <TrendingDown size={15} /> : <Minus size={15} />}
                    <span>{timeline.trend_status}</span>
                </div>
            </div>

            {/* Risk Area Chart */}
            <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="timelineRiskGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} unit="%" tickLine={false} axisLine={false} />
                        <ReferenceLine y={65} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'RED >65%', fill: '#f43f5e', fontSize: 10 }} />
                        <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'YELLOW >35%', fill: '#f59e0b', fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#f8fafc',
                                fontSize: '11px'
                            }}
                            formatter={(val: any, _name: any, props: any) => [
                                `${val}% (Triage: ${props.payload.triage}) | Glucose: ${props.payload.glucose} mg/dL | PHQ-9: ${props.payload.phq9}`,
                                'Risk Score'
                            ]}
                        />
                        <Area
                            type="monotone"
                            dataKey="risk"
                            stroke="#0d9488"
                            strokeWidth={3}
                            fill="url(#timelineRiskGradient)"
                            dot={{ fill: '#0d9488', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Visit Log Cards */}
            <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Historical Encounters
                </span>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                    {timeline.visits.slice().reverse().map((v, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                                <span className={`w-3 h-3 rounded-full shrink-0 ${v.traffic_light === 'RED'
                                    ? 'bg-rose-500'
                                    : v.traffic_light === 'YELLOW'
                                        ? 'bg-amber-400'
                                        : 'bg-emerald-500'
                                }`} />
                                <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                        {new Date(v.timestamp).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="text-[11px] text-slate-400">{v.village || 'Community Visit'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                        {(v.ml_risk_score * 100).toFixed(0)}% Risk
                                    </span>
                                    <span className="block text-[10px] text-slate-400">
                                        Glu: {v.blood_glucose_level} | PHQ: {v.phq9_total}
                                    </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.traffic_light === 'RED'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                    : v.traffic_light === 'YELLOW'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}>
                                    {v.traffic_light}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PatientTimeline;
