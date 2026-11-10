import React, { useState } from 'react';
import {
    Activity, Heart, Brain, ChevronRight, ChevronLeft, AlertCircle,
    CheckCircle2, AlertTriangle, Phone, RefreshCw, Sparkles, User,
    ShieldAlert, History
} from 'lucide-react';
import {
    submitScreeningVisit,
    type ScreeningVisitInput,
    type ScreeningVisitResponse
} from '../api/client';
import ShapExplainer from './ShapExplainer';
import PatientTimeline from './PatientTimeline';

const PHQ9_QUESTIONS = [
    "Little interest or pleasure in doing things?",
    "Feeling down, depressed, or hopeless?",
    "Trouble falling or staying asleep, or sleeping too much?",
    "Feeling tired or having little energy?",
    "Poor appetite or overeating?",
    "Feeling bad about yourself — or that you are a failure?",
    "Trouble concentrating on things, such as reading or watching TV?",
    "Moving or speaking so slowly or being fidgety/restless?",
    "Thoughts that you would be better off dead, or thoughts of hurting yourself?"
];

const PHQ9_OPTIONS = [
    { label: "Not at all (0)", value: 0 },
    { label: "Several days (1)", value: 1 },
    { label: "More than half the days (2)", value: 2 },
    { label: "Nearly every day (3)", value: 3 }
];

interface GuidedVisitFlowProps {
    workerName?: string;
    workerEmail?: string;
    onReset?: () => void;
}

