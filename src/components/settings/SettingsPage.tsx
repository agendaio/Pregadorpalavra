import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Download,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Key,
  Cpu,
  Coins,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { db } from '@/db/schema';
import { useUIStore } from '@/stores/ui';
import { semearExemplos } from '@/db/seed';
import { APP_VERSION } from '../../../v.config';
import {
  aiDB,
  CHAVE_STORAGE,
  MODELO_STORAGE,
  definirProviderAtivo,
  listarProviders,
  obterProviderAtivoId,
  obterProvider,
  obterStats,
  type StatsIA,
  type ProviderInfo,
} from '@/lib/ai';

export function SettingsPage() {
  const tema = useUIStore((s) => s.tema);
  const setTema = useUIStore((s) => s.setTema);
  const alternarTema = useUIStore((s) => s.alternarTema);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const total = useLiveQuery(() => db.mensagens.count(), []);
  const [stats, setStats] = useState<StatsIA | null>(null);

  const [chave, setChave] = useState('');
  const [mostrarChave, setMostrarChave] = useState(false);
  const [providerAtivo, setProviderAtivo] = useState(obterProviderAtivoId());
  const [modelo, setModelo] = useState(localStorage.getItem(MODELO_STORAGE) || 'gpt-4o-mini');
  const [status, setStatus] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null);

  useEffect(() => {
    obterStats().then(setStats);
  }, []);

  useEffect(() => {
    const c = localStorage.getItem(CHAVE_STORAGE) ?? '';
    setChave(c);
  }, []);

  const providers = listarProviders();
  const provAtivo = obterProvider(providerAtivo);

  const handleSalvarChave = () => {
    localStorage.setItem(CHAVE_STORAGE, chave);
    mostrarToast('Chave salva', 'sucesso');
    setStatus(null);
    void testarChave();
  };

  const handleLimparChave = () => {
    localStorage.removeItem(CHAVE_STORAGE);
    setChave('');
    mostrarToast('Chave removida', 'info');
    setStatus({ tipo: 'ok', msg: 'Chave removida. O assistente usará o modo local.' });
  };

  const testarChave = async () => {
    setStatus(null);
    const pr = await provAtivo.pronto();
    if (pr.ok) {
      setStatus({ tipo: 'ok', msg: `Pronto! ${provAtivo.info().nome} está configurado.` });
    } else {
      setStatus({ tipo: 'erro', msg: pr.motivo ?? 'Indisponível' });
    }
  };

  const handleProviderChange = (id: string) => {
    definirProviderAtivo(id as 'openai' | 'local');
    setProviderAtivo(id as 'openai' | 'local');
    mostrarToast(`Provider: ${id}`, 'info');
  };

  const handleModeloChange = (id: string) => {
    localStorage.setItem(MODELO_STORAGE, id);
    setModelo(id);
    mostrarToast(`Modelo: ${id}`, 'info');
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

  const openaiInfo = providers.find((p: { info: () => { id: string } }) => p.info().id === 'openai')!;
  const modelos = openaiInfo.info().modelos;

  return (
    <div className="flex h-full flex-col bg-paper">
      <MobileHeader title="Configurações" subtitle="IA, aparência, dados" />

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-2xl space-y-5 px-4 py-4">
          {/* IA — Provider */}
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Assistente Ministerial · IA
            </h2>
            <Card className="overflow-hidden p-0">
              <div className="border-b border-ink-100 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-ink-700" />
                  <span className="text-[13px] font-semibold text-ink-900">Provedor ativo</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {providers.map((p: { info: () => ProviderInfo }) => {
                    const info = p.info();
                    const ativo = providerAtivo === info.id;
                    return (
                      <button
                        key={info.id}
                        onClick={() => handleProviderChange(info.id)}
                        className={
                          'rounded-2xl border p-3 text-left transition-all ' +
                          (ativo
                            ? 'border-ink-900 bg-ink-50 shadow-soft'
                            : 'border-ink-200 bg-white hover:border-ink-300')
                        }
                      >
                        <div className="flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5 text-ink-700" />
                          <span className="text-[12.5px] font-semibold text-ink-900">{info.nome}</span>
                          {ativo && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-600" />}
                        </div>
                        <p className="mt-1 text-[10.5px] leading-snug text-ink-500">{info.descricao}</p>
                        {info.offline && (
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-medium uppercase text-emerald-700">
                            offline
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chave API — só para OpenAI */}
              {providerAtivo === 'openai' && (
                <div className="border-b border-ink-100 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Key className="h-4 w-4 text-ink-700" />
                    <span className="text-[13px] font-semibold text-ink-900">Chave da API</span>
                  </div>
                  <p className="mb-2.5 text-[11.5px] leading-relaxed text-ink-500">
                    Sua chave fica salva apenas no seu navegador. Para uso em produção, a Onda 2 vai mover isso para Edge Functions (chave nunca exposta ao cliente).
                  </p>
                  <div className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white p-1.5">
                    <input
                      type={mostrarChave ? 'text' : 'password'}
                      value={chave}
                      onChange={(e) => setChave(e.target.value)}
                      placeholder="sk-…"
                      className="flex-1 bg-transparent px-2 py-1 font-mono text-[12.5px] outline-none placeholder:text-ink-400"
                    />
                    <Button variant="ghost" size="icon" onClick={() => setMostrarChave(!mostrarChave)} aria-label="Mostrar/ocultar">
                      {mostrarChave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Button variant="primary" onClick={handleSalvarChave} className="h-8 text-[12px]">
                      Salvar chave
                    </Button>
                    <Button variant="outline" onClick={testarChave} className="h-8 text-[12px]">
                      Testar conexão
                    </Button>
                    <Button variant="ghost" onClick={handleLimparChave} className="h-8 text-[12px]">
                      Remover
                    </Button>
                  </div>

                  {status && (
                    <div
                      className={
                        'mt-3 flex items-start gap-2 rounded-lg p-2.5 text-[11.5px] ' +
                        (status.tipo === 'ok' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900')
                      }
                    >
                      {status.tipo === 'ok' ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      <span>{status.msg}</span>
                    </div>
                  )}

                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-ink-600 underline-offset-2 hover:underline"
                  >
                    Obter chave na OpenAI <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Modelo */}
              {providerAtivo === 'openai' && (
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-ink-700" />
                    <span className="text-[13px] font-semibold text-ink-900">Modelo</span>
                  </div>
                  <div className="space-y-1.5">
                    {modelos.map((m: { id: string; nome: string; descricao?: string; contexto: number; custoInput: number; custoOutput: number }) => {
                      const ativo = modelo === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleModeloChange(m.id)}
                          className={
                            'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ' +
                            (ativo ? 'border-ink-900 bg-ink-50' : 'border-ink-200 bg-white hover:border-ink-300')
                          }
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-ink-900">{m.nome}</span>
                              {ativo && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                            </div>
                            {m.descricao && (
                              <p className="mt-0.5 text-[11.5px] text-ink-600">{m.descricao}</p>
                            )}
                            <div className="mt-1.5 flex items-center gap-3 text-[10.5px] text-ink-500 tabular-nums">
                              <span>{(m.contexto / 1000).toFixed(0)}k contexto</span>
                              <span>${m.custoInput.toFixed(5)}/1k in</span>
                              <span>${m.custoOutput.toFixed(5)}/1k out</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13.5px] font-medium text-ink-900">Tema</div>
                  <p className="text-[11.5px] text-ink-500">
                    Claro reduz cansaço em luz forte. Escuro pro púlpito à noite.
                  </p>
                </div>
                <Button variant="outline" onClick={alternarTema}>
                  {tema === 'light' ? 'Escuro' : 'Claro'}
                </Button>
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