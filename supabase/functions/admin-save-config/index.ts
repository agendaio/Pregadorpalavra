import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    // Usa service role key (Edge Functions têm acesso)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { id, valor, atualizado_em } = await req.json();

    if (!id || valor === undefined) {
      return json({ error: 'id e valor são obrigatórios' }, 400);
    }

    const { data, error } = await supabase
      .from('ia_config')
      .upsert({ id, valor, atualizado_em: atualizado_em ?? new Date().toISOString() }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    return json({ success: true, data });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
