// Simular o que o browser faz ao chamar /rest/v1/admins
// via anon key + JWT do usuário bilidibr@gmail.com

import { createClient } from '@supabase/supabase-js';

const SB_URL = 'https://waxtmjkelcfevzyyugkt.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndheHRtamtlbGNmZXZ6eXl1Z2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTg3NTUsImV4cCI6MjA5ODM3NDc1NX0.ZZMJz0ov43q69rGRaNyg5AuJGlwqfZAjFGlK6RR6z-w';

async function test() {
  const sb = createClient(SB_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Login
  const { data: loginData, error: loginErr } = await sb.auth.signInWithPassword({
    email: 'bilidibr@gmail.com',
    password: 'monica00',
  });
  console.log('Login error:', loginErr?.message || 'ok');
  console.log('User:', loginData?.user?.id, loginData?.user?.email);

  // Get current user (this uses the stored session token)
  const { data: userData, error: userErr } = await sb.auth.getUser();
  console.log('getUser error:', userErr?.message || 'ok');
  console.log('getUser user:', userData?.user?.id);

  if (userData?.user) {
    // Query admins table (this is what checarAdmin does)
    const { data: adminsData, error: adminsErr } = await sb
      .from('admins')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('ativo', true)
      .maybeSingle();

    console.log('admins query error:', adminsErr?.message || 'nenhum');
    console.log('admins result:', JSON.stringify(adminsData));
  }
}

test();
