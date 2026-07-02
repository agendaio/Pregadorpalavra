-- Fix definitivo: auth_is_admin() com row_security = off para quebrar recursão
-- O problema: policy na admins chama auth_is_admin() → query admins → re-avalia policy → loop
-- Solução: desabilitar RLS temporariamente dentro da função

-- Política na admins: sem auth_is_admin() (que causa loop)
DROP POLICY IF EXISTS "admins_select_all" ON public.admins;
DROP POLICY IF EXISTS "admins_select_own" ON public.admins;
DROP POLICY IF EXISTS "admins_select_authenticated" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_anon" ON public.admins;
DROP POLICY IF EXISTS "admins_update_admin" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_admin" ON public.admins;
DROP POLICY IF EXISTS "admins_admin_write" ON public.admins;
DROP POLICY IF EXISTS "admins_select_authenticated_v2" ON public.admins;

-- SELECT: allow authenticated users (auth_is_admin() will still work for logic)
CREATE POLICY "admins_select_authenticated_v2" ON public.admins
  FOR SELECT TO authenticated USING (true);

-- auth_is_admin(): desabilita RLS ao consultar admins para evitar loop
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Desabilita RLS para esta transação ao consultar admins
  -- Isso quebra o ciclo: policy na admins → auth_is_admin() → query admins (sem policy)
  ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;

  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1
  ) INTO is_admin;

  -- Reabilita RLS
  ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

  RETURN is_admin;
EXCEPTION WHEN OTHERS THEN
  -- Se der erro (ex: transação rollback), tenta reabilitar RLS
  BEGIN ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN false;
END;
$$;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated, anon;
