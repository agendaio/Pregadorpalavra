-- ============================================================
-- MIGRATION: AI Agents System
-- ============================================================

-- Tabela principal de agentes IA
CREATE TABLE IF NOT EXISTS public.ia_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  descricao TEXT,
  objetivo TEXT,
  especialidade VARCHAR(100),
  icon VARCHAR(20) DEFAULT '🤖',
  cor VARCHAR(20) DEFAULT '#18181b',
  ativo BOOLEAN DEFAULT true,

  -- Prompt do sistema
  prompt_sistema TEXT,
  temperatura DECIMAL(3,2) DEFAULT 0.7,
  modelo VARCHAR(50),
  max_tokens INTEGER DEFAULT 2048,
  contexto_max_tokens INTEGER DEFAULT 128000,

  -- Configuração
  ferramentas TEXT[], -- jsonb array: ['web_search','calculator','...']
  base_conhecimento_id UUID,
  memoria_tipo VARCHAR(30) DEFAULT 'sermon', -- sermon|general|study|prayer|biblical

  -- Metadados
  versao INTEGER DEFAULT 1,
  criada_por UUID REFERENCES public.admins(id),
  admin_responsavel VARCHAR(200),
  stats_uso INTEGER DEFAULT 0,
  stats_tokens INTEGER DEFAULT 0,

  -- Timestamps
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  ultima_uso_em TIMESTAMPTZ
);

-- Histórico de versões do prompt
CREATE TABLE IF NOT EXISTS public.ia_agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ia_agents(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  prompt_sistema TEXT NOT NULL,
  temperatura DECIMAL(3,2),
  modelo VARCHAR(50),
  max_tokens INTEGER,
  changelog TEXT,
  criada_por UUID REFERENCES public.admins(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, versao)
);

-- Tabela de logs por agente
CREATE TABLE IF NOT EXISTS public.ia_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.ia_agents(id),
  user_id UUID,
  mensagem TEXT,
  resposta TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  duracao_ms INTEGER,
  custo_usd DECIMAL(8,6),
  modelo VARCHAR(50),
 工具_usadas TEXT[],
  sucesso BOOLEAN DEFAULT true,
  erro TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Configurações globais de IA (prompt padrão, etc)
