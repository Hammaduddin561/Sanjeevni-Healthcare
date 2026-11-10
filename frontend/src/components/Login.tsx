import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, ShieldCheck, HeartPulse, Stethoscope } from 'lucide-react';
import { login } from '../api/client';
import { changeLanguage } from '../i18n';

interface LoginProps {
  onLoginSuccess: (user: { email: string; name: string; role?: string; specialty?: string }) => void;
  onSwitchToSignup: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToSignup }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith('hi') ? 'hi' : 'en';
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const setDemoAccount = (email: string, pass: string, roleName: string) => {
    setFormData({ name: roleName, email, password: pass });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.email || !formData.password) {
      setError("Please fill in email and password");
      setLoading(false);
      return;
    }

    try {
      const authRes = await login(formData.email, formData.password);
      const user = {
        email: authRes.user_email,
        name: authRes.user_name || formData.name || "Clinician",
        role: authRes.role || "worker",
        specialty: authRes.user_specialty
      };

      localStorage.setItem('authToken', authRes.access_token);
      localStorage.setItem('sanjeevniUser', JSON.stringify(user));
      onLoginSuccess(user);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Invalid email or password";
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-clinical-bg dark:bg-clinical-bg-dark font-sans">
      <div className="hidden lg:flex relative flex-col justify-between p-12 bg-slate-900 border-r border-slate-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-clinical-teal-dark opacity-50"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-clinical-teal/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-clinical-teal to-cyan-400 flex items-center justify-center shadow-lg shadow-clinical-teal/20">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold font-display tracking-wide">{t('brand.name')}</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold font-display text-white mb-6 leading-tight">
            {t('login.headline1')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-clinical-teal to-cyan-300">
              {t('login.headline2')}
            </span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">{t('login.tagline')}</p>
        </div>

        <div className="relative z-10 text-slate-500 text-sm">{t('login.footer')}</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-[400px] space-y-8 animate-in slide-in-from-right-4 duration-500">
          <div className="flex justify-end">
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
              <button type="button" onClick={() => changeLanguage('en')} className={`px-2.5 py-1 rounded-lg font-bold ${currentLang === 'en' ? 'bg-clinical-teal text-white' : 'text-slate-600'}`}>EN</button>
              <button type="button" onClick={() => changeLanguage('hi')} className={`px-2.5 py-1 rounded-lg font-bold ${currentLang === 'hi' ? 'bg-clinical-teal text-white' : 'text-slate-600'}`}>हिन्दी</button>
            </div>
          </div>

          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold font-display text-slate-900 dark:text-white">{t('login.welcome')}</h2>
            <p className="text-slate-500 dark:text-slate-400">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">{t('login.full_name')}</label>
              <div className="relative group">
                <User className="absolute left-3 top-3 text-slate-400 group-focus-within:text-clinical-teal transition-colors" size={18} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-clinical-teal/50 focus:border-clinical-teal transition-all"
                  placeholder={t('login.name_placeholder')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">{t('login.email')}</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 text-slate-400 group-focus-within:text-clinical-teal transition-colors" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-clinical-teal/50 focus:border-clinical-teal transition-all"
                  placeholder="doctor@phc.org"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('login.password')}</label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-clinical-teal transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-clinical-teal/50 focus:border-clinical-teal transition-all"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('login.demo_label')}</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDemoAccount('worker@sanjeevni.org', 'Password@123', 'Sunita Devi (ASHA)')}
                  className="px-2 py-1.5 text-xs font-medium rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors flex items-center justify-center gap-1"
                >
                  <HeartPulse size={12} /> {t('login.role_asha')}
                </button>
                <button
                  type="button"
                  onClick={() => setDemoAccount('doctor@phc.org', 'Password@123', 'Dr. Ramesh Gupta')}
                  className="px-2 py-1.5 text-xs font-medium rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition-colors flex items-center justify-center gap-1"
                >
                  <Stethoscope size={12} /> {t('login.role_doctor')}
                </button>
                <button
                  type="button"
                  onClick={() => setDemoAccount('admin@hospital.org', 'password123', 'System Administrator')}
                  className="px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                >
                  <ShieldCheck size={12} /> {t('login.role_admin')}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm flex items-center gap-2 animate-shake">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-clinical-teal to-cyan-600 hover:from-clinical-teal-dark hover:to-cyan-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-clinical-teal/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>{t('login.sign_in')} <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {t('login.no_account')}{' '}
              <button onClick={onSwitchToSignup} className="text-clinical-teal font-semibold hover:underline">
                {t('login.create_account')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
