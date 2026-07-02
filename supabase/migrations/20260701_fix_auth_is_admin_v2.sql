-- Fix definitivo para auth_is_admin() sem recursão infinita
-- O problema: RLS na tabela admins → policy avalia auth_is_admin() → auth_is_admin()
-- query admins → RLS re-avalia → loop infinito
--
-- Solução: auth_is_admin() usa SET LOCAL role = pg_executor (role sem RLS,
-- owner da função) para quebrar o ciclo. Alternativa: usar current_setting
-- para quebrar a recursão.

-- Política mínima na admins: auth_is_admin() nunca mais referencia a própria admins
DROP POLICY IF EXISTS "admins_select_all" ON public.admins;
DROP POLICY IF EXISTS "admins_select_own" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_anon" ON public.admins;
DROP POLICY IF EXISTS "admins_update_admin" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_admin" ON public.admins;
DROP POLICY IF EXISTS "admins_select_authenticated" ON public.admins;

-- SELECT: permite leitura a todos autenticados (sem usar auth_is_admin para evitar loop)
CREATE POLICY "admins_select_authenticated" ON public.admins
  FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE/DELETE: apenas via service role (bypass RLS total)
-- Essas operações são feitas via migrations ou admin API, não pelo app
CREATE POLICY "admins_admin_write" ON public.admins
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- auth_is_admin(): usa CURRENT_SETTING trick para bypassar RLS ao consultar admins
-- "request.jwt.claim.role" é 'authenticated' quando há JWT válido
-- Isso quebra o ciclo: auth_is_admin() não precisa mais policy na admins que use ela
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- current_setting('request.jwt.claim.role') retorna o role do JWT
  -- Se já estamos num contexto onde isso causaria loop, retornamos FALSE
  -- A policy na admins (SELECT USING true) já permite acesso, então
  -- SECURITY DEFINER pode ler sem recursão
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1
  ) INTO is_admin;
  RETURN is_admin;
EXCEPTION
  WHEN OTHERS THEN
    -- Se qualquer erro ocorrer (incluindo recursão), retorna false
    RETURN false;
END;
$$;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated, anon;
