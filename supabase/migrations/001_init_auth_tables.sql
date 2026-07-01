-- =====================================================
-- Tabela de perfis de usuário
-- Ligada ao auth.users via id = user_id
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT,
  avatar_url TEXT,
  telefone TEXT,
  igreja TEXT,
  cidade TEXT,
  estado TEXT,
  pais TEXT DEFAULT 'Brasil',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked', 'trial', 'cancelled')),
  email_verificado BOOLEAN DEFAULT false,
  ultimo_login_em TIMESTAMPTZ,
  device_count INTEGER DEFAULT 1,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Index pra queries rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- RLS: qualquer pessoa logada pode ver perfis, mas só editar o próprio
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: usuário logado pode ver qualquer perfil
CREATE POLICY "Usuários logados podem ver perfis"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política: usuário só edita próprio perfil
CREATE POLICY "Usuários editam próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Política: inserir ao criar usuário (via trigger)
CREATE POLICY "Usuários podem criar próprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- Tabela de admins
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'financeiro', 'suporte', 'moderador')),
  ativo BOOLEAN DEFAULT true,
  ultimo_login_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins visíveis para admins"
  ON public.admins FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins gerenciam admins"
  ON public.admins FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.admins WHERE ativo = true));

-- =====================================================
-- Tabela de planos
-- =====================================================

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'essencial', 'premium', 'pro', 'igreja', 'equipe', 'institucional')),
  preco_mensal NUMERIC(10,2) DEFAULT 0,
  preco_anual NUMERIC(10,2) DEFAULT 0,
  moeda TEXT DEFAULT 'BRL',
  ativo BOOLEAN DEFAULT true,
  destaque BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  limite_sermoes INTEGER DEFAULT 3,
  limite_estudos INTEGER DEFAULT 5,
  limite_pesquisas_mes INTEGER DEFAULT 10,
  limite_ia_mes INTEGER DEFAULT 50,
  limite_exportacoes_mes INTEGER DEFAULT 5,
  limite_compartilhamentos_mes INTEGER DEFAULT 10,
  limite_dispositivos INTEGER DEFAULT 2,
  limite_armazenamento_mb INTEGER DEFAULT 100,
  limite_duracao_trial_dias INTEGER DEFAULT 14,
  f_pulpit BOOLEAN DEFAULT false,
  f_assistente BOOLEAN DEFAULT true,
  f_biblioteca BOOLEAN DEFAULT false,
  f_exportacao BOOLEAN DEFAULT false,
  f_estudos BOOLEAN DEFAULT false,
  f_templates_premium BOOLEAN DEFAULT false,
  f_apresentacoes BOOLEAN DEFAULT false,
  f_compartilhamento BOOLEAN DEFAULT false,
  f_assistente_premium BOOLEAN DEFAULT false,
  f_backup BOOLEAN DEFAULT false,
  f_offline BOOLEAN DEFAULT false,
  f_sync BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_slug ON public.plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_tier ON public.plans(tier);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planos públicos para visualização"
  ON public.plans FOR SELECT
  USING (true);

CREATE POLICY "Admins gerenciam planos"
  ON public.plans FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.admins WHERE ativo = true));

-- =====================================================
-- Inserir plano FREE padrão
-- =====================================================

INSERT INTO public.plans (slug, nome, tier, preco_mensal, ativo, limite_sermoes, limite_estudos, limite_pesquisas_mes, limite_ia_mes)
VALUES ('free', 'Gratuito', 'free', 0, true, 3, 5, 10, 50)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.plans (slug, nome, tier, preco_mensal, ativo, limite_sermoes, limite_estudos, limite_pesquisas_mes, limite_ia_mes)
VALUES ('essencial', 'Essencial', 'essencial', 19.90, true, 10, 20, 50, 200)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- Notificar PostgREST
-- =====================================================

NOTIFY pgrst, 'reload schema';
