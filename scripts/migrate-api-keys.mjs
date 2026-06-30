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
  const cols = [
    'temperature NUMERIC(3,2) DEFAULT 0.7',
    'max_tokens INTEGER DEFAULT 2500',
    'context_window INTEGER DEFAULT 128000',
    'timeout_ms INTEGER DEFAULT 60000',
    'streaming BOOLEAN DEFAULT true',
    'memoria_contexto TEXT DEFAULT 10',
    'ultimo_teste_em TIMESTAMPTZ',
    'ultimo_status TEXT',
    'ultimo_teste_latency_ms INTEGER',
  ];
  for (const colDef of cols) {
    const name = colDef.split(' ')[0];
    try {
      await client.query('ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS ' + colDef);
      console.log('+ ' + name);
    } catch (e) {
      const msg = String(e);
      if (msg.includes('already exists')) {
        console.log('~ ' + name + ' (existe)');
      } else {
        console.log('X ' + name + ': ' + msg.slice(0, 100));
      }
    }
  }
  await client.query('CREATE INDEX IF NOT EXISTS idx_api_keys_ativo ON public.api_keys(ativo)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON public.api_keys(provider)');
  await client.end();
  console.log('OK - Migration api_keys completa!');
})();
