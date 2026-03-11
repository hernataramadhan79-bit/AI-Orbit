'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Code, FileText, Eye, Copy, Check, ExternalLink, ChevronRight, Download, Maximize2, Minimize2, FileDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useThemeStore } from '../../store/useThemeStore';
import { jsPDF } from 'jspdf';

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
            <pre className="p-5 text-sm text-gray-300 font-mono overflow-auto custom-scrollbar leading-relaxed max-h-[80vh]">
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
            className="w-full h-[75vh] rounded-xl border border-white/10 bg-white"
            sandbox="allow-scripts allow-same-origin"
            title="HTML Preview"
        />
    );
}

// --- Search Results ---
function SearchResults({ sources }: { sources: { title: string; url: string; content: string }[] }) {
    const { primaryColor } = useThemeStore();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    📊 Hasil Pencarian ({sources.length})
                </span>
            </div>
            {sources.map((src, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="rounded-xl bg-white/5 border border-white/8 overflow-hidden hover:bg-white/8 transition-colors group"
                >
                    <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm text-white truncate pr-4">{src.title}</p>
                                <p className="text-[11px] mt-1 truncate" style={{ color: primaryColor }}>{src.url}</p>
                                <p className={`text-xs text-gray-400 leading-relaxed mt-2 ${expandedIndex === i ? '' : 'line-clamp-2'}`}>
                                    {src.content}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <a
                                    href={src.url}
                                    onClick={(e) => e.stopPropagation()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all"
                                    title="Buka di tab baru"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                                <ChevronRight
                                    className={`w-4 h-4 text-gray-500 transition-transform ${expandedIndex === i ? 'rotate-90' : ''}`}
                                />
                            </div>
                        </div>
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
    const [isFullscreen, setIsFullscreen] = useState(true);

    useEffect(() => {
        // Reset state when artifact changes
        setViewMode('preview');
        setIsFullscreen(true);
    }, [artifact?.id]);

    const isHtml = artifact?.type === 'html';

    const handleDownloadPdf = () => {
        if (!artifact) return;
        const doc = new jsPDF();
        
        // --- Hilangkan simbol Markdown untuk tampilan PDF yang bersih ---
        const cleanContent = artifact.content
            .replace(/^#+\s/gm, '') // Hapus header (#)
            .replace(/\*\*/g, '')   // Hapus bold (**)
            .replace(/\*/g, '')     // Hapus italic (*)
            .replace(/^- /gm, '• ')  // Ganti dash menjadi bullet point
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Ambil teks dari link
            .replace(/```[\s\S]*?```/g, '\n[Blok Kode]\n'); // Sederhanakan blok kode

        // Header Dokumen
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(33, 33, 33); // Warna teks gelap
        doc.text(artifact.title, 20, 25);
        
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Dokumen ini dibuat secara otomatis oleh AI-Orbit (Premium) pada ${new Date().toLocaleDateString('id-ID')}`, 20, 33);
        
        // Garis pemisah
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.5);
        doc.line(20, 38, 190, 38);
        
        // Isi Konten
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        
        const paragraphs = cleanContent.split('\n');
        let cursorY = 48;
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const bottomMargin = 25;
        const contentWidth = 170;

        paragraphs.forEach(paragraph => {
            if (!paragraph.trim() && paragraph.length === 0) {
                cursorY += 4; // Spasi untuk baris kosong
                return;
            }

            const lines = doc.splitTextToSize(paragraph, contentWidth);
            lines.forEach((line: string) => {
                // Cek apakah perlu halaman baru
                if (cursorY > pageHeight - bottomMargin) {
                    doc.addPage();
                    cursorY = 25; // Reset kursor ke atas halaman baru
                }
                doc.text(line, margin, cursorY);
                cursorY += 7; // Spasi antar baris
            });
            cursorY += 2; // Spasi tambahan antar paragraf
        });
        
        doc.save(`${artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    };

    const handleDownloadRaw = () => {
        if (!artifact) return;

        let extension = '.txt';
        if (artifact.type === 'code') {
            // Mapping bahasa ke ekstensi
            const lang = artifact.language?.toLowerCase();
            if (lang === 'python') extension = '.py';
            else if (lang === 'javascript') extension = '.js';
            else if (lang === 'typescript') extension = '.ts';
            else if (lang === 'html') extension = '.html';
            else if (lang === 'css') extension = '.css';
            else if (lang === 'json') extension = '.json';
            else if (lang === 'react' || lang === 'jsx') extension = '.jsx';
            else if (lang === 'tsx') extension = '.tsx';
            else extension = `.${lang || 'txt'}`;
        }
        else if (artifact.type === 'html') extension = '.html';
        else if (artifact.type === 'markdown') extension = '.md';
        else if (artifact.type === 'mermaid') extension = '.mmd';

        const blob = new Blob([artifact.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };



    return (
        <AnimatePresence>
            {artifact && (
                <motion.div
                    key={artifact.id}
                    initial={{ opacity: 0 }}
                    animate={{ 
                        opacity: 1, 
                        width: isFullscreen ? '100vw' : '450px',
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={`fixed inset-y-0 right-0 h-full bg-[#050505] lg:border-l border-white/5 overflow-hidden z-[100] shadow-2xl transition-all duration-500 ${isFullscreen ? 'w-full' : 'max-w-full lg:min-w-[450px]'}`}
                >
                    <div className="flex flex-col h-full bg-[#0a0a0a]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/5 shrink-0 bg-[#0f0f0f]/80 backdrop-blur-2xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl flex items-center justify-center bg-white/5 border border-white/5 shadow-inner shrink-0"
                                    style={{ color: primaryColor }}>
                                    {artifact.type === 'code' ? <Code className="w-5 h-5" /> :
                                        artifact.type === 'html' ? <Eye className="w-5 h-5" /> :
                                            <FileText className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0">
                                    <span className="block font-bold text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-0.5">Intelligence Artifact</span>
                                    <span className="block font-semibold text-sm md:text-[15px] text-white truncate leading-none">{artifact.title}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {isHtml && (
                                    <div className="flex p-0.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold mr-1">
                                        {(['preview', 'source'] as const).map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setViewMode(mode)}
                                                className={`px-2.5 py-1.5 rounded-lg transition-all duration-300 ${viewMode === mode ? 'bg-white text-black shadow-lg scale-100' : 'text-gray-500 hover:text-white scale-95'}`}
                                            >
                                                {mode === 'preview' ? 'Preview' : 'Kode'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {artifact.type === 'markdown' ? (
                                    <button
                                        onClick={handleDownloadPdf}
                                        className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-90 border border-white/5 flex items-center gap-2"
                                        title="Unduh PDF"
                                    >
                                        <FileDown className="w-5 h-5" />
                                        <span className="text-xs font-bold hidden xs:inline">Unduh PDF</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleDownloadRaw}
                                        className="px-4 py-2.5 rounded-2xl bg-primary/10 hover:bg-primary/20 text-white transition-all active:scale-90 border border-primary/20 flex items-center gap-2"
                                        style={{ backgroundColor: `${primaryColor}20`, borderColor: `${primaryColor}40`, color: primaryColor }}
                                        title="Unduh Kode"
                                    >
                                        <Download className="w-5 h-5" />
                                        <span className="text-xs font-bold hidden xs:inline">Unduh .{artifact.language || 'file'}</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-90 border border-white/5 hidden md:block"
                                    title={isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
                                >
                                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                                </button>

                                <button
                                    onClick={onClose}
                                    className="p-2.5 rounded-2xl bg-white/10 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all active:scale-90 border border-white/10"
                                    title="Tutup"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#050505]">
                            <div className={`${isFullscreen ? 'max-w-5xl mx-auto' : ''} p-5 md:p-8 space-y-8`}>
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
                                        className="prose-ai max-w-none bg-white/[0.02] p-6 md:p-10 rounded-3xl border border-white/5 shadow-2xl"
                                    >
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {artifact.content}
                                        </ReactMarkdown>
                                    </motion.div>
                                )}
                                {artifact.type === 'search-results' && artifact.sources && (
                                    <SearchResults sources={artifact.sources} />
                                )}
                                {artifact.type === 'mermaid' && (
                                    <div className="bg-white/5 p-8 rounded-3xl border border-white/5 font-mono text-sm text-gray-400">
                                        [Diagram Mermaid Content]
                                        <CodeBlock code={artifact.content} language="mermaid" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-3 border-t border-white/5 shrink-0 bg-[#0a0a0a]">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.2em]">
                                    Secure Artifact Storage — Orbit 1.0
                                </span>
                                <div className="flex gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-white/10"></div>
                                    <div className="w-1 h-1 rounded-full bg-white/15"></div>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
