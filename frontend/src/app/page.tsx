'use client';

import { useState, useEffect } from 'react';
import ChatBox from '../components/ai/ChatBox';
import { Plus, PanelLeft, MessageSquare, Trash2, Settings, User, Orbit, X, Palette, Pin, LogOut, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import AuthModal from '../components/auth/AuthModal';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';


// Fallback UUID generator if crypto.randomUUID is unavailable
const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    if (window.crypto.randomUUID) return window.crypto.randomUUID();
    return ([1e7] as any + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: any) =>
      (c ^ (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};


export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState<{ id: string, title: string, messages?: any[], pinned?: boolean }[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { primaryColor, setPrimaryColor } = useThemeStore();
  const { user, signOut } = useAuthStore();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Global trigger for Auth Modal
  useEffect(() => {
    const handleOpenAuth = () => setIsAuthModalOpen(true);
    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  const themePresets = [
    { name: 'Emerald', color: '#10b981' },
    { name: 'Blue', color: '#3b82f6' },
    { name: 'Purple', color: '#a855f7' },
    { name: 'Rose', color: '#f43f5e' },
    { name: 'Amber', color: '#f59e0b' },
    { name: 'Cyan', color: '#06b6d4' },
  ];

  // Sync history from Local Storage & Supabase
  useEffect(() => {
    const refreshHistory = async () => {
      // 1. Get Local History
      const localSaved = localStorage.getItem('ai-orbit-history');
      let combinedHistory = localSaved ? JSON.parse(localSaved) : [];

      // 2. Get Supabase History if User Logged In
      if (user && isSupabaseEnabled) {
        try {
          const { data: convs, error } = await supabase
            .from('conversations')
            .select(`
              id, title, model, is_pinned, updated_at
            `)
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

          if (error) throw error;

          if (convs) {
            const cloudHistory = convs.map(c => ({
              id: c.id,
              title: c.title,
              pinned: c.is_pinned,
              messages: []
            }));

            // --- SMART MERGE: Prevent data loss and duplication ---
            const historyMap = new Map();
            cloudHistory.forEach(item => historyMap.set(item.id, item));

            combinedHistory.forEach((item: any) => {
              if (item.id === activeSessionId) {
                historyMap.set(item.id, item);
              } else if (historyMap.has(item.id)) {
                const cloudItem = historyMap.get(item.id);
                historyMap.set(item.id, { ...cloudItem, messages: item.messages || [] });
              } else {
                historyMap.set(item.id, item);
              }
            });

            combinedHistory = Array.from(historyMap.values());
            localStorage.setItem('ai-orbit-history', JSON.stringify(combinedHistory));
          }
        } catch (err) {
          console.error("☁️ Orbit Cloud: Fetch error", err);
        }
      }

      setChatHistory(combinedHistory);
    };


    refreshHistory();

    if (!activeSessionId) {
      setActiveSessionId(generateUUID());
    }



    window.addEventListener('chat-history-updated', refreshHistory);
    window.addEventListener('storage', refreshHistory);
    return () => {
      window.removeEventListener('chat-history-updated', refreshHistory);
      window.removeEventListener('storage', refreshHistory);
    };
  }, [user]);



  const selectChat = (id: string) => {
    setActiveSessionId(id);
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Update Local Memory
    const newHistory = chatHistory.filter(h => h.id !== id);
    setChatHistory(newHistory);
    localStorage.setItem('ai-orbit-history', JSON.stringify(newHistory));

    // 2. Sync to Cloud
    if (user && isSupabaseEnabled) {
      try {
        const { error } = await supabase.from('conversations').delete().eq('id', id);
        if (error) console.error("☁️ Orbit Cloud: Delete error", error.message);
        else console.log("☁️ Orbit Cloud: Chat deleted successfully.");
      } catch (err) {
        console.error("Orbit Cloud: Delete system error", err);
      }
    }

    if (activeSessionId === id) {
      setActiveSessionId(crypto.randomUUID());
      window.dispatchEvent(new Event('chat-history-updated'));
    }
  };


  const togglePinChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Update Local
    const newHistory = chatHistory.map(h =>
      h.id === id ? { ...h, pinned: !h.pinned } : h
    );
    setChatHistory(newHistory);
    localStorage.setItem('ai-orbit-history', JSON.stringify(newHistory));

    // 2. Sync to Cloud
    if (user && isSupabaseEnabled) {
      const chat = newHistory.find(h => h.id === id);
      try {
        const { error } = await supabase
          .from('conversations')
          .update({ is_pinned: !!chat?.pinned })
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error("☁️ Orbit Cloud: Pin sync error", err);
      }
    }
  };


  const createNewChat = () => {
    const newId = generateUUID();
    setActiveSessionId(newId);
    // Kita biarkan ChatBox mengirim pesan pertama sebelum masuk list history
  };



  const activeSession = chatHistory.find(h => h.id === activeSessionId);

  const handleSignOut = async () => {
    // 1. Bersihkan memory lokal TOTAL saat logout
    localStorage.removeItem('ai-orbit-history');
    setChatHistory([]);
    setActiveSessionId(generateUUID());

    // 2. Jalankan perintah sign out dari store
    await signOut();

    // 3. Force refresh UI agar state benar-benar bersih
    window.location.reload();
  };


  return (
    <main className="flex h-screen w-full bg-[#0f0f0f] overflow-hidden text-gray-200 font-sans relative" style={{ ['--tw-selection-bg' as any]: `${primaryColor}4d` }}>
      {/* Background Ambient Light */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[80%] h-[40%] blur-[120px] pointer-events-none z-0 transition-colors duration-1000"
        style={{ backgroundColor: `${primaryColor}22` }}
      />
      <div
        className="fixed bottom-0 right-0 w-[30%] h-[30%] blur-[100px] pointer-events-none z-0 transition-colors duration-1000"
        style={{ backgroundColor: `${primaryColor}11` }}
      />

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
            className="fixed lg:relative h-full flex-shrink-0 flex flex-col bg-[#111111]/80 backdrop-blur-2xl border-r border-white/5 z-50 shadow-2xl overflow-hidden"
          >
            <div className="w-[280px] h-full flex flex-col">
              {/* Brand Logo */}
              <div className="p-6 pb-2 flex items-center gap-3 group px-5">
                <div className="w-9 h-9 rounded-xl p-[1px] shadow-lg transition-shadow duration-500"
                  style={{
                    background: `linear-gradient(to top right, ${primaryColor}, #3b82f633)`,
                    boxShadow: `0 0 20px ${primaryColor}33`
                  }}
                >
                  <div className="w-full h-full rounded-xl bg-[#0f0f0f] flex items-center justify-center">
                    <Orbit className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" style={{ color: primaryColor }} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight text-white flex items-center gap-0">
                    AI<span className="bg-gradient-to-r bg-clip-text text-transparent underline underline-offset-4"
                      style={{
                        backgroundImage: `linear-gradient(to right, ${primaryColor}, #3b82f6)`,
                        textDecorationColor: `${primaryColor}33`
                      }}
                    >-Orbit</span>
                  </span>

                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] -mt-0.5 opacity-60">Intelligence</span>
                </div>
              </div>

              <div className="p-4 pt-2 flex items-center justify-between">
                <button
                  onClick={createNewChat}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl transition-all duration-300 text-sm font-medium flex-1 text-left border border-white/10 active:scale-[0.98] group"
                >
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Percakapan Baru</span>
                </button>
                <button
                  onClick={toggleSidebar}
                  className="p-2.5 text-gray-400 hover:text-gray-100 hover:bg-white/5 rounded-xl transition-colors ml-2"
                >
                  <PanelLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 mt-4 space-y-4 custom-scrollbar">
                {/* Pinned Chats */}
                {chatHistory.some(chat => chat.pinned) && (
                  <div className="space-y-2">
                    <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Pin className="w-2.5 h-2.5" style={{ color: primaryColor }} />
                      <span>Tersemat</span>
                    </div>
                    {chatHistory.filter(chat => chat.pinned).map(chat => (
                      <motion.div
                        layout
                        key={chat.id}
                        onClick={() => selectChat(chat.id)}
                        className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 cursor-pointer text-sm border ${activeSessionId === chat.id
                          ? 'shadow-[0_0_20px_rgba(0,0,0,0.2)]'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-100 border-transparent'
                          }`}
                        style={activeSessionId === chat.id ? {
                          backgroundColor: `${primaryColor}1a`,
                          color: primaryColor,
                          borderColor: `${primaryColor}33`
                        } : {}}
                      >
                        <MessageSquare className={`w-4 h-4 ${activeSessionId === chat.id ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`} />
                        <span className="truncate flex-1 font-medium">{chat.title}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => togglePinChat(chat.id, e)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                            title="Lepas Peniti"
                          >
                            <Pin className="w-3.5 h-3.5 fill-current rotate-45" style={{ color: primaryColor }} />
                          </button>
                          <button
                            onClick={(e) => deleteChat(chat.id, e)}
                            className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Regular Chats */}
                <div className="space-y-2">
                  <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Riwayat</div>
                  {chatHistory.filter(chat => !chat.pinned).length === 0 && !chatHistory.some(chat => chat.pinned) ? (
                    <div className="px-4 py-12 text-center">
                      <p className="text-xs text-gray-600 italic">Belum ada riwayat percakapan</p>
                    </div>
                  ) : (
                    chatHistory.filter(chat => !chat.pinned).map(chat => (
                      <motion.div
                        layout
                        key={chat.id}
                        onClick={() => selectChat(chat.id)}
                        className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 cursor-pointer text-sm border ${activeSessionId === chat.id
                          ? 'shadow-[0_0_20px_rgba(0,0,0,0.2)]'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-100 border-transparent'
                          }`}
                        style={activeSessionId === chat.id ? {
                          backgroundColor: `${primaryColor}1a`,
                          color: primaryColor,
                          borderColor: `${primaryColor}33`
                        } : {}}
                      >
                        <MessageSquare className={`w-4 h-4 ${activeSessionId === chat.id ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`} />
                        <span className="truncate flex-1 font-medium">{chat.title}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => togglePinChat(chat.id, e)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                            title="Sematkan"
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => deleteChat(chat.id, e)}
                            className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-white/5 bg-[#0a0a0a]/50">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-3 w-full hover:bg-white/5 px-3 py-3 rounded-xl transition-colors text-sm text-gray-400 hover:text-gray-200"
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-medium">Pengaturan</span>
                </button>

                {user ? (
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/5 group relative overflow-hidden">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-colors duration-500 text-black/80 shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {(user.email || user.id).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-white">
                          {user.email ? user.email.split('@')[0] : `User_${user.id.slice(0, 5)}`}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">Orbit Intelligence User</p>
                      </div>
                    </div>

                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full hover:bg-red-500/10 px-3 py-3 rounded-xl transition-colors text-sm text-gray-500 hover:text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="font-medium">Keluar</span>
                    </button>

                  </div>
                ) : (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="mt-2 flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-all text-sm font-bold text-black shadow-xl"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="font-medium">Masuk / Daftar</span>
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative h-full min-w-0 z-10">
        <ChatBox
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          sessionId={activeSessionId}
          initialMessages={activeSession?.messages}
        />
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#161616] border border-white/10 rounded-[32px] shadow-2xl p-8 z-[110] overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5">
                    <Palette className="w-5 h-5" style={{ color: primaryColor }} />
                  </div>
                  <h2 className="text-xl font-bold">Personalisasi Tema</h2>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-400 mb-4">Pilih Warna Aksen Aplikasi</p>
                  <div className="grid grid-cols-3 gap-3">
                    {themePresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => setPrimaryColor(preset.color)}
                        className={`group relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 ${primaryColor === preset.color ? 'bg-white/5' : 'border-white/5 bg-transparent opacity-60 hover:opacity-100 hover:border-white/10'
                          }`}
                        style={primaryColor === preset.color ? { borderColor: `${primaryColor}66` } : {}}
                      >
                        <div
                          className="w-6 h-6 rounded-full shadow-lg"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{preset.name}</span>
                        {primaryColor === preset.color && (
                          <motion.div layoutId="activePreset" className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-[#161616]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Preview Ambient</h3>
                  <div className="h-2 w-full rounded-full overflow-hidden bg-white/10">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: '100%' }}
                      className="h-full" style={{ backgroundColor: primaryColor }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </main>
  );
}
