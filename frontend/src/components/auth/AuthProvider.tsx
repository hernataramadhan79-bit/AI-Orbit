'use client';

import { useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setSession, setLoading } = useAuthStore();

    useEffect(() => {
        // Jika Supabase belum dikonfigurasi, langsung set loading false
        if (!isSupabaseEnabled) {
            setLoading(false);
            return;
        }

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [setUser, setSession, setLoading]);

    return <>{children}</>;
}
