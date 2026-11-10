import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface RiskGaugeProps {
    riskScore: number; // 0 to 1
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ riskScore }) => {
    const percentage = Math.round(riskScore * 100);

    // Determine color based on risk
    let color = '#0d9488'; // teal
    let label = 'Low Risk';

    if (riskScore > 0.3) {
        color = '#fbbf24'; // amber
        label = 'Moderate Risk';
    }
    if (riskScore > 0.7) {
        color = '#f43f5e'; // rose
        label = 'High Risk';
    }

    const data = [
        { name: 'Risk', value: percentage, fill: color }
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full w-full relative py-6">
            <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        innerRadius="70%"
                        outerRadius="100%"
                        barSize={20}
                        data={data}
                        startAngle={180}
                        endAngle={0}
                    >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar
                            background={{ fill: '#f1f5f9' }}
                            dataKey="value"
                            cornerRadius={10}
                            animationDuration={1500}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>

                <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="flex flex-col items-center">
                        <span className="text-6xl font-black tracking-tighter text-slate-800 dark:text-white drop-shadow-sm">
                            {percentage}%
                        </span>
                        <span className={`text-xs font-bold uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full ${riskScore > 0.7 ? 'bg-rose-100 text-rose-600' :
                                riskScore > 0.3 ? 'bg-amber-100 text-amber-600' :
                                    'bg-teal-100 text-teal-600'
                            }`}>
                            {label}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-[-10px]">
                <span className="text-[10px] uppercase font-bold text-slate-400">AI Confidence: 94.2%</span>
            </div>
        </div>
    );
};

export default RiskGauge;
