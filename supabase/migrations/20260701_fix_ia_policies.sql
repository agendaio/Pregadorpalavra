-- ============================================================
-- MIGRATION: Fix IA policies idempotency (2026-07-01)
-- Corrige policies da tabela ia_* que falharam na migração original
-- por causa de conflito de versão (3 arquivos com mesmo prefixo 20260630)
-- ============================================================

-- Garante que as policies existem (drop + create = idempotente)
DROP POLICY IF EXISTS "admins manage agents" ON public.ia_agents;
CREATE POLICY "admins manage agents" ON public.ia_agents
  FOR ALL TO authenticated
  USING (public.auth_is_admin() = true)
  WITH CHECK (public.auth_is_admin() = true);

DROP POLICY IF EXISTS "admins manage versions" ON public.ia_agent_versions;
CREATE POLICY "admins manage versions" ON public.ia_agent_versions
  FOR ALL TO authenticated
  USING (public.auth_is_admin() = true)
  WITH CHECK (public.auth_is_admin() = true);

DROP POLICY IF EXISTS "admins manage logs" ON public.ia_agent_logs;
CREATE POLICY "admins manage logs" ON public.ia_agent_logs
  FOR ALL TO authenticated
  USING (public.auth_is_admin() = true)
  WITH CHECK (public.auth_is_admin() = true);

DROP POLICY IF EXISTS "admins manage config" ON public.ia_config;
CREATE POLICY "admins manage config" ON public.ia_config
  FOR ALL TO authenticated
  USING (public.auth_is_admin() = true)
  WITH CHECK (public.auth_is_admin() = true);

-- Garante que a função helper existe
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

-- Garante que a RPC de stats existe
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
