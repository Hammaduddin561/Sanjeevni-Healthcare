import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Bot, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface Intent {
  patterns: string[];
  responses: string[];
  tag: string;
}

const INTENTS: Intent[] = [
  {
    tag: 'greeting',
    patterns: ['hello', 'hi', 'hey', 'good morning', 'namaste', 'hii', 'helo'],
    responses: [
      'Namaste! 🙏 I\'m Sanjeevni\'s Wellness Guide. Ask me anything about diabetes, heart health, nutrition, or mental wellness!',
      'Hello! Welcome to Sanjeevni. How can I support your health journey today?',
    ]
  },
  {
    tag: 'hba1c',
    patterns: ['hba1c', 'a1c', 'glycated hemoglobin', 'haemoglobin a1c', 'what is a1c'],
    responses: [
      '🩸 HbA1c (Glycated Haemoglobin) measures your average blood sugar over 2–3 months.\n\n• Normal: Below 5.7%\n• Pre-diabetes: 5.7% – 6.4%\n• Diabetes: 6.5% or higher\n\nThe lower your HbA1c, the better your long-term diabetes control!'
    ]
  },
  {
    tag: 'blood_glucose',
    patterns: ['blood glucose', 'blood sugar', 'glucose level', 'fasting sugar', 'normal sugar', 'sugar level'],
    responses: [
      '📊 Healthy blood glucose ranges:\n\n• Fasting (8+ hrs): 70–99 mg/dL (Normal)\n• Post-meal (2 hrs): Below 140 mg/dL\n• Pre-diabetes fasting: 100–125 mg/dL\n• Diabetes fasting: 126 mg/dL+\n\n💡 Tip: Check your glucose in the morning before eating for the most accurate fasting reading.'
    ]
  },
  {
    tag: 'bmi',
    patterns: ['bmi', 'body mass index', 'weight', 'overweight', 'obese', 'ideal weight', 'healthy weight'],
    responses: [
      '⚖️ BMI (Body Mass Index) = Weight(kg) / Height(m)²\n\n• Below 18.5: Underweight\n• 18.5 – 24.9: Normal weight ✅\n• 25 – 29.9: Overweight ⚠️\n• 30+: Obese 🚨\n\nFor South Asians, a BMI above 23 may indicate increased metabolic risk. Consult your doctor for personalized advice.'
    ]
  },
  {
    tag: 'diabetes_prevention',
    patterns: ['reduce diabetes', 'prevent diabetes', 'diabetes risk', 'avoid diabetes', 'lower risk', 'diabetes prevention'],
    responses: [
      '🛡️ 5 proven ways to reduce diabetes risk:\n\n1. **Lose 5–7% body weight** if overweight\n2. **Walk 30 mins daily** — even after meals\n3. **Cut refined carbs & sugary drinks**\n4. **Eat more fiber** (whole grains, dal, vegetables)\n5. **Manage stress** — chronic stress spikes blood sugar\n\nThe Diabetes Prevention Program showed lifestyle changes reduce Type 2 diabetes risk by 58%!'
    ]
  },
  {
    tag: 'diabetes_symptoms',
    patterns: ['symptoms of diabetes', 'diabetes symptoms', 'signs of diabetes', 'how to know diabetes', 'diabetes signs'],
    responses: [
      '⚠️ Common diabetes symptoms:\n\n• Frequent urination (especially at night)\n• Excessive thirst\n• Unexplained weight loss\n• Blurry vision\n• Slow-healing wounds\n• Tingling in hands/feet\n• Extreme fatigue\n\n🔴 If you experience multiple symptoms, get a blood glucose test immediately. Early detection saves lives!'
    ]
  },
  {
    tag: 'heart_health',
    patterns: ['heart', 'cardiac', 'cardiovascular', 'blood pressure', 'cholesterol', 'bp'],
    responses: [
      '❤️ Heart health tips for diabetics:\n\n• Keep blood pressure below 130/80 mmHg\n• LDL cholesterol target: below 100 mg/dL\n• Quit smoking — it doubles heart disease risk\n• Exercise 150 mins/week\n• Take prescribed medications consistently\n\nDiabetes + high BP is a dangerous combination. Regular monitoring is key!'
    ]
  },
  {
    tag: 'posture',
    patterns: ['posture', 'back pain', 'sitting', 'spine', 'neck pain', 'ergonomics'],
    responses: [
      '🧘 Good posture for desk workers:\n\n• Screen at eye level — no neck strain\n• Feet flat on floor, knees at 90°\n• Lower back supported by chair\n• Take a 5-min break every hour\n• Try the 20-20-20 rule: every 20 mins, look 20 feet away for 20 seconds\n\n💪 Poor posture contributes to chronic pain and reduced blood circulation. Set hourly reminders!'
    ]
  },
  {
    tag: 'exercise',
    patterns: ['exercise', 'workout', 'physical activity', 'walk', 'yoga', 'gym', 'fitness'],
    responses: [
      '🏃 Exercise recommendations for metabolic health:\n\n• **150 min/week** moderate activity (brisk walking, cycling)\n• **Post-meal walks** (10–15 min) reduce glucose spikes by up to 30%\n• **Resistance training** 2x/week builds insulin-sensitive muscle\n• **Yoga** reduces cortisol and improves insulin sensitivity\n\n🌟 Even 10 minutes of movement is better than none!'
    ]
  },
  {
    tag: 'diet',
    patterns: ['diet', 'food', 'eat', 'nutrition', 'meal', 'what to eat', 'avoid food', 'healthy food'],
    responses: [
      '🥗 Diabetes-friendly diet essentials:\n\n✅ **Eat more:**\n• Leafy greens (spinach, methi, palak)\n• Whole grains (brown rice, jowar, bajra)\n• Legumes (dal, rajma, chana)\n• Healthy fats (nuts, olive oil, avocado)\n\n❌ **Limit:**\n• White rice, maida, white bread\n• Sugary drinks, fruit juices\n• Fried & ultra-processed foods\n• High-sodium packaged snacks'
    ]
  },
  {
    tag: 'mental_health',
    patterns: ['stress', 'anxiety', 'depression', 'mental health', 'sad', 'worried', 'feeling low', 'mental'],
    responses: [
      '🧠 Mental health matters for physical health too:\n\n• Stress hormones (cortisol) directly raise blood sugar\n• Depression is 2× more common in diabetics\n• Use our **Mental Health Screening** tab for a PHQ-9 assessment\n\n🆘 Crisis helplines:\n• iCall: 9152987821\n• Vandrevala: 1860-2662-345\n• AASRA: 9820466627\n\nYou\'re not alone. Seeking help is a sign of strength!'
    ]
  },
  {
    tag: 'sleep',
    patterns: ['sleep', 'insomnia', 'tired', 'fatigue', 'sleeping', 'rest'],
    responses: [
      '😴 Sleep & metabolic health:\n\n• Less than 6 hours sleep increases diabetes risk by 28%\n• Poor sleep raises ghrelin (hunger hormone) → overeating\n• Aim for **7–9 hours** nightly\n\n💡 Tips for better sleep:\n• Same sleep/wake time daily\n• No screens 1 hr before bed\n• Cool, dark room (18–21°C)\n• Avoid caffeine after 2pm'
    ]
  },
  {
    tag: 'goodbye',
    patterns: ['bye', 'goodbye', 'thanks', 'thank you', 'ok', 'done', 'that\'s all'],
    responses: [
      'Stay healthy! 🌱 Remember to check the Risk Assessment tab for personalized health predictions. Namaste! 🙏',
      'Take care! For detailed risk analysis, use the Assessment panel. See you! 😊'
    ]
  },
];

