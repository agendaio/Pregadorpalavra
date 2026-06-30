import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Loader2,
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldOff,
  ShieldCheck,
  PauseCircle,
  Edit3,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supabase, type AppUser, type UserStatus, type Subscription } from '@/lib/supabase';
import { cn, formatarRelativo } from '@/lib/utils';

const STATUS_OPCOES: { id: UserStatus; label: string; cor: string }[] = [
  { id: 'active', label: 'Ativo', cor: 'bg-emerald-500/15 text-emerald-300' },
  { id: 'trial', label: 'Trial', cor: 'bg-violet-500/15 text-violet-300' },
  { id: 'suspended', label: 'Suspenso', cor: 'bg-amber-500/15 text-amber-300' },
  { id: 'blocked', label: 'Bloqueado', cor: 'bg-red-500/15 text-red-300' },
  { id: 'cancelled', label: 'Cancelado', cor: 'bg-white/10 text-white/40' },
];

export function AdminUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<UserStatus | 'todos'>('todos');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<AppUser | null>(null);

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
    setCarregando(true);
    try {
      const { data, error } = await sb
        .from('users')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(500);
      if (error) throw error;
      setUsers(data ?? []);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  const alterarStatus = async (u: AppUser, novo: UserStatus) => {
    const sb = supabase();
    if (!sb) return;
    const { error } = await sb.from('users').update({ status: novo }).eq('id', u.id);
    if (error) {
      setErro(error.message);
      return;
    }
    setUsers((xs) => xs.map((x) => (x.id === u.id ? { ...x, status: novo } : x)));
    setEditando(null);
  };

  const filtrados = users.filter((u) => {
    if (filtroStatus !== 'todos' && u.status !== filtroStatus) return false;
    if (!busca.trim()) return true;
    const t = busca.toLowerCase();
    return (
      u.email.toLowerCase().includes(t) ||
      (u.nome ?? '').toLowerCase().includes(t) ||
      (u.igreja ?? '').toLowerCase().includes(t)
    );
  });

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Usuários</h1>
          <p className="mt-1 text-[13px] text-white/50">
            {users.length} cadastrados · {filtrados.length} filtrados
          </p>
        </div>
        <button
          onClick={() => void carregar()}
          disabled={carregando}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-medium hover:bg-white/10 disabled:opacity-50"
        >
          {carregando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Atualizar'}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <Search className="h-4 w-4 text-white/40" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por email, nome ou igreja…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-white/30"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFiltroStatus('todos')}
            className={cn(
              'flex-shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-colors',
              filtroStatus === 'todos'
                ? 'bg-white text-slate-900'
                : 'bg-white/5 text-white/60 hover:bg-white/10',
            )}
          >
            Todos
          </button>
          {STATUS_OPCOES.map((s) => (
            <button
              key={s.id}
              onClick={() => setFiltroStatus(s.id)}
              className={cn(
                'flex-shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-colors',
                filtroStatus === s.id
                  ? 'bg-white text-slate-900'
                  : 'bg-white/5 text-white/60 hover:bg-white/10',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm">
        {carregando && users.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-[13px] text-white/50">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando usuários…
          </div>
        ) : erro ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 px-6 text-center text-white/60">
            <AlertCircle className="h-6 w-6 text-amber-400" />
            <div className="text-[13px]">Erro ao carregar</div>
            <div className="text-[11.5px] text-white/40">{erro}</div>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-white/50">
            <Users className="h-6 w-6 text-white/30" />
            <div className="text-[13px]">Nenhum usuário encontrado</div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtrados.map((u) => {
              const st = STATUS_OPCOES.find((s) => s.id === u.status) ?? STATUS_OPCOES[0];
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 text-[13px] font-semibold">
                    {(u.nome ?? u.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium">
                        {u.nome ?? u.email}
                      </span>
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', st.cor)}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11.5px] text-white/50">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {u.email}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatarRelativo(new Date(u.criado_em).getTime())}
                      </span>
                      {u.igreja && <span>· {u.igreja}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditando(editando?.id === u.id ? null : u)}
                    className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"
                    aria-label="Editar"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Painel de edição */}
      {editando && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl rounded-t-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:rounded-2xl"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 text-[13px] font-semibold">
              {(editando.nome ?? editando.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{editando.nome ?? editando.email}</div>
              <div className="truncate text-[11px] text-white/50">{editando.email}</div>
            </div>
          </div>

          <div className="mb-2 text-[10.5px] font-medium uppercase tracking-wider text-white/40">
            Alterar status
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <button
              onClick={() => void alterarStatus(editando, 'active')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-[12px] font-medium text-emerald-300 hover:bg-emerald-500/25"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Ativar
            </button>
            <button
              onClick={() => void alterarStatus(editando, 'suspended')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-2 text-[12px] font-medium text-amber-300 hover:bg-amber-500/25"
            >
              <PauseCircle className="h-3.5 w-3.5" />
              Suspender
            </button>
            <button
              onClick={() => void alterarStatus(editando, 'blocked')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-2 text-[12px] font-medium text-red-300 hover:bg-red-500/25"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              Bloquear
            </button>
            <button
              onClick={() => void alterarStatus(editando, 'trial')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-500/15 px-3 py-2 text-[12px] font-medium text-violet-300 hover:bg-violet-500/25"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Trial
            </button>
            <button
              onClick={() => void alterarStatus(editando, 'cancelled')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-[12px] font-medium text-white/60 hover:bg-white/10"
            >
              Cancelar
            </button>
          </div>

          <button
            onClick={() => setEditando(null)}
            className="mt-3 w-full rounded-lg bg-white/5 px-3 py-2 text-[12px] font-medium hover:bg-white/10"
          >
            Fechar
          </button>
        </motion.div>
      )}
    </div>
  );
}