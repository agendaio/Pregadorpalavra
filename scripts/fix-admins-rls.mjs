import pg from 'pg';
const client = new pg.Client({
  host: 'db.waxtmjkelcfevzyyugkt.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'FSia27UXGKtE0aju',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});
(async () => {
  await client.connect();

  await client.query(`
    -- ================================================
    -- CORREÇÃO: quebrar recursão RLS com SECURITY DEFINER
    -- ================================================

    -- 1. Remove policies problemáticas
    DROP POLICY IF EXISTS admins_select_self ON public.admins;
    DROP POLICY IF EXISTS admins_select_all ON public.admins;
    DROP POLICY IF EXISTS admins_select_own ON public.admins;
    DROP VIEW IF EXISTS public._admins_active;

    -- 2. Função SECURITY DEFINER (roda como owner = postgres, ignora RLS)
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

    -- 3. Grant pra authenticated poder usar a função
    GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated, anon;

    -- 4. Policy: usuário vê APENAS sua própria linha
    CREATE POLICY admins_select_own ON public.admins
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());

    -- 5. Policy: admins ativos veem TODAS as linhas (usa função SECURITY DEFINER)
    CREATE POLICY admins_select_all ON public.admins
      FOR SELECT TO authenticated
      USING (public.auth_is_admin());
  `);

  console.log('✅ RLS corrigida com SECURITY DEFINER!');

  // Verificar policies
  const { rows: policies } = await client.query(`
    SELECT policyname, cmd, qual
    FROM pg_policies WHERE tablename = 'admins'
  `);
  console.log('\nPolicies em admins:');
  for (const p of policies) {
    console.log(`  • ${p.policyname} (${p.cmd}): ${(p.qual||'').substring(0,100)}`);
  }

  // Verificar função
  const { rows: fns } = await client.query(`
    SELECT proname, prosecurity, proiswindow
    FROM pg_proc WHERE proname = 'auth_is_admin'
  `);
  console.log('\nFunção auth_is_admin:', JSON.stringify(fns[0]));

  await client.end();
  console.log('\n🎉 Pronto!');
})();
