-- Migration: 20260708_api_keys_rodizio_rpc
-- Execute este SQL no Supabase Dashboard (SQL Editor) para ativar o rodizio LRU completo.
-- A Edge Function ja funciona sem esta migration (usa fallback REST),
-- mas com ela ativada, o sistema faz rodizio entre multiplas chaves automaticamente.
--
-- Instrucoes:
-- 1. Abra https://supabase.com/dashboard/project/waxtmjkelcfevzyyugkt/sql
-- 2. Cole este SQL e clique em "Run"

-- =====================================================================
-- Rodizio inteligente de chaves de API
-- =====================================================================

-- 1) Remove a restricao "so 1 chave ativa por provider"
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_provider_ativo_key;

-- 2) Colunas de rodizio / telemetria por chave
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS apelido            TEXT,
  ADD COLUMN IF NOT EXISTS ultimo_uso_em      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS req_count          BIGINT      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS erro_count         BIGINT      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cooldown_ate       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS desativado_em      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_desativacao TEXT;

-- Indice pra escolher rapido a proxima chave (rodizio por provider)
CREATE INDEX IF NOT EXISTS idx_api_keys_rodizio
  ON public.api_keys (ativo, provider, cooldown_ate, ultimo_uso_em);

-- =====================================================================
-- RPC: pega a proxima chave ativa (rodizio LRU)
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
    RETURN;
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
-- RPC: marca uma chave com problema
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
    UPDATE public.api_keys
       SET cooldown_ate = now() + make_interval(secs => GREATEST(p_cooldown_seg, 1)),
           motivo_desativacao = p_tipo,
           erro_count = erro_count + 1
     WHERE id = p_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pegar_proxima_chave(TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_chave_erro(UUID, TEXT, INT) TO service_role;
