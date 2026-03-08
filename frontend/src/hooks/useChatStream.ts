import { useState, useRef } from 'react';
import { useAgentStore } from '../store/useAgentStore';
import { useAuthStore } from '../store/useAuthStore';

export interface Attachment {
    name: string;
    type: string;
    url?: string;
}

export interface Message {
    role: 'user' | 'ai';
    content: string;
    attachments?: Attachment[];
}

export function useChatStream() {
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesRef = useRef<Message[]>([]);
    const { setAgentStep } = useAgentStore();
    const { session } = useAuthStore();
    const abortControllerRef = useRef<AbortController | null>(null);

    // Keep ref in sync with state
    const setMessagesWithRef = (update: Message[] | ((prev: Message[]) => Message[])) => {
        setMessages((prev) => {
            const next = typeof update === 'function' ? update(prev) : update;
            messagesRef.current = next;
            return next;
        });
    };

    const sendMessage = async (prompt: string, model: string = "gpt", attachments?: Attachment[], sessionId?: string, resumeFromIndex?: number) => {
        stopStream();
        useAgentStore.setState({ isStreaming: true });
        useAgentStore.getState().setAgentStep('thinking', 'Memulai...', 'orbit');

        // Capture current history from ref immediately
        const currentHistory = [...messagesRef.current];
        const baseHistory = resumeFromIndex !== undefined ? currentHistory.slice(0, resumeFromIndex) : currentHistory;

        setMessagesWithRef((prev: Message[]) => {
            const base = resumeFromIndex !== undefined ? prev.slice(0, resumeFromIndex) : prev;
            return [
                ...base,
                { role: 'user', content: prompt, attachments },
                { role: 'ai', content: '' }
            ];
        });

        abortControllerRef.current = new AbortController();

        const aiPrompt = attachments && attachments.length > 0
            ? attachments.map(a => `[Lampiran: ${a.name} (${a.type})]`).join('\n') + `\n\n` + prompt
            : prompt;

        try {
            const cleanHistory = baseHistory.map(m => ({ role: m.role, content: m.content, attachments: m.attachments }));

            const response = await fetch('/api/v1/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    model,
                    history: cleanHistory,
                    attachments,
                    session_id: sessionId || 'default'
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server Error: ${response.status} - ${errorText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response body reader available.");

            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            setAgentStep('answering', 'Sedang menjawab...', model);

            while (true) {
                const { value, done: readerDone } = await reader.read();
                if (readerDone) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop() || '';

                for (const part of parts) {
                    const trimmedPart = part.trim();
                    if (!trimmedPart || !trimmedPart.startsWith('data: ')) continue;

                    const dataContent = trimmedPart.slice(6);
                    if (dataContent === '"[DONE]"') {
                        setAgentStep('idle', 'Selesai', model);
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(dataContent);
                        if (typeof parsed === 'string') {
                            setMessagesWithRef((prev) => {
                                if (prev.length === 0) return prev;
                                const next = [...prev];
                                const lastIdx = next.length - 1;
                                if (next[lastIdx].role === 'ai') {
                                    next[lastIdx] = { ...next[lastIdx], content: next[lastIdx].content + parsed };
                                }
                                return next;
                            });
                        } else if (typeof parsed === 'object' && parsed !== null && parsed.step) {
                            setAgentStep(parsed.step, parsed.status, parsed.provider);
                        }
                    } catch (e) {
                        console.warn("[ChatStream] JSON parse error", e);
                    }
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                setMessagesWithRef((prev) => {
                    const next = [...prev];
                    const lastIdx = next.length - 1;
                    if (lastIdx >= 0 && next[lastIdx].role === 'ai') {
                        const currentContent = next[lastIdx].content;
                        next[lastIdx] = {
                            ...next[lastIdx],
                            content: currentContent + (currentContent ? "\n\n" : "") + "_🛑 Respon dihentikan oleh pengguna._"
                        };
                    }
                    return next;
                });
            } else {
                console.error("[ChatStream] Error:", error);
                setMessagesWithRef((prev) => {
                    const next = [...prev];
                    if (next.length > 0 && next[next.length - 1].role === 'ai') {
                        next[next.length - 1].content = `❌ Maaf, terjadi kesalahan: ${error.message}`;
                    }
                    return next;
                });
            }
        } finally {
            useAgentStore.setState({ isStreaming: false });
        }
    };

    const stopStream = () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        useAgentStore.setState({ isStreaming: false });
    };

    return { messages, setMessages: setMessagesWithRef, sendMessage, stopStream };
}
