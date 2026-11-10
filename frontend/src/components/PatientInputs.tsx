import React, { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { predictRisk, type PredictionInput, type PredictionResponse } from '../api/client';
import { Loader2, Info, Activity, User, HeartPulse, Scale, ActivitySquare, Droplets } from 'lucide-react';
import SectionCard from "./ui/SectionCard";

interface PatientInputsProps {
    onPredictionSuccess: (data: PredictionResponse, inputData: PredictionInput) => void;
    user?: { email: string; name: string } | null;
}

const PatientInputs: React.FC<PatientInputsProps> = ({ onPredictionSuccess, user }) => {
    const { register, handleSubmit, control } = useForm<PredictionInput>({
        defaultValues: {
            age: 45,
            gender: 'Female',
            smoking_history: 'never',
            hypertension: 0,
            heart_disease: 0,
            bmi: 27.5,
            HbA1c_level: 5.5,
            blood_glucose_level: 100
        }
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Watch values for sliders
    const age = useWatch({ control, name: 'age' });
    const bmi = useWatch({ control, name: 'bmi' });
    const hba1c = useWatch({ control, name: 'HbA1c_level' });
    const glucose = useWatch({ control, name: 'blood_glucose_level' });

    const onSubmit = async (data: PredictionInput) => {
        setIsLoading(true);
        setError(null);
        try {
            const payload: PredictionInput = {
                ...data,
                age: Number(data.age),
                hypertension: Number(data.hypertension),
                heart_disease: Number(data.heart_disease),
                bmi: Number(data.bmi),
                HbA1c_level: Number(data.HbA1c_level),
                blood_glucose_level: Number(data.blood_glucose_level),
                clinician_id: user?.email,
                clinician_name: user?.name,
            };

            const result = await predictRisk(payload);
            onPredictionSuccess(result, payload);
        } catch (err) {
            console.error(err);
            setError("Analysis service unavailable. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Shared Styles
    const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5";
    const sliderClass = "w-full h-2 bg-slate-200 dark:bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-clinical-teal hover:accent-teal-500 transition-all";
    const numberInputClass = "w-20 pl-3 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-clinical-teal/50 text-right";

    return (
        <SectionCard
            title="Patient Diagnostics"
            subtitle="Enter clinical parameters for risk stratification."
            className="h-full sticky top-24 shadow-glass dark:shadow-glass-dark"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                {/* 1. Core Demographics */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                            <User size={16} />
                        </div>
                        <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">Identity Profile</h4>
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 space-y-5">
                        {/* Age Slider */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className={labelClass}>Age</label>
                                <span className="text-sm font-black text-slate-700 dark:text-white bg-white dark:bg-slate-700 px-2 py-0.5 rounded shadow-sm border border-slate-100 dark:border-slate-600">
                                    {age} <span className="text-[10px] text-slate-400 font-normal ml-1">YRS</span>
                                </span>
                            </div>
                            <input
                                type="range"
                                min="1" max="100"
                                {...register("age")}
                                className={sliderClass}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Gender</label>
                                <select {...register("gender")} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-clinical-teal/50 outline-none transition-all">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Smoking</label>
                                <select {...register("smoking_history")} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-clinical-teal/50 outline-none transition-all">
                                    <option value="never">Never</option>
                                    <option value="current">Current</option>
                                    <option value="former">Former</option>
                                    <option value="ever">Ever</option>
                                    <option value="not current">Not Current</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Medical History */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg">
                            <HeartPulse size={16} />
                        </div>
                        <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">Medical History</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="cursor-pointer relative overflow-hidden group">
                            <input type="checkbox" className="peer sr-only" {...register("hypertension")} />
                            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl peer-checked:border-rose-500 peer-checked:bg-rose-50/30 dark:peer-checked:bg-rose-900/20 transition-all flex flex-col items-center gap-2 h-full justify-center text-center">
                                <ActivitySquare size={20} className="text-slate-300 peer-checked:text-rose-500 transition-colors" />
                                <span className="text-xs font-bold text-slate-500 peer-checked:text-rose-700 dark:peer-checked:text-rose-400">Hypertension</span>
                            </div>
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                        </label>

                        <label className="cursor-pointer relative overflow-hidden group">
                            <input type="checkbox" className="peer sr-only" {...register("heart_disease")} />
                            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl peer-checked:border-rose-500 peer-checked:bg-rose-50/30 dark:peer-checked:bg-rose-900/20 transition-all flex flex-col items-center gap-2 h-full justify-center text-center">
                                <HeartPulse size={20} className="text-slate-300 peer-checked:text-rose-500 transition-colors" />
                                <span className="text-xs font-bold text-slate-500 peer-checked:text-rose-700 dark:peer-checked:text-rose-400">Heart Disease</span>
                            </div>
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                        </label>
                    </div>
                </div>

                {/* 3. Vitals Sliders */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-teal-50 dark:bg-teal-900/20 text-clinical-teal rounded-lg">
                            <Activity size={16} />
                        </div>
                        <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">Clinical Vitals</h4>
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-xl border border-slate-100 dark:border-slate-800/50 space-y-6">
                        {/* BMI */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className={labelClass}><Scale size={14} /> BMI ({bmi})</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" step="0.1" {...register("bmi")} className={numberInputClass} />
                                    <span className="text-[10px] font-bold text-slate-400">KG/M²</span>
                                </div>
                            </div>
                            <input type="range" min="10" max="60" step="0.1" {...register("bmi")} className={sliderClass} />
                            <div className="flex justify-between text-[9px] text-slate-400 font-bold tracking-widest mt-1">
                                <span>UNDERWEIGHT</span>
                                <span>NORMAL</span>
                                <span>OBESE</span>
                            </div>
                        </div>

                        {/* HbA1c */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className={labelClass}><Droplets size={14} /> HbA1c ({hba1c}%)</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" step="0.1" {...register("HbA1c_level")} className={numberInputClass} />
                                    <span className="text-[10px] font-bold text-slate-400">%</span>
                                </div>
                            </div>
                            <input type="range" min="3" max="15" step="0.1" {...register("HbA1c_level")} className={sliderClass} />
                            <div className="w-full h-1 bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-full mt-2 opacity-50"></div>
                        </div>

                        {/* Glucose */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className={labelClass}><Droplets size={14} /> Glucose ({glucose})</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" step="1" {...register("blood_glucose_level")} className={numberInputClass} />
                                    <span className="text-[10px] font-bold text-slate-400">MG/DL</span>
                                </div>
                            </div>
                            <input type="range" min="50" max="300" step="1" {...register("blood_glucose_level")} className={sliderClass} />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-clinical-coral rounded-xl text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
                        <Info size={16} className="shrink-0" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-clinical-teal hover:bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <span>Run Risk Analysis</span>
                            <Activity size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </SectionCard>
    );
};

export default PatientInputs;
