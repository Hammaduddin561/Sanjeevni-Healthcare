import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { BarChart3, TrendingUp, Zap, ChevronDown, ChevronUp, Languages, AlertCircle, CheckCircle } from 'lucide-react';

export interface ShapExplanation {
    feature: string;
    impact_score: number;
    impact_description: string;
    value?: any;
    plain_text_en?: string;
    plain_text_hi?: string;
}

interface ShapExplainerProps {
    explanations: ShapExplanation[];
    summary_en?: string;
    summary_hi?: string;
    loading?: boolean;
}

type VisualizationMode = 'bar' | 'waterfall' | 'force';

const ShapExplainer: React.FC<ShapExplainerProps> = ({
    explanations = [],
    summary_en,
    summary_hi,
    loading = false
}) => {
    const [mode, setMode] = useState<VisualizationMode>('bar');
    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

    const featureLabels: Record<string, { en: string; hi: string }> = {
        'age': { en: 'Age', hi: 'आयु' },
        'gender': { en: 'Gender', hi: 'लिंग' },
        'bmi': { en: 'Body Weight (BMI)', hi: 'शरीर का वजन (BMI)' },
        'hypertension': { en: 'High Blood Pressure', hi: 'उच्च रक्तचाप' },
        'heart_disease': { en: 'Heart Disease History', hi: 'हृदय रोग इतिहास' },
        'smoking_history': { en: 'Smoking History', hi: 'धूम्रपान इतिहास' },
        'HbA1c_level': { en: 'HbA1c Blood Sugar', hi: 'HbA1c रक्त शर्करा' },
        'blood_glucose_level': { en: 'Blood Glucose', hi: 'रक्त शर्करा (ग्लूकोज)' },
        'BMI_Age_Interaction': { en: 'Weight × Age Synergy', hi: 'वजन व आयु संयुक्त प्रभाव' },
        'Glucose_HbA1c_Interaction': { en: 'Combined Glycemic Factor', hi: 'संयुक्त शर्करा संकेतक' },
        'BMI_Category': { en: 'BMI Category', hi: 'बीएमआई श्रेणी' }
    };

    if (loading) {
        return (
            <div className="w-full h-72 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-clinical-teal"></div>
            </div>
        );
    }

    if (!explanations || explanations.length === 0) {
        return (
            <div className="w-full h-56 flex flex-col items-center justify-center text-slate-400">
                <Zap size={36} className="mb-2 opacity-25" />
                <p className="text-sm">No explanations computed yet.</p>
            </div>
        );
    }

    const sortedExplanations = [...explanations]
        .sort((a, b) => Math.abs(b.impact_score) - Math.abs(a.impact_score))
        .slice(0, 8);

    const positiveImpact = sortedExplanations
        .filter(e => e.impact_score > 0)
        .reduce((sum, e) => sum + e.impact_score, 0);
    const negativeImpact = sortedExplanations
        .filter(e => e.impact_score < 0)
        .reduce((sum, e) => sum + Math.abs(e.impact_score), 0);

    const chartData = sortedExplanations.map(exp => ({
        feature: featureLabels[exp.feature]?.[language] || exp.feature,
        value: exp.impact_score,
        description: exp.impact_description,
        rawFeature: exp.feature
    }));

    let cumulative = 0;
    const waterfallData = sortedExplanations.map((exp) => {
        const start = cumulative;
        cumulative += exp.impact_score;
        return {
            feature: featureLabels[exp.feature]?.[language] || exp.feature,
            start,
            end: cumulative,
            value: exp.impact_score,
            description: exp.impact_description
        };
    });

    const activeSummary = language === 'hi'
        ? (summary_hi || "जांच रिपोर्ट के अनुसार मुख्य जोखिम कारकों का विवरण नीचे दिया गया है।")
        : (summary_en || "Screening indicators identify the following primary factors driving estimated risk.");

    return (
        <div className="w-full space-y-5">
            {/* Plain Language Summary Card */}
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/50 dark:border-teal-800/40">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold tracking-wider uppercase text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                        <Zap size={14} className="text-teal-600 dark:text-teal-400" />
                        {language === 'hi' ? 'सरल भाषा में व्याख्या (Plain-Language Explanation)' : 'Plain-Language Explanation'}
                    </span>
                    <button
                        onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 flex items-center gap-1.5 hover:bg-teal-50 transition-colors shadow-sm"
                        title="Switch Language / भाषा बदलें"
                    >
                        <Languages size={13} />
                        {language === 'en' ? 'हिन्दी में पढ़ें' : 'Read in English'}
                    </button>
                </div>

                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                    {activeSummary}
                </p>

                {/* Key Driver Cards */}
                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {sortedExplanations.slice(0, 4).map((exp, idx) => {
                        const isRiskUp = exp.impact_score > 0.01;
                        const label = featureLabels[exp.feature]?.[language] || exp.feature;
                        const sentence = language === 'hi'
                            ? (exp.plain_text_hi || `${label} का प्रभाव`)
                            : (exp.plain_text_en || `${label} impact`);

                        return (
                            <div
                                key={idx}
                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs ${isRiskUp
                                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/40 text-rose-900 dark:text-rose-200'
                                    : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                                }`}
                            >
                                {isRiskUp ? (
                                    <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                                ) : (
                                    <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <span className="font-semibold block">{label}</span>
                                    <span className="text-[11px] opacity-90 leading-tight">{sentence}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Technical Details Toggle */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                    <span>
                        {showTechnicalDetails
                            ? 'Hide Technical Details (SHAP Values & Charts)'
                            : 'View Technical Details (SHAP Values & Waterfall)'}
                    </span>
                    {showTechnicalDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showTechnicalDetails && (
                    <div className="mt-4 space-y-4">
                        {/* Visualization Mode Selection */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setMode('bar')}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${mode === 'bar'
                                        ? 'bg-clinical-teal/20 text-clinical-teal dark:text-teal-300 font-bold'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <BarChart3 size={14} />
                                    Bar Chart
                                </button>
                                <button
                                    onClick={() => setMode('waterfall')}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${mode === 'waterfall'
                                        ? 'bg-clinical-teal/20 text-clinical-teal dark:text-teal-300 font-bold'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <TrendingUp size={14} />
                                    Waterfall
                                </button>
                                <button
                                    onClick={() => setMode('force')}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${mode === 'force'
                                        ? 'bg-clinical-teal/20 text-clinical-teal dark:text-teal-300 font-bold'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <Zap size={14} />
                                    Force Plot
                                </button>
                            </div>

                            <div className="flex items-center gap-3 text-[11px]">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                                    <span className="text-slate-500">+{positiveImpact.toFixed(3)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    <span className="text-slate-500">-{negativeImpact.toFixed(3)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Chart Render */}
                        <div className="h-64 w-full">
                            {mode === 'bar' && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={chartData}
                                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                                    >
                                        <XAxis type="number" tick={{ fontSize: 10 }} />
                                        <YAxis
                                            type="category"
                                            dataKey="feature"
                                            width={95}
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                        />
                                        <Tooltip
                                            formatter={(value: any, _name: any, props: any) => [
                                                `${Number(value).toFixed(4)} (${props.payload.description})`,
                                                'Impact'
                                            ]}
                                        />
                                        <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {chartData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.value > 0 ? '#f43f5e' : '#10b981'}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}

                            {mode === 'waterfall' && (
                                <div className="h-full flex flex-col justify-center space-y-1.5 px-2">
                                    {waterfallData.slice(0, 6).map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                            <span className="w-28 truncate text-slate-600 dark:text-slate-400">
                                                {item.feature}
                                            </span>
                                            <div className="flex-1 h-6 relative bg-slate-100 dark:bg-slate-800 rounded">
                                                <div
                                                    className={`absolute h-full rounded transition-all ${item.value > 0
                                                        ? 'bg-rose-500/30 border-l-2 border-rose-500'
                                                        : 'bg-emerald-500/30 border-l-2 border-emerald-500'
                                                    }`}
                                                    style={{
                                                        left: `${Math.max(0, Math.min(100, item.start * 100 + 50))}%`,
                                                        width: `${Math.max(4, Math.abs(item.value) * 100)}%`
                                                    }}
                                                />
                                            </div>
                                            <span className="w-12 text-right font-mono text-[10px]">
                                                {item.value > 0 ? '+' : ''}{item.value.toFixed(3)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {mode === 'force' && (
                                <div className="h-full flex flex-col justify-center px-2">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {chartData.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50">
                                                <span className="truncate text-slate-600 dark:text-slate-400">{item.feature}</span>
                                                <span className={`font-mono font-bold ${item.value > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {item.value > 0 ? '+' : ''}{item.value.toFixed(3)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShapExplainer;
