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
  const USER_ID = '784e5b1f-4aef-4028-b325-cdcb807c0acc';

  // Simular o que o client Supabase faz com RLS (SET ROLE = authenticated)
  await client.query(`SET LOCAL ROLE authenticated`);

  // Testar a policy original (que está falhando)
  try {
    const { rows, error } = await client.query(`
      SELECT * FROM public.admins
      WHERE user_id = '${USER_ID}' AND ativo = true
    `);
    console.log('Com RLS (policy original) — rows:', rows.length, 'error:', error?.message || 'nenhum');
  } catch (e) {
    console.log('Erro RLS:', e.message);
  }

  // Testar bypassing RLS (postgres role direto)
  await client.query(`SET LOCAL ROLE postgres`);
  const { rows: allRows } = await client.query(`
    SELECT * FROM public.admins
    WHERE user_id = '${USER_ID}' AND ativo = true
  `);
  console.log('Sem RLS (postgres direto) — rows:', JSON.stringify(allRows));

  await client.end();
})();
