'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStream } from '../../hooks/useChatStream';
import { useAgentStore } from '../../store/useAgentStore';
import { Send, Square, Paperclip, Image as ImageIcon, Mic, ChevronDown, Sparkles, Globe, Activity, PanelLeft, User, Copy, Check, Pencil, Orbit, Code, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';

import { useThemeStore } from '../../store/useThemeStore';
import ArtifactPanel, { Artifact } from './ArtifactPanel';
import VoicePlayer from './VoicePlayer';
import { useAuthStore } from '@/store/useAuthStore';

interface ChatBoxProps {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    sessionId: string | null;
    initialMessages?: { role: 'user' | 'ai', content: string }[];
}

const MessageItem = React.memo(({
    msg, i, isStreaming, primaryColor, onCopy, copiedId,
    onEdit, isEditing, onEditCancel, onEditSave, editContent,
    onEditContentChange, onRegenerate, isLast, extractArtifact, setCurrentArtifact, sessionId
}: any) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`flex gap-3 md:gap-5 group/msg ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
            {msg.role === 'ai' && (
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl p-[1px] flex-shrink-0 mt-1 shadow-lg overflow-hidden group/avatar" style={{ background: `linear-gradient(to top right, ${primaryColor}88, transparent)` }}>
                    <div className="w-full h-full rounded-xl md:rounded-2xl bg-[#0f0f0f] flex items-center justify-center">
                        <Orbit
                            className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-700 ${isStreaming ? 'animate-spin' : 'group-hover/avatar:rotate-180'}`}
                            style={{ color: primaryColor, animationDuration: '3s' }}
                        />
                    </div>
                </div>
            )}
            <div className={`relative min-w-0 max-w-[92%] sm:max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? '' : 'flex-1'}`}>
                <div className={`text-[14px] md:text-[15px] leading-relaxed relative ${msg.role === 'user' ? 'bg-[#2a2a2a] text-gray-100 px-3 md:px-6 py-2 md:py-4 rounded-[1.25rem] md:rounded-[2rem] rounded-tr-sm shadow-xl border border-white/5' : 'text-gray-200 py-1 md:py-2'}`}>
                    {isEditing ? (
                        <div className="flex flex-col gap-3">
                            <textarea
                                value={editContent}
                                onChange={(e) => onEditContentChange(e.target.value)}
                                className="w-full bg-[#1a1a1a] text-white p-4 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500/50 min-h-[100px]"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={onEditCancel} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Batal</button>
                                <button onClick={() => onEditSave(editContent)} className="px-4 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg font-bold">Simpan & Kirim</button>
                            </div>
                        </div>
                    ) : (
                        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/5">
                            {(!msg.content || msg.content.trim() === "") && isStreaming ? (
                                <div className="flex items-center gap-1.5 py-2">
                                    <motion.div animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                                    <motion.div animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                                    <motion.div animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                                </div>
                            ) : (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            )}
                        </div>
                    )}

                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {msg.attachments.map((file: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-xl border border-white/5 text-[10px] md:text-xs">
                                    <Paperclip className="w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Message Actions */}
                {!isEditing && (!isStreaming || msg.content?.length > 0) && (
                    <div className={`flex items-center gap-1 mt-2 transition-opacity duration-300 ${msg.role === 'user' ? 'justify-end opacity-100 md:opacity-0 group-hover/msg:opacity-100' : 'opacity-100 md:opacity-0 group-hover/msg:opacity-100'}`}>
                        <button onClick={() => onCopy(msg.content, i)} className="p-1.5 md:p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors" title="Salin">
                            {copiedId === i ? <Check className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <Copy className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                        </button>
                        {msg.role === 'user' ? (
                            <button
                                onClick={onEdit}
                                className="p-1.5 md:p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors" title="Edit"
                            >
                                <Pencil className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </button>
                        ) : (
                            <>
                                <VoicePlayer text={msg.content} messageId={i} />
                                <button
                                    onClick={() => {
                                        const artifact = extractArtifact(msg.content, i);
                                        if (artifact) setCurrentArtifact(artifact);
                                    }}
                                    className={`p-1.5 md:p-2 hover:bg-white/5 rounded-lg transition-colors ${extractArtifact(msg.content, i) ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                                    title="Tampilkan Preview"
                                >
                                    <Globe className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                </button>
                                {isLast && (
                                    <button onClick={onRegenerate} className="p-1.5 md:p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors" title="Regenerasi">
                                        <RotateCcw className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
});

MessageItem.displayName = 'MessageItem';

export default function ChatBox({ isSidebarOpen, toggleSidebar, sessionId, initialMessages = [] }: ChatBoxProps) {
    const [input, setInput] = useState('');
    const [selectedAgent, setSelectedAgent] = useState('Auto / Orbit Brain');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [attachments, setAttachments] = useState<{ name: string, type: string, url: string }[]>([]);
    const { messages, setMessages, sendMessage, stopStream } = useChatStream();
    const { isStreaming } = useAgentStore();
    const { primaryColor } = useThemeStore();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuthStore();
    const [demoUsage, setDemoUsage] = useState(0);
    const [showLimitModal, setShowLimitModal] = useState(false);

    const prevSessionIdRef = useRef<string | null>(null);

    // Sync demo usage from localStorage
    useEffect(() => {
        if (!user) {
            const count = parseInt(localStorage.getItem('ai-orbit-demo-count') || '0');
            setDemoUsage(count);
        }
    }, [user]);

    const incrementDemoCount = () => {
        const newCount = demoUsage + 1;
        setDemoUsage(newCount);
        localStorage.setItem('ai-orbit-demo-count', newCount.toString());
        return newCount;
    };


    const [copiedId, setCopiedId] = useState<number | string | null>(null);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);

    // --- Artifact detection: extract first code block from AI message ---
    const extractArtifact = useCallback((content: string, msgIdx: number): Artifact | null => {
        const codeMatch = content.match(/```(\w*)\n([\s\S]*?)```/);
        if (codeMatch) {
            const lang = codeMatch[1] || 'code';
            const code = codeMatch[2];
            const isHtml = lang === 'html';
            return {
                id: `artifact-${msgIdx}-${Date.now()}`,
                type: isHtml ? 'html' : 'code',
                title: isHtml ? 'HTML Preview' : `Kode ${lang.toUpperCase()}`,
                content: code,
                language: lang,
            };
        }
        // Fallback: long markdown
        if (content.length > 800 && content.includes('#')) {
            return {
                id: `artifact-${msgIdx}-md`,
                type: 'markdown',
                title: 'Dokumen',
                content,
            };
        }
        return null;
    }, []);


    // Handle click outside for model selector
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownOpen]);

    // Listen for auth modal trigger
    useEffect(() => {
        const handleOpenAuth = () => {
            // This is a bit hacky since the state is in the parent (page.tsx)
            // But we can trigger it via a window event or better yet, move modal state to a store.
            // For now, the event is dispatched from the limit modal.
        };
        window.addEventListener('open-auth-modal', handleOpenAuth);
        return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
    }, []);

    const handleCopy = async (content: string, id: string | number) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(content);
            } else {
                // Fallback for non-HTTPS or older browsers
                const textArea = document.createElement("textarea");
                textArea.value = content;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error("Gagal menyalin teks:", err);
        }
    };

    const copyAllChat = () => {
        if (messages.length === 0) return;

        const fullChat = messages.map(msg => {
            const role = msg.role === 'user' ? '👤 Pengguna' : '🤖 AI-Orbit';
            return `${role}:\n${msg.content}\n\n---\n`;
        }).join('\n');


        handleCopy(fullChat, 'all');
    };

    const startEditing = (idx: number, content: string) => {
        setEditingIdx(idx);
        setEditContent(content);
    };

    const saveEdit = (idx: number) => {
        if (!editContent.trim()) return;

        // If user edited their message, we want to truncate and re-send
        if (messages[idx].role === 'user') {
            const selectedAgentData = agents.find(a => a.name === selectedAgent);
            // We pass index 'idx' as resumeFromIndex. 
            // useChatStream.sendMessage will slice(0, idx) and add new prompt.
            sendMessage(editContent, selectedAgentData?.id || 'gpt', messages[idx].attachments, sessionId || undefined, idx);
        } else {
            setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[idx].content = editContent;
                return newMessages;
            });
        }

        setEditingIdx(null);
    };

    const handleRegenerate = () => {
        if (isStreaming || messages.length < 2) return;

        // Temukan pesan user terakhir sebelum pesan AI ini
        // Biasanya index - 1
        let lastUserMessageIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserMessageIndex = i;
                break;
            }
        }

        if (lastUserMessageIndex > -1) {
            const lastUserMsg = messages[lastUserMessageIndex];
            const selectedAgentData = agents.find(a => a.name === selectedAgent);
            sendMessage(lastUserMsg.content, selectedAgentData?.id || 'gpt', lastUserMsg.attachments, sessionId || undefined, lastUserMessageIndex);
        }
    };

    // Load initial messages only when sessionId explicitly changes
    useEffect(() => {
        const fetchInitialMessages = async () => {
            if (sessionId !== prevSessionIdRef.current) {
                // 1. Try initialMessages from props/localStorage
                if (initialMessages && initialMessages.length > 0) {
                    setMessages(initialMessages);
                }
                // 2. Fallback: If logged in and empty local, fetch from Cloud ONLY for this session
                else if (user && isSupabaseEnabled && sessionId) {
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (uuidRegex.test(sessionId)) {
                        try {
                            const { data, error } = await supabase
                                .from('messages')
                                .select('role, content, attachments')
                                .eq('conversation_id', sessionId)
                                .order('created_at', { ascending: true });

                            if (error) throw error;
                            if (data && data.length > 0) {
                                setMessages(data as any);
                            } else {
                                setMessages([]);
                            }
                        } catch (err) {
                            console.error("☁️ Orbit Cloud: Failed to fetch messages for session", err);
                            setMessages([]);
                        }
                    } else {
                        setMessages([]);
                    }
                } else {
                    setMessages([]);
                }
                prevSessionIdRef.current = sessionId;
            }
        };

        fetchInitialMessages();
    }, [sessionId, initialMessages, user]);

    // --- OPTIMIZED SYNC: Persist messages to localStorage & Cloud ---
    useEffect(() => {
        if (!sessionId || messages.length === 0) return;

        // 1. Debounce and check streaming state
        // We only want to sync to Cloud when streaming stops or for user messages
        const timeout = setTimeout(() => {
            const saved = localStorage.getItem('ai-orbit-history');
            const history = saved ? JSON.parse(saved) : [];
            const sessionIdx = history.findIndex((h: any) => h.id === sessionId);

            if (sessionIdx > -1) {
                // Update local memory
                history[sessionIdx].messages = messages;
                localStorage.setItem('ai-orbit-history', JSON.stringify(history));

                // --- SYNC TO CLOUD (Only if NOT streaming or if it's the final update) ---
                if (user && isSupabaseEnabled && !isStreaming) {
                    const syncToSupabase = async () => {
                        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        if (!uuidRegex.test(sessionId)) return;

                        try {
                            // 1. Upsert Conversation
                            await supabase.from('conversations').upsert({
                                id: sessionId,
                                user_id: user.id,
                                title: messages[0].content.slice(0, 40) + (messages[0].content.length > 40 ? '...' : ''),
                                model: selectedAgent,
                                updated_at: new Date().toISOString()
                            });

                            // 2. Clear and Insert Messages (Atomic-ish)
                            // We use a small optimization here: only sync if we have a full AI response
                            const lastMsg = messages[messages.length - 1];
                            if (lastMsg.role === 'ai' && lastMsg.content.length > 0) {
                                await supabase.from('messages').delete().eq('conversation_id', sessionId);
                                const msgData = messages.map(m => ({
                                    conversation_id: sessionId,
                                    role: m.role,
                                    content: m.content,
                                    attachments: m.attachments || []
                                }));
                                await supabase.from('messages').insert(msgData);
                                console.log("☁️ Orbit Cloud: History synced.");
                            }
                        } catch (err) {
                            console.error("❌ Orbit Cloud Sync Error:", err);
                        }
                    };
                    syncToSupabase();
                }

                // Notify other components (like sidebar) only if not actively streaming
                // or at reasonable intervals to prevent UI jank/loops
                if (!isStreaming) {
                    window.dispatchEvent(new Event('chat-history-updated'));
                }
            }
        }, isStreaming ? 2000 : 500); // Wait longer if streaming

        return () => clearTimeout(timeout);
    }, [messages, sessionId, user, selectedAgent, isStreaming]);


    // Auto scroll to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isStreaming]);

    // Auto resize textarea
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        if (sessionId) {
            formData.append('session_id', sessionId);
        }

        try {
            const response = await fetch('/api/v1/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            setAttachments(prev => [...prev, { name: data.filename, type: data.type, url: data.url }]);
        } catch (err) {
            alert("Gagal mengunggah file");
        } finally {
            e.target.value = '';
        }
    };

    const startVoiceInput = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Browser Anda tidak mendukung Voice Input.");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev + transcript);
        };
        recognition.start();
    };

    const handleSend = (e: React.FormEvent | React.KeyboardEvent) => {
        e.preventDefault();
        if ((!input.trim() && attachments.length === 0) || isStreaming) return;

        // --- Demo Limit Logic ---
        if (!user) {
            if (demoUsage >= 5) {
                setShowLimitModal(true);
                return;
            }
            incrementDemoCount();
        }

        const selectedAgentData = agents.find(a => a.name === selectedAgent);
        sendMessage(input, selectedAgentData?.id || 'gpt', attachments, sessionId || undefined);


        if (messages.length === 0 && sessionId) {
            const saved = localStorage.getItem('ai-orbit-history');
            const history = saved ? JSON.parse(saved) : [];

            if (!history.find((h: any) => h.id === sessionId)) {
                const title = input.trim() ? (input.slice(0, 30) + (input.length > 30 ? '...' : '')) : "File / Gambar";
                const newEntry = {
                    id: sessionId,
                    title,
                    messages: [
                        { role: 'user', content: input, attachments },
                        { role: 'ai', content: '' }
                    ],
                    timestamp: new Date().toISOString()
                };
                history.unshift(newEntry);
                localStorage.setItem('ai-orbit-history', JSON.stringify(history));
                window.dispatchEvent(new Event('chat-history-updated'));
            }
        }

        setInput('');
        setAttachments([]);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const agents = [
        { id: 'auto', name: 'Auto / Orbit Brain', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'llama', name: 'Meta / Llama 3.3-70b', icon: <Activity className="w-4 h-4" /> },
        { id: 'deepseek', name: 'DeepSeek / deepseek-v3.2', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'qwen', name: 'Alibaba / Qwen 3 Next', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'kimi', name: 'Moonshot / Kimi K2.5', icon: <Orbit className="w-4 h-4" /> },
        { id: 'gpt', name: 'OpenAI / gpt-oss-120b', icon: <Globe className="w-4 h-4" /> }
    ];


    return (
        <div className="flex h-full bg-transparent overflow-hidden relative">
            {/* Main Chat Column */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
                <header className="absolute top-0 left-0 w-full h-12 md:h-16 flex items-center px-4 md:px-6 bg-transparent z-40 pointer-events-none">
                    <div className="flex items-center justify-between w-full pointer-events-auto">
                        <div className="flex items-center gap-2 md:gap-3">
                            <AnimatePresence>
                                {!isSidebarOpen && (
                                    <motion.button
                                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                        onClick={toggleSidebar} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                    >
                                        <PanelLeft className="w-5 h-5" />
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>

                        {messages.length > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={copyAllChat}
                                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-xs font-semibold backdrop-blur-md shadow-xl`}
                                style={{ color: primaryColor }}
                            >
                                {copiedId === 'all' ? (
                                    <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span className="hidden xs:inline">Tersalin</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span className="hidden xs:inline">Salin Seluruh Chat</span>
                                    </>
                                )}
                            </motion.button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto w-full scroll-smooth custom-scrollbar" ref={chatContainerRef}>
                    <AnimatePresence mode="wait">
                        {messages.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col h-full items-center justify-center text-gray-500 space-y-6 md:space-y-8 max-w-2xl mx-auto px-4 md:px-6 pt-10 md:pt-0"
                            >
                                <div className="relative">
                                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 6 }} className="absolute inset-0 blur-[60px] md:blur-[80px] rounded-full" style={{ backgroundColor: primaryColor }}></motion.div>
                                    <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/5 flex items-center justify-center shadow-2xl border border-white/10 group overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-tr opacity-20 group-hover:opacity-30 transition-opacity duration-500" style={{ backgroundImage: `linear-gradient(to top right, ${primaryColor}, transparent)` }}></div>
                                        <Orbit className="w-8 h-8 md:w-10 md:h-10 group-hover:rotate-180 transition-transform duration-700 relative z-10" style={{ color: primaryColor }} />
                                    </div>
                                </div>
                                <div className="text-center space-y-2 md:space-y-3">
                                    <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">Apa yang bisa saya bantu hari ini?</h1>
                                    <p className="text-gray-500 text-sm md:text-lg px-4 md:px-0">Partner cerdas untuk eksplorasi ide, coding, dan diskusi produktif.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full">
                                    {[
                                        {
                                            title: "Eksplorasi Ide Kreatif",
                                            desc: "Brainstorming konsep unik",
                                            prompt: "Bantu saya memikirkan 5 ide unik untuk proyek kreatif saya.",
                                            icon: Sparkles
                                        },
                                        {
                                            title: "Bedah Kode / Masalah Teknis",
                                            desc: "Coding & Optimasi sistem",
                                            prompt: "Jelaskan cara kerja kode ini dan bagaimana mengoptimalkannya.",
                                            icon: Code
                                        },
                                        {
                                            title: "Belajar Konsep Rumit",
                                            desc: "Jelaskan secara sederhana",
                                            prompt: "Jelaskan konsep Quantum Physics seolah saya anak usia 10 tahun.",
                                            icon: Orbit
                                        },
                                        {
                                            title: "Ringkas & Analisis Teks",
                                            desc: "Temukan poin-poin penting",
                                            prompt: "Tolong ringkas teks ini menjadi poin-poin yang mudah dipahami.",
                                            icon: Activity
                                        }
                                    ].map((item) => (
                                        <button
                                            key={item.title}
                                            onClick={() => setInput(item.prompt)}
                                            className="p-3 md:p-5 rounded-2xl md:rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-gray-400 text-left hover:text-white group relative overflow-hidden flex items-center md:items-start gap-3 md:gap-4"
                                        >
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors shrink-0" style={{ color: primaryColor }}>
                                                <item.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <p className="font-bold text-xs md:text-sm text-white group-hover:translate-x-1 transition-transform truncate">{item.title}</p>
                                                <p className="text-[10px] md:text-[11px] text-gray-600 group-hover:text-gray-500 mt-0.5 md:mt-1 truncate">{item.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="max-w-4xl mx-auto w-full pb-32 pt-16 md:pt-20 flex flex-col gap-6 md:gap-10 px-4 md:px-6">
                                {messages.filter((m, idx, self) =>
                                    // Deduplicate identical consecutive messages which often happen during race condition syncs
                                    idx === 0 || !(m.role === self[idx - 1].role && m.content === self[idx - 1].content)
                                ).map((msg, i) => (
                                    <MessageItem
                                        key={`${sessionId}-${i}`}
                                        msg={msg}
                                        i={i}
                                        sessionId={sessionId}
                                        isStreaming={isStreaming && i === messages.length - 1}
                                        primaryColor={primaryColor}
                                        onCopy={handleCopy}
                                        copiedId={copiedId}
                                        onEdit={() => startEditing(i, msg.content)}
                                        isEditing={editingIdx === i}
                                        onEditCancel={() => setEditingIdx(null)}
                                        onEditSave={saveEdit}
                                        editContent={editContent}
                                        onEditContentChange={setEditContent}
                                        onRegenerate={handleRegenerate}
                                        isLast={i === messages.length - 1}
                                        extractArtifact={extractArtifact}
                                        setCurrentArtifact={setCurrentArtifact}
                                    />
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="shrink-0 pb-4 pt-2 px-3 md:px-6 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f] to-transparent z-20">
                    <div className="max-w-6xl mx-auto relative md:px-4">
                        <AnimatePresence>
                            {attachments.length > 0 && (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-wrap gap-2 mb-4 px-2">
                                    {attachments.map((file, idx) => (
                                        <motion.div
                                            layout
                                            key={idx}
                                            className="bg-white/5 border border-white/10 rounded-2xl px-3 py-2 md:px-4 md:py-3 flex items-center gap-3 text-xs text-gray-200 shadow-xl backdrop-blur-md"
                                        >
                                            <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                                                {file.type.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="max-w-[100px] md:max-w-[140px] truncate font-semibold">{file.name}</span>
                                                <span className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-tighter">Ready</span>
                                            </div>
                                            <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="ml-1 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-all">✕</button>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="relative group w-full mb-2">
                            {/* Ambient Input Glow */}
                            <div
                                className="absolute -inset-1 rounded-[32px] blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000 pointer-events-none"
                                style={{ background: `linear-gradient(to right, ${primaryColor}30, ${primaryColor}05)` }}
                            />

                            <form
                                onSubmit={handleSend}
                                className="relative flex items-center bg-[#141414]/95 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-2xl focus-within:bg-[#181818] focus-within:border-white/20 transition-all duration-400 pl-2 md:pl-3 pr-2 md:pr-3 py-1.5 md:py-2.5 min-h-[58px] md:min-h-[68px]"
                            >
                                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'file')} />
                                <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />

                                {/* AI Model Selector */}
                                <div className="relative shrink-0" ref={dropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        className="flex items-center gap-2 px-3 md:px-4 h-11 rounded-2xl transition-all text-xs font-bold text-gray-400 hover:text-white group border border-white/5 bg-white/[0.03] hover:bg-white/[0.08]"
                                    >
                                        <div className="relative flex items-center justify-center">
                                            <div className="absolute inset-0 blur-md rounded-full animate-pulse opacity-40 transition-colors" style={{ backgroundColor: primaryColor }} />
                                            <Orbit className="w-4 h-4 relative z-10 group-hover:rotate-90 transition-transform duration-500" style={{ color: primaryColor }} />
                                        </div>
                                        <span className="hidden lg:inline tracking-tight">{selectedAgent.split(' / ')[1]}</span>
                                        <ChevronDown className={`w-3.5 h-3.5 opacity-50 hidden md:inline transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {dropdownOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: -4 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                className="absolute bottom-full left-0 mb-4 w-60 md:w-64 bg-[#1a1a1a] border border-white/10 rounded-[24px] shadow-2xl py-3 z-[110] overflow-hidden backdrop-blur-3xl"
                                            >
                                                <div className="px-5 pb-2 mb-2 border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pilih Intelligence</div>
                                                {agents.map((ag) => {
                                                    const isActive = selectedAgent === ag.name;
                                                    return (
                                                        <button
                                                            key={ag.name}
                                                            onClick={() => { setSelectedAgent(ag.name); setDropdownOpen(false); }}
                                                            className={`w-full text-left px-5 py-3 flex items-center gap-4 transition-all text-sm group relative ${isActive ? 'text-white' : 'hover:bg-white/5 text-gray-300 hover:text-white'
                                                                }`}
                                                            style={isActive ? { backgroundColor: `${primaryColor}1a`, color: primaryColor } : {}}
                                                        >
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isActive ? '' : 'bg-white/5 group-hover:bg-white/10'
                                                                }`}
                                                                style={isActive ? { backgroundColor: `${primaryColor}33`, color: primaryColor } : {}}
                                                            >
                                                                {ag.icon}
                                                            </div>
                                                            <span className="font-semibold flex-1">{ag.name.split(' / ')[1] || ag.name}</span>
                                                            {isActive && (
                                                                <div className="relative flex items-center justify-center mr-1">
                                                                    <div className="absolute w-2 h-2 rounded-full blur-sm animate-pulse" style={{ backgroundColor: primaryColor }} />
                                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="w-px h-6 bg-white/10 mx-1 md:mx-2 hidden sm:block"></div>

                                {/* Attachment Action */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2.5 md:p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all shrink-0 group"
                                    title="Lampirkan file"
                                >
                                    <Paperclip className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>

                                {/* Textarea Section */}
                                <div className="relative flex-1 flex items-center h-full">
                                    <textarea
                                        ref={textareaRef}
                                        value={input}
                                        onChange={handleInput}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                                        placeholder="Tanya Sesuatu..."
                                        className="w-full bg-transparent py-2.5 md:py-3 px-1 text-sm md:text-[16px] text-gray-100 focus:outline-none resize-none placeholder-gray-500 leading-relaxed custom-scrollbar overflow-y-auto max-h-[150px] md:max-h-[200px] min-h-[38px] md:min-h-[44px] flex items-center"
                                        rows={1}
                                    />
                                </div>

                                {/* Right Actions */}
                                <div className="flex items-center gap-1 md:gap-1.5 shrink-0 ml-1 md:ml-2">
                                    <button
                                        type="button"
                                        onClick={startVoiceInput}
                                        className="p-2.5 md:p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all hidden md:flex items-center justify-center"
                                        title="Voice Input"
                                    >
                                        <Mic className="w-5 h-5" />
                                    </button>

                                    {isStreaming ? (
                                        <button
                                            type="button"
                                            onClick={stopStream}
                                            className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-white bg-white/10 hover:bg-red-500/20 hover:text-red-400 rounded-2xl transition-all shadow-lg border border-white/5"
                                        >
                                            <Square className="w-4 h-4 fill-current" />
                                        </button>
                                    ) : (
                                        <motion.button
                                            whileHover={(input.trim() || attachments.length > 0) ? { scale: 1.02 } : {}}
                                            whileTap={(input.trim() || attachments.length > 0) ? { scale: 0.98 } : {}}
                                            type="submit"
                                            disabled={!input.trim() && attachments.length === 0}
                                            className={`w-10 h-10 md:w-11 md:h-11 rounded-2xl transition-all duration-300 flex items-center justify-center ${(input.trim() || attachments.length > 0)
                                                ? 'shadow-xl'
                                                : 'bg-white/[0.03] text-gray-600 cursor-not-allowed border border-white/5'
                                                }`}
                                            style={(input.trim() || attachments.length > 0) ? {
                                                backgroundColor: primaryColor,
                                                color: '#000',
                                                boxShadow: `0 8px 16px ${primaryColor}33`
                                            } : {}}
                                        >
                                            <Send className={`w-4 h-4 md:w-5 md:h-5 ${(input.trim() || attachments.length > 0) ? 'fill-black/20' : ''}`} />
                                        </motion.button>
                                    )}
                                </div>

                                {/* Hidden File Inputs */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={(e) => handleFileUpload(e, 'file')}
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.txt,.csv,.md,.markdown,image/*"
                                />
                                <input
                                    type="file"
                                    ref={imageInputRef}
                                    onChange={(e) => handleFileUpload(e, 'image')}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </form>
                        </div>
                    </div>
                </div >

                {/* Demo Limit Modal */}
                <AnimatePresence>
                    {showLimitModal && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setShowLimitModal(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="relative w-full max-w-sm bg-[#161616] border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
                                    <Sparkles className="w-8 h-8 text-amber-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Satu Langkah Lagi!</h3>
                                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                                    Anda telah menggunakan 5 kuota demo gratis. <br />Silakan masuk untuk menikmati AI-Orbit tanpa batas.
                                </p>

                                <button
                                    onClick={() => { setShowLimitModal(false); /* Trigger login modal logic should be in parent or shared store */ window.dispatchEvent(new CustomEvent('open-auth-modal')); }}
                                    className="w-full py-4 rounded-2xl font-bold text-black transition-all hover:brightness-110 active:scale-95 shadow-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    Masuk / Daftar Sekarang
                                </button>
                                <button onClick={() => setShowLimitModal(false)} className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest font-bold">
                                    Mungkin Nanti
                                </button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Demo Progress Bar (Floating UI) */}
                {!user && demoUsage > 0 && (
                    <div className="absolute top-20 right-6 z-30 lg:flex hidden">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 px-4 flex items-center gap-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Quota Demo</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className={`w-3 h-1 rounded-full ${i < demoUsage ? '' : 'bg-white/10'}`} style={i < demoUsage ? { backgroundColor: primaryColor } : {}} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>{/* End Main Chat Column */}


            {/* Artifact Side Panel */}
            <ArtifactPanel
                artifact={currentArtifact}
                onClose={() => setCurrentArtifact(null)}
            />
        </div >
    );
}
