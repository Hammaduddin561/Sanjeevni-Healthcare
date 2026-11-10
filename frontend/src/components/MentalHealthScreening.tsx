import React, { useState } from 'react';
import { Brain, Heart, Phone, Calendar, ChevronRight, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things?",
  "Feeling down, depressed, or hopeless?",
  "Trouble falling or staying asleep, or sleeping too much?",
  "Feeling tired or having little energy?",
  "Poor appetite or overeating?",
  "Feeling bad about yourself — or that you are a failure?",
  "Trouble concentrating on things, such as reading or watching TV?",
  "Moving or speaking so slowly that other people could have noticed — or the opposite?",
  "Thoughts that you would be better off dead, or thoughts of hurting yourself?",
];

const FREQUENCY_OPTIONS = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

interface SeverityInfo {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  advice: string;
}

const getSeverity = (score: number): SeverityInfo => {
  if (score <= 4) return {
    label: 'Minimal Depression', color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle className="w-6 h-6 text-emerald-500" />,
    advice: 'Your score suggests minimal depressive symptoms. Continue with healthy lifestyle habits and self-care.'
  };
  if (score <= 9) return {
    label: 'Mild Depression', color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800',
    icon: <Info className="w-6 h-6 text-yellow-500" />,
    advice: 'Mild symptoms detected. Consider speaking to a mental health professional or counsellor for guidance.'
  };
  if (score <= 14) return {
    label: 'Moderate Depression', color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800',
    icon: <AlertTriangle className="w-6 h-6 text-orange-500" />,
    advice: 'Moderate depression detected. We strongly recommend consulting a mental health professional. Help is available.'
  };
  if (score <= 19) return {
    label: 'Moderately Severe Depression', color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800',
    icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
    advice: 'Your score indicates moderately severe depression. Please reach out to a mental health professional or crisis line immediately.'
  };
  return {
    label: 'Severe Depression', color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-300 dark:border-red-700',
    icon: <AlertTriangle className="w-6 h-6 text-red-700 animate-pulse" />,
    advice: 'URGENT: Severe depression detected. Please contact a crisis helpline or emergency services immediately. You are not alone.'
  };
};

const HELPLINES = [
  { name: 'iCall (TISS)', number: '9152987821', desc: 'Psychological counselling' },
  { name: 'Vandrevala Foundation', number: '1860-2662-345', desc: '24/7 mental health support' },
  { name: 'AASRA', number: '9820466627', desc: 'Suicide prevention' },
  { name: 'Snehi', number: '044-24640050', desc: 'Emotional support' },
];

