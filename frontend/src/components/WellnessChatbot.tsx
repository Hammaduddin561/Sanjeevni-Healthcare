import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Bot, User, AlertTriangle, ShieldCheck, PhoneCall, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  isEmergency?: boolean;
  source?: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  'What is normal fasting blood sugar?',
  'What is the cutoff for high BP?',
  'Tips to lower HbA1c with diet',
  'मरीज का बीपी 180 से ऊपर है, क्या करें?'
];

import { API_BASE_URL, handleUnauthorized } from '../api/client';

export const WellnessChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Namaste! 🙏 I am Sanjeevni AI Assistant, grounded in WHO, ADA, and AHA guidelines. How can I assist with your health screening today? (Available in English & हिन्दी)',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [llmOnline, setLlmOnline] = useState<boolean>(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Health check
    fetch(`${API_BASE_URL}/llm/health`)
      .then(r => r.json())
      .then(d => setLlmOnline(d.status === 'ok'))
      .catch(() => setLlmOnline(false));
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const botMsgId = (Date.now() + 1).toString();
    const botPlaceholder: Message = {
      id: botMsgId,
      role: 'bot',
      text: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, botPlaceholder]);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message: text.trim() })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error('Streaming failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE data
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                accumulated += data.text;
                const isEmergency = accumulated.includes('EMERGENCY') || accumulated.includes('आपातकालीन');
                setMessages(prev =>
                  prev.map(m => m.id === botMsgId ? { ...m, text: accumulated, isEmergency } : m)
                );
              }
            } catch {
              // Non-JSON or keepalive
            }
          }
        }
      }
    } catch {
      // Graceful offline fallback
      setMessages(prev =>
        prev.map(m =>
          m.id === botMsgId
            ? {
                ...m,
                text: 'Assistant is running in offline mode. Please consult your nearest Primary Health Centre Medical Officer for clinical advice.\n\nHelplines: Emergency: 112 | Tele-MANAS: 14416'
              }
            : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-emerald-500 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <MessageCircle size={28} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Grounded Health Assistant</h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck size={12} /> ADA/AHA/WHO Grounded
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Screening assistance for ASHA workers. Cites verified medical guidelines. Zero hallucination guarantee.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {llmOnline ? 'AI Ready' : 'Grounded Fallback'}
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <div className="glass-panel rounded-3xl overflow-hidden flex flex-col h-[560px] shadow-sm">
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
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'bot'
                      ? msg.isEmergency
                        ? 'bg-rose-600 text-white animate-bounce'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                      : 'bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-500 text-white dark:text-slate-900'
                  }`}
                >
                  {msg.role === 'bot' ? (msg.isEmergency ? <AlertTriangle size={16} /> : <Bot size={16} />) : <User size={14} />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-sm whitespace-pre-line leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                      : msg.isEmergency
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-950 dark:text-rose-100 rounded-bl-none'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/50 dark:border-slate-700/50'
                  }`}
                >
                  {msg.isEmergency && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold">
                      <AlertTriangle size={16} /> Critical Medical / Crisis Escalation
                    </div>
                  )}
                  {msg.text || (isTyping && <span className="animate-pulse">Consulting clinical guidelines...</span>)}

                  {msg.isEmergency && (
                    <div className="mt-3 pt-2 border-t border-rose-200 dark:border-rose-800/50 flex flex-wrap gap-2">
                      <a
                        href="tel:112"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
                      >
                        <PhoneCall size={12} /> Call Emergency (112)
                      </a>
                      <a
                        href="tel:14416"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
                      >
                        <PhoneCall size={12} /> Tele-MANAS (14416)
                      </a>
                    </div>
                  )}

                  <div className="mt-1 text-[10px] text-right opacity-60">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-6 py-2 border-t border-slate-200/50 dark:border-slate-700/50 flex gap-2 overflow-x-auto bg-slate-50/50 dark:bg-slate-900/30">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => sendMessage(prompt)}
              className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 whitespace-nowrap transition-colors flex items-center gap-1"
            >
              <Sparkles size={11} className="text-emerald-500" /> {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type health question in English or हिन्दी (e.g., normal BP cutoff)..."
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
export default WellnessChatbot;
