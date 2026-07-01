const https = require('https');
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndheHRtamtlbGNmZXZ6eXl1Z2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTg3NTUsImV4cCI6MjA5ODM3NDc1NX0.ZZMJz0ov43q69rGRaNyg5AuJGlwqfZAjFGlK6RR6z-w';

function get(path) {
  return new Promise((resolve, reject) => {
    const req = https.get({ hostname: 'waxtmjkelcfevzyyugkt.supabase.co', path, headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey } }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  // Check if table exists
  const r = await get('/rest/v1/ia_config?select=id,valor,atualizado_em&limit=1');
  console.log('Status:', r.status);
  console.log('Body:', r.body.slice(0, 300));
}

main().catch(console.error);