export default function MentalHealthScreening() {
  const [answers, setAnswers] = useState<number[]>(Array(9).fill(-1));
  const [submitted, setSubmitted] = useState(false);
  const [showCounselling, setShowCounselling] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);

  const totalScore = answers.reduce((sum, v) => sum + (v >= 0 ? v : 0), 0);
  const answered = answers.filter(a => a >= 0).length;
  const allAnswered = answered === 9;
  const severity = getSeverity(totalScore);

  const handleAnswer = (val: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = val;
    setAnswers(newAnswers);
    if (currentQ < 8) setTimeout(() => setCurrentQ(currentQ + 1), 300);
  };

  const handleSubmit = () => {
    if (allAnswered) setSubmitted(true);
  };

  const handleReset = () => {
    setAnswers(Array(9).fill(-1));
    setSubmitted(false);
    setCurrentQ(0);
    setShowCounselling(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-purple-500">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
            <Brain size={28} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Mental Health Screening</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              PHQ-9 — Patient Health Questionnaire. Clinically validated depression screening tool.
              Takes about 2 minutes.
            </p>
          </div>
        </div>
      </div>

      {!submitted ? (
        <div className="glass-panel p-8 rounded-3xl space-y-8">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>Question {Math.min(currentQ + 1, 9)} of 9</span>
              <span>{answered} answered</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(answered / 9) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="text-xs text-slate-400 text-center italic">
              Over the last 2 weeks, how often have you been bothered by…
            </p>
          </div>

          {/* Question Navigator */}
          <div className="flex flex-wrap gap-2 justify-center">
            {PHQ9_QUESTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                  i === currentQ
                    ? 'bg-purple-500 text-white scale-110 shadow-lg'
                    : answers[i] >= 0
                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Current Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                <p className="text-lg font-medium text-slate-800 dark:text-white leading-relaxed">
                  <span className="text-purple-500 font-bold mr-2">Q{currentQ + 1}.</span>
                  {PHQ9_QUESTIONS[currentQ]}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {FREQUENCY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                      answers[currentQ] === opt.value
                        ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-md scale-105'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    <div className="text-lg font-bold mb-1">{opt.value}</div>
                    <div className="text-xs leading-tight">{opt.label}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
            >
              ← Previous
            </button>

            {currentQ < 8 ? (
              <button
                onClick={() => setCurrentQ(currentQ + 1)}
                disabled={answers[currentQ] < 0}
                className="px-6 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-purple-600 transition-colors flex items-center gap-2"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!allAnswered}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2"
              >
                <Brain size={16} /> View Results
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Results */
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Score Card */}
            <div className={`glass-panel p-8 rounded-3xl border-2 ${severity.border}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {severity.icon}
                  <div>
                    <p className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">PHQ-9 Score</p>
                    <h3 className={`text-2xl font-bold font-display ${severity.color}`}>{severity.label}</h3>
                  </div>
                </div>
                <div className={`text-5xl font-bold font-display ${severity.color}`}>
                  {totalScore}<span className="text-xl text-slate-400">/27</span>
                </div>
              </div>

              {/* Score bar */}
              <div className="relative h-4 bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 to-red-500 rounded-full mb-4 overflow-hidden">
                <div
                  className="absolute right-0 top-0 h-full bg-slate-100/60 dark:bg-slate-900/60 transition-all duration-1000"
                  style={{ width: `${((27 - totalScore) / 27) * 100}%` }}
                />
                <div
                  className="absolute top-0 h-full w-1.5 bg-white rounded-full shadow-lg transition-all duration-1000"
                  style={{ left: `${(totalScore / 27) * 100}%`, transform: 'translateX(-50%)' }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Minimal (0-4)</span>
                <span>Mild (5-9)</span>
                <span>Moderate (10-14)</span>
                <span>Severe (20+)</span>
              </div>

              <div className={`mt-6 p-4 rounded-xl ${severity.bg} border ${severity.border}`}>
                <p className={`text-sm font-medium ${severity.color}`}>{severity.advice}</p>
              </div>
            </div>

            {/* Answers Summary */}
            <div className="glass-panel p-6 rounded-3xl">
              <h4 className="font-bold text-slate-900 dark:text-white mb-4">Response Summary</h4>
              <div className="space-y-2">
                {PHQ9_QUESTIONS.map((q, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">{q}</span>
                    <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                      answers[i] === 0 ? 'bg-emerald-100 text-emerald-700' :
                      answers[i] === 1 ? 'bg-yellow-100 text-yellow-700' :
                      answers[i] === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {FREQUENCY_OPTIONS[answers[i]]?.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Crisis Helplines */}
            <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-rose-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-rose-500/10">
                  <Phone size={20} className="text-rose-500" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white">Mental Health Helplines (India)</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {HELPLINES.map(h => (
                  <div key={h.name} className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{h.name}</p>
                    <p className="text-rose-600 dark:text-rose-400 font-mono font-bold text-lg">{h.number}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{h.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setShowCounselling(!showCounselling)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg"
              >
                <Calendar size={18} /> Book Counselling Session
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Retake Screening
              </button>
            </div>

            {/* Counselling Modal */}
            {showCounselling && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 rounded-3xl border border-purple-200 dark:border-purple-800"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-purple-500/10">
                    <Heart size={20} className="text-purple-500" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Counselling Resources</h4>
                </div>
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                  <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800">
                    <p className="font-semibold text-purple-700 dark:text-purple-300 mb-1">🏥 iCall — TISS</p>
                    <p>Professional counselling from trained psychologists. Call <span className="font-mono font-bold">9152987821</span> Mon–Sat 8am–10pm</p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800">
                    <p className="font-semibold text-purple-700 dark:text-purple-300 mb-1">💬 Online Counselling</p>
                    <p>Platforms like YourDOST, MindPeers, and Wysa offer chat-based mental health support with certified therapists.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800">
                    <p className="font-semibold text-purple-700 dark:text-purple-300 mb-1">🏨 Hospital OPD</p>
                    <p>Visit the psychiatry OPD at your nearest government hospital. NIMHANS Bangalore: <span className="font-mono font-bold">080-46110007</span></p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-4 italic">
                  Note: This screening is for informational purposes only and not a clinical diagnosis.
                  Always consult a qualified mental health professional.
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
