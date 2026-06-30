import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Cpu,
  Wifi,
  WifiOff,
  Activity,
  Plus,
  Trash2,
  Settings,
  ChevronDown,
  RefreshCw,
  Zap,
  Clock,
  TrendingUp,
  Hash,
  MessageSquare,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  latencyMs?: number;
}

interface ApiKeyConfig {
  id: string;
  provider: string;
  key_ciphertext?: string;
  modelo_padrao: string | null;
  ativo: boolean;
  temperature: number | null;
  max_tokens: number | null;
  context_window: number | null;
  timeout_ms: number | null;
  streaming: boolean | null;
  memoria_contexto: string | null;
  ultimo_teste_em: string | null;
  ultimo_status: string | null;
  ultimo_teste_latency_ms: number | null;
  criado_em: string;
  atualizado_em: string;
}

interface ProviderMeta {
  id: string;
  label: string;
  logo: string;
  modelos: { id: string; label: string }[];
  docsUrl: string;
}

// ─── Meta dos provedores ───────────────────────────────────────────────────

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    logo: '🤖',
    modelos: [
      { id: 'gpt-4o', label: 'GPT-4o (mais capaz)' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini (rápido)' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    logo: '🧠',
    modelos: [
      { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku (rápido)' },
      { id: 'claude-3-opus', label: 'Claude 3 Opus' },
    ],
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'google',
    label: 'Google Gemini',
    logo: '💎',
    modelos: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'azure',
    label: 'Azure OpenAI',
    logo: '☁️',
    modelos: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { id: 'gpt-35-turbo', label: 'GPT-3.5 Turbo' },
    ],
    docsUrl: 'https://portal.azure.com',
  },
];

// ─── Máscara de chave ────────────────────────────────────────────────────────

function maskKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  return key.slice(0, 10) + '••••••••' + key.slice(-4);
}

// ─── Status badge ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (status === 'online') {
    return (
      <div className="flex items-center gap-1.5 text-emerald-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Online
      </div>
    );
  }
  if (status === 'testing') {
    return (
      <div className="flex items-center gap-1.5 text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Testando...
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-white/40">
      <WifiOff className="h-3 w-3" />
      Offline
    </div>
  );
}

// ─── Test Result Row ────────────────────────────────────────────────────────

function TestRow({ result }: { result: TestResult }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <div className="mt-0.5 flex-shrink-0">
        {result.passed ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <XCircle className="h-4 w-4 text-red-400" />
        )}
      </div>
      <div className="flex-1">
        <div className={cn('text-[13px] font-medium', result.passed ? 'text-white' : 'text-red-300')}>
          {result.name}
        </div>
        <div className="mt-0.5 text-[11.5px] text-white/50">{result.message}</div>
      </div>
      {result.latencyMs !== undefined && (
        <div className="flex-shrink-0 text-[11px] text-white/30 tabular-nums">
          {result.latencyMs}ms
        </div>
      )}
    </div>
  );
}

// ─── Config Row genérica ─────────────────────────────────────────────────────

function ConfigRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <div className="flex-shrink-0 text-white/30">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-[12.5px] font-medium text-white/80">{label}</div>
        {description && <div className="mt-0.5 text-[11px] text-white/40">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function AdminApiKeys() {
  const [keys, setKeys] = useState<ApiKeyConfig[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Form state
  const [provider, setProvider] = useState('openai');
  const [modelo, setModelo] = useState('gpt-4o-mini');
  const [apiKeyRaw, setApiKeyRaw] = useState('');
  const [mostrarKey, setMostrarKey] = useState(false);
  const [testando, setTestando] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [testOk, setTestOk] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // Settings expandidos
  const [mostrarSettings, setMostrarSettings] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2500);
  const [contextWindow, setContextWindow] = useState(128000);
  const [timeoutMs, setTimeoutMs] = useState(60000);
  const [streaming, setStreaming] = useState(true);
  const [memoriaCtx, setMemoriaCtx] = useState('10');

  const currentProviderMeta = PROVIDERS.find((p) => p.id === provider)!;

  // Carregar chaves
  const carregar = async () => {
    const sb = supabase();
    if (!sb) { setErro('Supabase nao configurado'); setCarregando(false); return; }
    try {
      const { data, error } = await sb
        .from('api_keys')
        .select('*')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      setKeys((data ?? []) as ApiKeyConfig[]);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { void carregar(); }, []);

  // Testar chave
  const testarChave = async () => {
    if (!apiKeyRaw.trim()) {
      setMsg({ tipo: 'erro', texto: 'Cole uma chave para testar' });
      return;
    }
    setTestando(true);
    setTestResults(null);
    setTestOk(false);
    setMsg(null);

    try {
      const sb = supabase();
      if (!sb) throw new Error('Supabase nao configurado');
      const { data, error } = await sb.functions.invoke('test-key', {
        body: { provider, apiKey: apiKeyRaw.trim(), model: modelo },
      });

      if (error || !data) {
        setTestResults([{ name: 'Erro de conexao', passed: false, message: String(error ?? 'Sem resposta do servidor') }]);
        setTestOk(false);
      } else {
        const result = data as { success: boolean; tests: TestResult[]; latencyMs: number; model: string };
        setTestResults(result.tests);
        setTestOk(result.success);
      }
    } catch (e) {
      setTestResults([{ name: 'Erro interno', passed: false, message: (e as Error).message }]);
      setTestOk(false);
    } finally {
      setTestando(false);
    }
  };

  // Salvar chave
  const salvarChave = async () => {
    if (!apiKeyRaw.trim()) {
      setMsg({ tipo: 'erro', texto: 'Cole uma chave valida' });
      return;
    }
    if (!testOk) {
      setMsg({ tipo: 'erro', texto: 'Teste a chave antes de salvar' });
      return;
    }

    setSalvando(true);
    setMsg(null);
    const sb = supabase();
    if (!sb) { setSalvando(false); return; }

    try {
      // Desativar chaves anteriores do mesmo provider
      await sb.from('api_keys').update({ ativo: false }).eq('provider', provider).eq('ativo', true);

      const { error } = await sb.from('api_keys').insert({
        provider,
        key_ciphertext: apiKeyRaw.trim(),
        modelo_padrao: modelo,
        ativo: true,
        temperature,
        max_tokens: maxTokens,
        context_window: contextWindow,
        timeout_ms: timeoutMs,
        streaming,
        memoria_contexto: memoriaCtx,
        ultimo_teste_em: new Date().toISOString(),
        ultimo_status: 'online',
        ultimo_teste_latency_ms: testResults?.find((t) => t.latencyMs)?.latencyMs ?? null,
      });

      if (error) throw error;

      setMsg({ tipo: 'ok', texto: `Chave ${provider} salva com sucesso` });
      setApiKeyRaw('');
      setTestResults(null);
      setTestOk(false);
      setMostrarSettings(false);
      void carregar();
    } catch (e) {
      setMsg({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  };

  // Desativar
  const desativar = async (k: ApiKeyConfig) => {
    if (!confirm(`Desativar a chave ${k.provider}?`)) return;
    const sb = supabase();
    if (!sb) return;
    const { error } = await sb.from('api_keys').update({ ativo: false }).eq('id', k.id);
    if (error) setMsg({ tipo: 'erro', texto: error.message });
    else { setMsg({ tipo: 'ok', texto: 'Chave desativada' }); void carregar(); }
  };

  // Reativar
  const reativar = async (k: ApiKeyConfig) => {
    const sb = supabase();
    if (!sb) return;
    // Desativa todas do provider primeiro
    await sb.from('api_keys').update({ ativo: false }).eq('provider', k.provider).eq('ativo', true);
    await sb.from('api_keys').update({ ativo: true }).eq('id', k.id);
    void carregar();
  };

  // Encontrar chave ativa
  const chaveAtiva = keys.find((k) => k.ativo);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">API Keys & IA</h1>
          <p className="mt-1 text-[13px] text-white/50">
            Configure e valide a chave da IA — usuarios finais nunca veem a chave
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 backdrop-blur-sm">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-white/40">Status da IA</div>
            <StatusBadge status={chaveAtiva?.ultimo_status ?? null} />
          </div>
          {chaveAtiva && (
            <div className="h-8 w-px bg-white/10" />
          )}
          {chaveAtiva && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Provedor</div>
              <div className="text-[13px] font-medium capitalize">{chaveAtiva.provider}</div>
            </div>
          )}
        </div>
      </div>

      {/* Card de status se tem chave ativa */}
      {chaveAtiva && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-wider text-white/40">Ultimo teste</div>
            <div className="mt-1 text-[14px] font-semibold">
              {chaveAtiva.ultimo_teste_em
                ? new Date(chaveAtiva.ultimo_teste_em).toLocaleString('pt-BR')
                : 'Nunca'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-wider text-white/40">Latencia media</div>
            <div className="mt-1 text-[14px] font-semibold tabular-nums">
              {chaveAtiva.ultimo_teste_latency_ms != null
                ? `${chaveAtiva.ultimo_teste_latency_ms}ms`
                : '—'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-wider text-white/40">Modelo</div>
            <div className="mt-1 truncate text-[14px] font-semibold">{chaveAtiva.modelo_padrao ?? '—'}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-wider text-white/40">Temperatura</div>
            <div className="mt-1 text-[14px] font-semibold tabular-nums">
              {chaveAtiva.temperature ?? 0.7}
            </div>
          </div>
        </div>
      )}

      {/* Form principal */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
        <h2 className="mb-5 flex items-center gap-2 text-[14px] font-semibold">
          <Plus className="h-4 w-4 text-emerald-400" />
          Cadastrar nova chave
        </h2>

        {/* Provider selector */}
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-white/40">
              Provedor
            </label>
            <div className="flex gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setProvider(p.id); setModelo(p.modelos[0].id); setTestResults(null); setTestOk(false); }}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-center text-[11px] font-medium transition-all',
                    provider === p.id
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20',
                  )}
                >
                  <span className="text-base">{p.logo}</span>
                  {p.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-white/40">
              Modelo
            </label>
            <select
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[13px] outline-none focus:border-cyan-500/50"
            >
              {currentProviderMeta.modelos.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-white/40">
              API Key
            </label>
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
              <input
                type={mostrarKey ? 'text' : 'password'}
                value={apiKeyRaw}
                onChange={(e) => { setApiKeyRaw(e.target.value); setTestResults(null); setTestOk(false); }}
                placeholder={provider === 'azure' ? 'Endpoint key...' : 'sk-...'}
                className="flex-1 bg-transparent px-1 py-1 font-mono text-[12px] outline-none placeholder:text-white/30"
              />
              <button onClick={() => setMostrarKey(!mostrarKey)} className="rounded p-1 text-white/40 hover:text-white">
                {mostrarKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              {apiKeyRaw && (
                <button onClick={() => { navigator.clipboard.writeText(apiKeyRaw); }} className="rounded p-1 text-white/40 hover:text-white">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-white/40">
              Acoes
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => { if (apiKeyRaw) void testarChave(); }}
                disabled={!apiKeyRaw.trim() || testando}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[12px] font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
              >
                {testando ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                Testar
              </button>
              <button
                onClick={() => void salvarChave()}
                disabled={salvando || !testOk}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-3 py-2.5 text-[12px] font-semibold text-white hover:brightness-110 disabled:opacity-40"
              >
                {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Salvar
              </button>
            </div>
          </div>
        </div>

        {/* Botao settings */}
        <button
          onClick={() => setMostrarSettings(!mostrarSettings)}
          className="mb-3 flex items-center gap-2 text-[12px] text-white/40 hover:text-white/70"
        >
          <Settings className="h-3.5 w-3.5" />
          Configuracoes globais
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', mostrarSettings && 'rotate-180')} />
        </button>

        {/* Settings expandidos */}
        <AnimatePresence>
          {mostrarSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="grid gap-2 pb-3 md:grid-cols-2">
                <ConfigRow icon={Activity} label="Temperatura" description="Criatividade das respostas (0=exato, 1=balanceado, 2=criativo)">
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      className="w-20 accent-emerald-400"
                    />
                    <span className="w-8 text-right text-[12px] tabular-nums text-white/60">{temperature}</span>
                  </div>
                </ConfigRow>

                <ConfigRow icon={Hash} label="Maximo de tokens" description="Limite de resposta">
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[12px] tabular-nums outline-none"
                  />
                </ConfigRow>

                <ConfigRow icon={MessageSquare} label="Janela de contexto" description="Tokens de contexto aceitos">
                  <input
                    type="number"
                    value={contextWindow}
                    onChange={(e) => setContextWindow(Number(e.target.value))}
                    className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[12px] tabular-nums outline-none"
                  />
                </ConfigRow>

                <ConfigRow icon={Clock} label="Timeout" description="Tempo maximo de resposta (ms)">
                  <input
                    type="number"
                    value={timeoutMs}
                    onChange={(e) => setTimeoutMs(Number(e.target.value))}
                    className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[12px] tabular-nums outline-none"
                  />
                </ConfigRow>

                <ConfigRow icon={Wifi} label="Streaming" description="Respostas em tempo real">
                  <button
                    onClick={() => setStreaming(!streaming)}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      streaming ? 'bg-emerald-500' : 'bg-white/20',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                        streaming ? 'translate-x-5' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </ConfigRow>

                <ConfigRow icon={TrendingUp} label="Memoria de contexto" description="Mensagens anteriores incluidas">
                  <select
                    value={memoriaCtx}
                    onChange={(e) => setMemoriaCtx(e.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[12px] outline-none"
                  >
                    <option value="0">Desativada</option>
                    <option value="5">5 mensagens</option>
                    <option value="10">10 mensagens (padrao)</option>
                    <option value="20">20 mensagens</option>
                    <option value="50">50 mensagens</option>
                  </select>
                </ConfigRow>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Test results */}
        <AnimatePresence>
          {testResults && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 space-y-2"
            >
              {/* Header do resultado */}
              <div className="flex items-center gap-2">
                {testOk ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <span className={cn('text-[13px] font-semibold', testOk ? 'text-emerald-300' : 'text-red-300')}>
                  {testOk ? 'Chave validada com sucesso' : 'Falha na validacao'}
                </span>
                {testResults.find((t) => t.latencyMs) && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/50">
                    {testResults.find((t) => t.latencyMs)?.latencyMs}ms
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {testResults.map((r, i) => <TestRow key={i} result={r} />)}
              </div>
              {testOk && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[12px] text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                  Todos os testes concluidos. Pronta para utilizacao.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mensagem de status */}
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'mt-3 flex items-start gap-2 rounded-xl p-3 text-[12.5px]',
              msg.tipo === 'ok'
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border border-red-500/30 bg-red-500/10 text-red-200',
            )}
          >
            {msg.tipo === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
            {msg.texto}
          </motion.div>
        )}
      </div>

      {/* Lista de chaves */}
      <div>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">
          Chaves cadastradas ({keys.length})
        </h2>
        {carregando ? (
          <div className="flex h-32 items-center justify-center text-white/50">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : erro ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-[12.5px] text-red-200">{erro}</div>
        ) : keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-8 text-center text-[13px] text-white/40">
            Nenhuma chave cadastrada
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <motion.div
                key={k.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'overflow-hidden rounded-2xl border backdrop-blur-sm transition-all',
                  k.ativo
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-white/10 bg-white/[0.02] opacity-60',
                )}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Badge provider */}
                  <div className={cn(
                    'flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-2xl',
                    k.ativo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/40',
                  )}>
                    <span className="text-lg">{PROVIDERS.find((p) => p.id === k.provider)?.logo ?? '🤖'}</span>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold capitalize">{k.provider}</span>
                      {k.ativo ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                          ATIVO
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/40">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11.5px] text-white/40">
                      <span className="font-mono">{maskKey(k.key_ciphertext ?? '')}</span>
                      {k.modelo_padrao && <span>Modelo: {k.modelo_padrao}</span>}
                      {k.temperature != null && <span>Temp: {k.temperature}</span>}
                      {k.ultimo_teste_em && (
                        <span>Testado: {new Date(k.ultimo_teste_em).toLocaleDateString('pt-BR')}</span>
                      )}
                      {k.ultimo_teste_latency_ms != null && (
                        <span>{k.ultimo_teste_latency_ms}ms</span>
                      )}
                    </div>
                  </div>

                  {/* Acoes */}
                  <div className="flex items-center gap-2">
                    {!k.ativo && (
                      <button
                        onClick={() => void reativar(k)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/25"
                      >
                        <RefreshCw className="h-3 w-3" /> Reativar
                      </button>
                    )}
                    {k.ativo && (
                      <button
                        onClick={() => void desativar(k)}
                        className="rounded-lg p-2 text-white/40 hover:bg-red-500/20 hover:text-red-400"
                        aria-label="Desativar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Configs expandidas */}
                <div className="border-t border-white/5 bg-white/[0.01] px-4 py-3">
                  <div className="flex flex-wrap gap-4 text-[11px] text-white/40">
                    <span>Max tokens: <span className="text-white/60">{k.max_tokens ?? 2500}</span></span>
                    <span>Timeout: <span className="text-white/60">{k.timeout_ms ?? 60000}ms</span></span>
                    <span>Contexto: <span className="text-white/60">{k.context_window ?? 128000}</span></span>
                    <span>Streaming: <span className="text-white/60">{k.streaming !== false ? 'Sim' : 'Nao'}</span></span>
                    <span>Memoria: <span className="text-white/60">{k.memoria_contexto ?? 10} msgs</span></span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="flex items-start gap-2">
          <Cpu className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-300" />
          <div className="text-[12px] text-cyan-100">
            <strong className="font-semibold">Arquitetura de seguranca:</strong> as chaves sao armazenadas no banco
            Supabase e lidas exclusivamente pela Edge Function <code className="rounded bg-black/30 px-1">ai-chat</code>.
            A chave <strong>nunca</strong> aparece no client. Usuarios finais usam o Assistente Ministerial sem
            configurar nada.
          </div>
        </div>
      </div>
    </div>
  );
}
