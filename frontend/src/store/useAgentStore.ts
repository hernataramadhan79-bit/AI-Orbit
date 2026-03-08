import { create } from 'zustand';

interface AgentState {
    currentStep: string;
    provider: string;
    statusText: string;
    isStreaming: boolean;
    setAgentStep: (step: string, status: string, provider?: string) => void;
    resetStream: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
    currentStep: 'idle',
    provider: '-',
    statusText: '',
    isStreaming: false,
    setAgentStep: (step, status, provider) => set((state) => ({
        currentStep: step,
        statusText: status,
        isStreaming: true,
        provider: provider || state.provider
    })),
    resetStream: () => set({ currentStep: 'idle', statusText: '', isStreaming: false, provider: '-' })
}));
