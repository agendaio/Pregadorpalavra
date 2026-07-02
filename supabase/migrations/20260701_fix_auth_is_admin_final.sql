-- Fix FINAL: RLS na tabela admins desabilitada + auth_is_admin() simples
-- A tabela admins é写入 raramente (só via migration/admin), não precisa de RLS complexa
-- auth_is_admin() não pode ser chamada por policies na admins (causaria loop)

-- Remove todas as policies da admins
DROP POLICY IF EXISTS "admins_select_all" ON public.admins;
DROP POLICY IF EXISTS "admins_select_own" ON public.admins;
DROP POLICY IF EXISTS "admins_select_authenticated" ON public.admins;
DROP POLICY IF EXISTS "admins_select_authenticated_v2" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_anon" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_admin" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_service" ON public.admins;
DROP POLICY IF EXISTS "admins_update_own" ON public.admins;
DROP POLICY IF EXISTS "admins_update_admin" ON public.admins;
DROP POLICY IF EXISTS "admins_update_service" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_admin" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_service" ON public.admins;
DROP POLICY IF EXISTS "admins_admin_write" ON public.admins;
DROP POLICY IF EXISTS "apikeys_admin_only" ON public.admins;

-- Desabilita RLS na admins:写入 raramente (migration), acesso via service_role que tem BYPASSRLS
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;

-- auth_is_admin(): query simples sem loop (RLS na admins está desabilitada)
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
