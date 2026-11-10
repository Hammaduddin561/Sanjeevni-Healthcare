import React, { useState } from 'react';
import { Mail, Lock, Building2, Eye, EyeOff, ArrowRight, User } from 'lucide-react';

interface SignupProps {
  onSignupSuccess: (user: { email: string; name: string; specialty: string }) => void;
  onSwitchToLogin: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSignupSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    specialty: '',
    hospital: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("Name is required");
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Valid email is required");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.specialty || !formData.hospital.trim()) {
      setError("Clinical details are required");
      return false;
    }
    return true;
  }

  const validateForm = () => {
    if (!formData.password || formData.password.length < 4) {
      setError("Password must be at least 4 characters");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setError('');
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) setStep(3);
  }

  const prevStep = () => {
    setError('');
    if (step > 1) setStep(step - 1);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const mockUser = {
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`,
        specialty: formData.specialty
      };

      // Store auth state locally
      localStorage.setItem('authToken', 'mock-jwt-token-12345');
      localStorage.setItem('user', JSON.stringify(mockUser));

      onSignupSuccess(mockUser);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-clinical-bg dark:bg-clinical-bg-dark">

      {/* Visual Side */}
      <div className="hidden lg:flex relative flex-col justify-center items-center p-12 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-clinical-teal-dark opacity-90"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-clinical-teal/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-lg text-center text-white space-y-8">
          <h2 className="text-4xl font-display font-bold">Join the Network</h2>
          <div className="grid gap-6 text-left">
            <div className="bg-white/5 p-6 rounded-xl border border-white/10 backdrop-blur-sm">
              <h3 className="font-semibold text-clinical-teal mb-2">Advanced Analytics</h3>
              <p className="text-slate-400 text-sm">Access SOTA ensemble models including BioMistral-7B, XGBoost, and CatBoost for precise risk stratification.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-xl border border-white/10 backdrop-blur-sm">
              <h3 className="font-semibold text-clinical-teal mb-2">Interpretable AI</h3>
              <p className="text-slate-400 text-sm">Understand model decisions with SHAP values and counterfactual reasoning for every prediction.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Signup Form Side */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-6 animate-slide-up">

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-bold font-display text-slate-900 dark:text-white mb-2">Create Account</h2>
            <p className="text-slate-500 dark:text-slate-400">Step {step} of 3</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
                    <input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-clinical-teal outline-none"
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
                    <input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-clinical-teal outline-none"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-clinical-teal outline-none"
                      placeholder="doctor@hospital.org"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Clinical Info */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Specialty</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-slate-400" size={18} />
                    <select
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-clinical-teal outline-none appearance-none"
                    >
                      <option value="">Select Specialty</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Endocrinology">Endocrinology</option>
                      <option value="General Practice">General Practice</option>
                      <option value="Internal Medicine">Internal Medicine</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Hospital / Clinic</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                      name="hospital"
                      value={formData.hospital}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-clinical-teal outline-none"
                      placeholder="Medical Center Name"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Security */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-clinical-teal outline-none"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-clinical-teal outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Back
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 bg-clinical-teal hover:bg-clinical-teal-dark text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Next <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-clinical-teal to-cyan-600 hover:from-clinical-teal-dark hover:to-cyan-700 text-white font-semibold py-2.5 rounded-xl shadow-lg transition-all relative overflow-hidden"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating Account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </button>
              )}
            </div>

          </form>

          <div className="text-center text-sm text-slate-500 font-medium">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="text-clinical-teal hover:underline cursor-pointer">
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
