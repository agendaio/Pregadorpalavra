import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, Loader2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase, type FeatureFlag, type FeatureState } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const ESTADOS: { id: FeatureState; label: string; cor: string }[] = [
  { id: 'released', label: 'Liberado', cor: 'bg-emerald-500/15 text-emerald-300' },
  { id: 'premium', label: 'Premium', cor: 'bg-amber-500/15 text-amber-300' },
  { id: 'beta', label: 'Beta', cor: 'bg-cyan-500/15 text-cyan-300' },
  { id: 'experimental', label: 'Experimental', cor: 'bg-violet-500/15 text-violet-300' },
  { id: 'development', label: 'Em desenvolvimento', cor: 'bg-blue-500/15 text-blue-300' },
  { id: 'blocked', label: 'Bloqueado', cor: 'bg-red-500/15 text-red-300' },
  { id: 'hidden', label: 'Oculto', cor: 'bg-white/10 text-white/40' },
];

export function AdminFeatures() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
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
      const { data, error } = await sb.from('feature_flags').select('*').order('feature_key');
      if (error) throw error;
      setFlags(data ?? []);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  const toggle = async (f: FeatureFlag) => {
    const novoEstado: FeatureState = f.estado === 'released' ? 'premium' : 'released';
    const sb = supabase();
    if (!sb) return;
    const { error } = await sb.from('feature_flags').update({ estado: novoEstado }).eq('id', f.id);
    if (!error) {
      setFlags((xs) => xs.map((x) => (x.id === f.id ? { ...x, estado: novoEstado } : x)));
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Feature Flags</h1>
        <p className="mt-1 text-[13px] text-white/50">
          Controle dinâmico de funcionalidades — libere, bloqueie ou destaque
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
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm">
          <div className="divide-y divide-white/5">
            {flags.map((f) => {
              const est = ESTADOS.find((e) => e.id === f.estado) ?? ESTADOS[0];
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/5">
                    <Flag className="h-4 w-4 text-white/60" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium">{f.nome}</span>
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', est.cor)}>
                        {est.label}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-white/40">
                      <code>{f.feature_key}</code>
                      {f.descricao && ` · ${f.descricao}`}
                    </div>
                  </div>
                  <button
                    onClick={() => void toggle(f)}
                    className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"
                    title="Alternar released/premium"
                  >
                    {f.estado === 'released' ? (
                      <ToggleRight className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-white/40" />
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}