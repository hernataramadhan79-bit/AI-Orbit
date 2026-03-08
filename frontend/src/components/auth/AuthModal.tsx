'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Loader2, Sparkles, Chrome } from 'lucide-react';

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { useThemeStore } from '../../store/useThemeStore';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { primaryColor } = useThemeStore();

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                alert('Konfirmasi email Anda untuk melanjutkan.');
            }
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: 'google') => {

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
        }
    };


    // Jika Supabase belum dikonfigurasi, tampilkan panduan setup
    if (isOpen && !isSupabaseEnabled) {
        return (
            <AnimatePresence>
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md rounded-[2rem] bg-[#0f0f0f] border border-white/10 shadow-2xl p-8"
                    >
                        <button onClick={onClose} className="absolute top-5 right-5 p-2 hover:bg-white/5 rounded-full text-gray-400">
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col items-center text-center gap-4 py-4">
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-amber-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Setup Supabase Dulu</h2>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Fitur login belum aktif karena Supabase belum dikonfigurasi. Tambahkan key berikut ke file <code className="text-amber-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">frontend/.env.local</code>:
                            </p>
                            <div className="w-full bg-white/5 rounded-xl p-4 text-left font-mono text-xs text-gray-300 leading-loose border border-white/10">
                                <p className="text-gray-500"># Dari Supabase Dashboard → Settings → API</p>
                                <p><span className="text-emerald-400">NEXT_PUBLIC_SUPABASE_URL</span>=https://xxxxx.supabase.co</p>
                                <p><span className="text-emerald-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>=eyJxxxxxx</p>
                            </div>
                            <p className="text-gray-500 text-xs">Setelah mengisi file tersebut, restart frontend dengan <code className="text-white bg-white/5 px-1.5 py-0.5 rounded">npm run dev</code></p>
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-[#0f0f0f] border border-white/10 shadow-2xl shadow-black"
                    >
                        {/* Background Accents */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" style={{ backgroundImage: `linear-gradient(90deg, transparent, ${primaryColor}55, transparent)` }} />
                        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px]" style={{ backgroundColor: `${primaryColor}15` }} />

                        <div className="relative p-8 pt-10">
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex flex-col items-center mb-8 text-center">
                                <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center bg-white/5 border border-white/10 mb-4 shadow-xl">
                                    <Sparkles className="w-8 h-8" style={{ color: primaryColor }} />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    {isLogin ? 'Selamat Datang Kembali' : 'Bergabung dengan Orbit'}
                                </h2>
                                <p className="text-gray-400 text-sm">
                                    {isLogin ? 'Masuk untuk sinkronisasi kecerdasan Anda.' : 'Mulai perjalanan kecerdasan buatan Anda.'}
                                </p>
                            </div>

                            <form onSubmit={handleEmailAuth} className="space-y-4">
                                <div className="space-y-2">
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-white transition-colors" />
                                        <input
                                            type="email"
                                            placeholder="Alamat Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-gray-600"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-white transition-colors" />
                                        <input
                                            type="password"
                                            placeholder="Kata Sandi"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-gray-600"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-red-400 text-[11px] font-medium px-1 leading-relaxed">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="relative w-full py-4 rounded-2xl font-bold text-black transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 overflow-hidden group shadow-xl"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <span className="relative">{isLogin ? 'Masuk' : 'Daftar Sekarang'}</span>
                                    )}
                                </button>
                            </form>

                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/5"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold text-gray-600">
                                    <span className="bg-[#0f0f0f] px-4">Atau Lewat</span>
                                </div>
                            </div>

                            <div className="mb-8">
                                <button
                                    onClick={() => handleOAuth('google')}
                                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-semibold transition-all shadow-md active:scale-95"
                                >
                                    <Chrome className="w-5 h-5 text-emerald-400" style={{ color: primaryColor }} />
                                    <span>Lanjut dengan Google</span>
                                </button>
                            </div>


                            <p className="text-center text-gray-500 text-xs">
                                {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
                                <button
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="ml-2 font-bold hover:underline"
                                    style={{ color: primaryColor }}
                                >
                                    {isLogin ? 'Daftar' : 'Masuk'}
                                </button>
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
