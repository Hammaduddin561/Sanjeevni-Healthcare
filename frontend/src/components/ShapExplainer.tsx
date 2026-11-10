import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { BarChart3, TrendingUp, Zap } from 'lucide-react';

interface ShapExplanation {
    feature: string;
    impact_score: number;
    impact_description: string;
}

interface ShapExplainerProps {
    explanations: ShapExplanation[];
    loading?: boolean;
}

type VisualizationMode = 'bar' | 'waterfall' | 'force';

const ShapExplainer: React.FC<ShapExplainerProps> = ({ explanations = [], loading = false }) => {
    const [mode, setMode] = useState<VisualizationMode>('bar');

    // Mapping for readable feature names
    const featureLabels: Record<string, string> = {
        'age': 'Age',
        'gender': 'Gender',
        'bmi': 'BMI',
        'hypertension': 'Hypertension',
        'heart_disease': 'Heart Disease',
        'smoking_history': 'Smoking History',
        'HbA1c_level': 'HbA1c Level',
        'blood_glucose_level': 'Blood Glucose',
        'BMI_Age_Interaction': 'BMI × Age',
        'Glucose_HbA1c_Interaction': 'Glucose × HbA1c',
        'BMI_Category': 'BMI Category'
    };

    if (loading) {
        return (
            <div className="w-full h-96 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!explanations || explanations.length === 0) {
        return (
            <div className="w-full h-96 flex flex-col items-center justify-center text-gray-400">
                <Zap size={48} className="mb-3 opacity-20" />
                <p className="text-sm">No explanations available</p>
            </div>
        );
    }

    // Sort by absolute impact and take top features
    const sortedExplanations = [...explanations]
        .sort((a, b) => Math.abs(b.impact_score) - Math.abs(a.impact_score))
        .slice(0, 10);

    // Calculate summary statistics
    const positiveImpact = sortedExplanations
        .filter(e => e.impact_score > 0)
        .reduce((sum, e) => sum + e.impact_score, 0);
    const negativeImpact = sortedExplanations
        .filter(e => e.impact_score < 0)
        .reduce((sum, e) => sum + Math.abs(e.impact_score), 0);

    // Prepare data for charts
    const chartData = sortedExplanations.map(exp => ({
        feature: featureLabels[exp.feature] || exp.feature,
        value: exp.impact_score,
        description: exp.impact_description,
        rawFeature: exp.feature
    }));

    // Waterfall data (cumulative)
    let cumulative = 0;
    const waterfallData = sortedExplanations.map((exp) => {
        const start = cumulative;
        cumulative += exp.impact_score;
        return {
            feature: featureLabels[exp.feature] || exp.feature,
            start,
            end: cumulative,
            value: exp.impact_score,
            description: exp.impact_description
        };
    });

    return (
        <div className="w-full space-y-4">
            {/* Header with Mode Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMode('bar')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'bar'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                    >
                        <BarChart3 size={16} />
                        Bar Chart
                    </button>
                    <button
                        onClick={() => setMode('waterfall')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'waterfall'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                    >
                        <TrendingUp size={16} />
                        Waterfall
                    </button>
                    <button
                        onClick={() => setMode('force')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'force'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                    >
                        <Zap size={16} />
                        Force Plot
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400">
                            +{positiveImpact.toFixed(3)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400">
                            -{negativeImpact.toFixed(3)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Visualization */}
            <div className="h-80 w-full">
                {mode === 'bar' && (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={chartData}
                            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                        >
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis
                                type="category"
                                dataKey="feature"
                                width={95}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    fontSize: '12px'
                                }}
                                formatter={(value: any, _name: any, props: any) => [
                                    `${Number(value).toFixed(4)} (${props.payload.description})`,
                                    'Impact'
                                ]}
                            />
                            <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={1.5} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.value > 0 ? '#ef4444' : '#22c55e'}
                                        opacity={0.8}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}

                {mode === 'waterfall' && (
                    <div className="h-full flex flex-col justify-center space-y-2 px-4">
                        {waterfallData.slice(0, 8).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <span className="text-xs text-gray-600 dark:text-gray-400 w-24 truncate">
                                    {item.feature}
                                </span>
                                <div className="flex-1 h-8 relative">
                                    <div
                                        className={`absolute h-full rounded transition-all ${item.value > 0 ? 'bg-red-500/20 border-l-2 border-red-500' : 'bg-green-500/20 border-l-2 border-green-500'
                                            }`}
                                        style={{
                                            left: `${Math.min(item.start, item.end) * 100 + 50}%`,
                                            width: `${Math.abs(item.value) * 100}%`
                                        }}
                                    >
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                                            {item.value > 0 ? '+' : ''}{item.value.toFixed(3)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {mode === 'force' && (
                    <div className="h-full flex flex-col justify-center px-4">
                        <div className="relative h-24 bg-gradient-to-r from-green-50 via-gray-50 to-red-50 dark:from-green-900/10 dark:via-gray-900/10 dark:to-red-900/10 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-px h-full bg-gray-300 dark:bg-gray-600"></div>
                            </div>
                            {chartData.slice(0, 6).map((item, idx) => {
                                const isPositive = item.value > 0;
                                const width = Math.abs(item.value) * 200;
                                return (
                                    <div
                                        key={idx}
                                        className={`absolute top-1/2 -translate-y-1/2 h-6 rounded flex items-center justify-center text-xs font-medium text-white transition-all hover:scale-105 cursor-pointer ${isPositive ? 'bg-red-500' : 'bg-green-500'
                                            }`}
                                        style={{
                                            [isPositive ? 'left' : 'right']: '50%',
                                            width: `${Math.min(width, 150)}px`,
                                            opacity: 0.7 + (Math.abs(item.value) * 3),
                                            zIndex: 10 - idx
                                        }}
                                        title={`${item.feature}: ${item.value.toFixed(4)}`}
                                    >
                                        <span className="truncate px-2">{item.feature}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            {chartData.slice(0, 6).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                    <div className={`w-3 h-3 rounded ${item.value > 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                    <span className="text-gray-600 dark:text-gray-400 truncate flex-1">
                                        {item.feature}
                                    </span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        {item.value > 0 ? '+' : ''}{item.value.toFixed(3)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                    <span>Increases Risk</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                    <span>Decreases Risk</span>
                </div>
            </div>
        </div>
    );
};

export default ShapExplainer;
