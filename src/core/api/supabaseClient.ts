import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing in environment variables.');
}

/**
 * Supabase Client Singleton
 * Primarily used for invoking Edge Functions and Realtime subscriptions.
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export default supabase;
