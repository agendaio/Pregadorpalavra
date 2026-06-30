import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Loader2,
  AlertCircle,
  Cpu,
  Coins,
  Clock,
  TrendingUp,
  User,
} from 'lucide-react';
import { supabase, type UsageLog } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface TopUser {
  id: string;
  count: number;
}

export function AdminUsage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    mesAtual: number;
    custoMes: number;
    duracaoMedia: number;
    topUser: TopUser | null;
  }>({
    total: 0,
    mesAtual: 0,
    custoMes: 0,
    duracaoMedia: 0,
    topUser: null,
  });

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
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { data, error } = await sb
        .from('usage_log')
        .select('*')
        .eq('tipo', 'ia_request')
        .order('criado_em', { ascending: false })
        .limit(100);
      if (error) throw error;
      setLogs(data ?? []);

      const total = data?.length ?? 0;
      const mesAtual = (data ?? []).filter(
        (d) => new Date(d.criado_em) >= inicioMes,
      ).length;
      const custoMes = (data ?? [])
        .filter((d) => new Date(d.criado_em) >= inicioMes)
        .reduce((acc, d) => acc + (d.custo_usd ?? 0), 0);
      const duracaoMedia =
        total > 0
          ? (data ?? []).reduce((acc, d) => acc + (d.duracao_ms ?? 0), 0) / total
          : 0;

      const contagem: Record<string, number> = {};
      for (const d of data ?? []) {
        if (d.user_id) contagem[d.user_id] = (contagem[d.user_id] ?? 0) + 1;
      }
      const top = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];

      setStats({
        total,
        mesAtual,
        custoMes,
        duracaoMedia,
        topUser: top ? { id: top[0], count: top[1] } : null,
      });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Uso da IA</h1>
        <p className="mt-1 text-[13px] text-white/50">
          Últimas 100 requisições, custo estimado e usuários ativos
        </p>
      </div>

      {carregando && logs.length === 0 ? (
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
        <>
          {/* Stats */}
          <div className="grid gap-3 md:grid-cols-4">
            <StatBox icon={Activity} label="Requisições (100 últimas)" valor={stats.total} cor="text-cyan-400" />
            <StatBox icon={TrendingUp} label="No mês" valor={stats.mesAtual} cor="text-emerald-400" />
            <StatBox icon={Coins} label="Custo no mês" valor={`$${stats.custoMes.toFixed(4)}`} cor="text-amber-400" />
            <StatBox icon={Clock} label="Duração média" valor={`${(stats.duracaoMedia / 1000).toFixed(2)}s`} cor="text-violet-400" />
          </div>

          {/* Top user */}
          {stats.topUser && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-fuchsia-400" />
                <span className="text-[12.5px] text-white/60">Top usuário:</span>
                <code className="rounded bg-white/5 px-2 py-0.5 text-[11px]">{stats.topUser.id.slice(0, 8)}…</code>
                <span className="font-semibold tabular-nums">{stats.topUser.count} reqs</span>
              </div>
            </div>
          )}

          {/* Lista */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm">
            <div className="divide-y divide-white/5">
              {logs.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.005, 0.1) }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02]"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/15 text-fuchsia-300">
                    <Cpu className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="rounded-full bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60">
                        {log.provider ?? 'openai'}
                      </span>
                      <span className="text-white/70">{log.acao ?? log.tipo}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-white/40">
                      {log.user_id && (
                        <code>{log.user_id.slice(0, 8)}…</code>
                      )}
                      <span>·</span>
                      <span>{new Date(log.criado_em).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[12px] tabular-nums text-white/80">
                      {log.tokens_input + log.tokens_output} tok
                    </div>
                    <div className="font-mono text-[10.5px] tabular-nums text-white/40">
                      ${log.custo_usd?.toFixed(5) ?? '0.00000'}
                    </div>
                  </div>
                </motion.div>
              ))}
              {logs.length === 0 && (
                <div className="p-8 text-center text-[13px] text-white/40">
                  Nenhuma requisição registrada ainda
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({ icon: Icon, label, valor, cor }: { icon: React.ComponentType<{ className?: string }>; label: string; valor: string | number; cor: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm">
      <Icon className={cn('h-4 w-4', cor)} />
      <div className="mt-2 text-[20px] font-bold tabular-nums">{valor}</div>
      <div className="text-[11px] text-white/50">{label}</div>
    </div>
  );
}