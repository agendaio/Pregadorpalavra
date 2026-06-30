-- =====================================================
-- PREGADOR OS — Schema inicial
-- =====================================================
-- Idempotente (IF NOT EXISTS em tudo)
-- Pode rodar múltiplas vezes sem erro
-- =====================================================

-- ===== EXTENSIONS =====
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== ENUMS =====
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'financeiro', 'suporte', 'moderador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'suspended', 'blocked', 'trial', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_tier AS ENUM ('free', 'essencial', 'premium', 'pro', 'igreja', 'equipe', 'institucional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE feature_state AS ENUM ('released', 'blocked', 'hidden', 'premium', 'development', 'experimental', 'beta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- TABELA: admins (separada de users para segurança)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  role admin_role NOT NULL DEFAULT 'admin',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_login_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);

-- =====================================================
-- TABELA: plans
-- =====================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tier plan_tier NOT NULL DEFAULT 'free',
  preco_mensal NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_anual NUMERIC(10,2) NOT NULL DEFAULT 0,
  moeda TEXT NOT NULL DEFAULT 'BRL',
  ativo BOOLEAN NOT NULL DEFAULT true,
  destaque BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,

  -- Limites
  limite_sermoes INTEGER NOT NULL DEFAULT 5,
  limite_estudos INTEGER NOT NULL DEFAULT 5,
  limite_pesquisas_mes INTEGER NOT NULL DEFAULT 20,
  limite_ia_mes INTEGER NOT NULL DEFAULT 50,
  limite_exportacoes_mes INTEGER NOT NULL DEFAULT 5,
  limite_compartilhamentos_mes INTEGER NOT NULL DEFAULT 10,
  limite_dispositivos INTEGER NOT NULL DEFAULT 1,
  limite_armazenamento_mb INTEGER NOT NULL DEFAULT 50,
  limite_duracao_trial_dias INTEGER NOT NULL DEFAULT 7,

  -- Features liberadas
  f_pulpit BOOLEAN NOT NULL DEFAULT true,
  f_assistente BOOLEAN NOT NULL DEFAULT true,
  f_biblioteca BOOLEAN NOT NULL DEFAULT true,
  f_exportacao BOOLEAN NOT NULL DEFAULT false,
  f_estudos BOOLEAN NOT NULL DEFAULT true,
  f_templates_premium BOOLEAN NOT NULL DEFAULT false,
  f_apresentacoes BOOLEAN NOT NULL DEFAULT false,
  f_compartilhamento BOOLEAN NOT NULL DEFAULT false,
  f_assistente_premium BOOLEAN NOT NULL DEFAULT false,
  f_backup BOOLEAN NOT NULL DEFAULT false,
  f_offline BOOLEAN NOT NULL DEFAULT true,
  f_sync BOOLEAN NOT NULL DEFAULT false,

  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_slug ON public.plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_tier ON public.plans(tier);

-- =====================================================
-- TABELA: users (perfil público dos usuários)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT,
  avatar_url TEXT,
  telefone TEXT,
  igreja TEXT,
  cidade TEXT,
  estado TEXT,
  pais TEXT DEFAULT 'BR',
  status user_status NOT NULL DEFAULT 'active',
  email_verificado BOOLEAN NOT NULL DEFAULT false,
  ultimo_login_em TIMESTAMPTZ,
  device_count INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_criado ON public.users(criado_em DESC);

-- =====================================================
-- TABELA: subscriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status subscription_status NOT NULL DEFAULT 'trialing',
  ciclo TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'yearly'
  inicio_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim_em TIMESTAMPTZ,
  trial_fim_em TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,
  valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0,
  moeda TEXT NOT NULL DEFAULT 'BRL',
  payment_provider TEXT, -- 'stripe' | 'mercadopago' | 'manual'
  payment_id TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- =====================================================
-- TABELA: usage_log (consumo da plataforma)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL, -- 'ia_request' | 'sermao_created' | 'estudo_created' | 'export' | 'share' | 'login' | 'signup' | 'error'
  acao TEXT,
  meta JSONB,
  provider TEXT, -- 'openai' | 'local' | 'anthropic'
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  custo_usd NUMERIC(10,5) DEFAULT 0,
  duracao_ms INTEGER,
  ip TEXT,
  user_agent TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_user ON public.usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tipo ON public.usage_log(tipo);
CREATE INDEX IF NOT EXISTS idx_usage_criado ON public.usage_log(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_usage_user_tipo_criado ON public.usage_log(user_id, tipo, criado_em DESC);

-- =====================================================
-- TABELA: feature_flags (controle dinâmico)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_key TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  estado feature_state NOT NULL DEFAULT 'released',
  planos_autorizados UUID[] DEFAULT '{}', -- array de plan.id que tem acesso
  metadata JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags(feature_key);

-- =====================================================
-- TABELA: audit_logs (auditoria completa)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  user_id_alvo UUID REFERENCES public.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL, -- 'user.blocked' | 'plan.created' | 'flag.changed' | etc
  recurso TEXT, -- 'user' | 'plan' | 'subscription' | 'feature_flag'
  recurso_id UUID,
  detalhes JSONB,
  ip TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_criado ON public.audit_logs(criado_em DESC);

-- =====================================================
-- TABELA: api_keys (chaves de serviço centralizadas)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL, -- 'openai' | 'anthropic' | 'google'
  key_ciphertext TEXT NOT NULL, -- chave criptografada (uso server-side)
  modelo_padrao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, ativo) -- só uma chave ativa por provider
);

