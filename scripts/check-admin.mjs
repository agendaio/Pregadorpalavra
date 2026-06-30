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
  const { rows: users } = await client.query(`SELECT id, email FROM auth.users WHERE email = 'bilidibr@gmail.com'`);
  console.log('auth.users:', JSON.stringify(users));
  const { rows: admins } = await client.query(`SELECT user_id, email, role, ativo FROM public.admins`);
  console.log('admins table:', JSON.stringify(admins));
  await client.end();
})();
