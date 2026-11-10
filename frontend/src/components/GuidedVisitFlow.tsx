import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Activity, Heart, Brain, ChevronRight, ChevronLeft, AlertCircle,
    CheckCircle2, AlertTriangle, Phone, RefreshCw, Sparkles,
    ShieldAlert, History, Mic, Volume2, Share2
} from 'lucide-react';
import {
    submitScreeningVisit,
    type ScreeningVisitInput,
    type ScreeningVisitResponse
} from '../api/client';
import ShapExplainer from './ShapExplainer';
import PatientTimeline from './PatientTimeline';
import { SpeechHandler } from '../utils/speech';
import { changeLanguage } from '../i18n';

interface GuidedVisitFlowProps {
    workerName?: string;
    workerEmail?: string;
    onReset?: () => void;
}

export const GuidedVisitFlow: React.FC<GuidedVisitFlowProps> = ({
    workerName = "ASHA Health Worker",
    workerEmail = "worker@sanjeevni.org"
}) => {
    const { t, i18n } = useTranslation();
    const currentLang = (i18n.language.startsWith('hi') ? 'hi' : 'en') as 'en' | 'hi';

    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<ScreeningVisitResponse | null>(null);
    const [showTimeline, setShowTimeline] = useState(false);

    // Voice & Speech state
    const [activeListeningField, setActiveListeningField] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [consentGiven, setConsentGiven] = useState(true);

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

    const phqQuestions = [
        t('phq9.q1'),
        t('phq9.q2'),
        t('phq9.q3'),
        t('phq9.q4'),
        t('phq9.q5'),
        t('phq9.q6'),
        t('phq9.q7'),
        t('phq9.q8'),
        t('phq9.q9')
    ];

    const phqOptions = [
        { label: t('phq9.opt0'), value: 0 },
        { label: t('phq9.opt1'), value: 1 },
        { label: t('phq9.opt2'), value: 2 },
        { label: t('phq9.opt3'), value: 3 }
    ];

    // Voice recognition helper
    const handleVoiceInput = (fieldName: string, setter: (val: number) => void) => {
        if (!SpeechHandler.isSpeechRecognitionSupported()) {
            alert(t('visit.voice_unsupported'));
            return;
        }

        setActiveListeningField(fieldName);
        SpeechHandler.startListening(
            currentLang,
            (transcript, parsedNumber) => {
                setActiveListeningField(null);
                if (parsedNumber !== null && !isNaN(parsedNumber)) {
                    setter(parsedNumber);
                } else {
                    alert(`Recognized: "${transcript}". Please speak a clear number.`);
                }
            },
            () => {
                setActiveListeningField(null);
            }
        );
    };

    // Speech synthesis helper
    const handleReadAloud = () => {
        if (!result) return;
        if (isSpeaking) {
            SpeechHandler.stopSpeaking();
            setIsSpeaking(false);
            return;
        }

        const langHeadline = currentLang === 'hi'
            ? result.traffic_light === 'RED'
                ? 'लाल चेतावनी: उच्च जोखिम। तत्काल डॉक्टर से संपर्क करें।'
                : result.traffic_light === 'YELLOW'
                ? 'पीली चेतावनी: मध्यम जोखिम। जल्द से जल्द स्वास्थ्य केंद्र जाएं।'
                : 'हरी रिपोर्ट: कम जोखिम। स्वस्थ खानपान और नियमित व्यायाम रखें।'
            : `${result.traffic_light} Alert: ${result.action_headline}. ${result.action_details}`;

        const langSummary = currentLang === 'hi' && result.summary_hi
            ? result.summary_hi
            : result.summary_en || result.action_details;

        const speechText = `${langHeadline}. ${langSummary}`;
        setIsSpeaking(true);
        SpeechHandler.speak(speechText, currentLang, () => setIsSpeaking(false));
    };

    // Derived BP category
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
        if (!consentGiven) {
            alert("Please confirm patient consent before submitting clinical visit.");
            return;
        }

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
        SpeechHandler.stopSpeaking();
        setIsSpeaking(false);
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
            {/* Header with 5-Minute ASHA Visit Badge and Language Toggle */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-clinical-teal flex items-center gap-1.5">
                        <Activity size={15} /> {t('visit.title')}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white mt-1">
                        New Assessment
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {/* Bilingual Language Switcher */}
                    <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => changeLanguage('hi')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                currentLang === 'hi'
                                    ? 'bg-clinical-teal text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                            }`}
                        >
                            हिन्दी
                        </button>
                        <button
                            type="button"
                            onClick={() => changeLanguage('en')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                currentLang === 'en'
                                    ? 'bg-clinical-teal text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                            }`}
                        >
                            English
                        </button>
                    </div>

                    <span className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
                                <span className="block text-xs font-bold leading-tight truncate">{t('visit.step1')}</span>
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
                                <span className="block text-xs font-bold leading-tight truncate">{t('visit.step2')}</span>
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
                                <span className="block text-xs font-bold leading-tight truncate">{t('visit.step3')}</span>
                                <span className="text-[10px] opacity-80 hidden sm:inline">9-Item Depression</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 1: Basic Vitals */}
            {step === 1 && (
                <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 shadow-glass border border-white/20 dark:border-white/5 animate-in fade-in duration-200">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-lg">
                            <Activity className="text-clinical-teal" size={20} />
                            {t('visit.step1')}
                        </div>
                        <span className="text-xs text-slate-400">Step 1 of 3</span>
                    </div>

                    {/* Patient Identifiers */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Patient Name (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Ramesh Devi"
                                value={patientName}
                                onChange={e => setPatientName(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Patient ID / ABHA ID
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. P_4821"
                                value={patientId}
                                onChange={e => setPatientId(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Village / Sub-Centre
                            </label>
                            <input
                                type="text"
                                value={village}
                                onChange={e => setVillage(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                        </div>
                    </div>

                    {/* Age, Gender, Smoking */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('visit.age')}</label>
                                <button
                                    type="button"
                                    onClick={() => handleVoiceInput('age', setAge)}
                                    className={`p-1 rounded-lg text-xs ${activeListeningField === 'age' ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-clinical-teal'}`}
                                    title={t('visit.voice_input')}
                                >
                                    <Mic size={14} />
                                </button>
                            </div>
                            <input
                                type="number"
                                min={1}
                                max={120}
                                value={age}
                                onChange={e => setAge(Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('visit.gender')}</label>
                            <select
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-clinical-teal outline-none"
                            >
                                <option value="Female">{t('visit.female')}</option>
                                <option value="Male">{t('visit.male')}</option>
                                <option value="Other">{t('visit.other')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('visit.smoking')}</label>
                            <select
                                value={smoking}
                                onChange={e => setSmoking(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-clinical-teal outline-none"
                            >
                                <option value="never">{t('visit.never')}</option>
                                <option value="former">{t('visit.former')}</option>
                                <option value="current">{t('visit.current')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Metabolic Readings: BMI, Glucose, HbA1c */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('visit.bmi')}</label>
                                <button
                                    type="button"
                                    onClick={() => handleVoiceInput('bmi', setBmi)}
                                    className={`p-1 rounded-lg text-xs ${activeListeningField === 'bmi' ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-clinical-teal'}`}
                                    title={t('visit.voice_input')}
                                >
                                    <Mic size={14} />
                                </button>
                            </div>
                            <input
                                type="number"
                                step="0.1"
                                min={10}
                                max={70}
                                value={bmi}
                                onChange={e => setBmi(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold outline-none"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Normal: 18.5 - 24.9</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('visit.glucose')}</label>
                                <button
                                    type="button"
                                    onClick={() => handleVoiceInput('glucose', setBloodGlucose)}
                                    className={`p-1 rounded-lg text-xs ${activeListeningField === 'glucose' ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-clinical-teal'}`}
                                    title={t('visit.voice_input')}
                                >
                                    <Mic size={14} />
                                </button>
                            </div>
                            <input
                                type="number"
                                min={40}
                                max={600}
                                value={bloodGlucose}
                                onChange={e => setBloodGlucose(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold outline-none"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Normal: 70 - 100 mg/dL</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('visit.hba1c')}</label>
                                <button
                                    type="button"
                                    onClick={() => handleVoiceInput('hba1c', setHba1c)}
                                    className={`p-1 rounded-lg text-xs ${activeListeningField === 'hba1c' ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-clinical-teal'}`}
                                    title={t('visit.voice_input')}
                                >
                                    <Mic size={14} />
                                </button>
                            </div>
                            <input
                                type="number"
                                step="0.1"
                                min={3.5}
                                max={18}
                                value={hba1c}
                                onChange={e => setHba1c(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold outline-none"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Normal: &lt; 5.7%</p>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setStep(2)}
                            className="px-6 py-3 rounded-2xl bg-clinical-teal text-white font-bold text-sm flex items-center gap-2 hover:bg-clinical-teal-dark shadow-lg transition-all"
                        >
                            <span>{t('visit.next')}</span>
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
                            {t('visit.step2')}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${bpCategory.color}`}>
                            {bpCategory.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {t('visit.systolic')}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => handleVoiceInput('systolicBp', setSystolicBp)}
                                    className={`p-1 rounded-lg text-xs ${activeListeningField === 'systolicBp' ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-clinical-teal'}`}
                                    title={t('visit.voice_input')}
                                >
                                    <Mic size={14} />
                                </button>
                            </div>
                            <input
                                type="number"
                                min={70}
                                max={250}
                                value={systolicBp}
                                onChange={e => setSystolicBp(Number(e.target.value))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                            <p className="text-xs text-slate-500">Normal: &lt; 120 mmHg</p>
                        </div>

                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {t('visit.diastolic')}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => handleVoiceInput('diastolicBp', setDiastolicBp)}
                                    className={`p-1 rounded-lg text-xs ${activeListeningField === 'diastolicBp' ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-clinical-teal'}`}
                                    title={t('visit.voice_input')}
                                >
                                    <Mic size={14} />
                                </button>
                            </div>
                            <input
                                type="number"
                                min={40}
                                max={150}
                                value={diastolicBp}
                                onChange={e => setDiastolicBp(Number(e.target.value))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-clinical-teal outline-none"
                            />
                            <p className="text-xs text-slate-500">Normal: &lt; 80 mmHg</p>
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
                            <ChevronLeft size={16} /> {t('visit.prev')}
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            className="px-6 py-3 rounded-2xl bg-clinical-teal text-white font-bold text-sm flex items-center gap-2 hover:bg-clinical-teal-dark shadow-lg transition-all"
                        >
                            <span>{t('visit.next')}</span>
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
                            {t('phq9.title')}
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
                        {t('phq9.subtitle')}
                    </p>

                    <div className="space-y-4">
                        {phqQuestions.map((q, idx) => {
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
                                        {phqOptions.map(opt => (
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

                    {/* Patient Consent Checkbox */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="patient-consent"
                            checked={consentGiven}
                            onChange={e => setConsentGiven(e.target.checked)}
                            className="w-4 h-4 text-clinical-teal rounded border-slate-300 focus:ring-clinical-teal"
                        />
                        <label htmlFor="patient-consent" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                            {t('visit.consent_checkbox')}
                        </label>
                    </div>

                    {/* Submit Bar */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setStep(2)}
                            className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm flex items-center gap-1.5 hover:bg-slate-100"
                        >
                            <ChevronLeft size={16} /> {t('visit.prev')}
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
                                    <span>{t('visit.complete')}</span>
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
                                        {t('triage.reasons')}:
                                    </span>
                                    {result.escalation_reasons.map((r, i) => (
                                        <div key={i} className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>{r}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Read Aloud & WhatsApp Share Action Row */}
                            <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                                <button
                                    type="button"
                                    onClick={handleReadAloud}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
                                        isSpeaking
                                            ? 'bg-rose-600 text-white animate-pulse'
                                            : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90'
                                    }`}
                                >
                                    <Volume2 size={15} />
                                    <span>{isSpeaking ? t('triage.reading') : t('triage.read_aloud')}</span>
                                </button>

                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(
                                        `Sanjeevni Health Screening Result\nPatient: ${result.patient_name || result.patient_id}\nTriage: ${result.traffic_light}\nAdvice: ${result.action_headline}\nDetails: ${result.action_details}`
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                                >
                                    <Share2 size={14} />
                                    <span>{t('triage.whatsapp_reminder')}</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Helplines (if RED / crisis) */}
                    {result.emergency_helpline_required && result.helplines.length > 0 && (
                        <div className="p-6 rounded-3xl bg-rose-600 text-white shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center gap-3">
                                <Phone size={24} className="animate-bounce" />
                                <div>
                                    <h3 className="text-lg font-bold">{t('emergency.crisis_alert')}</h3>
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
