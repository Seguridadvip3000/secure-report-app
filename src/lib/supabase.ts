import { createClient } from '@supabase/supabase-js';

// Necesitarás reemplazar estos valores con los de tu proyecto Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://TU-PROYECTO.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'TU_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
