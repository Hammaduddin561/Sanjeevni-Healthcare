import React, { type ReactNode } from 'react';

interface SectionCardProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
    className?: string;
    action?: ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, children, className = "", action }) => {
    return (
        <div className={`glass-panel rounded-3xl overflow-hidden flex flex-col ${className}`}>
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-start bg-slate-50/30 dark:bg-slate-800/30">
                <div>
                    <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {title}
                    </h3>
                    {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
                </div>
                {action && <div>{action}</div>}
            </div>
            <div className="p-6 flex-1">
                {children}
            </div>
        </div>
    );
};

export default SectionCard;
