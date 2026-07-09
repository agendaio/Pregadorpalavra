-- Migration: 20260709_drop_provider_ativo_constraint
-- Corrige: duplicate key value violates unique constraint "api_keys_provider_ativo_key"
-- Quando o usuário tenta cadastrar uma nova chave (ex: 2ª Groq), o banco barrava
-- porque só permitia 1 chave ativa por provider. Esta migration remove a restrição,
-- permitindo múltiplas chaves ativas por provider (sistema de rodízio LRU).

-- Primeiro: tenta soltar pelo nome que o Postgres criou automaticamente
-- (tabela_api_keys + colunas_provider + ativo + sufixo _key)
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_provider_ativo_key;

-- Se ainda houver constraint com nome diferente, soltar todas as unique constraints
-- que envolvam provider E ativo na tabela api_keys (só afeta esta tabela)
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.api_keys'::regclass
      AND contype = 'u'
      AND (
        -- constraint cobre as colunas provider e ativo (em qualquer ordem)
        EXISTS (
          SELECT 1 FROM unnest(conkey) WITH ORDINALITY AS t(col, ord)
          WHERE col IN (
            SELECT attnum FROM pg_attribute
            WHERE attrelid = 'public.api_keys'::regclass
              AND attname IN ('provider', 'ativo')
          )
          GROUP BY col
          HAVING COUNT(DISTINCT attname) = 2
          AND COUNT(*) = 2
        )
      )
  LOOP
    RAISE NOTICE 'Dropping constraint: %', c.conname;
    EXECUTE format('ALTER TABLE public.api_keys DROP CONSTRAINT %I', c.conname);
  END LOOP;
END;
$$;

-- Garantir que o índice de rodízio existe (criado na migração anterior)
CREATE INDEX IF NOT EXISTS idx_api_keys_rodizio
  ON public.api_keys (ativo, provider, cooldown_ate, ultimo_uso_em);

-- Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';
