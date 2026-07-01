const https = require('https');
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndheHRtamtlbGNmZXZ6eXl1Z2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTg3NTUsImV4cCI6MjA5ODM3NDc1NX0.ZZMJz0ov43q69rGRaNyg5AuJGlwqfZAjFGlK6RR6z-w';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'waxtmjkelcfevzyyugkt.supabase.co', path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey }
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

async function main() {
  const r = await post('/functions/v1/admin-save-config', {
    id: 'prompt_global',
    valor: 'Teste via Edge Function - ' + new Date().toISOString(),
    atualizado_em: new Date().toISOString()
  });
  console.log('Status:', r.status, 'Body:', r.body.slice(0, 300));
}

main().catch(console.error);
