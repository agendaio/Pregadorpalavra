/**
 * Store de autenticação para usuário comum.
 * Gerencia login, cadastro e sessão do usuário.
 */

import { create } from 'zustand';
import { supabase, SUPABASE_CONFIGURED, type AppUser } from '@/lib/supabase';

interface AuthState {
  user: AppUser | null;
  carregando: boolean;
  erro: string | null;

  inicializar: () => Promise<void>;
  login: (email: string, senha: string) => Promise<void>;
  signup: (email: string, senha: string, nome: string) => Promise<void>;
  logout: () => Promise<void>;
  atualizarPerfil: (dados: Partial<AppUser>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  carregando: false,
  erro: null,

  inicializar: async () => {
    if (!SUPABASE_CONFIGURED) {
      set({ erro: 'Supabase não configurado', carregando: false });
      return;
    }

    const sb = supabase()!;
    set({ carregando: true });

    // Timeout de 10s
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000));

    try {
      const { data: { session } } = await Promise.race([
        sb.auth.getSession(),
        timeout,
      ]) ?? { data: { session: null } };

      if (session?.user) {
        // Buscar perfil do usuário
        const { data: perfil } = await sb
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (perfil) {
          set({ user: perfil as AppUser, erro: null });
        } else {
          // Criar perfil se não existir
          const novoPerfil = {
            id: session.user.id,
            email: session.user.email ?? '',
            nome: session.user.user_metadata?.nome ?? session.user.email?.split('@')[0] ?? 'Usuário',
            avatar_url: null,
            telefone: null,
            igreja: null,
            cidade: null,
            estado: null,
            pais: 'Brasil',
            status: 'active' as const,
            email_verificado: session.user.email_confirmed_at !== null,
            ultimo_login_em: new Date().toISOString(),
            device_count: 1,
            criado_em: session.user.created_at,
          };

          await sb.from('profiles').upsert(novoPerfil);
          set({ user: novoPerfil, erro: null });
        }
      }

      // Listener de mudanças
      sb.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data: perfil } = await sb
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (perfil) {
            set({ user: perfil as AppUser });
          }
        } else {
          set({ user: null });
        }
      });
    } catch {
      // Falha de rede
    }

    set({ carregando: false });
  },

  login: async (email: string, senha: string) => {
    if (!SUPABASE_CONFIGURED) {
      set({ erro: 'Supabase não configurado' });
      throw new Error('Supabase não configurado');
    }

    const sb = supabase()!;
    set({ carregando: true, erro: null });

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });

      if (error) {
        set({ carregando: false, erro: error.message });
        throw error;
      }

      if (!data.user) {
        set({ carregando: false, erro: 'Login falhou' });
        throw new Error('Sem usuário');
      }

      // Buscar ou criar perfil
      const { data: perfil } = await sb
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (perfil) {
        // Atualizar último login
        await sb.from('profiles').update({ ultimo_login_em: new Date().toISOString() }).eq('id', data.user.id);
        set({ user: perfil as AppUser, carregando: false });
      } else {
        const novoPerfil = {
          id: data.user.id,
          email: data.user.email ?? email,
          nome: data.user.user_metadata?.nome ?? email.split('@')[0],
          avatar_url: null,
          telefone: null,
          igreja: null,
          cidade: null,
          estado: null,
          pais: 'Brasil',
          status: 'active' as const,
          email_verificado: data.user.email_confirmed_at !== null,
          ultimo_login_em: new Date().toISOString(),
          device_count: 1,
          criado_em: data.user.created_at,
        };

        await sb.from('profiles').upsert(novoPerfil);
        set({ user: novoPerfil, carregando: false });
      }
    } catch (err) {
      if ((err as Error).message !== 'Supabase não configurado') {
        set({ carregando: false });
      }
      throw err;
    }
  },

  signup: async (email: string, senha: string, nome: string) => {
    if (!SUPABASE_CONFIGURED) {
      set({ erro: 'Supabase não configurado' });
      throw new Error('Supabase não configurado');
    }

    const sb = supabase()!;
    set({ carregando: true, erro: null });

    try {
      const { data, error } = await sb.auth.signUp({
        email,
        password: senha,
        options: {
          data: { nome },
        },
      });

      if (error) {
        set({ carregando: false, erro: error.message });
        throw error;
      }

      if (!data.user) {
        set({ carregando: false, erro: 'Cadastro falhou' });
        throw new Error('Sem usuário');
      }

      // Criar perfil
      const novoPerfil = {
        id: data.user.id,
        email,
        nome,
        avatar_url: null,
        telefone: null,
        igreja: null,
        cidade: null,
        estado: null,
        pais: 'Brasil',
        status: 'trial' as const,
        email_verificado: false,
        ultimo_login_em: null,
        device_count: 1,
        criado_em: new Date().toISOString(),
      };

      await sb.from('profiles').upsert(novoPerfil);
      set({ user: novoPerfil, carregando: false });
    } catch (err) {
      if ((err as Error).message !== 'Supabase não configurado') {
        set({ carregando: false });
      }
      throw err;
    }
  },

  logout: async () => {
    if (!SUPABASE_CONFIGURED) return;
    const sb = supabase()!;
    await sb.auth.signOut();
    set({ user: null });
  },

  atualizarPerfil: async (dados: Partial<AppUser>) => {
    const { user } = get();
    if (!user) return;

    const sb = supabase()!;
    const { error } = await sb
      .from('profiles')
      .update(dados)
      .eq('id', user.id);

    if (!error) {
      set({ user: { ...user, ...dados } });
    }
  },
}));
