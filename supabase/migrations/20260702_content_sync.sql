-- ============================================================
-- PREGADOR OS — Migrations completas
-- Banco: waxtmjkelcfevzyyugkt
-- Data: 2026-07-01
-- ============================================================

-- ── 1. TABELA: series (criar ANTES de mensagens por causa da FK) ───────────
CREATE TABLE IF NOT EXISTS series (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  descricao     TEXT,
  cor           TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_series_user_id ON series(user_id);
CREATE OR REPLACE FUNCTION fn_series_updated_em() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;
CREATE OR REPLACE TRIGGER trg_series_updated_em
  BEFORE UPDATE ON series FOR EACH ROW EXECUTE FUNCTION fn_series_updated_em();

-- ── 2. TABELA: mensagens (sermões, esboços, estudos) ──────────────────────
CREATE TABLE IF NOT EXISTS mensagens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- identidade
  titulo      TEXT NOT NULL DEFAULT 'Sem título',
  categoria   TEXT NOT NULL DEFAULT 'sermão',
  -- contexto
  tema        TEXT NOT NULL DEFAULT '',
  texto_base  TEXT NOT NULL DEFAULT '',
  objetivo    TEXT NOT NULL DEFAULT '',
  publico     TEXT NOT NULL DEFAULT '',
  ocasiao     TEXT NOT NULL DEFAULT '',
  serie_id    UUID REFERENCES series(id) ON DELETE SET NULL,
  livro_biblico TEXT NOT NULL DEFAULT '',
  personagens TEXT[] NOT NULL DEFAULT '{}',

  -- conteúdo bíblico
  versiculos_json  JSONB NOT NULL DEFAULT '[]',
  referencias_json JSONB NOT NULL DEFAULT '[]',

  -- corpo
  comentarios       TEXT NOT NULL DEFAULT '',
  contexto_historico TEXT NOT NULL DEFAULT '',
  aplicacoes        TEXT[] NOT NULL DEFAULT '{}',
  ilustracoes       TEXT[] NOT NULL DEFAULT '{}',
  testemunhos       TEXT[] NOT NULL DEFAULT '{}',
  frases_marcantes  TEXT[] NOT NULL DEFAULT '{}',
  perguntas         TEXT[] NOT NULL DEFAULT '{}',
  desafios          TEXT[] NOT NULL DEFAULT '{}',
  dinamica          TEXT NOT NULL DEFAULT '',
  oracao            TEXT NOT NULL DEFAULT '',
  conclusao         TEXT NOT NULL DEFAULT '',

  -- praticidade
  tempo_estimado  INTEGER NOT NULL DEFAULT 30,
  observacoes     TEXT NOT NULL DEFAULT '',

  -- conteúdo rico (Tiptap JSON serializado)
  esboco    TEXT NOT NULL DEFAULT '',
  conteudo  TEXT NOT NULL DEFAULT '',

  -- slides e anexos
  slides_json  JSONB NOT NULL DEFAULT '[]',
  arquivos_json JSONB NOT NULL DEFAULT '[]',

  -- metadados
  igreja         TEXT,
  data_pregacao  TIMESTAMPTZ,
  tags           TEXT[] NOT NULL DEFAULT '{}',
  favorita       BOOLEAN NOT NULL DEFAULT FALSE,
  status         TEXT NOT NULL DEFAULT 'rascunho'
                  CHECK (status IN ('rascunho', 'pronta', 'pregada', 'arquivada')),

  -- controle de versão e sync
  versao      INTEGER NOT NULL DEFAULT 1,
  device_id   TEXT,
  synced_at   TIMESTAMPTZ DEFAULT now(),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_mensagens_user_id  ON mensagens(user_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_status   ON mensagens(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mensagens_updated  ON mensagens(user_id, atualizado_em DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_serie   ON mensagens(serie_id) WHERE serie_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mensagens_tags     ON mensagens USING gin(tags);

-- auto-atualiza updated_em
CREATE OR REPLACE FUNCTION fn_mensagens_updated_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;
CREATE OR REPLACE TRIGGER trg_mensagens_updated_em
  BEFORE UPDATE ON mensagens
  FOR EACH ROW EXECUTE FUNCTION fn_mensagens_updated_em();



-- ── 3. TABELA: tags ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome    TEXT NOT NULL,
  cor     TEXT,
  UNIQUE(user_id, nome)
);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- ── 4. TABELA: estudos ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estudos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL DEFAULT 'Sem título',
  tipo          TEXT NOT NULL DEFAULT 'devocional',
  conteudo      TEXT NOT NULL DEFAULT '',
  versiculos    TEXT[] NOT NULL DEFAULT '{}',
  reflexao      TEXT NOT NULL DEFAULT '',
  oracao        TEXT NOT NULL DEFAULT '',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  favorito       BOOLEAN NOT NULL DEFAULT FALSE,
  synced_at     TIMESTAMPTZ DEFAULT now(),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estudos_user_id ON estudos(user_id);
CREATE INDEX IF NOT EXISTS idx_estudos_updated  ON estudos(user_id, atualizado_em DESC);
CREATE INDEX IF NOT EXISTS idx_estudos_tags    ON estudos USING gin(tags);
CREATE OR REPLACE FUNCTION fn_estudos_updated_em() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;
CREATE OR REPLACE TRIGGER trg_estudos_updated_em
  BEFORE UPDATE ON estudos FOR EACH ROW EXECUTE FUNCTION fn_estudos_updated_em();

-- ── 5. TABELA: analises ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensagem_id   UUID REFERENCES mensagens(id) ON DELETE CASCADE,
  pontuacao     INTEGER NOT NULL DEFAULT 0,
  checks_json   JSONB NOT NULL DEFAULT '[]',
  alertas_json  JSONB NOT NULL DEFAULT '[]',
  synced_at     TIMESTAMPTZ DEFAULT now(),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analises_user_id    ON analises(user_id);
CREATE INDEX IF NOT EXISTS idx_analises_mensagem ON analises(mensagem_id) WHERE mensagem_id IS NOT NULL;

-- ── 6. TABELA: sync_log (controle de sincronização) ──────────────────────
CREATE TABLE IF NOT EXISTS sync_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tabela     TEXT NOT NULL,
  registro_id UUID NOT NULL,
  operacao   TEXT NOT NULL CHECK (operacao IN ('upsert', 'delete')),
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tabela, registro_id)
);
CREATE INDEX IF NOT EXISTS idx_sync_log_user_tabela ON sync_log(user_id, tabela);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE series    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log  ENABLE ROW LEVEL SECURITY;

-- Políticas: usuário vê/manipula só os seus registros
CREATE POLICY "users own mensagens" ON mensagens FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users own series" ON series FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users own tags" ON tags FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users own estudos" ON estudos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users own analises" ON analises FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users own sync_log" ON sync_log FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- NOTIFICA POSTGREST PRA RECARREGAR CACHE DO SCHEMA
-- ============================================================
NOTIFY pgrst, 'reload schema';
