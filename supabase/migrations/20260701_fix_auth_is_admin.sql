-- Fix: auth_is_admin() não causa recursão infinita de RLS
-- Solução: usar SET LOCAL role para bypassar RLS ao consultar admins

CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Bypass RLS by setting role to table owner
  SET LOCAL role TO pg_database_owner;
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1
  ) INTO is_admin;
  RETURN is_admin;
END;
$$;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO postgres;
