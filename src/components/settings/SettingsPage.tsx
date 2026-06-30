import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Coins,
  RefreshCw,
  Loader2,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { db } from '@/db/schema';
import { useUIStore, FONT_SIZE_LABELS, type FontSize } from '@/stores/ui';
import { semearExemplos } from '@/db/seed';
import { APP_VERSION } from '../../../v.config';
import {
  aiDB,
  obterStats,
  openaiProvider,
  type StatsIA,
} from '@/lib/ai';
import { Switch } from '@/components/ui/Input';

export function SettingsPage() {
  const tema = useUIStore((s) => s.tema);
  const alternarTema = useUIStore((s) => s.alternarTema);
  const fonte = useUIStore((s) => s.fonte);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const total = useLiveQuery(() => db.mensagens.count(), []);
  const [stats, setStats] = useState<StatsIA | null>(null);

  const [iaStatus, setIaStatus] = useState<{ tipo: 'ok' | 'erro' | 'loading'; msg: string }>({
    tipo: 'loading',
    msg: 'Verificando…',
  });

  useEffect(() => {
    obterStats().then(setStats);
  }, []);

  useEffect(() => {
    void verificarIA();
  }, []);

  const verificarIA = async () => {
    const pr = await openaiProvider.pronto();
    if (pr.ok) {
      setIaStatus({ tipo: 'ok', msg: 'Respostas completas via IA — configuradas pelo administrador.' });
    } else {
      setIaStatus({ tipo: 'erro', msg: pr.motivo ?? 'Indisponível' });
    }
  };

  const exportar = async () => {
    const mensagens = await db.mensagens.toArray();
    const historico = await db.historico.toArray();
    const blob = new Blob(
      [JSON.stringify({ mensagens, historico, exportadoEm: Date.now() }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pregador-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarToast('Backup exportado', 'sucesso');
  };

  const importar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const texto = await file.text();
      try {
        const dados = JSON.parse(texto);
        if (Array.isArray(dados.mensagens)) {
          for (const m of dados.mensagens) await db.mensagens.put(m);
        }
        if (Array.isArray(dados.historico)) {
          for (const h of dados.historico) await db.historico.put(h);
        }
        mostrarToast(`Importado: ${dados.mensagens?.length ?? 0} mensagens`, 'sucesso');
      } catch {
        mostrarToast('Arquivo inválido', 'erro');
      }
    };
    input.click();
  };

  const limparTudo = async () => {
    if (!confirm('Apagar TODAS as mensagens e histórico? Esta ação é irreversível.')) return;
    await db.mensagens.clear();
    await db.historico.clear();
    await aiDB.mensagens.clear();
    await aiDB.sessoes.clear();
    await aiDB.cache.clear();
    mostrarToast('Biblioteca limpa', 'sucesso');
  };

  return (
    <div className="flex flex-col bg-paper text-ink-900 dark:bg-paper-dark dark:text-ink-100">
      <MobileHeader title="Configurações" subtitle="IA, aparência, dados" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-4">

          {/* IA — Status */}
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">
              Assistente Ministerial
            </h2>
            <div className="overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900/40">
              <div className="flex items-start gap-3 p-4">
                <div className={cn(
                  'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl',
                  iaStatus.tipo === 'ok' ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-red-50 dark:bg-red-500/20',
                )}>
                  {iaStatus.tipo === 'ok' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : iaStatus.tipo === 'loading' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-ink-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-accent dark:text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-[14.5px] font-semibold tracking-tight text-ink-900 dark:text-white">
                    {iaStatus.tipo === 'ok'
                      ? 'Assistente ativo'
                      : iaStatus.tipo === 'loading'
                      ? 'Verificando…'
                      : 'Configuração necessária'}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500 dark:text-ink-400">
                    {iaStatus.msg}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 border-t border-ink-100 px-4 py-3 dark:border-ink-800">
                <button
                  onClick={() => void verificarIA()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-[12.5px] font-medium text-ink-700 transition-colors hover:bg-ink-50 active:scale-95 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Verificar
                </button>
                {iaStatus.tipo !== 'ok' && (
                  <a
                    href="/admin/api-keys"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-900 px-4 text-[12.5px] font-medium text-white transition-colors hover:bg-ink-800 dark:bg-white dark:text-ink-950"
                  >
                    Configurar IA →
                  </a>
                )}
              </div>
            </div>
          </section>

          {stats && stats.requisicoes > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">
                Uso da IA
              </h2>
              <div className="rounded-2xl border border-ink-200/80 bg-white p-4 shadow-soft dark:border-ink-800 dark:bg-ink-900/40">
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Requisições" valor={String(stats.requisicoes)} icon={Sparkles} />
                  <Stat label="Tokens" valor={stats.tokensTotal.toLocaleString('pt-BR')} icon={Cpu} />
                  <Stat label="Custo" valor={`$${stats.custoTotalUSD.toFixed(4)}`} icon={Coins} />
                </div>
                {Object.entries(stats.porProvider).length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-ink-100 pt-2.5 text-[11.5px] dark:border-ink-800">
                    {Object.entries(stats.porProvider).map(([prov, s]: [string, { requisicoes: number; tokens: number; custo: number }]) => (
                      <div key={prov} className="flex items-center justify-between text-ink-600 dark:text-ink-300">
                        <span>{prov}</span>
                        <span className="tabular-nums">
                          {s.requisicoes} req · {s.tokens.toLocaleString('pt-BR')} tok · ${s.custo.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Aparência */}
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">
              Aparência
            </h2>
            <div className="space-y-3 rounded-2xl border border-ink-200/80 bg-white p-4 shadow-soft dark:border-ink-800 dark:bg-ink-900/40">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium tracking-tight text-ink-900 dark:text-white">Tema</div>
                  <p className="text-[12px] text-ink-500 dark:text-ink-400">
                    Claro pra luz forte. Escuro pro púlpito à noite.
                  </p>
                </div>
                <Switch
                  checked={tema === 'dark'}
                  onChange={(v) => useUIStore.getState().setTema(v ? 'dark' : 'light')}
                  ariaLabel="Alternar tema"
                />
              </div>

              <div className="border-t border-ink-100 pt-3 dark:border-ink-800">
                <div className="mb-2.5">
                  <div className="text-[14px] font-medium tracking-tight text-ink-900 dark:text-white">
                    Tamanho da fonte
                  </div>
                  <p className="text-[12px] text-ink-500 dark:text-ink-400">
                    Ajuste para leitura prolongada mais confortável.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['pequeno', 'medio', 'grande'] as FontSize[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => useUIStore.getState().setFonte(f)}
                      className={cn(
                        'rounded-xl border py-2.5 text-center text-[13px] font-medium transition-all active:scale-95',
                        fonte === f
                          ? 'border-ink-900 bg-ink-50 text-ink-900 dark:border-white dark:bg-ink-800 dark:text-white'
                          : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-ink-600',
                      )}
                    >
                      {FONT_SIZE_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Dados */}
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">
              Dados
            </h2>
            <div className="rounded-2xl border border-ink-200/80 bg-white p-4 shadow-soft dark:border-ink-800 dark:bg-ink-900/40">
              <div className="mb-3 flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2.5 text-[12.5px] dark:bg-ink-800/60">
                <span className="text-ink-700 dark:text-ink-200">
                  <span className="font-semibold tabular-nums text-ink-900 dark:text-white">{total ?? 0}</span>{' '}
                  mensagens armazenadas
                </span>
                <span className="text-[10.5px] text-ink-400 dark:text-ink-500">IndexedDB · offline-first</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={exportar}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white text-[12.5px] font-medium text-ink-700 transition-colors hover:bg-ink-50 active:scale-95 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar
                </button>
                <button
                  onClick={importar}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white text-[12.5px] font-medium text-ink-700 transition-colors hover:bg-ink-50 active:scale-95 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700"
                >
                  <Upload className="h-3.5 w-3.5" /> Importar
                </button>
                <button
                  onClick={semearExemplos}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white text-[12.5px] font-medium text-ink-700 transition-colors hover:bg-ink-50 active:scale-95 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700"
                >
                  Semear
                </button>
              </div>
            </div>
          </section>

          {/* Zona de risco */}
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
              Zona de risco
            </h2>
            <div className="rounded-2xl border border-red-200/80 bg-red-50/40 p-4 dark:border-red-500/30 dark:bg-red-500/5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium tracking-tight text-ink-900 dark:text-white">
                    Apagar tudo
                  </div>
                  <p className="text-[12px] text-ink-500 dark:text-ink-400">
                    Mensagens, histórico e conversas de IA.
                  </p>
                </div>
                <button
                  onClick={limparTudo}
                  className="inline-flex h-10 flex-shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-700 active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Apagar
                </button>
              </div>
            </div>
          </section>

          <div className="pb-6 text-center text-[10.5px] text-ink-400 dark:text-ink-500">
            Pregador OS · v{APP_VERSION} · Mobile-first + PWA
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, valor, icon: Icon }: { label: string; valor: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl bg-ink-50 p-2.5 text-center dark:bg-ink-800/60">
      <Icon className="mx-auto h-3.5 w-3.5 text-ink-500 dark:text-ink-400" />
      <div className="mt-1 text-[14px] font-semibold tabular-nums text-ink-900 dark:text-white">{valor}</div>
      <div className="text-[10px] text-ink-500 dark:text-ink-400">{label}</div>
    </div>
  );
}
