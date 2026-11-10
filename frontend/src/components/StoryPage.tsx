import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Howl } from 'howler';
import { Activity, Brain, ShieldCheck, ChevronRight, Stethoscope, Volume2, VolumeX } from 'lucide-react';

// --- Assets ---
// using Web Audio API for all to allow better mixing and avoid pool exhaustion
const ambientSound = new Howl({
    src: ['/sounds/ambient.wav'],
    loop: true,
    volume: 0.3,
    html5: false // Changed to false to prevent pool lock, sacrificing some RAM for stability
});

const clickSound = new Howl({
    src: ['/sounds/click.wav'],
    volume: 0.2,
    html5: false
});

const transitionSound = new Howl({
    src: ['/sounds/whoosh.wav'],
    volume: 0.2,
    html5: false
});

// --- Main UI Component ---

interface StoryPageProps {
    onComplete: () => void;
    onSlideChange?: (index: number) => void;
}

export default function StoryPage({ onComplete, onSlideChange }: StoryPageProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [muted, setMuted] = useState(false);
    const [interacted, setInteracted] = useState(false);
    const [audioStatus, setAudioStatus] = useState<'waiting' | 'loading' | 'playing' | 'error'>('waiting');

    useEffect(() => {
        // Sync minimal state
        onSlideChange?.(currentSlide);
    }, [currentSlide, onSlideChange]);

    useEffect(() => {
        const handleStateChange = () => {
            if (ambientSound.playing()) setAudioStatus('playing');
        };

        ambientSound.on('play', handleStateChange);
        ambientSound.on('loaderror', () => {
            console.warn("Ambient load error");
            setAudioStatus('error');
        });

        // Attempt autoplay once on mount
        ambientSound.play();

        return () => {
            ambientSound.stop();
            ambientSound.off();
        };
    }, []);

    const handleInteraction = () => {
        // 1. Immediate UI feedback: Hide overlay immediately
        setInteracted(true);

        // 2. Resume Audio Context (Browser requirement)
        if (Howler.ctx.state === 'suspended') {
            Howler.ctx.resume().then(() => {
                ambientSound.play();
                setAudioStatus('playing');
            }).catch(err => console.error("Audio resume failed", err));
        } else {
            ambientSound.play();
            setAudioStatus('playing');
        }
    };

    const toggleMute = () => {
        if (muted) {
            ambientSound.fade(0, 0.3, 1000);
            setMuted(false);
            if (!ambientSound.playing()) ambientSound.play();
        } else {
            ambientSound.fade(0.3, 0, 500);
            setMuted(true);
        }
    };

    const slides = [
        {
            id: 0,
            title: "The Clinical Data Challenge",
            subtitle: "Healthcare data is complex, fragmented, and overwhelming.",
            description: "Clinicians spend 40% of their time synthesizing data instead of treating patients. Critical insights often get lost in the noise of disconnected systems.",
            icon: <Activity className="w-24 h-24 text-rose-500" />,
            color: "text-rose-400",
            accentData: "rose"
        },
        {
            id: 1,
            title: "Enter Sanjeevni AI",
            subtitle: "A digital twin for every patient, powered by SOTA ensembles.",
            description: "We process thousands of biomarkers in real-time using BioMistral-7B and advanced risk engines to predict outcomes before they happen.",
            icon: <Brain className="w-24 h-24 text-cyan-500" />,
            color: "text-cyan-400",
            accentData: "cyan"
        },
        {
            id: 2,
            title: "Your Intelligent Workspace",
            subtitle: "Precision medicine at your fingertips.",
            description: "Welcome to your new dashboard. Real-time risk stratification, counterfactual analysis, and explainable AI—all in one place.",
            icon: <ShieldCheck className="w-24 h-24 text-emerald-500" />,
            color: "text-emerald-400",
            accentData: "emerald"
        }
    ];

    const handleNext = () => {
        if (!muted) transitionSound.play();

        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        } else {
            ambientSound.fade(0.3, 0, 1000);
            setTimeout(onComplete, 500);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 overflow-hidden font-display cursor-default selection:bg-clinical-teal/30"
            onClick={handleInteraction}
        >
            {/* Audio Unlock Overlay - Only shows if not interacted */}
            {!interacted && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-1000"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleInteraction();
                    }}
                >
                    <div className="flex flex-col items-center gap-4 animate-pulse cursor-pointer">
                        <Volume2 className="w-16 h-16 text-white/50" />
                        <span className="text-white/70 font-mono tracking-widest text-sm uppercase">Click anywhere to initialize system</span>
                    </div>
                </div>
            )}

            {/* Debug Status */}
            <div className="fixed bottom-4 right-20 z-[70] px-3 py-1 rounded-full bg-black/50 text-[10px] text-white/50 font-mono pointer-events-none backdrop-blur-md border border-white/5">
                ♫ {audioStatus} | {muted ? 'muted' : 'vol:100%'}
            </div>

            {/* Sound Control */}
            <button
                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                className="absolute top-8 right-8 z-[60] p-3 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md"
            >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {/* Main Content Layer */}
            <div className="relative z-10 w-full h-full flex flex-col items-center">

                {/* Header Logo - Fixed Absolute */}
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50"
                >
                    <div className="flex items-center gap-3 px-6 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-md shadow-2xl ring-1 ring-white/20 hover:bg-white/10 transition-colors cursor-default">
                        <div className="p-1.5 bg-clinical-teal/20 rounded-full">
                            <Stethoscope className="w-5 h-5 text-clinical-teal" strokeWidth={2.5} />
                        </div>
                        <span className="text-lg font-bold tracking-widest text-white uppercase font-display">Sanjeevni Healthcarer</span>
                    </div>
                </motion.div>

                {/* Content Container with Padding for Logo Clearance */}
                <div className="flex-1 w-full flex flex-col items-center justify-center pt-32 px-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -40, filter: "blur(10px)" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="flex flex-col items-center text-center max-w-4xl"
                        >
                            {/* Icon Glass Container */}
                            <div className="mb-10 relative group">
                                <div className={`absolute inset-0 bg-${slides[currentSlide].accentData}-500/20 blur-2xl rounded-full group-hover:bg-${slides[currentSlide].accentData}-500/30 transition-all duration-700`}></div>
                                <div className="relative p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/20">
                                    {slides[currentSlide].icon}
                                </div>
                            </div>

                            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-8 drop-shadow-2xl">
                                <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50">
                                    {slides[currentSlide].title}
                                </span>
                            </h1>

                            <h2 className={`text-2xl md:text-3xl font-light ${slides[currentSlide].color} mb-8 tracking-wide`}>
                                {slides[currentSlide].subtitle}
                            </h2>

                            <p className="text-xl text-slate-400 max-w-2xl leading-relaxed font-light">
                                {slides[currentSlide].description}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Navigation */}
                <div className="w-full pb-16 flex flex-col items-center gap-10 z-50">
                    {/* Progress Bars */}
                    <div className="flex gap-4">
                        {slides.map((_, index) => (
                            <div key={index} className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-white"
                                    initial={{ width: "0%" }}
                                    animate={{ width: index === currentSlide ? "100%" : index < currentSlide ? "100%" : "0%" }}
                                    transition={{ duration: index === currentSlide ? 5 : 0.5 }} // Auto-progress simulation logic if we wanted it
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => { if (!muted) clickSound.play(); onComplete(); }}
                            className="text-sm text-slate-500 hover:text-white transition-colors tracking-widest uppercase hover:underline underline-offset-8 decoration-white/30"
                        >
                            Skip Intro
                        </button>

                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: "0 0 30px -5px rgba(255, 255, 255, 0.3)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleNext}
                            className="group relative px-10 py-5 bg-white text-slate-950 rounded-full font-bold text-lg transition-all duration-300 flex items-center gap-4 overflow-hidden"
                        >
                            <span className="relative z-10">
                                {currentSlide === slides.length - 1 ? "Enter Dashboard" : "Continue"}
                            </span>
                            <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />

                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-200 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        </motion.button>
                    </div>
                </div>

            </div>
        </div>
    );
}
