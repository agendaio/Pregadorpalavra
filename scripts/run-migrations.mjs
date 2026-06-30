/**
 * Script pra rodar as migrations no Supabase via Postgres connection.
 *
 * Tenta primeiro com senha vazia (alguns Supabase aceitam),
 * depois com a senha do DB se o usuário fornecer.
 *
 * Uso: node scripts/run-migrations.mjs [db_password]
 */

import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_REF = 'waxtmjkelcfevzyyugkt';
const HOST = `db.${PROJECT_REF}.supabase.co`;
const PORT = 5432;
const USER = 'postgres';
const DATABASE = 'postgres';

const PASSWORD = process.argv[2] || process.env.SUPABASE_DB_PASSWORD || '';

if (!PASSWORD) {
  console.error('❌ Preciso da senha do DB (a que você escolheu ao criar o projeto Supabase).');
  console.error('   Uso: node scripts/run-migrations.mjs SUA_SENHA');
  process.exit(1);
}

const client = new pg.Client({
  host: HOST,
  port: PORT,
  user: USER,
  password: PASSWORD,
  database: DATABASE,
  ssl: { rejectUnauthorized: false },
});

const MIGRATIONS = [
  'supabase/migrations/20260630_initial_schema.sql',
  'supabase/migrations/20260630_seed_plans.sql',
];

async function run() {
  console.log('🔌 Conectando ao Postgres...');
  await client.connect();
  console.log('✅ Conectado.');

  for (const file of MIGRATIONS) {
    const full = path.resolve(file);
    if (!fs.existsSync(full)) {
      console.error(`❌ Arquivo não encontrado: ${full}`);
      continue;
    }
    const sql = fs.readFileSync(full, 'utf-8');
    console.log(`\n📄 Rodando ${file} (${sql.length} chars)...`);
    try {
      await client.query(sql);
      console.log(`✅ ${file} OK`);
    } catch (err) {
      console.error(`❌ Erro em ${file}: ${err.message}`);
      throw err;
    }
  }

  // Inserir admin se não existir
  console.log('\n👤 Inserindo bilidibr@gmail.com como super_admin (se não existir)...');
  await client.query(`
    INSERT INTO public.admins (user_id, email, nome, role, ativo)
    SELECT id, email, 'Bilidibr', 'super_admin', true
    FROM auth.users WHERE email = 'bilidibr@gmail.com'
    ON CONFLICT (email) DO NOTHING;
  `);

  const { rows } = await client.query(`SELECT email, role, nome FROM public.admins`);
  console.log(`\n📋 Admins cadastrados: ${rows.length}`);
  for (const r of rows) console.log(`   • ${r.email} (${r.role}) - ${r.nome}`);

  const { rows: plans } = await client.query(`SELECT slug, nome, preco_mensal FROM public.plans ORDER BY ordem`);
  console.log(`\n💰 Planos cadastrados: ${plans.length}`);
  for (const p of plans) console.log(`   • ${p.slug}: ${p.nome} — R$ ${p.preco_mensal}`);

  const { rows: flags } = await client.query(`SELECT COUNT(*)::int as n FROM public.feature_flags`);
  console.log(`\n🚩 Feature flags: ${flags[0].n}`);

  await client.end();
  console.log('\n🎉 Tudo aplicado!');
}

run().catch((e) => {
  console.error(e);
  client.end();
  process.exit(1);
});