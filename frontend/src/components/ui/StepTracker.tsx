'use client';

import { useAgentStore } from '../../store/useAgentStore';
import { Loader2, CheckCircle2, ChevronRight, Cpu } from 'lucide-react';

export default function StepTracker() {
    const { currentStep, statusText, isStreaming, provider } = useAgentStore();

    return (
        <div className="flex flex-col gap-3 p-4 bg-[#2f2f2f]/80 backdrop-blur-xl rounded-2xl border border-gray-600/30 shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">Agent Tracker</h3>
            </div>

            <div className="flex items-center text-xs mt-1">
                <div className={`flex items-center transition-all ${currentStep === 'supervisor' || currentStep === 'worker' || currentStep === 'generating' ? 'opacity-100 text-blue-400' : 'opacity-50 text-gray-500'}`}>
                    <span className="font-medium">Supervisor</span>
                    <ChevronRight className="w-3 h-3 mx-1" />
                </div>

                <div className={`flex items-center transition-all ${currentStep === 'worker' || currentStep === 'generating' ? 'opacity-100 text-emerald-400' : 'opacity-50 text-gray-500'}`}>
                    <span className="font-medium">{provider !== '-' ? provider : 'Network'}</span>
                    <ChevronRight className="w-3 h-3 mx-1" />
                </div>

                <div className={`flex items-center transition-all ${currentStep === 'generating' ? 'opacity-100 text-purple-400' : 'opacity-50 text-gray-500'}`}>
                    <span className="font-medium animate-pulse">Streaming</span>
                </div>
            </div>

            <div className="mt-1 bg-[#1e1e1e]/50 rounded-lg p-2.5 flex items-center gap-3 border border-white/5">
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin text-gray-300" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                <span className="text-xs font-medium text-gray-300 truncate">{statusText || "Menunggu prompt selanjutnya..."}</span>
            </div>
        </div>
    );
}