-- =====================================================
-- TRIGGERS: updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['admins','plans','users','subscriptions','feature_flags','api_keys']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_updated_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()', t, t);
  END LOOP;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Função helper SECURITY DEFINER: verifica se o usuário atual é admin ativo.
-- SECURITY DEFINER = roda como owner (postgres), ignora RLS na consulta interna.
-- Isso quebra a recursão infinita que ocorreria com EXISTS direto na tabela admins.
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated, anon;

-- Admins: bloqueia tudo por padrão; só admins ativos acessam
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admins_select_own ON public.admins;
CREATE POLICY admins_select_own ON public.admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS admins_select_all ON public.admins;
CREATE POLICY admins_select_all ON public.admins
  FOR SELECT TO authenticated
  USING (public.auth_is_admin());

-- Plans: leitura pública (qualquer um vê os planos)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plans_select_public ON public.plans;
CREATE POLICY plans_select_public ON public.plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS plans_admin_write ON public.plans;
CREATE POLICY plans_admin_write ON public.plans FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

-- Users: cada user vê só seu próprio perfil; admins veem todos
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.auth_is_admin());
DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.auth_is_admin());

-- Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subs_select_own ON public.subscriptions;
CREATE POLICY subs_select_own ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.auth_is_admin());

-- Usage log: users veem o próprio, admins veem tudo
ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usage_select_own ON public.usage_log;
CREATE POLICY usage_select_own ON public.usage_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.auth_is_admin());
DROP POLICY IF EXISTS usage_insert_self ON public.usage_log;
CREATE POLICY usage_insert_self ON public.usage_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Feature flags: leitura pública (app checa)
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS flags_select_public ON public.feature_flags;
CREATE POLICY flags_select_public ON public.feature_flags FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS flags_admin_write ON public.feature_flags;
CREATE POLICY flags_admin_write ON public.feature_flags FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

-- Audit logs: só admins
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_admin_only ON public.audit_logs;
CREATE POLICY audit_admin_only ON public.audit_logs FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

-- API keys: só admins (service role bypassa RLS)
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS apikeys_admin_only ON public.api_keys;
CREATE POLICY apikeys_admin_only ON public.api_keys FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

-- =====================================================
-- Trigger: cria users profile automaticamente no signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.tg_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.tg_handle_new_user();

-- =====================================================
-- Fim do schema inicial
-- =====================================================
NOTIFY pgrst, 'reload schema';