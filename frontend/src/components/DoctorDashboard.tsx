import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users, AlertTriangle, AlertCircle, CheckCircle2, MapPin,
  Filter, Search, FileText, ChevronRight, X,
  Share2, ArrowUpDown, RefreshCw, Stethoscope
} from 'lucide-react';
import PatientTimeline from './PatientTimeline';
import { getFHIRBundle, apiClient } from '../api/client';

interface VisitRecord {
  id: string;
  visit_id: string;
  patient_id: string;
  patient_name: string;
  worker_id: string;
  worker_name?: string;
  village: string;
  timestamp: string;
  traffic_light: 'GREEN' | 'YELLOW' | 'RED';
  ml_risk_score: number;
  safety_escalated: boolean;
  escalation_reasons?: string[];
  action_headline?: string;
  action_details?: string;
  bmi: number;
  blood_glucose_level: number;
  HbA1c_level: number;
  systolic_bp: number;
  diastolic_bp: number;
  phq9_total: number;
  phq9_severity: string;
  phq9_crisis_flag: boolean;
  notes?: string;
}

export const DoctorDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVillage, setSelectedVillage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null);
  const [fhirData, setFhirData] = useState<any>(null);
  const [loadingFhir, setLoadingFhir] = useState(false);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/visits');
      setVisits(res.data.visits || []);
    } catch (err) {
      console.error('Failed fetching visits queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  // Compute village list
  const villages = Array.from(new Set(visits.map(v => v.village || 'Rampur Sub-Centre'))).filter(Boolean);

  // Compute counts
  const totalCount = visits.length;
  const redCount = visits.filter(v => v.traffic_light === 'RED').length;
  const yellowCount = visits.filter(v => v.traffic_light === 'YELLOW').length;
  const greenCount = visits.filter(v => v.traffic_light === 'GREEN').length;

  // Filter visits
  const filteredVisits = visits.filter(v => {
    const matchesVillage = selectedVillage === 'all' || v.village === selectedVillage;
    const matchesSearch = !searchQuery.trim() ||
      v.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.patient_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesVillage && matchesSearch;
  });

  const handleOpenPatient = async (visit: VisitRecord) => {
    setSelectedVisit(visit);
    setFhirData(null);
  };

  const handleFetchFHIR = async (visit: VisitRecord) => {
    setLoadingFhir(true);
    try {
      const bundle = await getFHIRBundle({
        age: 45,
        gender: 'Female',
        bmi: visit.bmi,
        HbA1c_level: visit.HbA1c_level,
        blood_glucose_level: visit.blood_glucose_level,
        hypertension: visit.systolic_bp >= 140 ? 1 : 0,
        heart_disease: 0,
        smoking_history: 'never',
        systolic_bp: visit.systolic_bp,
        diastolic_bp: visit.diastolic_bp,
        phq9_scores: [0, 0, 0, 0, 0, 0, 0, 0, 0]
      } as any);
      setFhirData(bundle);
    } catch (err) {
      console.error('FHIR export failed:', err);
    } finally {
      setLoadingFhir(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-clinical-teal flex items-center gap-1.5">
            <Stethoscope size={16} /> {t('doctor.portal_badge')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white mt-1">
            {t('doctor.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('doctor.subtitle')}
          </p>
        </div>

        <button
          onClick={fetchVisits}
          className="self-start sm:self-center px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{t('doctor.refresh')}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Screened */}
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-slate-500 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">{t('doctor.total')}</span>
            <Users size={18} />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{totalCount}</div>
          <span className="text-[11px] text-slate-400">{t('doctor.total_sub')}</span>
        </div>

        {/* RED Emergency */}
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-rose-500 bg-rose-50/40 dark:bg-rose-950/20 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-bold uppercase">{t('doctor.red_label')}</span>
            <AlertTriangle size={18} />
          </div>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{redCount}</div>
          <span className="text-[11px] text-rose-600/80 font-semibold">{t('doctor.red_sub')}</span>
        </div>

        {/* YELLOW Elevated */}
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-bold uppercase">{t('doctor.yellow_label')}</span>
            <AlertCircle size={18} />
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{yellowCount}</div>
          <span className="text-[11px] text-amber-600/80 font-semibold">{t('doctor.yellow_sub')}</span>
        </div>

        {/* GREEN Low Risk */}
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase">{t('doctor.green_label')}</span>
            <CheckCircle2 size={18} />
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{greenCount}</div>
          <span className="text-[11px] text-emerald-600/80 font-semibold">{t('doctor.green_sub')}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('doctor.filter_village')}</span>
          <select
            value={selectedVillage}
            onChange={e => setSelectedVillage(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="all">{t('doctor.all_villages')}</option>
            {villages.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={t('doctor.search_placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 outline-none"
          />
        </div>
      </div>

      {/* Priority Patient Queue Table */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-200/60 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 dark:text-white">{t('doctor.roster_title')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
              {t('doctor.showing')} {filteredVisits.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ArrowUpDown size={12} /> {t('doctor.sorted_note')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">{t('doctor.col_triage')}</th>
                <th className="py-3 px-4">{t('doctor.col_patient')}</th>
                <th className="py-3 px-4">{t('doctor.col_village')}</th>
                <th className="py-3 px-4">{t('doctor.col_bp')}</th>
                <th className="py-3 px-4">{t('doctor.col_glucose')}</th>
                <th className="py-3 px-4">{t('doctor.col_phq9')}</th>
                <th className="py-3 px-4">{t('doctor.col_worker')}</th>
                <th className="py-3 px-4 text-right">{t('doctor.col_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {t('doctor.empty')}
                  </td>
                </tr>
              ) : (
                filteredVisits.map(v => (
                  <tr
                    key={v.visit_id || v.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      v.traffic_light === 'RED' ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    {/* Triage Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${
                        v.traffic_light === 'RED'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : v.traffic_light === 'YELLOW'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {v.traffic_light === 'RED' && <AlertTriangle size={11} />}
                        {v.traffic_light === 'YELLOW' && <AlertCircle size={11} />}
                        {v.traffic_light === 'GREEN' && <CheckCircle2 size={11} />}
                        {v.traffic_light}
                      </span>
                    </td>

                    {/* Patient */}
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>{v.patient_name || 'Community Patient'}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{v.patient_id}</span>
                    </td>

                    {/* Village */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        {v.village || 'Rampur'}
                      </span>
                    </td>

                    {/* BP */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`font-bold ${
                        (v.systolic_bp >= 140 || v.diastolic_bp >= 90) ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {v.systolic_bp}/{v.diastolic_bp} mmHg
                      </span>
                    </td>

                    {/* Glucose / HbA1c */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {v.blood_glucose_level} mg/dL
                      </div>
                      <span className="text-[10px] text-slate-400">HbA1c: {v.HbA1c_level}%</span>
                    </td>

                    {/* PHQ-9 */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`font-semibold ${v.phq9_crisis_flag ? 'text-rose-600 font-bold' : 'text-purple-600'}`}>
                        {v.phq9_total}/27
                      </span>
                      {v.phq9_crisis_flag && (
                        <span className="block text-[10px] text-rose-500 font-bold">⚠️ {t('doctor.distress_flag')}</span>
                      )}
                    </td>

                    {/* Worker */}
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {v.worker_name || v.worker_id || t('doctor.col_worker')}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenPatient(v)}
                        className="px-3 py-1.5 rounded-xl bg-clinical-teal hover:bg-clinical-teal-dark text-white font-bold text-xs inline-flex items-center gap-1 transition-colors"
                      >
                        <span>{t('doctor.review')}</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ONE-CLICK PATIENT SUMMARY MODAL */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                    selectedVisit.traffic_light === 'RED'
                      ? 'bg-rose-600 text-white'
                      : selectedVisit.traffic_light === 'YELLOW'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {selectedVisit.traffic_light}
                  </span>
                  <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                    {selectedVisit.patient_name || selectedVisit.patient_id}
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">({selectedVisit.patient_id})</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>{t('doctor.village_label')}: <strong>{selectedVisit.village}</strong></span> •
                  <span>{t('doctor.screened_by')}: <strong>{selectedVisit.worker_name || selectedVisit.worker_id}</strong></span> •
                  <span>{new Date(selectedVisit.timestamp).toLocaleDateString()}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedVisit(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Headline Action */}
            <div className={`p-4 rounded-2xl border ${
              selectedVisit.traffic_light === 'RED'
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                : selectedVisit.traffic_light === 'YELLOW'
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider block opacity-75">{t('doctor.triage_direction')}</span>
              <h3 className="text-base font-black mt-0.5">{selectedVisit.action_headline}</h3>
              <p className="text-xs mt-1 opacity-90 leading-relaxed">{selectedVisit.action_details}</p>
            </div>

            {/* Vital Signs Grid */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">{t('doctor.vitals_recorded')}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500 block">{t('doctor.col_bp')}</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedVisit.systolic_bp}/{selectedVisit.diastolic_bp}
                  </span>
                  <span className="text-[10px] text-slate-400">{t('doctor.mmhg')}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500 block">{t('patientInputs.glucose')}</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedVisit.blood_glucose_level ?? '—'}
                  </span>
                  <span className="text-[10px] text-slate-400">{t('doctor.mgdl')}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500 block">{t('patientInputs.hba1c')}</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedVisit.HbA1c_level ?? '—'}%
                  </span>
                  <span className="text-[10px] text-slate-400">{t('doctor.hba1c_sub')}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500 block">{t('doctor.phq9_label')}</span>
                  <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                    {selectedVisit.phq9_total}/27
                  </span>
                  <span className="text-[10px] text-slate-400">{selectedVisit.phq9_severity}</span>
                </div>
              </div>
            </div>

            {/* Longitudinal Trend Timeline */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">{t('doctor.timeline_title')}</h4>
              <PatientTimeline patientId={selectedVisit.patient_id} />
            </div>

            {/* Actions & Export Row */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => handleFetchFHIR(selectedVisit)}
                  disabled={loadingFhir}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <FileText size={14} />
                  <span>{loadingFhir ? '...' : t('doctor.export_fhir')}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `PHC Doctor Follow-up Reminder\nPatient: ${selectedVisit.patient_name || selectedVisit.patient_id}\nTriage: ${selectedVisit.traffic_light}\nAdvice: ${selectedVisit.action_headline}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
                >
                  <Share2 size={14} />
                  <span>{t('doctor.whatsapp_advice')}</span>
                </a>
              </div>

              <button
                onClick={() => setSelectedVisit(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold"
              >
                {t('doctor.close')}
              </button>
            </div>

            {/* FHIR R4 JSON Viewer */}
            {fhirData && (
              <div className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">{t('doctor.fhir_title')}</span>
                <pre>{JSON.stringify(fhirData, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
