import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Jika env var belum diisi, buat dummy client agar app tidak crash
const isConfigured = supabaseUrl.startsWith('http') && supabaseAnonKey.length > 10;

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder-key-for-build');

export const isSupabaseEnabled = isConfigured;
