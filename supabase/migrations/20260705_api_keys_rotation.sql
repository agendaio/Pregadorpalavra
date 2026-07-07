-- =====================================================================
-- Rodízio inteligente de chaves de API
-- =====================================================================
-- Permite N chaves ativas por provedor, com rastreio de uso e
-- desativação/pausa automática por limite. A Edge Function pega a
-- próxima chave via RPC (rodízio LRU) e, se uma chave estourar limite,
-- pausa/desativa e tenta a próxima (failover) — zero instabilidade.

-- 1) Remove a restrição "só 1 chave ativa por provider"
--    (o nome default do constraint é <tabela>_<colunas>_key)
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_provider_ativo_key;

-- 2) Colunas de rodízio / telemetria por chave
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS apelido            TEXT,
  ADD COLUMN IF NOT EXISTS ultimo_uso_em      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS req_count          BIGINT      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS erro_count         BIGINT      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cooldown_ate       TIMESTAMPTZ,  -- pausa temporária (rate-limit ou quota diária)
  ADD COLUMN IF NOT EXISTS desativado_em      TIMESTAMPTZ,  -- desativada de vez (chave inválida)
  ADD COLUMN IF NOT EXISTS motivo_desativacao TEXT;

-- Índice pra escolher rápido a próxima chave (rodízio por provider)
CREATE INDEX IF NOT EXISTS idx_api_keys_rodizio
  ON public.api_keys (ativo, provider, cooldown_ate, ultimo_uso_em);

-- =====================================================================
-- RPC: pega a próxima chave ativa (rodízio LRU) e já marca o uso.
--   - Ignora chaves em cooldown (pausadas).
--   - Reativa sozinha quem já passou do cooldown.
--   - Concorrência-safe: FOR UPDATE SKIP LOCKED (várias invocações
--     simultâneas da Edge Function não pegam a mesma linha).
--   - p_provider NULL = rodízio entre TODAS as chaves ativas.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.pegar_proxima_chave(p_provider TEXT DEFAULT NULL)
RETURNS TABLE (id UUID, provider TEXT, key_ciphertext TEXT, modelo_padrao TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Cooldown expirado volta a ficar disponível automaticamente
  UPDATE public.api_keys k
     SET cooldown_ate = NULL
   WHERE k.cooldown_ate IS NOT NULL
     AND k.cooldown_ate <= now();

  SELECT k.id INTO v_id
    FROM public.api_keys k
   WHERE k.ativo = true
     AND (p_provider IS NULL OR k.provider = p_provider)
     AND (k.cooldown_ate IS NULL OR k.cooldown_ate <= now())
   ORDER BY k.ultimo_uso_em ASC NULLS FIRST, k.req_count ASC
   FOR UPDATE SKIP LOCKED
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN;  -- nenhuma chave disponível agora
  END IF;

  UPDATE public.api_keys k
     SET ultimo_uso_em = now(),
         req_count = k.req_count + 1
   WHERE k.id = v_id;

  RETURN QUERY
    SELECT k.id, k.provider, k.key_ciphertext, k.modelo_padrao
      FROM public.api_keys k
     WHERE k.id = v_id;
END;
$$;

-- =====================================================================
-- RPC: marca uma chave com problema.
--   - 'rate_limit' → pausa curta (p_cooldown_seg, ex. 60s). Reativa sozinha.
--   - 'quota'      → pausa longa (ex. 24h). Reativa sozinha depois.
--   - 'invalida'   → desativa de vez (401 / chave revogada). Manual pra voltar.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.marcar_chave_erro(
  p_id           UUID,
  p_tipo         TEXT,
  p_cooldown_seg INT DEFAULT 60
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_tipo = 'invalida' THEN
    UPDATE public.api_keys
       SET ativo = false,
           desativado_em = now(),
           motivo_desativacao = 'invalida',
           erro_count = erro_count + 1
     WHERE id = p_id;
  ELSE
    -- rate_limit ou quota → pausa temporária; volta sozinha ao fim do cooldown
    UPDATE public.api_keys
       SET cooldown_ate = now() + make_interval(secs => GREATEST(p_cooldown_seg, 1)),
           motivo_desativacao = p_tipo,
           erro_count = erro_count + 1
     WHERE id = p_id;
  END IF;
END;
$$;

-- A Edge Function usa o service_role. Admin (authenticated) também pode
-- chamar pegar_proxima_chave em testes.
GRANT EXECUTE ON FUNCTION public.pegar_proxima_chave(TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_chave_erro(UUID, TEXT, INT) TO service_role;
