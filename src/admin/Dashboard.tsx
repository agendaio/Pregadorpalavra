import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserPlus,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Sparkles,
  Activity,
  Server,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { supabase, type AppUser, type Plan, type UsageLog } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  trialUsers: number;
  newThisMonth: number;
  newLastMonth: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  mrr: number;
  totalIaRequests: number;
  iaRequestsThisMonth: number;
  totalCost: number;
  monthCost: number;
  statusPlanos: Plan[];
  recentUsage: UsageLog[];
  topRecursos: { key: string; count: number }[];
}

const StatCard = ({
  icon: Icon,
  label,
  valor,
  delta,
  cor = 'text-white',
  corFundo = 'bg-white/5',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valor: string | number;
  delta?: number;
  cor?: string;
  corFundo?: string;
}) => {
  const deltaPositivo = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', corFundo)}>
          <Icon className={cn('h-4 w-4', cor)} />
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium',
              deltaPositivo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300',
            )}
          >
            {deltaPositivo ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(delta).toFixed(0)}%
          </div>
        )}
      </div>
      <div className="mt-3 text-[22px] font-bold tracking-tight">{valor}</div>
      <div className="mt-0.5 text-[11.5px] text-white/50">{label}</div>
    </motion.div>
  );
};

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
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
      setCarregando(true);
      const agora = Date.now();
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      const tsMes = inicioMes.toISOString();
      const inicioMesPassado = new Date(inicioMes);
      inicioMesPassado.setMonth(inicioMesPassado.getMonth() - 1);
      const tsMesPassado = inicioMesPassado.toISOString();

      // Users
      const { count: totalUsers } = await sb.from('users').select('*', { count: 'exact', head: true });
      const { count: activeUsers } = await sb.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active');
      const { count: trialUsers } = await sb.from('users').select('*', { count: 'exact', head: true }).eq('status', 'trial');
      const { count: newThisMonth } = await sb.from('users').select('*', { count: 'exact', head: true }).gte('criado_em', tsMes);
      const { count: newLastMonth } = await sb
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('criado_em', tsMesPassado)
        .lt('criado_em', tsMes);

      // Subscriptions
      const { count: activeSubscriptions } = await sb
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      const { count: cancelledSubscriptions } = await sb
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled');

      const { data: subs } = await sb
        .from('subscriptions')
        .select('plan_id, ciclo, plans(preco_mensal, preco_anual)')
        .eq('status', 'active');

      const mrr = (subs ?? []).reduce((acc, s: any) => {
        const preco = s.plans?.preco_mensal ?? 0;
        return acc + (s.ciclo === 'yearly' ? preco / 12 : preco);
      }, 0);

      // Usage
      const { count: totalIaRequests } = await sb
        .from('usage_log')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'ia_request');
      const { count: iaRequestsThisMonth } = await sb
        .from('usage_log')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'ia_request')
        .gte('criado_em', tsMes);

      const { data: usageData } = await sb.from('usage_log').select('custo_usd').eq('tipo', 'ia_request');
      const totalCost = (usageData ?? []).reduce((acc, u) => acc + (u.custo_usd ?? 0), 0);

      const { data: usageMes } = await sb
        .from('usage_log')
        .select('custo_usd')
        .eq('tipo', 'ia_request')
        .gte('criado_em', tsMes);
      const monthCost = (usageMes ?? []).reduce((acc, u) => acc + (u.custo_usd ?? 0), 0);

      // Recent usage
      const { data: recent } = await sb
        .from('usage_log')
        .select('id, user_id, tipo, acao, provider, tokens_input, tokens_output, custo_usd, duracao_ms, criado_em, meta')
        .order('criado_em', { ascending: false })
        .limit(8);

      // Top recursos (tipo)
      const { data: agrupado } = await sb
        .from('usage_log')
        .select('tipo')
        .gte('criado_em', tsMes);
      const contagem: Record<string, number> = {};
      for (const u of agrupado ?? []) contagem[u.tipo] = (contagem[u.tipo] ?? 0) + 1;
      const topRecursos = Object.entries(contagem)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const { data: planos } = await sb.from('plans').select('*').order('ordem');

      const calcDelta = (current: number, last: number) => {
        if (last === 0) return current > 0 ? 100 : 0;
        return ((current - last) / last) * 100;
      };

      setStats({
        totalUsers: totalUsers ?? 0,
        activeUsers: activeUsers ?? 0,
        trialUsers: trialUsers ?? 0,
        newThisMonth: newThisMonth ?? 0,
        newLastMonth: newLastMonth ?? 0,
        activeSubscriptions: activeSubscriptions ?? 0,
        cancelledSubscriptions: cancelledSubscriptions ?? 0,
        mrr,
        totalIaRequests: totalIaRequests ?? 0,
        iaRequestsThisMonth: iaRequestsThisMonth ?? 0,
        totalCost,
        monthCost,
        statusPlanos: planos ?? [],
        recentUsage: recent ?? [],
        topRecursos,
      });

      void calcDelta;
      setErro(null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center text-white/50">
        <Sparkles className="mr-2 h-4 w-4 animate-pulse text-emerald-400" />
        Carregando métricas…
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center text-white/60">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <div className="text-[14px]">Erro ao carregar dados</div>
        <div className="text-[12px] text-white/40">{erro}</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-[13px] text-white/50">
          Visão geral em tempo real da plataforma
        </p>
      </div>

      {/* Status */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Sistema operacional
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/60">
          <Clock className="h-3 w-3" />
          Atualizado agora
        </span>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Users}
          label="Usuários totais"
          valor={stats.totalUsers}
          delta={stats.newThisMonth - stats.newLastMonth}
          cor="text-cyan-400"
          corFundo="bg-cyan-500/10"
        />
        <StatCard
          icon={UserCheck}
          label="Assinantes ativos"
          valor={stats.activeSubscriptions}
          cor="text-emerald-400"
          corFundo="bg-emerald-500/10"
        />
        <StatCard
          icon={DollarSign}
          label="MRR"
          valor={`R$ ${stats.mrr.toFixed(2)}`}
          cor="text-amber-400"
          corFundo="bg-amber-500/10"
        />
        <StatCard
          icon={Sparkles}
          label="IA no mês"
          valor={stats.iaRequestsThisMonth}
          delta={
            stats.iaRequestsThisMonth > 0 && stats.totalIaRequests > 0
              ? ((stats.iaRequestsThisMonth / stats.totalIaRequests) * 100)
              : 0
          }
          cor="text-fuchsia-400"
          corFundo="bg-fuchsia-500/10"
        />
      </div>

      {/* Segunda linha */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={UserPlus}
          label="Novos no mês"
          valor={stats.newThisMonth}
          cor="text-blue-400"
          corFundo="bg-blue-500/10"
        />
        <StatCard
          icon={CreditCard}
          label="Trial ativo"
          valor={stats.trialUsers}
          cor="text-violet-400"
          corFundo="bg-violet-500/10"
        />
        <StatCard
          icon={Activity}
          label="Custo IA no mês"
          valor={`$${stats.monthCost.toFixed(4)}`}
          cor="text-orange-400"
          corFundo="bg-orange-500/10"
        />
        <StatCard
          icon={Server}
          label="Custo IA total"
          valor={`$${stats.totalCost.toFixed(4)}`}
          cor="text-pink-400"
          corFundo="bg-pink-500/10"
        />
      </div>

      {/* Plano distribuição + Atividade recente */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top recursos */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Recursos mais usados (mês)
          </h2>
          {stats.topRecursos.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-white/40">
              Sem uso registrado ainda
            </div>
          ) : (
            <div className="space-y-2">
              {stats.topRecursos.map((r, i) => {
                const max = stats.topRecursos[0].count;
                const pct = (r.count / max) * 100;
                const rotulos: Record<string, string> = {
                  ia_request: 'Requisições IA',
                  sermao_created: 'Sermões criados',
                  estudo_created: 'Estudos criados',
                  export: 'Exportações',
                  share: 'Compartilhamentos',
                  login: 'Logins',
                  signup: 'Cadastros',
                };
                return (
                  <div key={r.key}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="text-white/70">{rotulos[r.key] ?? r.key}</span>
                      <span className="font-medium tabular-nums text-white/90">{r.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Atividade recente */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold">
            <Activity className="h-4 w-4 text-cyan-400" />
            Atividade recente
          </h2>
          {stats.recentUsage.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-white/40">
              Sem atividade registrada
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentUsage.map((u) => {
                const tipoLabel: Record<string, { rotulo: string; cor: string }> = {
                  ia_request: { rotulo: 'IA', cor: 'text-fuchsia-300 bg-fuchsia-500/10' },
                  signup: { rotulo: 'Signup', cor: 'text-emerald-300 bg-emerald-500/10' },
                  login: { rotulo: 'Login', cor: 'text-cyan-300 bg-cyan-500/10' },
                  error: { rotulo: 'Erro', cor: 'text-red-300 bg-red-500/10' },
                };
                const cfg = tipoLabel[u.tipo] ?? { rotulo: u.tipo, cor: 'text-white/60 bg-white/5' };
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5"
                  >
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                        cfg.cor,
                      )}
                    >
                      {cfg.rotulo}
                    </span>
                    <div className="min-w-0 flex-1 text-[12px] text-white/70">
                      {u.acao ?? u.tipo}
                      {u.provider && ` · ${u.provider}`}
                      {u.custo_usd != null && u.custo_usd > 0 && ` · $${u.custo_usd.toFixed(5)}`}
                    </div>
                    <span className="text-[10.5px] text-white/40">
                      {new Date(u.criado_em).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Planos ativos */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
        <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold">
          <CreditCard className="h-4 w-4 text-violet-400" />
          Planos configurados
        </h2>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {stats.statusPlanos.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold">{p.nome}</span>
                  {p.destaque && (
                    <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9.5px] font-medium uppercase text-amber-300">
                      Top
                    </span>
                  )}
                </div>
                {p.ativo ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <span className="text-[10px] text-white/40">Inativo</span>
                )}
              </div>
              <div className="mt-2 text-[18px] font-bold tabular-nums">
                R$ {p.preco_mensal.toFixed(2)}
                <span className="text-[11px] font-normal text-white/40">/mês</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.f_pulpit && <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">Púlpito</span>}
                {p.f_assistente && <span className="rounded-full bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-300">IA</span>}
                {p.f_exportacao && <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">Export</span>}
                {p.f_templates_premium && <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-300">Templates+</span>}
              </div>
              <div className="mt-2 text-[10.5px] text-white/40">
                Limite IA: {p.limite_ia_mes}/mês · Sermões: {p.limite_sermoes}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}