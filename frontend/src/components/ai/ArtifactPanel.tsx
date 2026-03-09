'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Code, FileText, Eye, Copy, Check, ExternalLink, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useThemeStore } from '../../store/useThemeStore';

export interface Artifact {
    id: string;
    type: 'code' | 'markdown' | 'html' | 'mermaid' | 'search-results';
    title: string;
    content: string;
    language?: string;
    sources?: { title: string; url: string; content: string }[];
}

interface ArtifactPanelProps {
    artifact: Artifact | null;
    onClose: () => void;
}

// --- Code Syntax Highlighter (simple, no extra deps) ---
function CodeBlock({ code, language }: { code: string; language?: string }) {
    const [copied, setCopied] = useState(false);
    const { primaryColor } = useThemeStore();

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#111]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/3">
                <span className="text-[11px] font-mono font-semibold text-gray-500 uppercase tracking-widest">
                    {language || 'code'}
                </span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-white transition-colors"
                >
                    {copied ? <Check className="w-3.5 h-3.5" style={{ color: primaryColor }} /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Tersalin' : 'Salin'}
                </button>
            </div>
            <pre className="p-5 text-sm text-gray-300 font-mono overflow-auto custom-scrollbar leading-relaxed max-h-[60vh]">
                {code}
            </pre>
        </div>
    );
}

// --- HTML Live Preview ---
function HtmlPreview({ html }: { html: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            doc?.open();
            doc?.write(html);
            doc?.close();
        }
    }, [html]);

    return (
        <iframe
            ref={iframeRef}
            className="w-full h-[60vh] rounded-xl border border-white/10 bg-white"
            sandbox="allow-scripts allow-same-origin"
            title="HTML Preview"
        />
    );
}

// --- Search Results ---
function SearchResults({ sources }: { sources: { title: string; url: string; content: string }[] }) {
    const { primaryColor } = useThemeStore();
    return (
        <div className="space-y-4">
            {sources.map((src, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="rounded-2xl bg-white/5 border border-white/8 p-4 hover:bg-white/8 transition-colors group"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-semibold text-sm text-white truncate">{src.title}</p>
                            <p className="text-[11px] mt-0.5 mb-2 truncate" style={{ color: primaryColor }}>{src.url}</p>
                            <p className="text-xs text-gray-400 leading-relaxed">{src.content}</p>
                        </div>
                        <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-gray-600 hover:text-white transition-all"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

// --- Main Artifact Panel ---
export default function ArtifactPanel({ artifact, onClose }: ArtifactPanelProps) {
    const { primaryColor } = useThemeStore();
    const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');

    useEffect(() => {
        // Reset viewMode when artifact changes
        setViewMode('preview');
    }, [artifact?.id]);

    const isHtml = artifact?.type === 'html';
    const isCode = artifact?.type === 'code';

    return (
        <AnimatePresence>
            {artifact && (
                <motion.div
                    key={artifact.id}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed inset-0 lg:relative lg:inset-auto h-full bg-[#111111] lg:border-l border-white/5 overflow-hidden z-[100] lg:z-auto w-full lg:w-[450px] lg:min-w-[450px]"
                >
                    <div className="flex flex-col h-full bg-[#0a0a0a] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0 bg-[#0f0f0f]/50 backdrop-blur-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5 border border-white/5 shadow-inner"
                                    style={{ color: primaryColor }}>
                                    {artifact.type === 'code' ? <Code className="w-5 h-5" /> :
                                        artifact.type === 'html' ? <Eye className="w-5 h-5" /> :
                                            <FileText className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0">
                                    <span className="block font-bold text-xs text-gray-500 uppercase tracking-widest mb-0.5">Dokumen Arsitektur</span>
                                    <span className="block font-semibold text-[15px] text-white truncate leading-none">{artifact.title}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {isHtml && (
                                    <div className="flex p-1 rounded-xl bg-white/5 border border-white/5 text-[11px] font-bold">
                                        {(['preview', 'source'] as const).map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setViewMode(mode)}
                                                className={`px-3 py-1.5 rounded-lg transition-all duration-300 ${viewMode === mode ? 'bg-white text-black shadow-lg shadow-white/10 scale-100' : 'text-gray-500 hover:text-white hover:bg-white/5 scale-95'}`}
                                            >
                                                {mode === 'preview' ? 'Preview' : 'Kode'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-90 border border-white/5"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent">
                            <div className="p-6 md:p-8 space-y-8 h-full">
                                {artifact.type === 'code' && (
                                    <CodeBlock code={artifact.content} language={artifact.language} />
                                )}
                                {artifact.type === 'html' && (
                                    viewMode === 'preview'
                                        ? <HtmlPreview html={artifact.content} />
                                        : <CodeBlock code={artifact.content} language="html" />
                                )}
                                {artifact.type === 'markdown' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="prose-ai max-w-none bg-white/[0.02] p-8 rounded-3xl border border-white/5 shadow-2xl"
                                    >
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {artifact.content}
                                        </ReactMarkdown>
                                    </motion.div>
                                )}
                                {artifact.type === 'search-results' && artifact.sources && (
                                    <SearchResults sources={artifact.sources} />
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-4 border-t border-white/5 shrink-0 bg-[#0f0f0f]/80 backdrop-blur-md">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em]">
                                    Engineered by AI-Orbit
                                </span>
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                    <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
