import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, Eye, EyeOff, Copy, CheckCircle2, XCircle, AlertCircle,
  Loader2, Cpu, Wifi, WifiOff, Activity, Plus, Trash2, Settings,
  ChevronDown, RefreshCw, Zap, Clock, TrendingUp, Hash, MessageSquare,
  X, Save, Play, Pause, RotateCcw, GitBranch, History, BarChart3,
  Sliders, Brain, Database, Shield, FileText, Zap as ZapIcon,
  Globe, ScrollText, Eye as EyeIcon, Beaker,
} from 'lucide-react';
import { supabase, callEdgeFunction } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface TestResult { name: string; passed: boolean; message: string; latencyMs?: number; }

interface ApiKeyConfig {
  id: string; provider: string; key_ciphertext?: string;
  modelo_padrao: string | null; ativo: boolean;
  temperature: number | null; max_tokens: number | null;
  context_window: number | null; timeout_ms: number | null;
  streaming: boolean | null; memoria_contexto: string | null;
  ultimo_teste_em: string | null; ultimo_status: string | null;
  ultimo_teste_latency_ms: number | null; criado_em: string; atualizado_em: string;
  // Rodízio automático (migração 20260705)
  apelido?: string | null;
  ultimo_uso_em?: string | null;
  req_count?: number | null;
  erro_count?: number | null;
  cooldown_ate?: string | null;
  desativado_em?: string | null;
  motivo_desativacao?: string | null;
}

interface ProviderMeta { id: string; label: string; logo: string; modelos: { id: string; label: string }[]; docsUrl: string; }

interface IAAgent {
  id: string; nome: string; slug: string; descricao: string | null;
  objetivo: string | null; especialidade: string | null;
  icon: string; cor: string; ativo: boolean;
  prompt_sistema: string | null; temperatura: number; modelo: string | null;
  max_tokens: number; contexto_max_tokens: number;
  ferramentas: string[] | null; memoria_tipo: string;
  versao: number; stats_uso: number; stats_tokens: number;
  admin_responsavel: string | null;
  criado_em: string; atualizado_em: string; ultima_uso_em: string | null;
}

interface AgentVersion {
  id: string; agent_id: string; versao: number; prompt_sistema: string;
  temperatura: number | null; modelo: string | null; max_tokens: number | null;
  changelog: string | null; criada_por: string | null; criado_em: string;
}

interface AgentLog {
  id: string; agent_id: string; user_id: string | null;
  mensagem: string; resposta: string | null;
  tokens_input: number | null; tokens_output: number | null;
  duracao_ms: number | null; custo_usd: number | null;
  modelo: string | null; ferramentas_usadas: string[] | null;
  sucesso: boolean; erro: string | null; criado_em: string;
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'apikeys',    label: 'API Keys',        icon: KeyRound },
  { id: 'modelos',    label: 'Modelos',          icon: Cpu },
  { id: 'agentes',    label: 'Agentes IA',       icon: Brain },
  { id: 'prompt',     label: 'Prompt Global',    icon: MessageSquare },
  { id: 'ferramentas',label: 'Ferramentas',      icon: ZapIcon },
  { id: 'limites',    label: 'Limites',          icon: Shield },
  { id: 'logs',       label: 'Logs',             icon: ScrollText },
  { id: 'testes',     label: 'Testes',           icon: Beaker },
  { id: 'stats',      label: 'Estatísticas',     icon: BarChart3 },
];