const SUGGESTIONS = [
  'What is HbA1c?',
  'Normal blood sugar levels?',
  'How to prevent diabetes?',
  'Tips for better sleep',
  'Exercise for diabetes',
  'Stress & blood sugar link',
];

const findResponse = (input: string): string => {
  const lower = input.toLowerCase();
  for (const intent of INTENTS) {
    if (intent.patterns.some(p => lower.includes(p))) {
      return intent.responses[Math.floor(Math.random() * intent.responses.length)];
    }
  }
  return "🤔 I didn't quite catch that. Try asking about:\n• Blood glucose levels\n• HbA1c & diabetes\n• Heart health tips\n• Exercise recommendations\n• Diet & nutrition\n• Mental wellness";
};

export default function WellnessChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'bot',
      text: 'Namaste! 🙏 I\'m your Sanjeevni Wellness Guide — your 24/7 health companion.\n\nAsk me about diabetes, blood sugar, nutrition, exercise, posture, or mental health. I\'m here to help!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: findResponse(text),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 600 + Math.random() * 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.replace(/\*\*(.*?)\*\*/g, '$1')}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-green-500">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-green-500/10 text-green-500">
            <MessageCircle size={28} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Wellness Guide</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              AI-powered health chatbot with knowledge on diabetes, nutrition, exercise & mental wellness.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Online
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <div className="glass-panel rounded-3xl overflow-hidden flex flex-col h-[560px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'bot'
                    ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white'
                    : 'bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-500 text-white dark:text-slate-900'
                }`}>
                  {msg.role === 'bot' ? <Bot size={16} /> : <User size={14} />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'bot'
                    ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700 rounded-tl-sm shadow-sm'
                    : 'bg-gradient-to-br from-clinical-teal to-cyan-600 text-white rounded-tr-sm shadow-md'
                }`}>
                  <p className="whitespace-pre-wrap">{formatText(msg.text)}</p>
                  <span className={`text-[10px] mt-2 block ${msg.role === 'bot' ? 'text-slate-400' : 'text-white/60'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                  <div className="flex gap-1.5 items-center h-4">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-green-500"
                        animate={{ y: ['0%', '-50%', '0%'] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        <div className="px-6 pb-3 flex gap-2 flex-wrap border-t border-slate-100 dark:border-slate-800 pt-3">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center gap-1"
            >
              <Sparkles size={10} />
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about diabetes, nutrition, exercise..."
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-xl disabled:opacity-40 hover:from-green-600 hover:to-teal-700 transition-all shadow-lg"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
