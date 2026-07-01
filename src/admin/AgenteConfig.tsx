/**
 * Admin: AgenteConfig — Configuração central do Assistente Ministerial
 *
 * Permite ao administrador configurar o agente IA único que atende
 * todos os usuários. Prompt, temperatura, modelo, memória, etc.
 */

import { useEffect, useState } from 'react';
import {
  Brain, Save, Loader2, CheckCircle2, XCircle, RotateCcw,
  Eye, EyeOff, Plus, ExternalLink, Info,
} from 'lucide-react';
import { callEdgeFunction } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface AgenteConfig {
  valor: string;
  metadata: {
    temperatura?: number;
    max_tokens?: number;
    modelo?: string;
    streaming?: boolean;
    context_window?: number;
    habilitado?: boolean;
  };
}

const MODELOS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', desc: 'Rápido e econômico. Ideal para 90% das tarefas.' },
  { id: 'gpt-4o', label: 'GPT-4o', desc: 'Modelo completo. Melhor raciocínio teológico e contexto longo.' },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', desc: 'Top de linha para exegese profunda e séries longas.' },
];

const PLACEHOLDER_PROMPT = `Você é o **Assistente Ministerial** — um mentor pastoral especializado, criado exclusivamente para o **Pregador OS**, o sistema operacional para pregadores.

Você NÃO é um ChatGPT genérico. Você é um teólogo prático com vocação pastoral, especializado em auxiliar pregadores no estudo, preparação e apresentação da Palavra de Deus.

Seu caráter é:
- Sóbrio, mas não frio
- Erudito, mas não pedante
- Cuidadoso com a Escritura
- Respeitoso com tradições cristãs diferentes

# Especializações
- Bíblia Sagrada (AT e NT), contexto bíblico e cultural
- Hermenêutica, Exegese e Homilética
- Pregação expositiva, temática e textual
- Teologia bíblica e sistemática
- Aplicações práticas, ilustrações, séries

# Regras
1. A Escritura tem autoridade final.
2. Nunca invente versículos ou dados factuais.
3.Diferencie: [FATO] / [INTERPRETAÇÃO] / [APLICAÇÃO]
4. Cite referências completas sempre (Livro Cap:Vers).

# Formato de resposta
Use markdown com títulos, listas e estrutura clara.
Organize em: Título, Subtítulo, Versículos, Contexto, Explicação, Aplicação, Observações.`;

