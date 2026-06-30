import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Loader2,
  Edit3,
  Star,
  DollarSign,
  Users,
  CheckCircle2,
  X,
  AlertCircle,
  Save,
} from 'lucide-react';
import { supabase, type Plan } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const FEATURES = [
  { key: 'f_pulpit', label: 'Modo Púlpito' },
  { key: 'f_assistente', label: 'Assistente IA' },
  { key: 'f_biblioteca', label: 'Biblioteca' },
  { key: 'f_estudos', label: 'Modo Estudo' },
  { key: 'f_exportacao', label: 'Exportação PDF/Word/PPT' },
  { key: 'f_templates_premium', label: 'Templates Premium' },
  { key: 'f_apresentacoes', label: 'Apresentações' },
  { key: 'f_compartilhamento', label: 'Compartilhamento' },
  { key: 'f_assistente_premium', label: 'IA Premium' },
  { key: 'f_backup', label: 'Backup em Nuvem' },
  { key: 'f_offline', label: 'Modo Offline' },
  { key: 'f_sync', label: 'Sync Multi-Device' },
] as const;

export function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Plan | null>(null);
  const [salvando, setSalvando] = useState(false);

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
      const { data, error } = await sb.from('plans').select('*').order('ordem');
      if (error) throw error;
      setPlans(data ?? []);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  const salvar = async () => {
    if (!editando) return;
    const sb = supabase();
    if (!sb) return;
    setSalvando(true);
    try {
      const { error } = await sb
        .from('plans')
        .update({
          nome: editando.nome,
          descricao: editando.descricao,
          preco_mensal: editando.preco_mensal,
          preco_anual: editando.preco_anual,
          limite_sermoes: editando.limite_sermoes,
          limite_estudos: editando.limite_estudos,
          limite_pesquisas_mes: editando.limite_pesquisas_mes,
          limite_ia_mes: editando.limite_ia_mes,
          limite_exportacoes_mes: editando.limite_exportacoes_mes,
          limite_dispositivos: editando.limite_dispositivos,
          limite_armazenamento_mb: editando.limite_armazenamento_mb,
          ativo: editando.ativo,
          destaque: editando.destaque,
          f_pulpit: editando.f_pulpit,
          f_assistente: editando.f_assistente,
          f_biblioteca: editando.f_biblioteca,
          f_exportacao: editando.f_exportacao,
          f_estudos: editando.f_estudos,
          f_templates_premium: editando.f_templates_premium,
          f_apresentacoes: editando.f_apresentacoes,
          f_compartilhamento: editando.f_compartilhamento,
          f_assistente_premium: editando.f_assistente_premium,
          f_backup: editando.f_backup,
          f_offline: editando.f_offline,
          f_sync: editando.f_sync,
        })
        .eq('id', editando.id);
      if (error) throw error;
      await carregar();
      setEditando(null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const patch = <K extends keyof Plan>(key: K, value: Plan[K]) => {
    if (!editando) return;
    setEditando({ ...editando, [key]: value });
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Planos</h1>
        <p className="mt-1 text-[13px] text-white/50">
          Configure preços, limites e features por plano
        </p>
      </div>

      {carregando && plans.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-[13px] text-white/50">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : erro ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-white/60">
          <AlertCircle className="h-6 w-6 text-amber-400" />
          <div className="text-[13px]">Erro: {erro}</div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-2xl border bg-slate-900/60 p-4 backdrop-blur-sm transition-all',
                p.destaque ? 'border-amber-500/30 shadow-lg shadow-amber-500/10' : 'border-white/10',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      p.tier === 'free'
                        ? 'bg-slate-700 text-white/60'
                        : p.tier === 'premium'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-cyan-500/15 text-cyan-300',
                    )}
                  >
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold">{p.nome}</div>
                    <div className="text-[10.5px] uppercase tracking-wide text-white/40">
                      {p.tier}
                    </div>
                  </div>
                </div>
                {p.destaque && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <DollarSign className="h-4 w-4 text-white/40" />
                <span className="text-[22px] font-bold tabular-nums">
                  {p.preco_mensal.toFixed(2)}
                </span>
                <span className="text-[11px] text-white/40">/mês</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1 text-[11px]">
                <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                  <div className="text-white/40">Sermões</div>
                  <div className="font-semibold tabular-nums">{p.limite_sermoes}</div>
                </div>
                <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                  <div className="text-white/40">IA/mês</div>
                  <div className="font-semibold tabular-nums">{p.limite_ia_mes}</div>
                </div>
                <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                  <div className="text-white/40">Estudos</div>
                  <div className="font-semibold tabular-nums">{p.limite_estudos}</div>
                </div>
                <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                  <div className="text-white/40">Storage</div>
                  <div className="font-semibold tabular-nums">{p.limite_armazenamento_mb}MB</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {p.f_pulpit && <Tag cor="emerald">Púlpito</Tag>}
                {p.f_assistente && <Tag cor="cyan">IA</Tag>}
                {p.f_exportacao && <Tag cor="amber">Export</Tag>}
                {p.f_templates_premium && <Tag cor="violet">Templates+</Tag>}
                {p.f_backup && <Tag cor="blue">Backup</Tag>}
                {p.f_sync && <Tag cor="pink">Sync</Tag>}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[10.5px]',
                    p.ativo ? 'text-emerald-400' : 'text-white/30',
                  )}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <button
                  onClick={() => setEditando(p)}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-medium hover:bg-white/10"
                >
                  <Edit3 className="h-3 w-3" />
                  Editar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de edição */}
      {editando && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-4"
          onClick={() => !salvando && setEditando(null)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl overflow-hidden rounded-t-2xl bg-slate-900 shadow-2xl md:rounded-2xl"
            style={{ maxHeight: '90vh' }}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/5 px-5 py-3">
              <div>
                <h2 className="text-[16px] font-semibold">{editando.nome}</h2>
                <p className="text-[11px] text-white/40">{editando.slug} · {editando.tier}</p>
              </div>
              <button
                onClick={() => setEditando(null)}
                disabled={salvando}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              {/* Básicos */}
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Identidade
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Nome">
                  <input
                    value={editando.nome}
                    onChange={(e) => patch('nome', e.target.value)}
                    className="input-base"
                  />
                </Field>
                <Field label="Descrição">
                  <input
                    value={editando.descricao ?? ''}
                    onChange={(e) => patch('descricao', e.target.value)}
                    className="input-base"
                  />
                </Field>
                <Field label="Preço mensal (R$)">
                  <input
                    type="number"
                    step="0.01"
                    value={editando.preco_mensal}
                    onChange={(e) => patch('preco_mensal', Number(e.target.value))}
                    className="input-base"
                  />
                </Field>
                <Field label="Preço anual (R$)">
                  <input
                    type="number"
                    step="0.01"
                    value={editando.preco_anual}
                    onChange={(e) => patch('preco_anual', Number(e.target.value))}
                    className="input-base"
                  />
                </Field>
              </div>

              {/* Limites */}
              <h3 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Limites
              </h3>
              <div className="grid gap-2 md:grid-cols-3">
                <NumField label="Sermões" v={editando.limite_sermoes} onC={(v) => patch('limite_sermoes', v)} />
                <NumField label="Estudos" v={editando.limite_estudos} onC={(v) => patch('limite_estudos', v)} />
                <NumField label="IA/mês" v={editando.limite_ia_mes} onC={(v) => patch('limite_ia_mes', v)} />
                <NumField label="Pesquisas/mês" v={editando.limite_pesquisas_mes} onC={(v) => patch('limite_pesquisas_mes', v)} />
                <NumField label="Exportações/mês" v={editando.limite_exportacoes_mes} onC={(v) => patch('limite_exportacoes_mes', v)} />
                <NumField label="Dispositivos" v={editando.limite_dispositivos} onC={(v) => patch('limite_dispositivos', v)} />
                <NumField label="Storage (MB)" v={editando.limite_armazenamento_mb} onC={(v) => patch('limite_armazenamento_mb', v)} />
              </div>

              {/* Features */}
              <h3 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Funcionalidades
              </h3>
              <div className="grid gap-1.5 md:grid-cols-2">
                {FEATURES.map((f) => (
                  <label
                    key={f.key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={editando[f.key as keyof Plan] as boolean}
                      onChange={(e) => patch(f.key as keyof Plan, e.target.checked as never)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5"
                    />
                    <span className="text-[12.5px]">{f.label}</span>
                  </label>
                ))}
              </div>

              {/* Status */}
              <h3 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Status
              </h3>
              <div className="flex flex-wrap gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <input
                    type="checkbox"
                    checked={editando.ativo}
                    onChange={(e) => patch('ativo', e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-[12.5px]">Ativo para venda</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={editando.destaque}
                    onChange={(e) => patch('destaque', e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-[12.5px]">Destacar como Top</span>
                </label>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-white/5 px-5 py-3">
              <button
                onClick={() => setEditando(null)}
                disabled={salvando}
                className="rounded-lg px-3 py-2 text-[12px] font-medium text-white/60 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={() => void salvar()}
                disabled={salvando}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 px-4 py-2 text-[12.5px] font-semibold hover:brightness-110 disabled:opacity-50"
              >
                {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <style>{`
        .input-base {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: white;
          outline: none;
        }
        .input-base:focus { border-color: rgba(16, 185, 129, 0.5); }
      `}</style>
    </div>
  );
}

function Tag({ children, cor }: { children: React.ReactNode; cor: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        cor === 'emerald' && 'bg-emerald-500/15 text-emerald-300',
        cor === 'cyan' && 'bg-cyan-500/15 text-cyan-300',
        cor === 'amber' && 'bg-amber-500/15 text-amber-300',
        cor === 'violet' && 'bg-violet-500/15 text-violet-300',
        cor === 'blue' && 'bg-blue-500/15 text-blue-300',
        cor === 'pink' && 'bg-pink-500/15 text-pink-300',
      )}
    >
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10.5px] font-medium uppercase tracking-wider text-white/40">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumField({ label, v, onC }: { label: string; v: number; onC: (v: number) => void }) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={v}
        onChange={(e) => onC(Number(e.target.value))}
        className="input-base"
      />
    </Field>
  );
}