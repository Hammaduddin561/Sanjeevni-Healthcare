import { useState, useEffect, lazy, Suspense } from 'react';
import PatientInputs from './components/PatientInputs';
import ClinicianDashboard from './components/ClinicianDashboard';
import AppShell from './components/layout/AppShell';
import Login from './components/Login';
import Signup from './components/Signup';
import AuditLog from './components/AuditLog';
import StoryPage from './components/StoryPage';
import GlobalBackground from './components/GlobalBackground';
import MentalHealthScreening from './components/MentalHealthScreening';
import WellnessChatbot from './components/WellnessChatbot';
import ModelCard from './components/ModelCard';
import GuidedVisitFlow from './components/GuidedVisitFlow';
import DoctorDashboard from './components/DoctorDashboard';
import { type PredictionResponse, type PredictionInput } from './api/client';
import { Stethoscope, Brain } from 'lucide-react';

const DigitalTwinModel = lazy(() => import('./components/DigitalTwinModel'));

interface User {
  email: string;
  name: string;
  role?: string;
  specialty?: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [view, setView] = useState<'screening' | 'dashboard' | 'logs' | 'mental-health' | 'wellness-chat' | 'model-card'>('screening');
  const [showIntro, setShowIntro] = useState(false);
  const [predictionData, setPredictionData] = useState<PredictionResponse | null>(null);
  const [patientData, setPatientData] = useState<PredictionInput | null>(null);


  useEffect(() => {
    const storedUser = localStorage.getItem('sanjeevniUser');
    const token = localStorage.getItem('authToken');
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('sanjeevniUser');
        localStorage.removeItem('authToken');
      }
    } else {
      localStorage.removeItem('sanjeevniUser');
    }

    const onUnauthorized = () => {
      setUser(null);
      setIsAuthenticated(false);
      setPredictionData(null);
      setPatientData(null);
      localStorage.removeItem('sanjeevniUser');
      localStorage.removeItem('authToken');
    };
    window.addEventListener('sanjeevni:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sanjeevni:unauthorized', onUnauthorized);
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    setShowIntro(false);
    localStorage.setItem('sanjeevniUser', JSON.stringify(userData));
  };

  const handleSignupSuccess = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    setShowIntro(false);
    localStorage.setItem('sanjeevniUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setPredictionData(null);
    setPatientData(null);
    localStorage.removeItem('sanjeevniUser');
    localStorage.removeItem('authToken');
  };

  const handlePredictionSuccess = (data: PredictionResponse, input: PredictionInput) => {
    setPredictionData(data);
    setPatientData(input);
  };

  if (!isAuthenticated) {
    if (authMode === 'login') {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSwitchToSignup={() => setAuthMode('signup')}
        />
      );
    } else {
      return (
        <Signup
          onSignupSuccess={handleSignupSuccess}
          onSwitchToLogin={() => setAuthMode('login')}
        />
      );
    }
  }

  return (
    <div className="relative w-full min-h-screen">
      <GlobalBackground
        mode={showIntro ? 'story' : 'dashboard'}
      />

      <div className="relative z-10">
        {showIntro ? (
          <StoryPage
            onComplete={() => setShowIntro(false)}
          />
        ) : (
          <AppShell
            onLogout={handleLogout}
            user={user}
            currentView={view}
            onNavigate={(v) => setView(v as 'screening' | 'dashboard' | 'logs' | 'mental-health' | 'wellness-chat' | 'model-card')}
          >
            {view === 'screening' ? (
              <div className="max-w-5xl mx-auto py-6 px-4">
                <GuidedVisitFlow
                  workerName={user?.name || "ASHA Health Worker"}
                  workerEmail={user?.email || "worker@sanjeevni.org"}
                />
              </div>
            ) : view === 'logs' ? (
              <div className="max-w-5xl mx-auto">
                <AuditLog />
              </div>
            ) : view === 'mental-health' ? (
              <div className="max-w-3xl mx-auto py-6">
                <MentalHealthScreening />
              </div>
            ) : view === 'wellness-chat' ? (
              <div className="max-w-3xl mx-auto py-6">
                <WellnessChatbot />
              </div>
            ) : view === 'model-card' ? (
              <div className="max-w-5xl mx-auto py-6">
                <ModelCard />
              </div>
            ) : view === 'dashboard' ? (
              <div className="py-2">
                <DoctorDashboard />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1600px] mx-auto pb-12">

                {/* Left Column: Input Form */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-clinical-teal flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-clinical-teal/10 text-clinical-teal">
                      <Stethoscope size={24} strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">New Assessment</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter patient vitals below to generate a multi-model risk profile.</p>
                    </div>
                  </div>
                  <PatientInputs onPredictionSuccess={handlePredictionSuccess} />
                </div>

                {/* Right Column: Dashboard */}
                <div className="lg:col-span-8 xl:col-span-8">
                  {predictionData ? (
                    <ClinicianDashboard
                      prediction={predictionData}
                      patientInput={patientData!}
                      onReset={() => { setPredictionData(null); setPatientData(null); }}
                      user={user || { name: 'Clinician', email: 'doc@hospital.com' }}
                    />
                  ) : (
                    <div className="glass-panel min-h-[600px] h-full rounded-3xl p-0 flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-br from-white/40 to-white/10 dark:from-slate-900/40 dark:to-slate-900/10">
                      {/* 3D Digital Twin Model (Lazy Loaded to avoid GPU load) */}
                      <div className="absolute inset-0 z-0">
                        <Suspense fallback={<div className="w-full h-full bg-slate-900/10 animate-pulse" />}>
                          <DigitalTwinModel />
                        </Suspense>
                      </div>

                      <div className="relative z-10 flex flex-col items-center pointer-events-none mt-40">
                        <div className="relative mb-6">
                          <div className="relative bg-white/10 dark:bg-slate-900/30 p-6 rounded-2xl backdrop-blur-md shadow-glass ring-1 ring-white/20">
                            <Brain className="text-clinical-teal dark:text-teal-400 w-12 h-12" strokeWidth={1.5} />
                          </div>
                        </div>

                        <h3 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                          Ready for <span className="text-transparent bg-clip-text bg-gradient-to-r from-clinical-teal to-cyan-500">Analysis</span>
                        </h3>

                        <p className="text-slate-500 dark:text-slate-400 max-w-md text-base leading-relaxed mb-8 px-4">
                          Our SOTA ensemble model combined with BioMistral-7B provides explainable risk predictions and digital twin simulations.
                        </p>

                        <div className="flex gap-4">
                          <div className="px-4 py-2 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white/20 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2 backdrop-blur-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            System Online
                          </div>
                          <div className="px-4 py-2 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white/20 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2 backdrop-blur-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            v2.0 Loaded
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </AppShell>
        )}
      </div>
    </div>
  );
}

export default App;
