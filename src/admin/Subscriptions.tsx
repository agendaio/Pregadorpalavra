import { useEffect, useState } from 'react';
import { CreditCard, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { supabase, type Subscription } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const STATUS_COR: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-300',
  trialing: 'bg-violet-500/15 text-violet-300',
  cancelled: 'bg-red-500/15 text-red-300',
  past_due: 'bg-amber-500/15 text-amber-300',
  paused: 'bg-white/10 text-white/40',
};

export function AdminSubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([]);
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
        .from('subscriptions')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(200);
      if (error) throw error;
      setSubs(data ?? []);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Assinaturas</h1>
        <p className="mt-1 text-[13px] text-white/50">
          {subs.length} assinaturas no sistema
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
      ) : subs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-12 text-center">
          <CreditCard className="mx-auto mb-3 h-8 w-8 text-white/20" />
          <div className="text-[14px] font-medium text-white/60">Nenhuma assinatura registrada</div>
          <div className="mt-1 text-[12px] text-white/30">
            Usuários que se cadastrarem com trial/plan aparecerão aqui.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm">
          <div className="divide-y divide-white/5">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]">
                <CreditCard className="h-4 w-4 text-cyan-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-white/5 px-1.5 py-0.5 text-[10.5px]">
                      {s.user_id.slice(0, 8)}…
                    </code>
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', STATUS_COR[s.status] ?? STATUS_COR.paused)}>
                      {s.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-white/40">
                    {s.ciclo} · R$ {s.valor_pago.toFixed(2)} · {s.payment_provider ?? 'manual'}
                  </div>
                </div>
                <span className="text-[10.5px] text-white/40">
                  {new Date(s.criado_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}