export function AdminAgenteConfig() {
  const [config, setConfig] = useState<AgenteConfig>({
    valor: '',
    metadata: {
      temperatura: 0.7,
      max_tokens: 2500,
      modelo: 'gpt-4o-mini',
      streaming: true,
      context_window: 128000,
      habilitado: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const sb = (await import('@/lib/supabase')).supabase();
    if (!sb) {
      setMsg({ type: 'err', text: 'Supabase não disponível.' });
      setLoading(false);
      return;
    }
    const { data, error } = await sb
      .from('ia_config')
      .select('valor, metadata')
      .eq('id', 'agente_ministerial')
      .maybeSingle();

    if (error || !data) {
      // Usa defaults
    } else {
      setConfig({
        valor: data.valor ?? '',
        metadata: {
          ...config.metadata,
          ...(data.metadata ?? {}),
        },
      });
    }
    setLoading(false);
  }

  async function salvar() {
    setSaving(true);
    setMsg(null);

    const payload = {
      id: 'agente_ministerial',
      label: 'Assistente Ministerial',
      valor: config.valor,
      metadata: config.metadata,
      ativo: true,
      atualizado_em: new Date().toISOString(),
    };

    const sb = (await import('@/lib/supabase')).supabase();
    const { data, error } = await sb!
      .from('ia_config')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      setMsg({ type: 'err', text: `Erro ao salvar: ${error.message}` });
    } else {
      setMsg({ type: 'ok', text: '✅ Configuração do Agente salva com sucesso!' });
    }
    setSaving(false);
  }

  async function testar() {
    if (!testInput.trim()) return;
    setTesting(true);
    setTestOutput('');
    try {
      const sb = (await import('@/lib/supabase')).supabase();
      const { data, error } = await sb!.functions.invoke('ai-chat', {
        body: { messages: [{ role: 'user', content: testInput }], modo: 'test', maxTokens: 500 },
      });
      if (error) {
        const e = error as { message?: string; context?: { body?: { message?: string } } };
        const detail = e?.context?.body?.message ?? e?.message ?? String(error);
        setTestOutput(`Erro: ${detail}`);
      } else {
        setTestOutput((data as { content?: string })?.content ?? JSON.stringify(data, null, 2));
      }
    } catch (e) {
      setTestOutput(`Erro: ${(e as Error).message}`);
    }
    setTesting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/20 text-2xl">
              🤖
            </div>
            Assistente Ministerial
          </h1>
          <p className="mt-1 text-[13px] text-white/50">
            Configuração central do agente IA — afeta todos os usuários
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            'rounded-full px-3 py-1 text-[11px] font-semibold',
            config.metadata.habilitado
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-red-500/15 text-red-300',
          )}>
            {config.metadata.habilitado ? '🟢 Ativo' : '🔴 Desabilitado'}
          </span>
        </div>
      </div>

      {/* Habilitado toggle */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-white">Agente Habilitado</h2>
            <p className="text-[12px] text-white/50">
              Quando desabilitado, os usuários não conseguem usar o assistente IA.
            </p>
          </div>
          <button
            onClick={() => setConfig(c => ({
              ...c,
              metadata: { ...c.metadata, habilitado: !c.metadata.habilitado },
            }))}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              config.metadata.habilitado ? 'bg-emerald-500' : 'bg-white/10',
            )}
          >
            <div className={cn(
              'absolute top-1 h-4 w-4 rounded-full bg-white transition-all',
              config.metadata.habilitado ? 'left-6' : 'left-1',
            )} />
          </button>
        </div>
      </Card>

      {/* Prompt Mestre */}
      <Card>
        <div className="mb-4">
          <h2 className="text-[14px] font-semibold text-white flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-400" />
            Prompt do Sistema (Prompt Mestre)
          </h2>
          <p className="text-[12px] text-white/50 mt-1">
            Define a identidade, especializações e regras do Assistente Ministerial.
            Este é o "cérebro" do agente.
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowPrompt(p => !p)}
            className="mb-2 flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/60"
          >
            {showPrompt ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPrompt ? 'Ocultar' : 'Mostrar'} prompt
          </button>
          <textarea
            value={config.valor}
            onChange={(e) => setConfig(c => ({ ...c, valor: e.target.value }))}
            rows={14}
            placeholder={PLACEHOLDER_PROMPT}
            className={cn(
              'w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-[12.5px] leading-relaxed transition-colors focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none',
              showPrompt ? 'text-white/90' : 'text-white/20',
            )}
            style={{ colorScheme: 'dark' }}
            onCopy={(e) => showPrompt || e.preventDefault()}
            onPaste={(e) => showPrompt || e.preventDefault()}
          />
          <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-white/30">
            <span>{config.valor.length.toLocaleString()} caracteres</span>
            <span>Prompt padrão: ~{PLACEHOLDER_PROMPT.length.toLocaleString()} caracteres</span>
          </div>
        </div>
      </Card>

      {/* Configurações de IA */}
      <Card>
        <h2 className="mb-4 text-[14px] font-semibold text-white">Configurações de IA</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {/* Modelo */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-white/60">Modelo</label>
            <div className="space-y-2">
              {MODELOS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setConfig(c => ({ ...c, metadata: { ...c.metadata, modelo: m.id } }))}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition-all',
                    config.metadata.modelo === m.id
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20',
                  )}
                >
                  <div className={cn(
                    'text-[12.5px] font-semibold',
                    config.metadata.modelo === m.id ? 'text-white' : 'text-white/70',
                  )}>
                    {m.label}
                  </div>
                  <div className="text-[11px] text-white/40">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Temperatura */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-white/60">
              Temperatura: <span className="text-white/90">{config.metadata.temperatura}</span>
            </label>
            <input
              type="range" min="0" max="1" step="0.05"
              value={config.metadata.temperatura ?? 0.7}
              onChange={(e) => setConfig(c => ({
                ...c,
                metadata: { ...c.metadata, temperatura: Number(e.target.value) },
              }))}
              className="mb-2 w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-white/30">
              <span>0 = preciso e determinístico</span>
              <span>1 = criativo e variado</span>
            </div>

            {/* Max Tokens */}
            <label className="mt-4 mb-1 block text-[11px] font-medium text-white/60">
              Máx Tokens: <span className="text-white/90">{config.metadata.max_tokens}</span>
            </label>
            <input
              type="range" min="256" max="8192" step="256"
              value={config.metadata.max_tokens ?? 2500}
              onChange={(e) => setConfig(c => ({
                ...c,
                metadata: { ...c.metadata, max_tokens: Number(e.target.value) },
              }))}
              className="mb-2 w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-white/30">
              <span>256</span>
              <span>8192</span>
            </div>

            {/* Streaming */}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setConfig(c => ({
                  ...c,
                  metadata: { ...c.metadata, streaming: !c.metadata.streaming },
                }))}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  config.metadata.streaming ? 'bg-violet-500' : 'bg-white/10',
                )}
              >
                <div className={cn(
                  'absolute top-1 h-4 w-4 rounded-full bg-white transition-all',
                  config.metadata.streaming ? 'left-6' : 'left-1',
                )} />
              </button>
              <span className="text-[12px] text-white/70">
                Streaming (resposta em tempo real)
              </span>
            </div>

            {/* Context Window */}
            <label className="mt-4 mb-1 block text-[11px] font-medium text-white/60">
              Janela de Contexto: <span className="text-white/90">{(config.metadata.context_window ?? 128000).toLocaleString()} tokens</span>
            </label>
            <input
              type="range" min="1000" max="128000" step="1000"
              value={config.metadata.context_window ?? 128000}
              onChange={(e) => setConfig(c => ({
                ...c,
                metadata: { ...c.metadata, context_window: Number(e.target.value) },
              }))}
              className="w-full accent-violet-500"
            />
          </div>
        </div>
      </Card>

      {/* Teste rápido */}
      <Card>
        <h2 className="mb-3 text-[14px] font-semibold text-white flex items-center gap-2">
          <Info className="h-4 w-4 text-cyan-400" />
          Teste Rápido
        </h2>
        <textarea
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          rows={2}
          placeholder="Digite uma pergunta de teste..."
          className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white/80 placeholder:text-white/20 focus:border-violet-500/50 focus:outline-none"
          style={{ colorScheme: 'dark' }}
        />
        <button
          onClick={() => void testar()}
          disabled={testing || !testInput.trim()}
          className="mb-4 flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-[12px] font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {testing ? 'Enviando...' : 'Testar Prompt'}
        </button>
        {testOutput && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <pre className="max-h-64 overflow-auto text-[11.5px] font-mono whitespace-pre-wrap text-white/70">
              {testOutput}
            </pre>
          </div>
        )}
      </Card>

      {/* Salvar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => void salvar()}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-[13px] font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </button>
        <button
          onClick={() => void carregar()}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[12px] font-medium text-white/60 hover:bg-white/10"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Descartar alterações
        </button>
        {msg && (
          <span className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium',
            msg.type === 'ok' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300',
          )}>
            {msg.type === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {msg.text}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-[12px] text-amber-200/80">
          💡 <strong>Importante:</strong> Alterações no Prompt Mestre afetam imediatamente todos os usuários.
          Teste com少量 perguntas antes de salvar. O modelo atual selecionado é <strong>{config.metadata.modelo}</strong>.
        </p>
      </div>
    </div>
  );
}

// ─── Subcomponente Card ─────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm',
      className,
    )}>
      {children}
    </div>
  );
}
