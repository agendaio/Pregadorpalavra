const { Client } = require('pg');
const c = new Client({
  host: 'db.waxtmjkelcfevzyyugkt.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'FSia27UXGKtE0aju',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});
c.connect();
c.query(`
CREATE OR REPLACE FUNCTION public.increment_agent_stats(p_agent_id UUID, p_tokens INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.ia_agents
  SET stats_uso = stats_uso + 1,
      stats_tokens = stats_tokens + COALESCE(p_tokens, 0),
      ultima_uso_em = now(),
      atualizado_em = now()
  WHERE id = p_agent_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_agent_stats TO authenticated, anon;
`).then(r => { console.log('OK - RPC created'); c.end(); })
  .catch(e => { console.error('ERR:', e.message); c.end(); });
