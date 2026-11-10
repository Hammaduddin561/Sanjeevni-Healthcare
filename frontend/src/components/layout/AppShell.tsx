import React, { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { Activity, User, LogOut, ChevronDown, Sparkles, LayoutDashboard, FileClock, Brain, MessageCircle, Scale, Stethoscope } from 'lucide-react';
import { Howl } from 'howler';

interface AppShellProps {
    children: ReactNode;
    user?: { email: string; name: string; role?: string; specialty?: string } | null;
    onLogout?: () => void;
    currentView?: 'screening' | 'dashboard' | 'logs' | 'mental-health' | 'wellness-chat' | 'model-card';
    onNavigate?: (view: 'screening' | 'dashboard' | 'logs' | 'mental-health' | 'wellness-chat' | 'model-card') => void;
}

const AppShell: React.FC<AppShellProps> = ({ children, user, onLogout, currentView = 'dashboard', onNavigate }) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language.startsWith('hi') ? 'hi' : 'en';

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
    };

    const uiClickSound = new Howl({
        src: ['/sounds/click.wav'],
        volume: 0.15,
        html5: false // Use Web Audio API for responsiveness and to avoid pool limits
    });

    const playClick = () => {
        uiClickSound.play();
    };

    return (
        <div className="min-h-screen font-sans">
            {/* Navbar */}
            <header className="fixed top-4 left-4 right-4 z-50 rounded-2xl glass-panel px-6 h-18 flex items-center justify-between transition-all duration-300">

                {/* Brand */}
                <button onClick={() => { playClick(); onNavigate?.('dashboard'); }} className="flex items-center gap-3.5 group">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-clinical-teal to-clinical-teal-dark text-white shadow-lg overflow-hidden group-hover:scale-105 transition-transform">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <Activity size={20} strokeWidth={2.5} className="relative z-10" />
                    </div>
                    <div className="flex flex-col items-start">
                        <h1 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                            Sanjeevni<span className="text-transparent bg-clip-text bg-gradient-to-r from-clinical-teal to-cyan-400">Care</span>
                        </h1>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Sparkles size={8} className="text-cyan-500" />
                            AI Health Platform
                        </span>
                    </div>
                </button>

                {/* Right Actions */}
                <div className="flex items-center gap-5">
                    <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/50 rounded-full px-1.5 py-1 border border-white/20 dark:border-white/5">
                        <button
                            onClick={() => { playClick(); onNavigate?.('screening'); }}
                            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-2 ${currentView === 'screening' ? 'bg-white dark:bg-slate-700 text-clinical-teal dark:text-teal-400 shadow-sm font-bold' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                        >
                            <Stethoscope size={14} />
                            {t('nav.screening')}
                        </button>
                        <button
                            onClick={() => { playClick(); onNavigate?.('dashboard'); }}
                            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-2 ${currentView === 'dashboard' ? 'bg-white dark:bg-slate-700 text-clinical-teal dark:text-teal-400 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                        >
                            <LayoutDashboard size={14} />
                            {t('nav.dashboard')}
                        </button>
                        <button
                            onClick={() => { playClick(); onNavigate?.('mental-health'); }}
                            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-2 ${currentView === 'mental-health' ? 'bg-white dark:bg-slate-700 text-purple-500 dark:text-purple-400 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                        >
                            <Brain size={14} />
                            {t('nav.mental_health')}
                        </button>
                        <button
                            onClick={() => { playClick(); onNavigate?.('wellness-chat'); }}
                            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-2 ${currentView === 'wellness-chat' ? 'bg-white dark:bg-slate-700 text-green-500 dark:text-green-400 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                        >
                            <MessageCircle size={14} />
                            {t('nav.assistant')}
                        </button>
                        <button
                            onClick={() => { playClick(); onNavigate?.('model-card'); }}
                            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-2 ${currentView === 'model-card' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                        >
                            <Scale size={14} />
                            {t('nav.model_card')}
                        </button>
                        {(user?.role === 'admin') && (
                            <button
                                onClick={() => { playClick(); onNavigate?.('logs'); }}
                                className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-2 ${currentView === 'logs' ? 'bg-white dark:bg-slate-700 text-clinical-teal dark:text-teal-400 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                            >
                                <FileClock size={14} />
                                {t('nav.audit_logs')}
                            </button>
                        )}
                    </nav>

                    {/* Global Language Toggle */}
                    <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
                        <button
                            type="button"
                            onClick={() => changeLanguage('en')}
                            className={`px-2 py-1 rounded-lg font-bold ${currentLang === 'en' ? 'bg-clinical-teal text-white' : 'text-slate-600 dark:text-slate-300'}`}
                        >
                            EN
                        </button>
                        <button
                            type="button"
                            onClick={() => changeLanguage('hi')}
                            className={`px-2 py-1 rounded-lg font-bold ${currentLang === 'hi' ? 'bg-clinical-teal text-white' : 'text-slate-600 dark:text-slate-300'}`}
                        >
                            हिन्दी
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />

                    {/* User Menu */}
                    <div className="relative">
                        <button
                            onClick={() => { playClick(); setShowUserMenu(!showUserMenu); }}
                            className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all border border-transparent hover:border-white/40 dark:hover:border-slate-700"
                        >
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 flex items-center justify-center text-white dark:text-slate-900 text-xs font-bold shadow-md ring-2 ring-white dark:ring-slate-800">
                                {user?.name ? getInitials(user.name) : <User size={14} />}
                            </div>
                            <div className="hidden sm:flex flex-col items-start">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">{user?.name || 'Guest User'}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">View Profile</span>
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown */}
                        {showUserMenu && user && (
                            <div className="absolute right-0 mt-3 w-64 glass-panel rounded-2xl p-2 z-50 animate-fade-in origin-top-right shadow-2xl">
                                <div className="px-4 py-3 bg-gradient-to-br from-slate-50/80 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-800/50 rounded-xl mb-1 border border-white/50 dark:border-slate-700">
                                    <p className="font-bold text-slate-900 dark:text-white text-sm font-display">{user.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">{user.email}</p>
                                    {user.specialty && (
                                        <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-clinical-teal/10 text-clinical-teal dark:text-teal-400 uppercase tracking-wide border border-clinical-teal/20">
                                            {user.specialty}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-0.5">
                                    <button
                                        onClick={() => {
                                            playClick();
                                            setShowUserMenu(false);
                                            onLogout?.();
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-clinical-coral hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors flex items-center gap-2.5 font-medium group"
                                    >
                                        <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Spacer */}
            <div className="h-28" />

            {/* Main Content */}
            <main className="max-w-[1400px] mx-auto px-6 py-4 animate-fade-in pb-12">
                {children}
            </main>

            {/* Research Prototype Footer Disclaimer */}
            <footer className="border-t border-slate-200/60 dark:border-slate-800/60 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-4 space-y-1.5">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                        ⚖️ Sanjeevni Healthcarer is a research prototype developed for rural community health screening.
                    </p>
                    <p className="text-[11px] opacity-80">
                        It does NOT provide definitive medical diagnoses or clinical prescriptions and must NEVER replace consultation with a qualified doctor. In medical emergencies, immediately dial 112 or Tele-MANAS 14416.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default AppShell;
