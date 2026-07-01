// Verifica UTF-8 da resposta da Edge Function ai-chat
const url = process.argv[2];
const sb = process.argv[3];
const key = process.argv[4];

(async () => {
  const email = 'utf8-test-' + Date.now() + '@test.com';
  await fetch(sb + '/auth/v1/admin/users', {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test123!@#', email_confirm: true })
  });
  const tok = await (await fetch(sb + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test123!@#' })
  })).json();
  const resp = await (await fetch(sb + '/functions/v1/ai-chat', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tok.access_token, apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Faça um esboço expositivo sobre João 3:16 com 3 pontos' }],
      agente_id: 'ee965226-1b88-4ba2-bdbd-c9368ab2e7e4',
      stream: false,
      maxTokens: 2000,
    }),
  })).json();

  console.log('--- Content first 400 chars:');
  console.log(resp.content.substring(0, 400));
  console.log('\n--- Tokens: in=' + resp.tokensInput + ' out=' + resp.tokensOutput);
  console.log('--- Agente: ' + resp.agente.nome);
  console.log('--- Modelo: ' + resp.model);
  // Confirma UTF-8 puro
  const has = resp.content.includes('Esboço Expositivo');
  console.log('--- "Esboço Expositivo" presente?', has);
})();