/**
 * Cliente Supabase (apenas client-side, usa anon key)
 *
 * A service_role_key NUNCA deve aparecer aqui.
 * Operações admin vão pela API REST com JWT do admin.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

/** Flag: Supabase está configurado? */
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** URL e key públicos (usados em fetch direto para Edge Functions) */
export { SUPABASE_URL, SUPABASE_ANON_KEY };

/**
 * Chama uma Edge Function via fetch direto (mais robusto que supabase.functions.invoke
 * em ambientes com restrições de rede/extensões bloqueadoras).
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: { message: string; status?: number } | null }> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { data: null, error: { message: data?.message ?? data?.error ?? `HTTP ${res.status}`, status: res.status } };
    }
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: (err as Error).message } };
  }
}

/** Cliente único (lazy) */
let _client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!SUPABASE_CONFIGURED) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'pregador-os.auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });
  }
  return _client;
}

// =====================================================
// Tipos
// =====================================================

export type AdminRole = 'super_admin' | 'admin' | 'financeiro' | 'suporte' | 'moderador';
export type UserStatus = 'active' | 'suspended' | 'blocked' | 'trial' | 'cancelled';
export type PlanTier = 'free' | 'essencial' | 'premium' | 'pro' | 'igreja' | 'equipe' | 'institucional';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';
export type FeatureState = 'released' | 'blocked' | 'hidden' | 'premium' | 'development' | 'experimental' | 'beta';

export interface Admin {
  id: string;
  user_id: string;
  email: string;
  nome: string;
  role: AdminRole;
  ativo: boolean;
  ultimo_login_em: string | null;
  criado_em: string;
}

export interface AppUser {
  id: string;
  email: string;
  nome: string | null;
  avatar_url: string | null;
  telefone: string | null;
  igreja: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string;
  status: UserStatus;
  email_verificado: boolean;
  ultimo_login_em: string | null;
  device_count: number;
  criado_em: string;
}

export interface Plan {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  tier: PlanTier;
  preco_mensal: number;
  preco_anual: number;
  moeda: string;
  ativo: boolean;
  destaque: boolean;
  ordem: number;
  limite_sermoes: number;
  limite_estudos: number;
  limite_pesquisas_mes: number;
  limite_ia_mes: number;
  limite_exportacoes_mes: number;
  limite_compartilhamentos_mes: number;
  limite_dispositivos: number;
  limite_armazenamento_mb: number;
  limite_duracao_trial_dias: number;
  f_pulpit: boolean;
  f_assistente: boolean;
  f_biblioteca: boolean;
  f_exportacao: boolean;
  f_estudos: boolean;
  f_templates_premium: boolean;
  f_apresentacoes: boolean;
  f_compartilhamento: boolean;
  f_assistente_premium: boolean;
  f_backup: boolean;
  f_offline: boolean;
  f_sync: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  ciclo: 'monthly' | 'yearly';
  inicio_em: string;
  fim_em: string | null;
  trial_fim_em: string | null;
  cancelado_em: string | null;
  valor_pago: number;
  moeda: string;
  payment_provider: string | null;
  criado_em: string;
}

export interface UsageLog {
  id: string;
  user_id: string | null;
  tipo: string;
  acao: string | null;
  meta: Record<string, unknown> | null;
  provider: string | null;
  tokens_input: number;
  tokens_output: number;
  custo_usd: number;
  duracao_ms: number | null;
  criado_em: string;
}

export interface FeatureFlag {
  id: string;
  feature_key: string;
  nome: string;
  descricao: string | null;
  estado: FeatureState;
  metadata: Record<string, unknown> | null;
}

export interface IAAgent {
  id: string; nome: string; slug: string; descricao: string | null;
  objetivo: string | null; especialidade: string | null;
  icon: string; cor: string; ativo: boolean;
  prompt_sistema: string | null; temperatura: number; modelo: string | null;
  max_tokens: number; contexto_max_tokens: number;
  ferramentas: string[] | null; memoria_tipo: string;
  versao: number; stats_uso: number; stats_tokens: number;
  admin_responsavel: string | null;
  criado_em: string; atualizado_em: string; ultima_uso_em: string | null;
}

export interface IAAgentLog {
  id: string; agent_id: string; user_id: string | null;
  mensagem: string; resposta: string | null;
  tokens_input: number | null; tokens_output: number | null;
  duracao_ms: number | null; custo_usd: number | null;
  modelo: string | null; ferramentas_usadas: string[] | null;
  sucesso: boolean; erro: string | null; criado_em: string;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  user_id_alvo: string | null;
  acao: string;
  recurso: string | null;
  recurso_id: string | null;
  detalhes: Record<string, unknown> | null;
  criado_em: string;
}