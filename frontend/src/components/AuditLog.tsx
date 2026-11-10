import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from './ui/SectionCard';
import { getAuditLogs, type AuditEventRecord } from '../api/client';
import { Loader2, Clock, ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

const AuditLog: React.FC = () => {
    const { t } = useTranslation();
    const [events, setEvents] = useState<AuditEventRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAuditLogs(100);
            setEvents(data.events || []);
        } catch (err: any) {
            console.error(err);
            const msg = err?.response?.status === 403
                ? t('auditLog.forbidden')
                : t('auditLog.error');
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getOutcomeBadge = (outcome: string) => {
        if (outcome === 'success') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <CheckCircle2 size={12} /> {t('auditLog.success')}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                <AlertTriangle size={12} /> {outcome}
            </span>
        );
    };

    return (
        <SectionCard
            title={t('auditLog.title')}
            subtitle={t('auditLog.subtitle')}
            className="shadow-glass dark:shadow-glass-dark min-h-[500px]"
        >
            <div className="flex justify-end mb-4">
                <button
                    onClick={fetchLogs}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    {t('auditLog.refresh')}
                </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                        <Loader2 size={32} className="animate-spin mb-3 text-clinical-teal" />
                        <span className="text-xs font-bold uppercase tracking-widest">{t('auditLog.loading')}</span>
                    </div>
                ) : error ? (
                    <div className="p-10 text-center text-clinical-coral font-medium">
                        {error}
                    </div>
                ) : events.length === 0 ? (
                    <div className="p-20 text-center text-slate-400">
                        {t('auditLog.empty')}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-xs">{t('auditLog.col_timestamp')}</th>
                                    <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-xs">{t('auditLog.col_actor')}</th>
                                    <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-xs">{t('auditLog.col_action')}</th>
                                    <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-xs">{t('auditLog.col_outcome')}</th>
                                    <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-xs">{t('auditLog.col_meta')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {events.map((ev) => (
                                    <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                                            <div className="flex items-center gap-2">
                                                <Clock size={13} className="text-slate-400" />
                                                {new Date(ev.timestamp).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-slate-800 dark:text-slate-200 font-semibold text-xs">{ev.actor_email}</span>
                                                <span className="text-[11px] uppercase tracking-wider text-clinical-teal font-bold">{ev.actor_role}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1 font-bold text-xs text-slate-800 dark:text-white">
                                                <ShieldCheck size={13} className="text-clinical-teal" /> {ev.action}
                                            </span>
                                            <span className="block text-[11px] text-slate-400 font-mono">{ev.resource}</span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            {getOutcomeBadge(ev.outcome)}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                                            {Object.keys(ev.details || {}).length > 0 ? JSON.stringify(ev.details) : '—'}
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