const PROVIDERS: ProviderMeta[] = [
  { id: 'groq',      label: 'Groq (grátis)',   logo: '⚡', modelos: [{ id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' }, { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' }], docsUrl: 'https://console.groq.com/keys' },
  { id: 'openai',    label: 'OpenAI',          logo: '🤖', modelos: [{ id: 'gpt-4o', label: 'GPT-4o' }, { id: 'gpt-4o-mini', label: 'GPT-4o Mini' }, { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' }, { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }], docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', label: 'Anthropic Claude',logo: '🧠', modelos: [{ id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' }, { id: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku' }, { id: 'claude-3-opus', label: 'Claude 3 Opus' }], docsUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'google',    label: 'Google Gemini',   logo: '💎', modelos: [{ id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }, { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }, { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }], docsUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'azure',     label: 'Azure OpenAI',    logo: '☁️', modelos: [{ id: 'gpt-4o', label: 'GPT-4o' }, { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' }], docsUrl: 'https://portal.azure.com' },
];

const MEMORIA_TIPOS = [
  { id: 'sermon',    label: 'Pregação',      icon: '🗣️' },
  { id: 'study',     label: 'Estudos',        icon: '📖' },
  { id: 'prayer',    label: 'Oração',         icon: '🙏' },
  { id: 'biblical',  label: 'Bíblico',         icon: '✝️' },
  { id: 'general',   label: 'Geral',           icon: '💬' },
];

const ICONES = ['🤖','🗣️','📖','🙏','✝️','💬','🎓','🔍','📝','💡','🌟','⚡','🎯','📚','🧩'];
const CORES = ['#7c3aed','#0891b2','#059669','#dc2626','#d97706','#db2777','#4f46e5','#0891b2'];

// ─── Subcomponentes ─────────────────────────────────────────────────────────

function TabPill({ id, active, onClick, icon: Icon, label }: {
  id: string; active: boolean; onClick: (id: string) => void;
  icon: React.ElementType; label: string;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-all',
        active ? 'bg-ink-900 text-white shadow-sm' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-ink-200 bg-white shadow-soft dark:border-ink-700 dark:bg-ink-900', className)}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-[13px] font-semibold text-ink-900 dark:text-white">{children}</h2>;
}

// Status de rodízio de uma chave: ativa / em pausa / desativada.
function statusChave(c: ApiKeyConfig): { label: string; cls: string } {
  const emPausa = c.cooldown_ate && new Date(c.cooldown_ate).getTime() > Date.now();
  if (!c.ativo) {
    return { label: 'desativada', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
  }
  if (emPausa) {
    const min = Math.max(1, Math.round((new Date(c.cooldown_ate!).getTime() - Date.now()) / 60000));
    const rotulo = c.motivo_desativacao === 'quota' ? `cota — volta em ${min}min` : `pausada ${min}min`;
    return { label: rotulo, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
  }
  return { label: 'ativa', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
      ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300'
    )}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

// ─── Seção: API Keys ────────────────────────────────────────────────────────

function ApiKeysSection() {
  const [configs, setConfigs] = useState<ApiKeyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testando, setTestando] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testOk, setTestOk] = useState(false);
  const [mostrarChave, setMostrarChave] = useState<string | null>(null);

  // Editing state
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);

  // Form state
  const [provider, setProvider] = useState('openai');
  const [modelo, setModelo] = useState('gpt-4o-mini');
  const [apiKeyRaw, setApiKeyRaw] = useState('');
  const [temp, setTemp] = useState(0.7);
  const [maxTok, setMaxTok] = useState(2048);
  const [timeoutMs, setTimeoutMs] = useState(60000);
  const [ctxWin, setCtxWin] = useState(128000);
  const [streaming, setStreaming] = useState(true);
  const [memoria, setMemoria] = useState('sermon');

  // Cadastro em massa (rodízio): colar várias chaves, uma por linha
  const [bulkKeys, setBulkKeys] = useState('');
  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function editarKey(c: ApiKeyConfig) {
    setEditingKeyId(c.id);
    setProvider(c.provider);
    setModelo(c.modelo_padrao ?? PROVIDERS.find(p => p.id === c.provider)?.modelos[0].id ?? 'gpt-4o-mini');
    setApiKeyRaw(c.key_ciphertext ?? '');
    setTemp(c.temperature ?? 0.7);
    setMaxTok(c.max_tokens ?? 2048);
    setTimeoutMs(c.timeout_ms ?? 60000);
    setCtxWin(c.context_window ?? 128000);
    setStreaming(c.streaming ?? true);
    setMemoria(c.memoria_contexto ?? 'sermon');
    setTestResults([]);
    setTestOk(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Cadastra várias chaves de uma vez (uma por linha) — todas ativas no rodízio.
  async function cadastrarEmMassa() {
    const linhas = Array.from(new Set(
      bulkKeys.split('\n').map((l) => l.trim()).filter(Boolean),
    ));
    if (linhas.length === 0) {
      setBulkMsg({ ok: false, text: 'Cole ao menos uma chave (uma por linha).' });
      return;
    }
    // Ignora chaves que já existem no banco
    const existentes = new Set(configs.map((c) => c.key_ciphertext).filter(Boolean));
    const novas = linhas.filter((k) => !existentes.has(k));
    if (novas.length === 0) {
      setBulkMsg({ ok: false, text: 'Todas essas chaves já estão cadastradas.' });
      return;
    }
    setBulkAdding(true);
    setBulkMsg(null);
    try {
      const sb = supabase();
      const agora = new Date().toISOString();
      const rows = novas.map((k) => ({
        provider,
        key_ciphertext: k,
        modelo_padrao: modelo,
        ativo: true,
        temperature: temp,
        max_tokens: maxTok,
        timeout_ms: timeoutMs,
        context_window: ctxWin,
        streaming,
        memoria_contexto: memoria,
        criado_em: agora,
      }));
      const { error } = await sb!.from('api_keys').insert(rows);
      if (error) throw error;
      const puladas = linhas.length - novas.length;
      setBulkMsg({ ok: true, text: `✅ ${novas.length} chave(s) adicionada(s) ao rodízio${puladas ? ` · ${puladas} já existia(m)` : ''}.` });
      setBulkKeys('');
      await carregar();
    } catch (e) {
      setBulkMsg({ ok: false, text: `❌ ${(e as Error).message ?? String(e)}` });
    } finally {
      setBulkAdding(false);
    }
  }

  // Reativa todas as chaves pausadas/desativadas (volta pro rodízio).
  async function reativarTodas() {
    const sb = supabase();
    const { error } = await sb!.from('api_keys').update({
      ativo: true,
      cooldown_ate: null,
      desativado_em: null,
      motivo_desativacao: null,
      atualizado_em: new Date().toISOString(),
    }).neq('id', '00000000-0000-0000-0000-000000000000'); // todas
    if (error) {
      setBulkMsg({ ok: false, text: `❌ ${error.message}` });
      return;
    }
    setBulkMsg({ ok: true, text: '✅ Todas as chaves foram reativadas.' });
    await carregar();
  }

  async function excluirKey(c: ApiKeyConfig) {
    if (!confirm(`Excluir a chave ${PROVIDERS.find(p => p.id === c.provider)?.label}?`)) return;
    const sb = supabase();
    await sb!.from('api_keys').delete().eq('id', c.id);
    if (editingKeyId === c.id) {
      setEditingKeyId(null);
      void resetForm();
    }
    await carregar();
  }

  function resetForm() {
    setEditingKeyId(null);
    setProvider('openai');
    setModelo('gpt-4o-mini');
    setApiKeyRaw('');
    setTemp(0.7);
    setMaxTok(2048);
    setTimeoutMs(60000);
    setCtxWin(128000);
    setStreaming(true);
    setMemoria('sermon');
    setTestResults([]);
    setTestOk(false);
  }

  const provMeta = PROVIDERS.find(p => p.id === provider)!;

  useEffect(() => { void carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const sb = supabase();
    const { data } = await sb!.from('api_keys').select('*').order('criado_em');
    setConfigs(data ?? []);
    if (data?.length) {
      const c = data[0];
      setProvider(c.provider);
      setModelo(c.modelo_padrao ?? 'gpt-4o-mini');
      setTemp(c.temperature ?? 0.7);
      setMaxTok(c.max_tokens ?? 2048);
      setTimeoutMs(c.timeout_ms ?? 60000);
      setCtxWin(c.context_window ?? 128000);
      setStreaming(c.streaming ?? true);
      setMemoria(c.memoria_contexto ?? 'sermon');
    }
    setLoading(false);
  }

  async function testarChave() {
    setTestando(true);
    setTestResults([]);
    setTestOk(false);

    try {
      const { data, error } = await callEdgeFunction<{ success: boolean; tests: TestResult[] }>(
        'test-key',
        { provider, apiKey: apiKeyRaw.trim(), model: modelo },
      );

      if (data && Array.isArray(data.tests)) {
        setTestResults(data.tests);
        setTestOk(data.success);
        return;
      }

      const msg = error?.message ?? 'Erro desconhecido';
      const status = error?.status ?? 0;

      if (status === 429) {
        setTestResults([{ name: `HTTP 429`, passed: false, message: `💳 Sem crédito na conta ${provider}. Adicione saldo em platform.openai.com → Billing.` }]);
      } else if (status === 401) {
        setTestResults([{ name: 'HTTP 401', passed: false, message: `🔑 Chave inválida ou expirada.` }]);
      } else if (status === 403) {
        setTestResults([{ name: 'HTTP 403', passed: false, message: `⛔ Sem permissão para este modelo.` }]);
      } else if (status >= 400) {
        setTestResults([{ name: `HTTP ${status}`, passed: false, message: msg }]);
      } else {
        setTestResults([{ name: 'Falha de rede', passed: false, message: `🌐 Não foi possível conectar. Detalhes: ${msg}\n\nVerifique: proxy/firewall/extensões bloqueadoras.` }]);
      }
      setTestOk(false);
    } catch (e) {
      setTestResults([{ name: 'Erro interno', passed: false, message: (e as Error).message }]);
    } finally {
      setTestando(false);
    }
  }

  async function salvar() {
    if (!apiKeyRaw.trim()) {
      setTestResults([{ name: 'Validação', passed: false, message: 'Digite a API Key antes de salvar.' }]);
      return;
    }
    setSaving(true);

    // Auto-testar antes de salvar
    setTestando(true);
    setTestResults([]);
    let testPassed = false;
    try {
      const { data, error } = await callEdgeFunction<{ success: boolean; tests: TestResult[] }>(
        'test-key',
        { provider, apiKey: apiKeyRaw.trim(), model: modelo },
      );
      if (data && Array.isArray(data.tests)) {
        setTestResults(data.tests);
        setTestOk(data.success);
        if (!data.success) {
          setTestando(false);
          setSaving(false);
          return;
        }
        testPassed = true;
      } else if (error) {
        const msg = error.message ?? 'Erro desconhecido';
        setTestResults([{ name: 'Teste falhou', passed: false, message: msg }]);
        setTestOk(false);
        setTestando(false);
        setSaving(false);
        return;
      }
    } catch (e) {
      setTestResults([{ name: 'Erro no teste', passed: false, message: (e as Error).message }]);
      setTestOk(false);
      setTestando(false);
      setSaving(false);
      return;
    }
    setTestando(false);

    const sb = supabase();
    const latencyMs = testResults.find(t => t.latencyMs)?.latencyMs ?? null;
    const payload = {
      provider,
      key_ciphertext: apiKeyRaw.trim(),
      modelo_padrao: modelo,
      ativo: true,
      temperature: temp,
      max_tokens: maxTok,
      timeout_ms: timeoutMs,
      context_window: ctxWin,
      streaming,
      memoria_contexto: memoria,
      ultimo_teste_em: new Date().toISOString(),
      ultimo_status: 'online',
      ultimo_teste_latency_ms: latencyMs,
    };

    try {
      // Modo edição: atualiza direto
      if (editingKeyId) {
        const { error } = await sb!.from('api_keys').update({ ...payload, atualizado_em: new Date().toISOString() }).eq('id', editingKeyId);
        if (error) throw error;
        setTestResults(prev => [...prev, { name: 'Salvar', passed: true, message: `✅ Chave editada e salva com sucesso!` }]);
        resetForm();
      } else {
        // Modo novo: só INSERE como ativa. Não desativa as outras — o rodízio
        // usa TODAS as chaves ativas, então cada chave nova soma à rotação.
        const { error } = await sb!.from('api_keys').insert({ ...payload, criado_em: new Date().toISOString() });
        if (error) throw error;
        setTestResults(prev => [...prev, { name: 'Salvar', passed: true, message: `✅ Chave ${provider} adicionada ao rodízio!` }]);
        setApiKeyRaw('');
      }
      await carregar();
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      setTestResults(prev => [...prev, { name: 'Erro ao salvar', passed: false, message: `❌ ${msg}` }]);
    } finally {
      setSaving(false);
    }
  }

  async function excluir(id: string, provLabel: string) {
    if (!confirm(`Excluir chave ${provLabel}? Esta ação não pode ser desfeita.`)) return;
    const sb = supabase();
    const { error } = await sb!.from('api_keys').delete().eq('id', id);
    if (error) {
      setTestResults([{ name: 'Erro ao excluir', passed: false, message: `❌ ${error.message}` }]);
      return;
    }
    if (editingKeyId === id) resetForm();
    await carregar();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink-300" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionTitle>
          {editingKeyId ? `✏️ Editando: ${PROVIDERS.find(p => p.id === provider)?.label}` : 'Configurar Provedor de IA'}
        </SectionTitle>
        {editingKeyId && (
          <button onClick={resetForm} className="flex items-center gap-1 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-[12px] font-medium text-ink-600 hover:bg-ink-50">
            <X className="h-3.5 w-3.5" /> Cancelar edição
          </button>
        )}
      </div>
      <Card className="p-4">
        <div className="mb-4 grid grid-cols-4 gap-2">
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => { setProvider(p.id); setModelo(p.modelos[0].id); }}
              className={cn('flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all', provider === p.id ? 'border-ink-900 bg-ink-50' : 'border-ink-200 bg-white hover:border-ink-300')}>
              <span className="text-2xl">{p.logo}</span>
              <span className="text-[11px] font-semibold text-ink-800 dark:text-white">{p.label}</span>
            </button>
          ))}
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Modelo</label>
          <select value={modelo} onChange={e => setModelo(e.target.value)}
            className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13px] text-ink-900 focus:border-ink-900 focus:outline-none">
            {provMeta.modelos.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">API Key</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type={mostrarChave === provider ? 'text' : 'password'} value={apiKeyRaw}
                onChange={e => setApiKeyRaw(e.target.value)}
                placeholder="sk-..."
                style={{ WebkitTextFillColor: '#18181b', colorScheme: 'light' }}
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 pr-10 text-[13px] font-mono text-ink-900 placeholder-ink-300 focus:border-ink-900 focus:outline-none" />
              <button onClick={() => setMostrarChave(mostrarChave === provider ? null : provider)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
                {mostrarChave === provider ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="mt-1 text-[10.5px] text-ink-500">
            <a href={provMeta.docsUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-1">Ver docs {provMeta.label} →</a>
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Temperatura: {temp}</label>
            <input type="range" min="0" max="1" step="0.05" value={temp} onChange={e => setTemp(Number(e.target.value))}
              className="w-full accent-ink-900" />
            <p className="mt-0.5 text-[10px] text-ink-400 dark:text-ink-500">0 = preciso | 1 = criativo</p>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Máx Tokens: {maxTok}</label>
            <input type="range" min="256" max="8192" step="256" value={maxTok} onChange={e => setMaxTok(Number(e.target.value))}
              className="w-full accent-ink-900" />
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Memória Contextual</label>
          <div className="flex flex-wrap gap-2">
            {MEMORIA_TIPOS.map(m => (
              <button key={m.id} onClick={() => setMemoria(m.id)}
                className={cn('rounded-full px-3 py-1 text-[11.5px] font-medium transition-all', memoria === m.id ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200')}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-ink-700 dark:text-ink-300">
            <input type="checkbox" checked={streaming} onChange={e => setStreaming(e.target.checked)} className="accent-ink-900" />
            Streaming (resposta em tempo real)
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => void salvar()} disabled={saving || testando || !apiKeyRaw.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-ink-900 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
            {(saving || testando) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Beaker className="h-3.5 w-3.5" />}
            {saving ? 'Salvando…' : testando ? 'Testando e salvando…' : editingKeyId ? '🔄 Testar e Atualizar' : '🧪 Testar e Salvar'}
          </button>
          {editingKeyId && (
            <button onClick={() => void excluir(editingKeyId, PROVIDERS.find(p => p.id === provider)?.label ?? provider)}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-[12.5px] font-medium text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          )}
        </div>

        {testResults.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {testResults.map((r, i) => (
              <div key={i} className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-[11.5px]', r.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800')}>
                {r.passed ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-600" />}
                <span className="font-medium">{r.name}</span>
                <span className="text-ink-500">— {r.message}</span>
                {r.latencyMs && <span className="ml-auto font-mono text-[10px]">{r.latencyMs}ms</span>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Cadastro em massa — rodízio */}
      <Card className="p-4">
        <div className="mb-1 flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-[13.5px] font-semibold text-ink-900 dark:text-white">Cadastro em massa (rodízio)</h3>
        </div>
        <p className="mb-3 text-[11.5px] text-ink-500 dark:text-ink-400">
          Cole várias chaves <strong>{provMeta.label}</strong> (uma por linha). Todas entram ativas no rodízio,
          usando o modelo <strong>{modelo}</strong> selecionado acima. O sistema alterna entre elas
          automaticamente e pausa/desativa a que atingir limite.
        </p>
        <textarea
          value={bulkKeys}
          onChange={(e) => setBulkKeys(e.target.value)}
          placeholder={"gsk_xxxxxxxx...\ngsk_yyyyyyyy...\ngsk_zzzzzzzz..."}
          rows={5}
          className="w-full resize-y rounded-xl border border-ink-200 bg-white px-3 py-2 font-mono text-[12px] text-ink-900 outline-none focus:border-indigo-400 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-ink-400">
            {bulkKeys.split('\n').map((l) => l.trim()).filter(Boolean).length} chave(s) coladas
          </span>
          <button
            onClick={() => void cadastrarEmMassa()}
            disabled={bulkAdding}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-indigo-500 active:scale-95 disabled:opacity-60"
          >
            {bulkAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {bulkAdding ? 'Cadastrando…' : 'Cadastrar todas'}
          </button>
        </div>
        {bulkMsg && (
          <div className={cn('mt-2 rounded-xl px-3 py-2 text-[11.5px]', bulkMsg.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300')}>
            {bulkMsg.text}
          </div>
        )}
      </Card>

      {/* Keys cadastradas */}
      {configs.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <SectionTitle>Keys Cadastradas ({configs.length})</SectionTitle>
            <button
              onClick={() => void reativarTodas()}
              className="mb-2 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-transparent dark:text-emerald-400"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reativar todas
            </button>
          </div>
          <div className="space-y-2">
            {configs.map(c => {
              const prov = PROVIDERS.find(p => p.id === c.provider);
              const st = statusChave(c);
              return (
                <Card key={c.id} className="flex items-center gap-3 p-3">
                  <span className="text-2xl">{prov?.logo}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-900 dark:text-white">
                      {prov?.label}
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide', st.cls)}>{st.label}</span>
                    </div>
                    <div className="truncate text-[11px] text-ink-500 dark:text-ink-400">
                      {c.modelo_padrao} · {c.key_ciphertext ? `${c.key_ciphertext.slice(0, 6)}…${c.key_ciphertext.slice(-4)}` : 'sem chave'}
                      {typeof c.req_count === 'number' && c.req_count > 0 ? ` · ${c.req_count} usos` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.ultimo_status && <StatusBadge ok={c.ultimo_status === 'online'} label={c.ultimo_status === 'online' ? 'Online' : 'Offline'} />}
                    {c.ultimo_teste_latency_ms && <span className="text-[10.5px] font-mono text-ink-400 dark:text-ink-500">{c.ultimo_teste_latency_ms}ms</span>}
                    <button
                      onClick={() => editarKey(c)}
                      title="Editar chave"
                      className={cn('flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all', editingKeyId === c.id ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800')}
                    >
                      <Settings className="h-3 w-3" /> Editar
                    </button>
                    <button
                      onClick={() => void excluir(c.id, prov?.label ?? c.provider)}
                      title="Excluir chave"
                      className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-red-900/30 dark:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="mt-2 text-[10.5px] text-ink-500 dark:text-ink-400">
            💡 <strong>Como funciona:</strong> ao salvar, o sistema desativa automaticamente outras chaves do mesmo provedor e ativa a nova.
            Cada provedor pode ter apenas <strong>1 chave ativa</strong> por vez (constraint do banco).
          </p>
        </>
      )}
    </div>
  );
}

// ─── Seção: Agentes IA ──────────────────────────────────────────────────────

function AgentesSection() {
  const [agents, setAgents] = useState<IAAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'list' | 'form' | 'test'>('list');
  const [editAgent, setEditAgent] = useState<IAAgent | null>(null);
  const [testAgent, setTestAgent] = useState<IAAgent | null>(null);

  // Form state
  const [form, setForm] = useState({
    nome: '', slug: '', descricao: '', objetivo: '', especialidade: '',
    icon: '🤖', cor: '#7c3aed', ativo: true,
    prompt_sistema: '', temperatura: 0.7, modelo: 'gpt-4o-mini',
    max_tokens: 2048, contexto_max_tokens: 128000,
    memoria_tipo: 'sermon', ferramentas: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [showSlug, setShowSlug] = useState(false);

  useEffect(() => { void carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const sb = supabase();
    const { data } = await sb!.from('ia_agents').select('*').order('criado_em');
    setAgents(data ?? []);
    setLoading(false);
  }

  function novo() {
    setEditAgent(null);
    setForm({ nome: '', slug: '', descricao: '', objetivo: '', especialidade: '',
      icon: '🤖', cor: '#7c3aed', ativo: true,
      prompt_sistema: '', temperatura: 0.7, modelo: 'gpt-4o-mini',
      max_tokens: 2048, contexto_max_tokens: 128000,
      memoria_tipo: 'sermon', ferramentas: [] });
    setTab('form');
  }

  function editar(a: IAAgent) {
    setEditAgent(a);
    setForm({
      nome: a.nome, slug: a.slug, descricao: a.descricao ?? '', objetivo: a.objetivo ?? '',
      especialidade: a.especialidade ?? '', icon: a.icon, cor: a.cor, ativo: a.ativo,
      prompt_sistema: a.prompt_sistema ?? '', temperatura: a.temperatura,
      modelo: a.modelo ?? 'gpt-4o-mini', max_tokens: a.max_tokens,
      contexto_max_tokens: a.contexto_max_tokens, memoria_tipo: a.memoria_tipo,
      ferramentas: a.ferramentas ?? [],
    });
    setTab('form');
  }

  async function salvar() {
    setSaving(true);
    const sb = supabase();
    const payload = {
      ...form,
      stats_uso: editAgent?.stats_uso ?? 0,
      stats_tokens: editAgent?.stats_tokens ?? 0,
      versao: (editAgent?.versao ?? 0) + 1,
    };
    if (editAgent) {
      await sb!.from('ia_agents').update({ ...payload, atualizado_em: new Date().toISOString() }).eq('id', editAgent.id);
    } else {
      await sb!.from('ia_agents').insert(payload);
    }
    await carregar();
    setSaving(false);
    setTab('list');
  }

  async function duplicar(a: IAAgent) {
    const sb = supabase();
    await sb!.from('ia_agents').insert({
      nome: `${a.nome} (cópia)`,
      slug: `${a.slug}-copy-${Date.now()}`,
      descricao: a.descricao, objetivo: a.objetivo, especialidade: a.especialidade,
      icon: a.icon, cor: a.cor, ativo: false,
      prompt_sistema: a.prompt_sistema, temperatura: a.temperatura,
      modelo: a.modelo, max_tokens: a.max_tokens,
      contexto_max_tokens: a.contexto_max_tokens, memoria_tipo: a.memoria_tipo,
      ferramentas: a.ferramentas, versao: 1,
    });
    await carregar();
  }

  async function toggleAtivo(a: IAAgent) {
    const sb = supabase();
    await sb!.from('ia_agents').update({ ativo: !a.ativo, atualizado_em: new Date().toISOString() }).eq('id', a.id);
    await carregar();
  }

  async function excluir(id: string) {
    if (!confirm('Excluir agente? Esta ação não pode ser desfeita.')) return;
    const sb = supabase();
    await sb!.from('ia_agents').delete().eq('id', id);
    await carregar();
  }

  async function testarAgente() {
    if (!testAgent || !testInput.trim()) return;
    setTestLoading(true);
    setTestOutput('');
    const sb = supabase();
    try {
      const { data, error } = await sb!.functions.invoke('ai-chat', {
        body: { mensagem: testInput, agente_id: testAgent.id, modo: 'test' },
      });
      if (error) {
        const e: any = error;
        const status = e?.context?.status;
        const bodyMsg = e?.context?.body?.message ?? e?.message ?? String(error);
        let detail = bodyMsg || `HTTP ${status ?? '?'}`;

        if (String(bodyMsg).match(/quota|credit balance|insufficient/i) || status === 429) {
          detail = `💳 Sem crédito na conta. Adicione saldo no provedor (Anthropic: console.anthropic.com → Plans & Billing | OpenAI: platform.openai.com → Billing).`;
        } else if (String(bodyMsg).includes('invalid_token') || status === 401) {
          detail = `🔑 Token inválido. Faça logout e login novamente.`;
        } else if (String(bodyMsg).match(/Failed to send|FetchError|network/i) || !status) {
          detail = `🌐 Falha de conexão. Verifique sua internet e tente novamente.`;
        } else {
          detail = `❌ ${bodyMsg}`;
        }
        throw new Error(detail);
      }
      setTestOutput(JSON.stringify(data, null, 2));
    } catch (e) {
      setTestOutput(`Erro: ${(e as Error).message}`);
    } finally {
      setTestLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink-300" /></div>;

  // LIST
  if (tab === 'list') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Agentes IA</SectionTitle>
        <button onClick={novo} className="flex items-center gap-1.5 rounded-xl bg-ink-900 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-ink-800">
          <Plus className="h-3.5 w-3.5" /> Novo Agente
        </button>
      </div>

      {agents.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Brain className="h-10 w-10 text-ink-200" />
          <p className="text-[13px] text-ink-500">Nenhum agente criado ainda.</p>
          <p className="text-[11.5px] text-ink-400">Clique em "Novo Agente" para começar.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {agents.map(a => (
            <Card key={a.id} className="p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: a.cor + '20' }}>
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-semibold text-ink-900">{a.nome}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', a.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-400')}>
                      {a.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-ink-500">{a.especialidade}</p>
                </div>
              </div>
              <p className="mb-3 line-clamp-2 text-[11.5px] text-ink-600">{a.descricao}</p>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] text-ink-500">v{a.versao}</span>
                <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] text-ink-500">{a.modelo}</span>
                <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] text-ink-500">🗣️ {a.stats_uso}x usado</span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => { setTestAgent(a); setTab('test'); }} className="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[11px] text-ink-700 hover:bg-ink-50">
                  <Play className="h-3 w-3" /> Testar
                </button>
                <button onClick={() => editar(a)} className="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[11px] text-ink-700 hover:bg-ink-50">
                  <Settings className="h-3 w-3" /> Editar
                </button>
                <button onClick={() => duplicar(a)} className="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[11px] text-ink-700 hover:bg-ink-50">
                  <Copy className="h-3 w-3" /> Duplicar
                </button>
                <button onClick={() => toggleAtivo(a)} className={cn('flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] hover:bg-ink-50', a.ativo ? 'border-red-200 text-red-700' : 'border-emerald-200 text-emerald-700')}>
                  {a.ativo ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {a.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button onClick={() => excluir(a.id)} className="ml-auto flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] text-red-700 hover:bg-red-50">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // FORM
  if (tab === 'form') return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setTab('list')} className="flex items-center gap-1 text-[12px] text-ink-500 hover:text-ink-800">
          <X className="h-4 w-4" /> Voltar
        </button>
        <span className="text-[13px] font-semibold text-ink-900">{editAgent ? `Editar: ${editAgent.nome}` : 'Novo Agente'}</span>
      </div>

      <Card className="p-4 space-y-4">
        {/* Identidade */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Ícone</label>
            <div className="flex flex-wrap gap-1.5">
              {ICONES.map(ic => (
                <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  className={cn('h-8 w-8 rounded-lg text-lg transition-all', form.icon === ic ? 'bg-ink-900 ring-2 ring-ink-900 ring-offset-1' : 'bg-ink-50 hover:bg-ink-100')}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Cor</label>
            <div className="flex flex-wrap gap-1.5">
              {CORES.map(cor => (
                <button key={cor} onClick={() => setForm(f => ({ ...f, cor }))}
                  className={cn('h-8 w-8 rounded-lg transition-all', form.cor === cor ? 'ring-2 ring-offset-2' : '')}
                  style={{ backgroundColor: cor }} />
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Ativo</label>
            <label className="flex items-center gap-2 pt-1">
              <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                className="accent-ink-900" />
              <span className="text-[12px] text-ink-700">Agente ativo</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Nome *</label>
            <input value={form.nome} onChange={e => {
              const nome = e.target.value;
              const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              setForm(f => ({ ...f, nome, slug }));
            }} className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13px] focus:border-ink-900 focus:outline-none" placeholder="Ex: Assistente Pregador" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Slug</label>
            <div className="flex items-center gap-2">
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                className="flex-1 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-[13px] font-mono text-ink-600 focus:border-ink-900 focus:outline-none" />
              <button onClick={() => setShowSlug(!showSlug)} className="text-ink-400 hover:text-ink-700">
                {showSlug ? <EyeOff className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Especialidade</label>
            <input value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))}
              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13px] focus:border-ink-900 focus:outline-none" placeholder="Ex: Pregação e Teologia" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Memória</label>
            <div className="flex flex-wrap gap-1.5">
              {MEMORIA_TIPOS.map(m => (
                <button key={m.id} onClick={() => setForm(f => ({ ...f, memoria_tipo: m.id }))}
                  className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium transition-all', form.memoria_tipo === m.id ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200')}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Descrição</label>
          <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13px] focus:border-ink-900 focus:outline-none" placeholder="Resumo do agente..." />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Objetivo</label>
          <textarea value={form.objetivo} onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))}
            rows={2}
            className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13px] focus:border-ink-900 focus:outline-none" placeholder="Qual o objetivo deste agente?" />
        </div>

        {/* Config IA */}
        <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 space-y-3">
          <h3 className="text-[12px] font-semibold text-ink-700">Configuração de IA</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
          <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400 dark:text-ink-400">Modelo</label>
              <select value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
                className="w-full rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[12px] focus:border-ink-900 focus:outline-none">
                {PROVIDERS.flatMap(p => p.modelos).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Temperatura: {form.temperatura}</label>
              <input type="range" min="0" max="1" step="0.05" value={form.temperatura}
                onChange={e => setForm(f => ({ ...f, temperatura: Number(e.target.value) }))}
                className="w-full accent-ink-900" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Máx Tokens: {form.max_tokens}</label>
              <input type="range" min="256" max="8192" step="256" value={form.max_tokens}
                onChange={e => setForm(f => ({ ...f, max_tokens: Number(e.target.value) }))}
                className="w-full accent-ink-900" />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Prompt do Sistema *</label>
          <textarea value={form.prompt_sistema} onChange={e => setForm(f => ({ ...f, prompt_sistema: e.target.value }))}
            rows={10}
            className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13px] font-mono leading-relaxed focus:border-ink-900 focus:outline-none"
            placeholder="Você é um assistente especializado em..." />
          <p className="mt-1 text-[10.5px] text-ink-400">{form.prompt_sistema.length} caracteres</p>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={() => void salvar()} disabled={saving || !form.nome.trim() || !form.prompt_sistema.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-ink-900 px-5 py-2 text-[13px] font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Salvando…' : 'Salvar Agente'}
          </button>
          <button onClick={() => setTab('list')} className="rounded-xl border border-ink-200 bg-white px-5 py-2 text-[13px] font-medium text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
        </div>
      </Card>
    </div>
  );

  // TEST
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setTab('list')} className="flex items-center gap-1 text-[12px] text-ink-500 hover:text-ink-800">
          <X className="h-4 w-4" /> Voltar
        </button>
        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
          <span style={{ fontSize: '1.3rem' }}>{testAgent?.icon}</span>
          Testar: {testAgent?.nome}
        </span>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {testAgent && [
            <span key="v" className="rounded-full bg-ink-50 px-2 py-0.5 text-[10.5px] text-ink-500">v{testAgent.versao}</span>,
            <span key="m" className="rounded-full bg-ink-50 px-2 py-0.5 text-[10.5px] text-ink-500">{testAgent.modelo}</span>,
            <span key="t" className="rounded-full bg-ink-50 px-2 py-0.5 text-[10.5px] text-ink-500">T={testAgent.temperatura}</span>,
            <span key="tok" className="rounded-full bg-ink-50 px-2 py-0.5 text-[10.5px] text-ink-500">max={testAgent.max_tokens}t</span>,
          ]}
        </div>

        <textarea value={testInput} onChange={e => setTestInput(e.target.value)}
          rows={4} placeholder="Digite uma mensagem de teste..."
          className="mb-3 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13px] focus:border-ink-900 focus:outline-none" />

        <button onClick={() => void testarAgente()} disabled={testLoading || !testInput.trim()}
          className="mb-4 flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-2 text-[13px] font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
          {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {testLoading ? 'Enviando…' : 'Enviar Teste'}
        </button>

        {testOutput && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-600 dark:text-ink-400">Resposta</label>
            <pre className="max-h-96 overflow-auto rounded-xl border border-ink-200 bg-ink-50 p-3 text-[11.5px] font-mono whitespace-pre-wrap text-ink-800">
              {testOutput}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Seção: Prompt Global ───────────────────────────────────────────────────

function PromptGlobalSection() {
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => { void carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const sb = supabase();
    if (!sb) { setMsg({ type: 'err', text: 'Supabase não configurado. Verifique VITE_SUPABASE_URL/KEY.' }); setLoading(false); return; }
    const { data, error } = await sb.from('ia_config').select('valor').eq('id', 'prompt_global').single();
    if (error) setPrompt('');
    else setPrompt(data?.valor ?? '');
    setLoading(false);
  }

  async function salvar() {
    if (!prompt.trim()) { setMsg({ type: 'err', text: 'Digite algo antes de salvar.' }); return; }
    setSaving(true);
    setMsg(null);
    const { data, error } = await callEdgeFunction<{ success: boolean; data?: unknown }>('admin-save-config', {
      id: 'prompt_global',
      valor: prompt,
      atualizado_em: new Date().toISOString(),
    });
    if (error || !data?.success) {
      setMsg({ type: 'err', text: `Erro: ${error?.message ?? 'Falha ao salvar'}` });
    } else {
      setMsg({ type: 'ok', text: '✅ Prompt Global salvo com sucesso!' });
    }
    setSaving(false);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink-300" /></div>;

  return (
    <div className="space-y-4">
      <SectionTitle>Prompt Global</SectionTitle>
      <Card className="p-4">
        <p className="mb-3 text-[12px] text-ink-500">Este prompt é adicionado antes de cada resposta da IA. Use para definir tom, regras gerais e contexto pastoral.</p>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={8}
          className="mb-3 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13px] font-mono leading-relaxed focus:border-ink-900 focus:outline-none"
          placeholder="Ex: Você é um assistente pastoral útil e respeitoso..." />
        {msg && (
          <div className={cn('mb-3 rounded-xl px-3 py-2 text-[12px]', msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>
            {msg.text}
          </div>
        )}
        <button onClick={() => void salvar()} disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-ink-900 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </Card>
    </div>
  );
}

// ─── Seção: Logs ────────────────────────────────────────────────────────────

function LogsSection() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE = 30;

  useEffect(() => { void carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const sb = supabase();
    const { data } = await sb!.from('ia_agent_logs').select('*').order('criado_em', { ascending: false }).limit(200);
    setLogs(data ?? []);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink-300" /></div>;

  const paginated = logs.slice(page * PAGE, (page + 1) * PAGE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Logs de IA ({logs.length} registros)</SectionTitle>
        <button onClick={() => void carregar()} className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-ink-700 hover:bg-ink-50">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>
      <div className="space-y-1.5">
        {paginated.map(l => (
          <Card key={l.id} className="p-3">
            <div className="flex items-start gap-3">
              <div className={cn('mt-0.5 h-2 w-2 flex-shrink-0 rounded-full', l.sucesso ? 'bg-emerald-400' : 'bg-red-400')} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-ink-800">{l.mensagem}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-[10.5px] text-ink-400">
                  {l.modelo && <span>{l.modelo}</span>}
                  {l.tokens_input && <span>⬆️{l.tokens_input}</span>}
                  {l.tokens_output && <span>⬇️{l.tokens_output}</span>}
                  {l.duracao_ms && <span>⏱️{l.duracao_ms}ms</span>}
                  {l.custo_usd !== null && <span>${l.custo_usd.toFixed(5)}</span>}
                  <span>{new Date(l.criado_em).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {logs.length > PAGE && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50">
            ← Anterior
          </button>
          <span className="px-3 py-1.5 text-[11.5px] text-ink-500">{page + 1} / {Math.ceil(logs.length / PAGE)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE >= logs.length}
            className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50">
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Seção: Estatísticas ────────────────────────────────────────────────────

function StatsSection() {
  const [stats, setStats] = useState<{ total: number; agentes: IAAgent[] }>({ total: 0, agentes: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { void carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const sb = supabase();
    const { data } = await sb!.from('ia_agents').select('*').order('stats_uso', { ascending: false });
    const totalTokens = data?.reduce((s, a) => s + (a.stats_tokens ?? 0), 0) ?? 0;
    const totalUso = data?.reduce((s, a) => s + (a.stats_uso ?? 0), 0) ?? 0;
    setStats({ total: totalUso, agentes: data ?? [] });
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink-300" /></div>;

  const maxUso = Math.max(...stats.agentes.map(a => a.stats_uso ?? 0), 1);

  return (
    <div className="space-y-4">
      <SectionTitle>Estatísticas de Uso</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="mb-1 text-2xl font-bold text-ink-900">{stats.total}</div>
          <div className="text-[11px] text-ink-500">Total de usos</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="mb-1 text-2xl font-bold text-ink-900">{stats.agentes.length}</div>
          <div className="text-[11px] text-ink-500">Agentes criados</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="mb-1 text-2xl font-bold text-ink-900">{stats.agentes.filter(a => a.ativo).length}</div>
          <div className="text-[11px] text-ink-500">Agentes ativos</div>
        </Card>
      </div>

      <SectionTitle>Uso por Agente</SectionTitle>
      <div className="space-y-2">
        {stats.agentes.map(a => (
          <Card key={a.id} className="p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">{a.icon}</span>
              <span className="flex-1 text-[13px] font-semibold text-ink-900">{a.nome}</span>
              <span className="text-[12px] font-mono text-ink-600">{a.stats_uso} usos</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full transition-all" style={{ width: `${((a.stats_uso ?? 0) / maxUso) * 100}%`, backgroundColor: a.cor }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Seção: Testes ──────────────────────────────────────────────────────────

function TestesSection() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  async function testar() {
    if (!input.trim()) return;
    setLoading(true);
    setOutput('');
    const sb = supabase();
    const t0 = Date.now();
    try {
      const { data, error } = await sb!.functions.invoke('ai-chat', {
        body: { mensagem: input, modo: 'test' },
      });
      const elapsed = Date.now() - t0;
      if (error) {
        const err: any = error;
        const status: number | undefined = err.context?.status;
        const rawBody = err.context?.body;
        const errBody = typeof rawBody === 'string'
          ? (() => { try { return JSON.parse(rawBody); } catch { return rawBody; } })()
          : rawBody ?? null;
        const detail = errBody?.message ?? errBody?.error ?? err.message ?? String(error).slice(0, 300);

        let hint = '';
        if (status === 401) hint = '\n💡 Sua sessão de admin expirou. Faça logout/login em /admin/login.';
        else if (status === 429) hint = '\n💳 Limite mensal atingido. Verifique o plano do usuário.';
        else if (status === 500 && String(detail).includes('no_api_key')) hint = '\n🔑 Nenhuma chave cadastrada. Vá em /admin/api-keys e cadastre uma chave OpenAI.';
        else if (String(detail).match(/Failed to send|FetchError|network|fetch/i)) hint = '\n🌐 Falha de rede. Verifique VPN/proxy/adblock.';

        setOutput(`❌ HTTP ${status ?? '?'} em ${elapsed}ms\n\n${detail}${hint}`);
        return;
      }
      setOutput(`✅ Respondido em ${elapsed}ms\n\n${JSON.stringify(data, null, 2)}`);
    } catch (e) {
      setOutput(`❌ Erro: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Teste do Assistente</SectionTitle>
      <Card className="p-4">
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={5}
          className="mb-3 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13px] focus:border-ink-900 focus:outline-none"
          placeholder="Digite uma mensagem para testar a IA…" />
        <button onClick={() => void testar()} disabled={loading || !input.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-ink-900 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {loading ? 'Enviando…' : 'Testar'}
        </button>
        {output && <pre className="mt-4 max-h-96 overflow-auto rounded-xl border border-ink-200 bg-ink-50 p-3 text-[11.5px] font-mono whitespace-pre-wrap text-ink-800">{output}</pre>}
      </Card>
    </div>
  );
}

// ─── Seção: Modelos ──────────────────────────────────────────────────────────

function ModelosSection() {
  const [configs, setConfigs] = useState<ApiKeyConfig[]>([]);
  const [usage, setUsage] = useState<{ total: number; byModel: Record<string, { calls: number; tokens: number; custo: number }> }>({ total: 0, byModel: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => { void carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const sb = supabase();
    const [{ data: cfgs }, { data: logs }] = await Promise.all([
      sb!.from('api_keys').select('*').eq('ativo', true),
      sb!.from('usage_log').select('meta, custo_usd').eq('tipo', 'ia_request').gte('criado_em', new Date(Date.now() - 30 * 86400_000).toISOString()),
    ]);
    setConfigs(cfgs ?? []);
    const byModel: Record<string, { calls: number; tokens: number; custo: number }> = {};
    let total = 0;
    for (const l of logs ?? []) {
      const m = (l.meta as { model?: string } | null)?.model ?? 'desconhecido';
      const custo = Number(l.custo_usd ?? 0);
      if (!byModel[m]) byModel[m] = { calls: 0, tokens: 0, custo: 0 };
      byModel[m].calls += 1;
      byModel[m].custo += custo;
      total += custo;
    }
    setUsage({ total, byModel });
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink-300" /></div>;

  return (
    <div className="space-y-4">
      <SectionTitle>Modelos Configurados</SectionTitle>
      {configs.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Cpu className="h-10 w-10 text-ink-200" />
          <p className="text-[13px] text-ink-500">Nenhuma chave cadastrada.</p>
          <p className="text-[11.5px] text-ink-400">Vá em <strong>API Keys</strong> e cadastre uma chave OpenAI/Anthropic/Google.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {configs.map(c => {
            const prov = PROVIDERS.find(p => p.id === c.provider);
            return (
              <Card key={c.id} className="p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-2xl">{prov?.logo}</span>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-ink-900">{prov?.label}</div>
                    <div className="text-[11px] text-ink-500">{c.modelo_padrao}</div>
                  </div>
                  <StatusBadge ok={c.ativo} label={c.ativo ? 'Ativo' : 'Inativo'} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-lg bg-ink-50 p-2"><div className="text-ink-400">Temperatura</div><div className="font-mono text-ink-800">{c.temperature ?? '—'}</div></div>
                  <div className="rounded-lg bg-ink-50 p-2"><div className="text-ink-400">Max tokens</div><div className="font-mono text-ink-800">{c.max_tokens ?? '—'}</div></div>
                  <div className="rounded-lg bg-ink-50 p-2"><div className="text-ink-400">Contexto</div><div className="font-mono text-ink-800">{c.context_window ?? '—'}</div></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <SectionTitle>Uso por Modelo (últimos 30 dias)</SectionTitle>
      <Card className="p-4">
        {Object.keys(usage.byModel).length === 0 ? (
          <p className="text-[12px] text-ink-500">Nenhuma requisição registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(usage.byModel).map(([modelo, u]) => (
              <div key={modelo} className="flex items-center gap-3 rounded-lg bg-ink-50 p-2.5">
                <Cpu className="h-4 w-4 text-ink-500" />
                <div className="flex-1">
                  <div className="text-[12px] font-semibold text-ink-800">{modelo}</div>
                  <div className="text-[10.5px] text-ink-500">{u.calls} chamadas</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-mono text-ink-800">${u.custo.toFixed(4)}</div>
                  <div className="text-[10px] text-ink-400 dark:text-ink-500">custo total</div>
                </div>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-3 text-[12px]">
              <span className="font-semibold text-ink-700">Total</span>
              <span className="font-mono font-bold text-ink-900">${usage.total.toFixed(4)}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Seção: Limites ──────────────────────────────────────────────────────────

function LimitesSection() {
  const [stats, setStats] = useState<{ usado: number; limite: number; plano: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const sb = supabase();
    const session = await sb!.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId) { setLoading(false); return; }

    const inicioMes = new Date();
    inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);

    const [{ count }, { data: sub }] = await Promise.all([
      sb!.from('usage_log').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('tipo', 'ia_request').gte('criado_em', inicioMes.toISOString()),
      sb!.from('subscriptions').select('plans(limite_ia_mes, nome)').eq('user_id', userId).in('status', ['active', 'trialing']).order('criado_em', { ascending: false }).limit(1).maybeSingle(),
    ]);

    // Tipo explícito para relação aninhada do Supabase
    const planoData = sub as { plans: { limite_ia_mes: number; nome: string } | null } | null;
    const limite = planoData?.plans?.limite_ia_mes ?? 30;
    const plano = planoData?.plans?.nome ?? 'Free (sem assinatura)';
    setStats({ usado: count ?? 0, limite, plano });
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink-300" /></div>;
  if (!stats) return <Card className="p-6 text-center"><p className="text-[12px] text-ink-500">Faça login para ver seus limites.</p></Card>;

  const pct = Math.min(100, (stats.usado / Math.max(stats.limite, 1)) * 100);
  const cor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-4">
      <SectionTitle>Limite Mensal de IA</SectionTitle>
      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between text-[12px]">
          <span className="text-ink-500">Plano atual</span>
          <span className="font-semibold text-ink-800">{stats.plano}</span>
        </div>
        <div className="mb-3 mt-4 flex items-end justify-between">
          <div className="text-3xl font-bold text-ink-900">{stats.usado}</div>
          <div className="text-[13px] text-ink-500">de {stats.limite} requisições</div>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-ink-100">
          <div className={`h-full transition-all ${cor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-[11px] text-ink-500">
          {pct >= 100
            ? '⚠️ Limite atingido. Faça upgrade do plano.'
            : pct >= 80
            ? '⚠️ Próximo do limite. Considere upgrade.'
            : `Restam ${stats.limite - stats.usado} requisições este mês.`}
        </p>
      </Card>
    </div>
  );
}

// ─── Seção: Ferramentas ──────────────────────────────────────────────────────

const FERRAMENTAS = [
  { id: 'web_search', nome: 'Pesquisa Web', descricao: 'Busca na internet por contexto atualizado.', icon: Globe, plano: 'premium' },
  { id: 'cross_refs', nome: 'Referências Cruzadas', descricao: 'Sugere versículos relacionados ao texto-base.', icon: Hash, plano: 'todos' },
  { id: 'illustrations', nome: 'Banco de Ilustrações', descricao: 'Histórias e paráfrases ilustrativas.', icon: FileText, plano: 'todos' },
  { id: 'prayer_gen', nome: 'Gerador de Oração', descricao: 'Cria oração baseada no sermão.', icon: MessageSquare, plano: 'essencial' },
  { id: 'outline_check', nome: 'Auditoria de Esboço', descricao: 'Analisa coerência e equilíbrio.', icon: CheckCircle2, plano: 'premium' },
  { id: 'series_planner', nome: 'Planejador de Séries', descricao: 'Sugere séries temáticas completas.', icon: GitBranch, plano: 'premium' },
];

function FerramentasSection() {
  return (
    <div className="space-y-4">
      <SectionTitle>Ferramentas de IA Disponíveis</SectionTitle>
      <p className="text-[12px] text-ink-500">
        Cada ferramenta é injetada como capacidade ao agente quando habilitada na aba Agentes.
        O plano do usuário controla o que ele vê.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FERRAMENTAS.map(f => (
          <Card key={f.id} className="p-4">
            <div className="mb-2 flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
                <f.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-ink-900">{f.nome}</span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    f.plano === 'todos' ? 'bg-emerald-50 text-emerald-700' :
                    f.plano === 'essencial' ? 'bg-sky-50 text-sky-700' :
                    'bg-violet-50 text-violet-700'
                  )}>
                    {f.plano === 'todos' ? 'Todos' : f.plano}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ink-500">{f.descricao}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Seção: Placeholders (em construção) ─────────────────────────────────────

function PlaceholderSection({ name }: { name: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-12 text-center">
      <Settings className="h-10 w-10 text-ink-200" />
      <div>
        <p className="text-[14px] font-semibold text-ink-700">{name}</p>
        <p className="mt-1 text-[12px] text-ink-400">Em breve — funcionalidade em desenvolvimento.</p>
      </div>
    </Card>
  );
}

// ─── Componente Principal ───────────────────────────────────────────────────

export default function ApiKeysPage() {
  const [activeTab, setActiveTab] = useState('apikeys');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => { setInitialized(true); }, []);

  if (!initialized) return <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-ink-300" /></div>;

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 px-4 pt-4 pb-3 shadow-sm dark:shadow-none">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-5 w-5 text-ink-700 dark:text-ink-300" />
          <h1 className="text-[16px] font-bold text-ink-900 dark:text-white">Central de Inteligência Artificial</h1>
        </div>
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(t => (
            <TabPill key={t.id} {...t} active={activeTab === t.id} onClick={setActiveTab} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'apikeys'    && <ApiKeysSection />}
            {activeTab === 'modelos'    && <ModelosSection />}
            {activeTab === 'agentes'    && <AgentesSection />}
            {activeTab === 'prompt'     && <PromptGlobalSection />}
            {activeTab === 'ferramentas'&& <FerramentasSection />}
            {activeTab === 'limites'    && <LimitesSection />}
            {activeTab === 'logs'       && <LogsSection />}
            {activeTab === 'testes'     && <TestesSection />}
            {activeTab === 'stats'      && <StatsSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Alias named export para App.tsx
export { ApiKeysPage as AdminApiKeys };
