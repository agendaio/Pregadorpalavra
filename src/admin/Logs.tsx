import { useEffect, useState } from 'react';
import { ScrollText, Loader2, AlertCircle } from 'lucide-react';
import { supabase, type AuditLog } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const ACAO_COR: Record<string, string> = {
  'user.blocked': 'bg-red-500/15 text-red-300',
  'user.suspended': 'bg-amber-500/15 text-amber-300',
  'user.activated': 'bg-emerald-500/15 text-emerald-300',
  'user.cancelled': 'bg-white/10 text-white/40',
  'plan.created': 'bg-cyan-500/15 text-cyan-300',
  'plan.updated': 'bg-cyan-500/15 text-cyan-300',
  'flag.changed': 'bg-violet-500/15 text-violet-300',
  'notification.sent': 'bg-blue-500/15 text-blue-300',
  'apikey.saved': 'bg-emerald-500/15 text-emerald-300',
};

export function AdminLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void carregar();
  }, []);

  const carregar = async () => {
    const sb = supabase();
    if (!sb) {
      setErro('Supabase não configurado.');
      setCarregando(false);
      return;
    }
    try {
      const { data, error } = await sb
        .from('audit_logs')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(200);
      if (error) throw error;
      setLogs(data ?? []);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Auditoria</h1>
        <p className="mt-1 text-[13px] text-white/50">
          Log completo de ações administrativas
        </p>
      </div>

      {carregando ? (
        <div className="flex h-48 items-center justify-center text-white/50">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : erro ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-[13px] text-amber-200">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {erro}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-12 text-center">
          <ScrollText className="mx-auto mb-3 h-8 w-8 text-white/20" />
          <div className="text-[14px] font-medium text-white/60">Nenhuma ação registrada</div>
          <div className="mt-1 text-[12px] text-white/30">
            Ações de admin aparecerão aqui em tempo real.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm">
          <div className="divide-y divide-white/5">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02]">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                    ACAO_COR[l.acao] ?? 'bg-white/5 text-white/60',
                  )}
                >
                  {l.acao}
                </span>
                <div className="min-w-0 flex-1 text-[11.5px] text-white/60">
                  {l.recurso && (
                    <span>
                      {l.recurso}
                      {l.recurso_id && (
                        <code className="ml-1 rounded bg-white/5 px-1 py-0.5 text-[10px]">
                          {l.recurso_id.slice(0, 8)}…
                        </code>
                      )}
                    </span>
                  )}
                </div>
                <span className="text-[10.5px] text-white/40">
                  {new Date(l.criado_em).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}