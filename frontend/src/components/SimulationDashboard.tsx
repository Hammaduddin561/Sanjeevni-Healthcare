import React, { useState, useEffect, useCallback } from 'react';
import { simulateRisk, generateSimulationReport, type PredictionInput, type SimulationResponse } from '../api/client';
import { RefreshCcw, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { debounce } from 'lodash';

interface SimulationDashboardProps {
    originalData: PredictionInput;
}

const SimulationDashboard: React.FC<SimulationDashboardProps> = ({ originalData }) => {
    // Current state of sliders
    const [modifications, setModifications] = useState({
        bmi: 0,        // delta
        HbA1c_level: 0, // delta
        blood_glucose_level: 0 // delta
    });

    const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);

    // AI Report State
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);

    const handleAnalyzeScenario = async () => {
        if (!simulationResult) return;
        setLoadingAi(true);
        try {
            const backendMods: Record<string, any> = {};
            if (modifications.bmi !== 0) backendMods.bmi = originalData.bmi + modifications.bmi;
            if (modifications.HbA1c_level !== 0) backendMods.HbA1c_level = originalData.HbA1c_level + modifications.HbA1c_level;
            if (modifications.blood_glucose_level !== 0) backendMods.blood_glucose_level = originalData.blood_glucose_level + modifications.blood_glucose_level;

            const result = await generateSimulationReport(originalData, backendMods);
            setAiReport(result.report);
        } catch (error) {
            console.error("AI Analysis failed", error);
        } finally {
            setLoadingAi(false);
        }
    };

    // Debounced simulation call
    const runSimulation = useCallback(
        debounce(async (mods: typeof modifications) => {
            setIsSimulating(true);
            try {
                // Construct absolute modification for backend
                const backendMods: Record<string, any> = {};
                if (mods.bmi !== 0) backendMods.bmi = originalData.bmi + mods.bmi;
                if (mods.HbA1c_level !== 0) backendMods.HbA1c_level = originalData.HbA1c_level + mods.HbA1c_level;
                if (mods.blood_glucose_level !== 0) backendMods.blood_glucose_level = originalData.blood_glucose_level + mods.blood_glucose_level;

                if (Object.keys(backendMods).length === 0) {
                    setSimulationResult(null);
                    setIsSimulating(false);
                    return;
                }

                const result = await simulateRisk(originalData, backendMods);
                setSimulationResult(result);
            } catch (err) {
                console.error("Simulation failed", err);
            } finally {
                setIsSimulating(false);
            }
        }, 500),
        [originalData]
    );

    useEffect(() => {
        setAiReport(null); // Clear old report on change
        runSimulation(modifications);
    }, [modifications, runSimulation]);

    const handleSliderChange = (field: keyof typeof modifications, value: number) => {
        setModifications(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sliders */}
                <div className="space-y-6">
                    {/* BMI Slider */}
                    <div className="group">
                        <div className="flex justify-between text-sm mb-2">
                            <label className="font-bold text-slate-600 dark:text-slate-300">Reduce BMI</label>
                            <span className="text-clinical-teal font-black">{modifications.bmi.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min="-10"
                            max="0"
                            step="0.5"
                            value={modifications.bmi}
                            onChange={(e) => handleSliderChange('bmi', parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-clinical-teal"
                        />
                        <div className="text-[10px] font-medium text-slate-400 mt-1 flex justify-between">
                            <span>Current: {originalData.bmi}</span>
                            <span>Target: {(originalData.bmi + modifications.bmi).toFixed(1)}</span>
                        </div>
                    </div>

                    {/* HbA1c Slider */}
                    <div className="group">
                        <div className="flex justify-between text-sm mb-2">
                            <label className="font-bold text-slate-600 dark:text-slate-300">Lower HbA1c</label>
                            <span className="text-clinical-teal font-black">{modifications.HbA1c_level.toFixed(1)} %</span>
                        </div>
                        <input
                            type="range"
                            min="-3"
                            max="0"
                            step="0.1"
                            value={modifications.HbA1c_level}
                            onChange={(e) => handleSliderChange('HbA1c_level', parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-clinical-teal"
                        />
                        <div className="text-[10px] font-medium text-slate-400 mt-1 flex justify-between">
                            <span>Current: {originalData.HbA1c_level}%</span>
                            <span>Target: {(originalData.HbA1c_level + modifications.HbA1c_level).toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* Glucose Slider */}
                    <div className="group">
                        <div className="flex justify-between text-sm mb-2">
                            <label className="font-bold text-slate-600 dark:text-slate-300">Lower Blood Glucose</label>
                            <span className="text-clinical-teal font-black">{modifications.blood_glucose_level} mg/dL</span>
                        </div>
                        <input
                            type="range"
                            min="-50"
                            max="0"
                            step="5"
                            value={modifications.blood_glucose_level}
                            onChange={(e) => handleSliderChange('blood_glucose_level', parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-clinical-teal"
                        />
                        <div className="text-[10px] font-medium text-slate-400 mt-1 flex justify-between">
                            <span>Current: {originalData.blood_glucose_level}</span>
                            <span>Target: {originalData.blood_glucose_level + modifications.blood_glucose_level}</span>
                        </div>
                    </div>
                </div>

                {/* Results Visualization */}
                <div className="glass-panel text-slate-50 dark:text-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center border border-white/20 dark:border-white/10 relative overflow-hidden shadow-neo">
                    {/* Loading Overlay */}
                    {isSimulating && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 z-10 flex items-center justify-center backdrop-blur-sm transition-all">
                            <RefreshCcw className="animate-spin text-clinical-teal" size={32} />
                        </div>
                    )}

                    {!simulationResult ? (
                        <div className="text-center text-slate-400 dark:text-slate-500">
                            <p className="mb-2 font-medium">Adjust sliders to simulate health improvements.</p>
                            <div className="text-[10px] uppercase tracking-wider font-bold">Real-time SOTA Inference</div>
                        </div>
                    ) : (
                        <div className="w-full space-y-5">
                            <div className="flex justify-between items-center w-full px-2">
                                <div className="text-center">
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Original Risk</div>
                                    <div className="text-2xl font-black text-slate-700 dark:text-slate-200">{(simulationResult.original_risk * 100).toFixed(1)}%</div>
                                </div>
                                <ArrowRight className="text-slate-300 dark:text-slate-600" />
                                <div className="text-center">
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-clinical-teal mb-1">Projected Risk</div>
                                    <div className="text-3xl font-black text-clinical-teal">{(simulationResult.new_risk * 100).toFixed(1)}%</div>
                                </div>
                            </div>

                            <div className="w-full bg-slate-200 rounded-full h-3 dark:bg-slate-700 relative overflow-hidden">
                                <div
                                    className="bg-slate-400 h-full absolute top-0 left-0"
                                    style={{ width: `${simulationResult.original_risk * 100}%` }}
                                ></div>
                                <div
                                    className="bg-clinical-teal h-full absolute top-0 left-0 transition-all duration-500 shadow-[0_0_10px_rgba(13,148,136,0.5)]"
                                    style={{ width: `${simulationResult.new_risk * 100}%` }}
                                ></div>
                            </div>

                            <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-center text-xs font-bold uppercase tracking-wide border border-emerald-500/20">
                                Risk Reduction: <span className="text-sm">{(simulationResult.risk_reduction * 100).toFixed(1)}%</span>
                            </div>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                {loadingAi ? (
                                    <div className="p-2 flex justify-center">
                                        <Loader2 className="animate-spin text-clinical-teal" />
                                    </div>
                                ) : !aiReport ? (
                                    <button
                                        onClick={handleAnalyzeScenario}
                                        disabled={loadingAi}
                                        className="w-full flex items-center justify-center space-x-2 py-3 text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl transition-all shadow-lg"
                                    >
                                        <Sparkles size={16} />
                                        <span>Analyze Impact</span>
                                    </button>
                                ) : (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                                        <div className="flex items-center space-x-2 mb-2 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] uppercase tracking-widest">
                                            <Sparkles size={12} />
                                            <span>AI Scenario Analysis</span>
                                        </div>
                                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                            {aiReport}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SimulationDashboard;