export const GuidedVisitFlow: React.FC<GuidedVisitFlowProps> = ({
    workerName = "ASHA Health Worker",
    workerEmail = "worker@sanjeevni.org"
}) => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<ScreeningVisitResponse | null>(null);
    const [showTimeline, setShowTimeline] = useState(false);

    // Step 1: Basic Vitals
    const [patientName, setPatientName] = useState("");
    const [patientId, setPatientId] = useState("");
    const [village, setVillage] = useState("Rampur Sub-Centre");
    const [age, setAge] = useState<number>(42);
    const [gender, setGender] = useState("Female");
    const [bmi, setBmi] = useState<number>(24.8);
    const [bloodGlucose, setBloodGlucose] = useState<number>(110);
    const [hba1c, setHba1c] = useState<number>(5.8);
    const [smoking, setSmoking] = useState("never");
    const [heartDisease, setHeartDisease] = useState(0);

    // Step 2: Blood Pressure
    const [systolicBp, setSystolicBp] = useState<number>(124);
    const [diastolicBp, setDiastolicBp] = useState<number>(82);

    // Step 3: PHQ-9 (9 items)
    const [phq9, setPhq9] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0]);

    // Derived BP categorization for real-time guidance
    const getBpCategory = () => {
        if (systolicBp >= 180 || diastolicBp >= 120) {
            return { label: "CRISIS (>=180/120)", color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-300" };
        }
        if (systolicBp >= 140 || diastolicBp >= 90) {
            return { label: "Stage 2 Hypertension (>=140/90)", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300" };
        }
        if (systolicBp >= 120 || diastolicBp >= 80) {
            return { label: "Pre-hypertension (120-139 / 80-89)", color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-300" };
        }
        return { label: "Normal (<120/80)", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300" };
    };

    const bpCategory = getBpCategory();
    const phqTotal = phq9.reduce((a, b) => a + b, 0);

    const handleSubmitVisit = async () => {
        setSubmitting(true);
        try {
            const finalPatientId = patientId.trim() || `P_${Math.floor(1000 + Math.random() * 9000)}`;
            const payload: ScreeningVisitInput = {
                patient_id: finalPatientId,
                patient_name: patientName.trim() || "Community Patient",
                worker_id: workerEmail,
                worker_name: workerName,
                village: village.trim() || "Rampur Sub-Centre",
                age: Number(age),
                gender,
                bmi: Number(bmi),
                blood_glucose_level: Number(bloodGlucose),
                HbA1c_level: Number(hba1c),
                smoking_history: smoking,
                hypertension: (systolicBp >= 140 || diastolicBp >= 90) ? 1 : 0,
                heart_disease: heartDisease,
                systolic_bp: Number(systolicBp),
                diastolic_bp: Number(diastolicBp),
                phq9_scores: phq9
            };

            const response = await submitScreeningVisit(payload);
            setResult(response);
            setStep(4);
        } catch (err) {
            console.error("Screening submission failed:", err);
            alert("Error submitting screening visit. Please verify network connection or parameters.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setResult(null);
        setShowTimeline(false);
        setPatientName("");
        setPatientId("");
        setAge(42);
        setBmi(24.8);
        setBloodGlucose(110);
        setHba1c(5.8);
        setSystolicBp(124);
        setDiastolicBp(82);
        setPhq9([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    };

    return (
        <div className="max-w-4xl mx-auto pb-16">
            {/* Header with 5-Minute ASHA Visit Badge */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-clinical-teal flex items-center gap-1.5">
                        <Activity size={15} /> 5-Minute Doorstep Screening Flow
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white mt-1">
                        New Assessment
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Worker: <strong className="text-slate-900 dark:text-white">{workerName}</strong>
                    </span>
                </div>
            </div>

            {/* Step Progress Stepper */}
            {step < 4 && (
                <div className="glass-panel p-4 rounded-2xl mb-6 shadow-sm border border-white/20 dark:border-white/5">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setStep(1)}
                            className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${step === 1
                                ? 'bg-clinical-teal text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                            <div className="truncate">
                                <span className="block text-xs font-bold leading-tight truncate">Basic Vitals</span>
                                <span className="text-[10px] opacity-80 hidden sm:inline">Glucose, BMI, Age</span>
                            </div>
                        </button>

                        <button
                            onClick={() => setStep(2)}
                            className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${step === 2
                                ? 'bg-clinical-teal text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                            <div className="truncate">
                                <span className="block text-xs font-bold leading-tight truncate">Blood Pressure</span>
                                <span className="text-[10px] opacity-80 hidden sm:inline">Hypertension Flag</span>
                            </div>
                        </button>

                        <button
                            onClick={() => setStep(3)}
                            className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${step === 3
                                ? 'bg-clinical-teal text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                            <div className="truncate">
                                <span className="block text-xs font-bold leading-tight truncate">PHQ-9 Mental Health</span>
                                <span className="text-[10px] opacity-80 hidden sm:inline">9-Item Depression</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 1: Basic Vitals */}
            {step === 1 && (
                <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 shadow-glass border border-white/20 dark:border-white/5 animate-in fade-in duration-200">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-800 dark:text-white font-bold text-lg">
                        <User className="text-clinical-teal" size={20} />
                        Step 1: Patient Profile & Basic Vitals
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Patient Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Meera Devi"
                                value={patientName}
                                onChange={e => setPatientName(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Patient ID / Aadhar Last 4</label>
                            <input
                                type="text"
                                placeholder="e.g. P1002"
                                value={patientId}
                                onChange={e => setPatientId(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Village / Sub-Centre</label>
                            <input
                                type="text"
                                value={village}
                                onChange={e => setVillage(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Age (Years)</label>
                            <input
                                type="number"
                                min={18}
                                max={110}
                                value={age}
                                onChange={e => setAge(Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Gender</label>
                            <select
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-clinical-teal outline-none"
                            >
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">BMI (kg/m²)</label>
                            <input
                                type="number"
                                step="0.1"
                                min={12}
                                max={60}
                                value={bmi}
                                onChange={e => setBmi(Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Smoking Status</label>
                            <select
                                value={smoking}
                                onChange={e => setSmoking(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-clinical-teal outline-none"
                            >
                                <option value="never">Never Smoked</option>
                                <option value="former">Former Smoker</option>
                                <option value="current">Current Smoker / Bidi</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    Random Blood Glucose (mg/dL)
                                </label>
                                <span className={`text-[11px] font-bold ${bloodGlucose >= 300 ? 'text-rose-600' : bloodGlucose >= 200 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {bloodGlucose >= 300 ? 'Critical (>=300)' : bloodGlucose >= 200 ? 'High (>=200)' : 'Normal (<200)'}
                                </span>
                            </div>
                            <input
                                type="number"
                                min={40}
                                max={600}
                                value={bloodGlucose}
                                onChange={e => setBloodGlucose(Number(e.target.value))}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-bold text-clinical-teal focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Fingerprick glucometer reading during home visit.</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    HbA1c Level (%)
                                </label>
                                <span className={`text-[11px] font-bold ${hba1c >= 12.0 ? 'text-rose-600' : hba1c >= 8.5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {hba1c >= 6.5 ? 'Diabetic Range (>=6.5%)' : 'Reference Target'}
                                </span>
                            </div>
                            <input
                                type="number"
                                step="0.1"
                                min={3.5}
                                max={18.0}
                                value={hba1c}
                                onChange={e => setHba1c(Number(e.target.value))}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-bold text-clinical-teal focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Point-of-care capillary or recorded lab panel value.</p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setStep(2)}
                            className="px-6 py-3 rounded-2xl bg-clinical-teal text-white font-bold text-sm flex items-center gap-2 hover:bg-clinical-teal-dark shadow-lg transition-all"
                        >
                            <span>Next: Blood Pressure</span>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: Blood Pressure & Hypertension */}
            {step === 2 && (
                <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 shadow-glass border border-white/20 dark:border-white/5 animate-in fade-in duration-200">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-lg">
                            <Heart className="text-rose-500" size={20} />
                            Step 2: Blood Pressure & Cardiovascular Flag
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${bpCategory.color}`}>
                            {bpCategory.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                                Systolic Blood Pressure (mmHg)
                            </label>
                            <input
                                type="number"
                                min={70}
                                max={250}
                                value={systolicBp}
                                onChange={e => setSystolicBp(Number(e.target.value))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                            <p className="text-xs text-slate-500">Upper number (e.g. 120)</p>
                        </div>

                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                                Diastolic Blood Pressure (mmHg)
                            </label>
                            <input
                                type="number"
                                min={40}
                                max={150}
                                value={diastolicBp}
                                onChange={e => setDiastolicBp(Number(e.target.value))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                            <p className="text-xs text-slate-500">Lower number (e.g. 80)</p>
                        </div>
                    </div>

                    {/* Pre-existing Heart Disease */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <div>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">History of Heart Disease / Stroke</span>
                            <span className="text-xs text-slate-400">Known prior myocardial infarction, angina, or stroke.</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setHeartDisease(0)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${heartDisease === 0
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200'
                                }`}
                            >
                                No (0)
                            </button>
                            <button
                                type="button"
                                onClick={() => setHeartDisease(1)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${heartDisease === 1
                                    ? 'bg-rose-600 text-white shadow-md'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200'
                                }`}
                            >
                                Yes (1)
                            </button>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setStep(1)}
                            className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <ChevronLeft size={16} /> Back
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            className="px-6 py-3 rounded-2xl bg-clinical-teal text-white font-bold text-sm flex items-center gap-2 hover:bg-clinical-teal-dark shadow-lg transition-all"
                        >
                            <span>Next: PHQ-9 Mental Health</span>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: PHQ-9 Screener */}
            {step === 3 && (
                <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 shadow-glass border border-white/20 dark:border-white/5 animate-in fade-in duration-200">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-lg">
                            <Brain className="text-purple-500" size={20} />
                            Step 3: PHQ-9 Mental Health Screening
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="font-semibold text-slate-500">Total Score: <strong className="text-purple-600 dark:text-purple-400 text-sm">{phqTotal}/27</strong></span>
                            <button
                                type="button"
                                onClick={() => setPhq9([0, 0, 0, 0, 0, 0, 0, 0, 0])}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200"
                            >
                                Set All 0 (No Symptoms)
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Over the last 2 weeks, how often has the patient been bothered by any of the following problems?
                    </p>

                    <div className="space-y-4">
                        {PHQ9_QUESTIONS.map((q, idx) => {
                            const isCrisisQ = idx === 8;
                            const currentVal = phq9[idx];
                            return (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-2xl border transition-all ${isCrisisQ
                                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2.5">
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                                                {idx + 1}
                                            </span>
                                            <span>{q}</span>
                                        </span>
                                        {isCrisisQ && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shrink-0 flex items-center gap-1">
                                                <AlertTriangle size={11} /> Self-Harm Item
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {PHQ9_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    const updated = [...phq9];
                                                    updated[idx] = opt.value;
                                                    setPhq9(updated);
                                                }}
                                                className={`py-2 px-2.5 rounded-xl text-xs font-semibold text-center transition-all ${currentVal === opt.value
                                                    ? isCrisisQ && opt.value > 0
                                                        ? 'bg-rose-600 text-white shadow-md'
                                                        : 'bg-clinical-teal text-white shadow-md'
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Submit Bar */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setStep(2)}
                            className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm flex items-center gap-1.5 hover:bg-slate-100"
                        >
                            <ChevronLeft size={16} /> Back
                        </button>
                        <button
                            onClick={handleSubmitVisit}
                            disabled={submitting}
                            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-clinical-teal to-teal-700 text-white font-black text-sm flex items-center gap-2 hover:opacity-95 shadow-xl transition-all disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw className="animate-spin" size={16} />
                                    <span>Evaluating Safety & Triage...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    <span>Complete Visit & Generate Triage</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4: Combined Summary & Traffic Light Screen */}
            {step === 4 && result && (
                <div className="space-y-6 animate-in zoom-in-95 duration-200">
                    {/* Traffic Light Card */}
                    <div className={`p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row items-center gap-8 ${result.traffic_light === 'RED'
                        ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                        : result.traffic_light === 'YELLOW'
                            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                            : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                    }`}>
                        {/* Traffic Light Visual Widget */}
                        <div className="p-3 bg-slate-900 rounded-3xl shadow-2xl flex flex-col items-center gap-3 shrink-0 ring-4 ring-slate-800">
                            {/* RED */}
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${result.traffic_light === 'RED'
                                ? 'bg-rose-500 shadow-[0_0_25px_rgba(244,63,94,1)] scale-105'
                                : 'bg-rose-950/50 opacity-30'
                            }`}>
                                <AlertTriangle className="text-white" size={24} />
                            </div>

                            {/* YELLOW */}
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${result.traffic_light === 'YELLOW'
                                ? 'bg-amber-400 shadow-[0_0_25px_rgba(251,191,36,1)] scale-105'
                                : 'bg-amber-950/50 opacity-30'
                            }`}>
                                <AlertCircle className="text-slate-900" size={24} />
                            </div>

                            {/* GREEN */}
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${result.traffic_light === 'GREEN'
                                ? 'bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,1)] scale-105'
                                : 'bg-emerald-950/50 opacity-30'
                            }`}>
                                <CheckCircle2 className="text-white" size={24} />
                            </div>
                        </div>

                        {/* Triage Decision Details */}
                        <div className="flex-1 space-y-3 text-center md:text-left">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${result.traffic_light === 'RED'
                                    ? 'bg-rose-600 text-white'
                                    : result.traffic_light === 'YELLOW'
                                        ? 'bg-amber-500 text-slate-950'
                                        : 'bg-emerald-600 text-white'
                                }`}>
                                    Triage: {result.traffic_light}
                                </span>
                                {result.safety_escalated && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-600 text-white flex items-center gap-1 shadow-sm">
                                        <ShieldAlert size={12} /> Safety Guardrail Escalated
                                    </span>
                                )}
                                <span className="text-xs text-slate-500">
                                    Patient: <strong>{result.patient_name || result.patient_id}</strong>
                                </span>
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white leading-tight">
                                {result.action_headline}
                            </h2>

                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                                {result.action_details}
                            </p>

                            {/* Escalation Reasons Pill List */}
                            {result.escalation_reasons && result.escalation_reasons.length > 0 && (
                                <div className="mt-2 space-y-1 text-left">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                                        Critical Clinical Triggers:
                                    </span>
                                    {result.escalation_reasons.map((r, i) => (
                                        <div key={i} className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>{r}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Emergency Helplines (if RED / crisis) */}
                    {result.emergency_helpline_required && result.helplines.length > 0 && (
                        <div className="p-6 rounded-3xl bg-rose-600 text-white shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center gap-3">
                                <Phone size={24} className="animate-bounce" />
                                <div>
                                    <h3 className="text-lg font-bold">Mental Health Crisis Helplines (India)</h3>
                                    <p className="text-xs opacity-90">Support is free, confidential, and available 24/7. Connect immediately.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {result.helplines.map((h, idx) => (
                                    <a
                                        key={idx}
                                        href={`tel:${h.number.replace(/\s+/g, '')}`}
                                        className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center justify-between"
                                    >
                                        <div>
                                            <span className="font-bold text-sm block">{h.name}</span>
                                            <span className="text-xs opacity-80">{h.hours || 'Emergency Line'}</span>
                                        </div>
                                        <span className="text-base font-mono font-black underline">{h.number}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Plain Language & SHAP Explanation */}
                    <div className="glass-panel p-6 rounded-3xl shadow-glass border border-white/20 dark:border-white/5">
                        <ShapExplainer
                            explanations={result.explanations || []}
                            summary_en={result.summary_en}
                            summary_hi={result.summary_hi}
                        />
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            onClick={() => setShowTimeline(!showTimeline)}
                            className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 hover:bg-slate-200"
                        >
                            <History size={15} />
                            {showTimeline ? "Hide Patient Timeline" : "View Patient Timeline & Trend"}
                        </button>

                        <button
                            onClick={handleReset}
                            className="px-6 py-3 rounded-2xl bg-clinical-teal text-white font-bold text-sm flex items-center gap-2 hover:bg-clinical-teal-dark shadow-lg transition-all"
                        >
                            <RefreshCw size={15} />
                            <span>Start Next Patient Visit</span>
                        </button>
                    </div>

                    {/* Longitudinal Patient Timeline */}
                    {showTimeline && (
                        <div className="pt-4">
                            <PatientTimeline patientId={result.patient_id} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GuidedVisitFlow;
