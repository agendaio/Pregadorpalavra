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
  // Check RLS policies on admins table
  const { rows: policies } = await client.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'admins'
  `);
  console.log('RLS policies on admins:', JSON.stringify(policies, null, 2));

  // Try querying admins via anon key to simulate what the client does
  // Also check if there's a issue with the anon key JWT
  const { rows: tables } = await client.query(`
    SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'admins'
  `);
  console.log('admins table RLS:', JSON.stringify(tables));

  await client.end();
})();
