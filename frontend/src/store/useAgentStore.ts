import { create } from 'zustand';

export type AgentStepType =
    | 'idle'
    | 'thinking'
    | 'searching'
    | 'reading-docs'
    | 'routing'
    | 'reasoning'
    | 'answering'
    | 'done';

interface AgentState {
    currentStep: AgentStepType;
    provider: string;
    statusText: string;
    isStreaming: boolean;
    thinkingModel: string | null;
    setAgentStep: (step: string, status: string, provider?: string) => void;
    resetStream: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
    currentStep: 'idle',
    provider: '-',
    statusText: '',
    isStreaming: false,
    thinkingModel: null,
    setAgentStep: (step, status, provider) => set((state) => ({
        currentStep: step as AgentStepType,
        statusText: status,
        isStreaming: true,
        provider: provider || state.provider,
        thinkingModel: provider && provider !== 'orbit' && provider !== 'orbit-engine'
            ? provider
            : state.thinkingModel,
    })),
    resetStream: () => set({
        currentStep: 'idle',
        statusText: '',
        isStreaming: false,
        provider: '-',
        thinkingModel: null
    }),
}));
