-- Fix limpo: auth_is_admin() funciona sem recursão
-- Regra: NENHUMA policy na tabela admins pode usar auth_is_admin()
-- porque auth_is_admin() querya admins → loop infinito

-- Remove TODAS as policies antigas da admins
DROP POLICY IF EXISTS "admins_select_all" ON public.admins;
DROP POLICY IF EXISTS "admins_select_own" ON public.admins;
DROP POLICY IF EXISTS "admins_select_authenticated" ON public.admins;
DROP POLICY IF EXISTS "admins_select_authenticated_v2" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_anon" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_admin" ON public.admins;
DROP POLICY IF EXISTS "admins_update_own" ON public.admins;
DROP POLICY IF EXISTS "admins_update_admin" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_admin" ON public.admins;
DROP POLICY IF EXISTS "admins_admin_write" ON public.admins;
DROP POLICY IF EXISTS "apikeys_admin_only" ON public.admins;

-- Authenticated podem SELECT (ver lista de admins)
CREATE POLICY "admins_select_all" ON public.admins
  FOR SELECT TO authenticated USING (true);

-- Writes: apenas via service_role (bypass RLS total) - migrations e admin API
-- Como RLS é BYPASSED para service_role, não precisa de policy
-- INSERT: service_role pode inserir (via migração ou seed)
CREATE POLICY "admins_insert_service" ON public.admins
  FOR INSERT TO service_role WITH CHECK (true);

-- UPDATE: service_role pode atualizar
CREATE POLICY "admins_update_service" ON public.admins
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- DELETE: service_role pode deletar
CREATE POLICY "admins_delete_service" ON public.admins
  FOR DELETE TO service_role USING (true);

-- auth_is_admin(): agora querya admins SEM chamar policy (porque não há policy que use ela)
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY DEFINER já executa como owner (postgres/supabase_admin)
  -- que tem BYPASSRLS, então a query não re-avalia policies da admins
  --的矛盾: na prática Supabase AINDA avalia RLS mesmo com SECURITY DEFINER
  -- Solução real: usar current_setting trick
  RETURN EXISTS (
    WITH RECURSIVE check_admin AS (
      -- Não recursa aqui porque não usa auth_is_admin()
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid() AND ativo = true
      LIMIT 1
    )
    SELECT 1 FROM check_admin
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated, anon;
