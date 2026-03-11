'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore, AgentStepType } from '../../store/useAgentStore';
import { useThemeStore } from '../../store/useThemeStore';
import {
    Brain,
    Globe,
    FileSearch,
    Cpu,
    Sparkles,
    CheckCircle2,
} from 'lucide-react';

// --- Model Display Names ---
const MODEL_NAMES: Record<string, string> = {
    gpt: 'Llama 3.1',
    claude: 'Llama 3.1',
    reasoning: 'DeepSeek R1',
    vision: 'Gemini Vision',
    coder: 'Qwen Coder',
    turbo: 'Gemini Flash',
    auto: 'Orbit Brain',
    orbit: 'Orbit Brain',
};

// --- Step Config ---
interface StepConfig {
    label: string;
    icon: React.ElementType;
    color: string;
}

const STEP_CONFIG: Record<AgentStepType, StepConfig> = {
    idle: { label: 'Siap', icon: Sparkles, color: '#6b7280' },
    thinking: { label: 'Analisis Mendalam', icon: Brain, color: '#a78bfa' },
    routing: { label: 'Memilih Model', icon: Cpu, color: '#60a5fa' },
    searching: { label: 'Mencari Info Web', icon: Globe, color: '#34d399' },
    'reading-docs': { label: 'Membaca Dokumen', icon: FileSearch, color: '#f59e0b' },
    reasoning: { label: 'Reasoning System', icon: Brain, color: '#a78bfa' },
    answering: { label: 'Menjawab', icon: Sparkles, color: '#f472b6' },
    done: { label: 'Selesai', icon: CheckCircle2, color: '#34d399' },
};

// Animated pulsing orb
function PulseOrb({ color }: { color: string }) {
    return (
        <span className="relative flex h-2 w-2">
            <motion.span
                className="absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: color }}
                animate={{ scale: [1, 2.5, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            />
            <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: color }}
            />
        </span>
    );
}

// Animated dots for "..."
function AnimatedDots({ color }: { color: string }) {
    return (
        <span className="inline-flex items-center gap-0.5 ml-0.5">
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    className="block w-[3px] h-[3px] rounded-full"
                    style={{ backgroundColor: color }}
                    animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                />
            ))}
        </span>
    );
}

export default function ThinkingStatus({ isInline = false }: { isInline?: boolean }) {
    const { currentStep, isStreaming, statusText, provider } = useAgentStore();
    const { primaryColor } = useThemeStore();

    // Sembunyikan jika:
    // - Tidak sedang streaming (idle)
    // - Sedang di step 'answering' agar tidak double dengan 3 titik animasi default yang muncul di message bubble
    const isVisible = isStreaming && currentStep !== 'idle' && currentStep !== 'answering';
    const config = STEP_CONFIG[currentStep] ?? STEP_CONFIG.thinking;
    const Icon = config.icon;
    const activeColor = config.color;

    // Resolve display model name
    const modelKey = provider?.toLowerCase() ?? 'orbit';
    const modelDisplay = MODEL_NAMES[modelKey] ?? provider ?? 'Orbit Brain';

    // Bedakan antara "Advanced Thinking" (RAG, Web Search, Reasoning) dan "Normal"
    // Premium glowing box hanya muncul jika AI benar-benar sedang melakukan proses berat.
    const isAdvanced = ['searching', 'reading-docs', 'reasoning'].includes(currentStep);

    if (!isVisible) return null;

    if (isInline) {
        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                        opacity: { duration: 0.2 }
                    }}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.02] border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.3)] backdrop-blur-md self-start mb-2 ml-1"
                >
                    <div className="relative flex items-center justify-center">
                        <motion.div
                            animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Icon className="w-3 h-3" style={{ color: activeColor }} />
                        </motion.div>
                        <motion.div
                            className="absolute inset-0 rounded-full blur-[6px]"
                            style={{ backgroundColor: activeColor }}
                            animate={{ opacity: [0, 0.3, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold tracking-tight text-white/80">
                                {config.label}
                            </span>
                            <AnimatedDots color={activeColor} />
                        </div>
                    </div>

                    <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

                    <span className="text-[9px] uppercase tracking-[0.05em] font-black text-gray-500/80">
                        {modelDisplay}
                    </span>
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                key="thinking"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-2 py-1 px-1 select-none"
            >
                {/* Minimal Icon & Pulse */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] shadow-sm backdrop-blur-sm">
                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <Icon className="w-3.5 h-3.5" style={{ color: activeColor }} />
                    </motion.div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-medium text-gray-400">
                            {config.label}
                        </span>
                        <AnimatedDots color="#6b7280" />
                    </div>

                    {/* Divider & Model Tag */}
                    <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 opacity-60">
                        {modelDisplay}
                    </span>
                </div>

                {/* Reasoning Snippet (Optional if exists) */}
                {statusText && (
                    <motion.p
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="hidden md:block text-[11px] text-gray-500 italic max-w-[200px] truncate"
                    >
                        {statusText}
                    </motion.p>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
