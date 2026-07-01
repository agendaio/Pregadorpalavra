/**
 * Store de autenticação admin.
 * Persiste sessão e expõe helpers de login/logout.
 */

import { create } from 'zustand';
import { supabase, SUPABASE_CONFIGURED, type Admin } from '@/lib/supabase';

interface AuthState {
  user: { id: string; email: string | null } | null;
  admin: Admin | null;
  carregando: boolean;
  erro: string | null;

  inicializar: () => Promise<void>;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  checarAdmin: () => Promise<Admin | null>;
}

export const useAuthAdminStore = create<AuthState>((set, get) => ({
  user: null,
  admin: null,
  carregando: false,
  erro: null,

  inicializar: async () => {
    if (!SUPABASE_CONFIGURED) {
      set({ erro: 'Supabase não configurado (VITE_SUPABASE_URL/KEY)', carregando: false });
      return;
    }
    const sb = supabase()!;
    set({ carregando: true });

    // Timeout de 10s — se Supabase não responder, abandona
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000));

    try {
      const { data: { session } } = await Promise.race([
        sb.auth.getSession(),
        timeout,
      ]) ?? { data: { session: null } };

      if (session?.user) {
        set({ user: { id: session.user.id, email: session.user.email ?? null } });
        const admin = await get().checarAdmin();
        if (!admin) {
          await sb.auth.signOut();
          set({ user: null, admin: null });
        }
      }

      sb.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          set({ user: { id: session.user.id, email: session.user.email ?? null } });
          await get().checarAdmin();
        } else {
          set({ user: null, admin: null });
        }
      });
    } catch {
      // Falha de rede — segue sem sessão
    }

    set({ carregando: false });
  },

  login: async (email: string, senha: string) => {
    if (!SUPABASE_CONFIGURED) {
      set({ erro: 'Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env e na Vercel.' });
      throw new Error('Supabase não configurado');
    }
    const sb = supabase()!;
    set({ carregando: true, erro: null });

    const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) {
      set({ carregando: false, erro: error.message });
      throw error;
    }
    if (!data.user) {
      set({ carregando: false, erro: 'Login falhou' });
      throw new Error('Sem usuário');
    }

    set({ user: { id: data.user.id, email: data.user.email ?? null } });

    const admin = await get().checarAdmin();
    if (!admin) {
      await sb.auth.signOut();
      set({ user: null, admin: null, carregando: false, erro: 'Você não tem permissão de administrador.' });
      throw new Error('Sem permissão');
    }

    set({ carregando: false });
  },

  logout: async () => {
    if (!SUPABASE_CONFIGURED) return;
    const sb = supabase()!;
    await sb.auth.signOut();
    set({ user: null, admin: null });
  },

  checarAdmin: async () => {
    const sb = supabase()!;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const { data, error } = await sb
      .from('admins')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .maybeSingle();

    if (error || !data) {
      set({ admin: null });
      return null;
    }
    set({ admin: data as Admin });
    return data as Admin;
  },
}));