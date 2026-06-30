const { Client } = require('pg');
const fs = require('fs');

const c = new Client({
  host: 'db.waxtmjkelcfevzyyugkt.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'FSia27UXGKtE0aju',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

c.connect();

const prompt = fs.readFileSync('scripts/agent-prompt.txt', 'utf8');

c.query(
  'UPDATE public.ia_agents SET prompt_sistema = $1, atualizado_em = now(), versao = versao + 1 WHERE slug = $2',
  [prompt, 'assistente-pregador']
).then((r) => {
  console.log('OK - linhas:', r.rowCount);
  // Insere nova versão no histórico
  return c.query(
    `INSERT INTO public.ia_agent_versions (agent_id, versao, prompt_sistema, changelog)
     SELECT id, versao, prompt_sistema, 'Atualizado com prompt oficial do Assistente Ministerial IA'
     FROM public.ia_agents WHERE slug = $1`,
    ['assistente-pregador']
  );
}).then((r) => {
  console.log('Versão inserida:', r.rowCount);
  c.end();
}).catch((e) => {
  console.error('ERR:', e.message);
  c.end();
});