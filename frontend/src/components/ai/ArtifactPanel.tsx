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
                    className="flex flex-col h-full bg-[#111111] border-l border-white/5 overflow-hidden"
                    style={{ minWidth: '380px' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5"
                                style={{ color: primaryColor }}>
                                {artifact.type === 'code' ? <Code className="w-4 h-4" /> :
                                    artifact.type === 'html' ? <Eye className="w-4 h-4" /> :
                                        <FileText className="w-4 h-4" />}
                            </div>
                            <span className="font-semibold text-sm text-white truncate">{artifact.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {isHtml && (
                                <div className="flex rounded-xl overflow-hidden border border-white/8 text-[11px]">
                                    {(['preview', 'source'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setViewMode(mode)}
                                            className={`px-3 py-1.5 font-semibold capitalize transition-colors ${viewMode === mode ? 'text-black' : 'text-gray-500 hover:text-white'}`}
                                            style={viewMode === mode ? { backgroundColor: primaryColor } : {}}
                                        >
                                            {mode === 'preview' ? '👁 Preview' : '⌨ Kode'}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-600 hover:text-white transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {artifact.type === 'code' && (
                            <CodeBlock code={artifact.content} language={artifact.language} />
                        )}
                        {artifact.type === 'html' && (
                            viewMode === 'preview'
                                ? <HtmlPreview html={artifact.content} />
                                : <CodeBlock code={artifact.content} language="html" />
                        )}
                        {artifact.type === 'markdown' && (
                            <div className="prose-ai max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {artifact.content}
                                </ReactMarkdown>
                            </div>
                        )}
                        {artifact.type === 'search-results' && artifact.sources && (
                            <SearchResults sources={artifact.sources} />
                        )}
                    </div>

                    {/* Footer badge */}
                    <div className="px-6 py-3 border-t border-white/5 shrink-0">
                        <span className="text-[10px] font-mono text-gray-700 uppercase tracking-widest">
                            Artifact · AI-Orbit
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
