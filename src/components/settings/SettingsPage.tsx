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
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
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

export function SettingsPage() {
  const tema = useUIStore((s) => s.tema);
  const alternarTema = useUIStore((s) => s.alternarTema);
  const fonte = useUIStore((s) => s.fonte);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const total = useLiveQuery(() => db.mensagens.count(), []);
  const [stats, setStats] = useState<StatsIA | null>(null);

  const [iaStatus, setIaStatus] = useState<{ tipo: 'ok' | 'erro' | 'loading'; msg: string }>({ tipo: 'loading', msg: 'Verificando…' });

  useEffect(() => {
    obterStats().then(setStats);
  }, []);

  useEffect(() => {
    void verificarIA();
  }, []);

  const verificarIA = async () => {
    const pr = await openaiProvider.pronto();
    if (pr.ok) {
      setIaStatus({ tipo: 'ok', msg: `Respostas completas via IA — configuradas pelo administrador.` });
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
    <div className="flex h-full flex-col bg-paper">
      <MobileHeader title="Configurações" subtitle="IA, aparência, dados" />

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-2xl space-y-5 px-4 py-4">
          {/* IA — Status */}
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Assistente Ministerial
            </h2>
            <Card className="overflow-hidden p-0">
              <div className="p-4">
                <div className="mb-3 flex items-start gap-3">
                  <div className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl',
                    iaStatus.tipo === 'ok' ? 'bg-emerald-100' : 'bg-red-50',
                  )}>
                    {iaStatus.tipo === 'ok' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : iaStatus.tipo === 'loading' ? (
                      <Loader2 className="h-5 w-5 animate-spin text-ink-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold text-ink-900">
                      {iaStatus.tipo === 'ok' ? 'Assistente ativo' : iaStatus.tipo === 'loading' ? 'Verificando…' : 'Configuração necessária'}
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">{iaStatus.msg}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => void verificarIA()} className="h-8 text-[12px]">
                    <RefreshCw className="h-3.5 w-3.5" /> Verificar
                  </Button>
                  {iaStatus.tipo !== 'ok' && (
                    <a href="/admin/api-keys" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-4 text-[12px] font-medium text-ink-700 hover:bg-ink-50">
                      Configurar IA →
                    </a>
                  )}
                </div>
              </div>
            </Card>
          </section>

          {/* Stats IA */}
          {stats && stats.requisicoes > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                Uso da IA
              </h2>
              <Card className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Requisições" valor={String(stats.requisicoes)} icon={Sparkles} />
                  <Stat label="Tokens" valor={stats.tokensTotal.toLocaleString('pt-BR')} icon={Cpu} />
                  <Stat label="Custo" valor={`$${stats.custoTotalUSD.toFixed(4)}`} icon={Coins} />
                </div>
                {Object.entries(stats.porProvider).length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-ink-100 pt-2.5 text-[11.5px]">
                    {Object.entries(stats.porProvider).map(([prov, s]: [string, { requisicoes: number; tokens: number; custo: number }]) => (
                      <div key={prov} className="flex items-center justify-between text-ink-600">
                        <span>{prov}</span>
                        <span className="tabular-nums">
                          {s.requisicoes} req · {s.tokens.toLocaleString('pt-BR')} tok · ${s.custo.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </section>
          )}

          {/* Aparência */}
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Aparência
            </h2>
            <Card className="space-y-3 p-4">
              {/* Tema */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13.5px] font-medium text-ink-900">Tema</div>
                  <p className="text-[11.5px] text-ink-500">
                    Claro para luz forte. Escuro para o púlpito à noite.
                  </p>
                </div>
                <Button variant="outline" onClick={alternarTema}>
                  {tema === 'light' ? '🌙 Escuro' : '☀️ Claro'}
                </Button>
              </div>

              <div className="border-t border-ink-100 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13.5px] font-medium text-ink-900">Tamanho da fonte</div>
                    <p className="text-[11.5px] text-ink-500">
                      Ajuste para leitura prolongada mais confortável.
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {(['pequeno', 'medio', 'grande'] as FontSize[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => useUIStore.getState().setFonte(f)}
                      className={
                        'rounded-xl border py-2.5 text-center text-[12px] font-medium transition-all ' +
                        (fonte === f
                          ? 'border-ink-900 bg-ink-50 text-ink-900'
                          : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300')
                      }
                    >
                      {FONT_SIZE_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          {/* Dados */}
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Dados
            </h2>
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between rounded-lg bg-ink-50 p-3 text-[12.5px]">
                <span className="text-ink-700">
                  <span className="font-semibold tabular-nums text-ink-900">{total ?? 0}</span> mensagens armazenadas
                </span>
                <span className="text-[10.5px] text-ink-400">IndexedDB · offline-first</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={exportar} className="h-9 text-[12px]">
                  <Download className="h-3.5 w-3.5" /> Exportar
                </Button>
                <Button variant="outline" onClick={importar} className="h-9 text-[12px]">
                  <Upload className="h-3.5 w-3.5" /> Importar
                </Button>
                <Button variant="outline" onClick={semearExemplos} className="h-9 text-[12px]">
                  Semear
                </Button>
              </div>
            </Card>
          </section>

          {/* Zona de risco */}
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Zona de risco
            </h2>
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium text-ink-900">Apagar tudo</div>
                  <p className="text-[11.5px] text-ink-500">Mensagens, histórico e conversas de IA.</p>
                </div>
                <Button variant="danger" onClick={limparTudo} className="flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5" /> Apagar
                </Button>
              </div>
            </Card>
          </section>

          <div className="pb-4 text-center text-[10.5px] text-ink-400">
            Pregador OS · v{APP_VERSION} · Mobile-first + PWA
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, valor, icon: Icon }: { label: string; valor: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl bg-ink-50 p-2.5 text-center">
      <Icon className="mx-auto h-3.5 w-3.5 text-ink-500" />
      <div className="mt-1 text-[14px] font-semibold tabular-nums text-ink-900">{valor}</div>
      <div className="text-[10px] text-ink-500">{label}</div>
    </div>
  );
}