CREATE TABLE IF NOT EXISTS public.ia_config (
  id VARCHAR(50) PRIMARY KEY,
  valor TEXT,
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ia_agents_slug ON public.ia_agents(slug);
CREATE INDEX IF NOT EXISTS idx_ia_agents_ativo ON public.ia_agents(ativo);
CREATE INDEX IF NOT EXISTS idx_ia_agent_logs_agent ON public.ia_agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_ia_agent_logs_data ON public.ia_agent_logs(criado_em);
CREATE INDEX IF NOT EXISTS idx_ia_agent_versions_agent ON public.ia_agent_versions(agent_id);

-- RLS
ALTER TABLE public.ia_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_config ENABLE ROW LEVEL SECURITY;

-- Agentes: admin logado pode ler/escrever; anon não toca nada
DROP POLICY IF EXISTS "admins manage agents" ON public.ia_agents;
CREATE POLICY "admins manage agents" ON public.ia_agents
  FOR ALL USING (public.auth_is_admin() = true);

DROP POLICY IF EXISTS "admins manage versions" ON public.ia_agent_versions;
CREATE POLICY "admins manage versions" ON public.ia_agent_versions
  FOR ALL USING (public.auth_is_admin() = true);

DROP POLICY IF EXISTS "admins manage logs" ON public.ia_agent_logs;
CREATE POLICY "admins manage logs" ON public.ia_agent_logs
  FOR ALL USING (public.auth_is_admin() = true);

DROP POLICY IF EXISTS "admins manage config" ON public.ia_config;
CREATE POLICY "admins manage config" ON public.ia_config
  FOR ALL USING (public.auth_is_admin() = true);

-- Seed: agente padrão "Assistente Pregador"
INSERT INTO public.ia_agents (
  nome, slug, descricao, objetivo, especialidade, icon, cor, ativo,
  prompt_sistema, temperatura, modelo, max_tokens, contexto_max_tokens,
  memoria_tipo, versao, admin_responsavel
) VALUES (
  'Assistente Pregador',
  'assistente-pregador',
  'Assistente especializado em ajudar pregadores a preparar sermões, esboços, ilustrações e estudos bíblicos.',
  'Auxiliar o pregador em todas as etapas de preparação da mensagem: desde a escolha do texto até a aplicação prática.',
  'Pregação e Teologia',
  '🗣️',
  '#7c3aed',
  true,
  'Você é o Assistente Pregador, um teólogo e pregador experiente. Seu objetivo é ajudar pregadores a preparar mensagens impactantes.\n\nSua atuação:\n- Auxiliar na interpretação de textos bíblicos\n- Criar esboços e estruturar sermões\n- Sugerir ilustrações e aplicações\n- Preparar estudos aprofundados\n- Ajudar com reflexões e orações\n\nSeja sempre pastoral, teologicamente sólido e prático nas sugestões.',
  0.7,
  'gpt-4o-mini',
  2048,
  128000,
  'sermon',
  1,
  'Sistema'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.ia_agent_versions (
  agent_id, versao, prompt_sistema, temperatura, modelo, max_tokens, changelog
)
SELECT id, 1, prompt_sistema, temperatura, modelo, max_tokens, 'Versão inicial'
FROM public.ia_agents WHERE slug = 'assistente-pregador'
ON CONFLICT (agent_id, versao) DO NOTHING;

-- Seed: segundo agente "Assistente de Estudos"
INSERT INTO public.ia_agents (
  nome, slug, descricao, objetivo, especialidade, icon, cor, ativo,
  prompt_sistema, temperatura, modelo, max_tokens, contexto_max_tokens,
  memoria_tipo, versao, admin_responsavel
) VALUES (
  'Assistente de Estudos',
  'assistente-estudos',
  'Assistente focado em pesquisa bíblica, teologia e estudos detalhados.',
  'Ajudar o usuário em pesquisas teológicas, estudos de palavras gregas/hebraicas e análises doutrinárias.',
  'Estudos e Teologia',
  '📖',
  '#0891b2',
  true,
  'Você é o Assistente de Estudos, especializado em pesquisa bíblica e teologia. Seu objetivo é fornecer estudos profundos e precisos.\n\nSua atuação:\n- Pesquisa em textos originais (grego, hebraico)\n- Análise teológica de passagens\n- Comparação entre traduções\n- Contexto histórico-cultural\n- Doutrinas e sistemática\n\nSeja acadêmico, preciso e sempre referencie as fontes.',
  0.5,
  'gpt-4o-mini',
  2048,
  128000,
  'study',
  1,
  'Sistema'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.ia_agent_versions (
  agent_id, versao, prompt_sistema, temperatura, modelo, max_tokens, changelog
)
SELECT id, 1, prompt_sistema, temperatura, modelo, max_tokens, 'Versão inicial'
FROM public.ia_agents WHERE slug = 'assistente-estudos'
ON CONFLICT (agent_id, versao) DO NOTHING;

-- Prompt global seed
INSERT INTO public.ia_config (id, valor) VALUES
  ('prompt_global', 'Você é um assistente pastoral útil e respeitoso. Responda sempre com clareza, pastoralismo e precisão teológica.')
ON CONFLICT (id) DO NOTHING;

-- RPC para incrementar stats do agente
CREATE OR REPLACE FUNCTION public.increment_agent_stats(p_agent_id UUID, p_tokens INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.ia_agents
  SET stats_uso = stats_uso + 1,
      stats_tokens = stats_tokens + COALESCE(p_tokens, 0),
      ultima_uso_em = now(),
      atualizado_em = now()
  WHERE id = p_agent_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_agent_stats TO authenticated, anon;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
