import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detecta se as chaves sao reais ou placeholders
let isConfigured = 
    Boolean(url) &&
    Boolean(key) &&
    !url.includes('placeholder') &&
    !key.includes('placeholder');

let supabaseClient = null;

if (isConfigured) {
    try {
        supabaseClient = createClient(url, key);
        console.log("Conectado ao Supabase com sucesso!");
    } catch (err) {
        console.error("Erro ao inicializar cliente do Supabase:", err);
        isConfigured = false;
    }
} else {
    console.warn("Supabase nao configurado. Utilizando fallback local (localStorage).");
}

export const supabase = supabaseClient;
export const isSupabaseConfigured = isConfigured;
