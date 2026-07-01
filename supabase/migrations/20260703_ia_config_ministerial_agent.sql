-- Migration: 0021_ia_config_ministerial_agent.sql
-- Criado em: 2026-07-01
-- Objetivo: Tabela de configuração centralizada para o Agente Ministerial

-- Cria a tabela se não existir (schema básico do original 20260602)
CREATE TABLE IF NOT EXISTS ia_config (
  id VARCHAR(50) PRIMARY KEY,
  valor TEXT,
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Adiciona colunas extras caso a tabela já exista do schema original
ALTER TABLE ia_config ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE ia_config ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ia_config ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE ia_config ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE ia_config ALTER COLUMN valor SET DEFAULT '';

-- Comentário para documentação
COMMENT ON TABLE ia_config IS 'Configurações centralizadas do sistema IA (agente ministerial, prompts globais, etc.)';
COMMENT ON COLUMN ia_config.id IS 'Identificador único (ex: agente_ministerial, prompt_global, prompt_seguranca)';
COMMENT ON COLUMN ia_config.valor IS 'Valor principal (ex: texto do prompt do sistema)';
COMMENT ON COLUMN ia_config.metadata IS 'Configurações estruturadas em JSON (temperatura, modelo, tokens, etc.)';

-- Seed: configuração padrão do Assistente Ministerial
INSERT INTO ia_config (id, label, valor, metadata, ativo)
VALUES (
  'agente_ministerial',
  'Assistente Ministerial',
  '',
  '{"temperatura": 0.7, "max_tokens": 2500, "modelo": "gpt-4o-mini", "streaming": true, "context_window": 128000, "habilitado": true}',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Seed: prompt de segurança padrão
INSERT INTO ia_config (id, label, valor, metadata, ativo)
VALUES (
  'prompt_seguranca',
  'Prompt de Segurança',
  'Nunca afirme autoridade religiosa. Nunca invente versículos. Diferencie fato de interpretação. Respeite tradições cristãs diferentes.',
  '{}',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Seed: prompt bíblico padrão
INSERT INTO ia_config (id, label, valor, metadata, ativo)
VALUES (
  'prompt_biblico',
  'Prompt Bíblico',
  'Baseie respostas na Bíblia. Incentive o estudo pessoal. Cite referências completas. Indique quando houver debates acadêmicos.',
  '{}',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Trigger para atualizar_at
CREATE OR REPLACE FUNCTION update_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ia_config_updated_at ON ia_config;
CREATE TRIGGER trigger_ia_config_updated_at
  BEFORE UPDATE ON ia_config
  FOR EACH ROW EXECUTE FUNCTION update_at_column();

-- RLS: admins podem ler/escrever, anon não pode
ALTER TABLE ia_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins can manage ia_config" ON ia_config;
CREATE POLICY "admins can manage ia_config"
  ON ia_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid() AND admins.ativo = true
    )
  );

-- Notificar PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';
