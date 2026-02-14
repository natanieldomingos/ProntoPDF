import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Mantemos o app funcionando mesmo sem configurar login.
// Quando as variáveis não existirem, `supabase` fica null e a UI mostra o passo a passo.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "prontopdf.auth",
      },
    })
  : null;
