import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Loader2, AlertCircle, Server, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthAdminStore } from '@/stores/authAdmin';
import { APP_VERSION } from '@/v.config';

export function AdminSettings() {
  const admin = useAuthAdminStore((s) => s.admin);
  const [healthCheck, setHealthCheck] = useState<{ ok: boolean; latencyMs: number } | null>(null);
  const [verificando, setVerificando] = useState(false);

  const checar = async () => {
    setVerificando(true);
    const start = performance.now();
    const sb = supabase();
    if (!sb) {
      setHealthCheck({ ok: false, latencyMs: 0 });
      setVerificando(false);
      return;
    }
    try {
      const { error } = await sb.from('admins').select('id').limit(1);
      const latency = performance.now() - start;
      setHealthCheck({ ok: !error, latencyMs: latency });
    } catch {
      setHealthCheck({ ok: false, latencyMs: performance.now() - start });
    } finally {
      setVerificando(false);
    }
  };

  useEffect(() => {
    void checar();
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-[13px] text-white/50">
          Status do sistema e versão
        </p>
      </div>

      {/* Status */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
          <Server className="h-4 w-4 text-emerald-400" />
          Status dos serviços
        </h2>

        <div className="space-y-2">
          <ServiceRow
            nome="Supabase"
            status={healthCheck ? (healthCheck.ok ? 'ok' : 'erro') : 'verificando'}
            detalhe={healthCheck ? `${healthCheck.latencyMs.toFixed(0)}ms` : '—'}
          />
          <ServiceRow
            nome="Edge Function ai-chat"
            status="configurada"
            detalhe="Disponível após deploy"
          />
          <ServiceRow
            nome="Frontend Vercel"
            status="ok"
            detalhe="pregador-os.vercel.app"
          />
        </div>

        <button
          onClick={() => void checar()}
          disabled={verificando}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-medium hover:bg-white/10 disabled:opacity-50"
        >
          {verificando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Testar conexão'}
        </button>
      </div>

      {/* Versão */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
          <Database className="h-4 w-4 text-cyan-400" />
          Sistema
        </h2>
        <div className="grid gap-2 text-[12.5px] md:grid-cols-2">
          <Item label="Versão do app" valor={APP_VERSION} />
          <Item label="Admin logado" valor={admin?.nome ?? '—'} />
          <Item label="Email" valor={admin?.email ?? '—'} />
          <Item label="Role" valor={admin?.role ?? '—'} />
        </div>
      </div>

      {/* Próximos passos */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <h2 className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-amber-200">
          <AlertCircle className="h-4 w-4" />
          Próximas ondas
        </h2>
        <ul className="space-y-1 text-[12.5px] text-amber-100/80">
          <li>· Stripe / MercadoPago para pagamentos recorrentes</li>
          <li>· Feature flags dinâmicas com lookup no app</li>
          <li>· Push notifications reais via service worker</li>
          <li>· Email transacional (convite, recuperação)</li>
          <li>· Dashboard financeiro (MRR, ARR, churn, LTV)</li>
        </ul>
      </div>
    </div>
  );
}

function ServiceRow({ nome, status, detalhe }: { nome: string; status: string; detalhe: string }) {
  const cor =
    status === 'ok'
      ? 'bg-emerald-500/15 text-emerald-300'
      : status === 'erro'
      ? 'bg-red-500/15 text-red-300'
      : 'bg-white/5 text-white/60';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
      <span className="text-[12.5px] font-medium">{nome}</span>
      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10.5px] font-medium ${cor}`}>{status}</span>
      <span className="text-[10.5px] text-white/40">{detalhe}</span>
    </div>
  );
}

function Item({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
      <span className="text-[10.5px] uppercase tracking-wider text-white/40">{label}</span>
      <span className="ml-auto truncate font-mono text-[12px] text-white/80">{valor}</span>
    </div>
  );
}