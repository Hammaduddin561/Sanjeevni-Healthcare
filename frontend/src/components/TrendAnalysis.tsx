import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getHistory, type HistoryResponse } from '../api/client';


const TrendAnalysis: React.FC = () => {
    const [data, setData] = useState<HistoryResponse | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getHistory(10);
                setData(result);
            } catch (e) {
                console.error("Failed to fetch history", e);
            }
        };
        fetchData();

        // Poll every 10s to see updates if user predicts
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    if (!data || !data.history.length) return null;

    // Process for chart (reverse to show chronological)
    const chartData = [...data.history].reverse().map((rec, i) => ({
        index: i + 1,
        date: new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        risk: (rec.risk_assessment.score * 100).toFixed(1)
    }));

    return (
        <div className="h-full w-full">
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} unit="%" tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(4px)',
                                color: '#f8fafc',
                                padding: '8px 12px'
                            }}
                            itemStyle={{ color: '#2dd4bf' }}
                            labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="risk"
                            stroke="#0d9488"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRisk)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
                Visualizing risk progression over last 10 assessments. Velocity metric indicates rate of change.
            </p>
        </div>
    );
};

export default TrendAnalysis;
