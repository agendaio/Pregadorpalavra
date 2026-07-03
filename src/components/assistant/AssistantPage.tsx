import { useEffect, useRef, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, X, Plus, Copy, CheckCheck, AlertCircle, Loader2,
  MessageSquare, Trash2, Menu, Square, Mic, MicOff,
  Sparkles, Share2, Wand2, BookOpen, Megaphone, ClipboardList,
  Globe, Users, HelpCircle, GraduationCap, Drama, Scroll,
  History, ListChecks,
} from 'lucide-react';
import { supabase, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { aiDB } from '@/lib/ai';
import { SPECIALISTS, getSpecialist, type Specialist } from '@/lib/ai/specialists';
import { cn, formatarRelativo } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useCopilotOutlineStore } from '@/stores/copilotOutline';
import { construirContextoMemoria } from '@/lib/ai/memory';
import { useUIStore } from '@/stores/ui';
import { autoGenerateSlides } from '@/lib/autoGenerateSlides';
import { MarkdownRenderer } from '@/components/copilot/MarkdownRenderer';

// ─── Ícones profissionais por especialista (substitui os emojis) ───────────

const SPECIALIST_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'estudos-biblicos': BookOpen,
  'criar-pregacoes': Megaphone,
  'esbocos': ClipboardList,
  'contexto-historico': Globe,
  'estudo-celulas': Users,
  'duvidas-biblicas': HelpCircle,
  'teologia': GraduationCap,
  'criar-dinamicas': Drama,
  'criar-parabolas': Scroll,
};

function SpecialistIcon({ id, className }: { id: string; className?: string }) {
  const Icon = SPECIALIST_ICONS[id] ?? Sparkles;
  return <Icon className={className} />;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Converte erros técnicos (OpenAI/rede) em mensagem clara em português. */
function traduzirErroIA(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('insufficient_quota') || m.includes('exceeded your current quota') || m.includes('429')) {
    return 'A chave da OpenAI está sem créditos. Adicione saldo em platform.openai.com (Billing) ou cadastre uma chave com créditos no painel admin → API Keys.';
  }
  if (m.includes('invalid_api_key') || m.includes('incorrect api key') || m.includes('401')) {
    return 'A chave da OpenAI é inválida ou foi revogada. Cadastre uma chave válida no painel admin → API Keys.';
  }
  if (m.includes('no_api_key') || m.includes('nenhuma chave')) {
    return 'Nenhuma chave de IA configurada. Cadastre uma chave da OpenAI no painel admin → API Keys.';
  }
  if (m.includes('rate_limit') || m.includes('rate limit')) {
    return 'Muitas requisições em pouco tempo. Aguarde alguns segundos e tente de novo.';
  }
  if (m.includes('abort') || m.includes('timeout')) {
    return 'A resposta demorou demais e foi cancelada. Tente novamente.';
  }
  return `Não consegui responder: ${raw}`;
}

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  titulo: string;
  especialistaId?: string | null;
  createdAt: number;
  updatedAt: number;
}

// ─── Componente principal ───────────────────────────────────────────────────

export function AssistantPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSessoes, setShowSessoes] = useState(false);
  const [sessoesTab, setSessoesTab] = useState<'historico' | 'esboco'>('historico');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [improvingId, setImprovingId] = useState<string | null>(null);
  const [especialistaId, setEspecialistaId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // ── Memória da pregação (tema, texto-base, objetivo, público, etc) ──
  const ctxOutline = useCopilotOutlineStore();

  // ── Hook de transcrição de voz (Web Speech API) ──
  const speech = useSpeechRecognition('pt-BR');

  // Carregar sessões do IndexedDB
  const sessoes = useLiveQuery(() =>
    aiDB.sessoes.orderBy('updatedAt').reverse().limit(30).toArray() as Promise<ChatSession[]>,
  );

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, speech.interimTranscript]);

  // ── Sessão: criar / carregar ──

  const criarSessao = useCallback(async (espId: string | null) => {
    const esp = getSpecialist(espId);
    const sessao: ChatSession = {
      id: crypto.randomUUID(),
      titulo: esp ? `${esp.icon} ${esp.nome}` : 'Nova conversa',
      especialistaId: espId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await aiDB.sessoes.put(sessao);
    setSessionId(sessao.id);
    setMessages([]);
    setShowSessoes(false);
  }, []);

  const carregarSessao = useCallback(async (sessao: ChatSession) => {
    setSessionId(sessao.id);
    const msgs = await aiDB.mensagens
      .where('sessaoId')
      .equals(sessao.id)
      .sortBy('timestamp') as unknown as ChatMessage[];
    setMessages(msgs ?? []);
    setEspecialistaId(sessao.especialistaId ?? null);
    setShowSessoes(false);
  }, []);

  // ── Restaura a última conversa automaticamente ao abrir a página ──
  // Nunca começa "do zero" se já existe histórico — só limpa quando o
  // usuário clica em "Nova conversa" ou "Limpar" explicitamente.
  useEffect(() => {
    if (sessionId) return;
    (async () => {
      const ultima = await aiDB.sessoes.orderBy('updatedAt').reverse().first() as ChatSession | undefined;
      if (ultima) await carregarSessao(ultima);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deletarSessao = async (id: string) => {
    await aiDB.sessoes.delete(id);
    await aiDB.mensagens.where('sessaoId').equals(id).delete();
    if (sessionId === id) {
      setSessionId(null);
      setMessages([]);
      setEspecialistaId(null);
    }
  };

  // ── Ativar especialista (clicou num card) ──

  const ativarEspecialista = useCallback(async (esp: Specialist) => {
    setEspecialistaId(esp.id);
    // Sempre cria nova conversa ao trocar de especialista
    // (a memória da pregação segue mantida via outline store)
    await criarSessao(esp.id);
  }, [criarSessao]);

  // ── Enviar mensagem (streaming) ──

  const enviarMensagem = async (textoOverride?: string) => {
    const texto = (textoOverride ?? input).trim();
    if (!texto || loading) return;

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      await criarSessao(especialistaId);
      currentSessionId = (await aiDB.sessoes.orderBy('updatedAt').reverse().first())?.id ?? null;
      if (currentSessionId) setSessionId(currentSessionId);
    }

    if (!currentSessionId) {
      setError('Não foi possível criar sessão. Tente novamente.');
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: texto,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    const streamId = crypto.randomUUID();
    let streamContent = '';

    try {
      await aiDB.mensagens.put({ sessaoId: currentSessionId, ...userMsg });
      await aiDB.sessoes.update(currentSessionId, { updatedAt: Date.now() });

      // Histórico enviado para IA
      const chatHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Token do usuário (ou ANON_KEY)
      const sb = supabase();
      const { data: sessData } = await sb?.auth.getSession() ?? {};
      const userToken = (sessData?.session as { access_token?: string } | null | undefined)?.access_token;
      const token = userToken ?? SUPABASE_ANON_KEY;

      // System prompt do especialista ativo (se houver)
      const especialista = getSpecialist(especialistaId);
      const systemPrompt = especialista?.prompt ?? '';

      // Memória da pregação — tema, texto-base, objetivo, público, etc
      const session_context = {
        titulo: ctxOutline.titulo,
        serie: ctxOutline.serie,
        textoBase: ctxOutline.textoBase,
        tema: ctxOutline.tema,
        objetivo: ctxOutline.objetivo,
        publico: ctxOutline.publico,
        resumo: ctxOutline.resumo,
        introducao: ctxOutline.introducao,
        conclusao: ctxOutline.conclusao,
        pontos: ctxOutline.pontos,
        tempoEstimado: ctxOutline.tempoEstimado,
      };
      const ctxMemoriaStr = construirContextoMemoria({
        ...session_context,
        subtitulo: '',
        conversaId: currentSessionId,
        pastaId: ctxOutline.pastaId,
        pastaNome: ctxOutline.pastaNome,
        pastaCor: ctxOutline.pastaCor,
      });

      // System append: injeta memória automaticamente
      const systemAppend = ctxMemoriaStr || undefined;

      // Timeout
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 120_000);
      streamAbortRef.current = controller;

      let res: Response;
      try {
        res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              messages: chatHistory,
              modo: 'chat',
              systemPrompt: systemPrompt || undefined,
              systemAppend,
              session_context,
              stream: true,
              temperature: 0.7,
              maxTokens: 2500,
            }),
            signal: controller.signal,
          },
        );
      } catch (fetchErr) {
        window.clearTimeout(timeoutId);
        if ((fetchErr as Error).name === 'AbortError') {
          throw new Error('Tempo esgotado (2 min). Tente uma pergunta mais curta.');
        }
        throw fetchErr;
      }

      window.clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(errData.message ?? `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error('Resposta vazia do servidor.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const assistantMsg: ChatMessage = {
        id: streamId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      let errorDuringStream = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l: string) => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              errorDuringStream = true;
              throw new Error(parsed.message ?? 'Erro na stream');
            }
            if (parsed.content) {
              streamContent += parsed.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamId ? { ...m, content: streamContent } : m,
                ),
              );
            }
          } catch (parseErr) {
            if (errorDuringStream) throw parseErr;
            /* skip malformed chunk */
          }
        }
      }

      assistantMsg.content = streamContent || 'Resposta recebida sem conteúdo.';
      await aiDB.mensagens.put({ sessaoId: currentSessionId, ...assistantMsg });
      await aiDB.sessoes.update(currentSessionId, { updatedAt: Date.now() });

      // Auto-título da sessão a partir da 1ª mensagem do usuário
      if (messages.length === 0 && texto.length > 0) {
        const tituloAuto = texto.length > 48 ? texto.slice(0, 45) + '…' : texto;
        await aiDB.sessoes.update(currentSessionId, { titulo: tituloAuto });
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[ai-chat] Erro na stream:', raw);
      setMessages((prev) => prev.filter((m) => m.id !== streamId));
      setError(traduzirErroIA(raw));
    } finally {
      setLoading(false);
    }
  };

  const cancelarStream = () => {
    streamAbortRef.current?.abort();
    setLoading(false);
  };

  const copiarMensagem = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const compartilharMensagem = (content: string) => {
    if (navigator.share) {
      navigator.share({ text: content }).catch(() => {});
    } else {
      navigator.clipboard.writeText(content);
    }
  };

  const melhorarResposta = (msg: ChatMessage) => {
    if (loading) return;
    const prompt = `Analise e melhore esta resposta bíblica/teológica. A resposta atual é:\n\n${msg.content}\n\nPor favor, melhore: corrija imprecisões teológicas, enriqueça com mais detalhes bíblicos (versículos, contexto histórico), melhore a clareza e organização, e adicione aplicações práticas relevantes. Responda em português brasileiro, com formatação clara usando markdown (## Títulos, **negrito**, listas).`;
    setImprovingId(msg.id);
    // Envia direto — não precisa cair no campo de texto pra usuário apertar enviar
    void enviarMensagem(prompt).finally(() => {
      setImprovingId((cur) => (cur === msg.id ? null : cur));
    });
  };

  const adicionarAoEsboco = async (msg: ChatMessage) => {
    const store = useCopilotOutlineStore.getState();
    const novoPonto = {
      id: crypto.randomUUID(),
      texto: msg.content,
      subpontos: [],
      aplicacoes: [],
    };
    store.importar({ pontos: [...store.pontos, novoPonto] });
    useUIStore.getState().mostrarToast('Adicionado ao esboço', 'sucesso');
    try {
      await autoGenerateSlides(store);
    } catch { /* ignore */ }
  };

  // ── Microfone: iniciar / parar ──

  const toggleMicrofone = useCallback(() => {
    if (!speech.isSupported) {
      setError(traduzirErroIA('Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari.'));
      return;
    }
    if (speech.isListening) {
      speech.stop();
      // Ao concluir: junta transcript final + interim (caso ainda tenha) → vai pra textarea editável
      const full = [speech.transcript, speech.interimTranscript].filter(Boolean).join(' ').trim();
      if (full) {
        setInput((prev) => (prev ? prev + ' ' : '') + full);
      }
    } else {
      speech.reset();
      speech.start();
    }
  }, [speech]);

  const especialistaAtivo = getSpecialist(especialistaId);
  const temConversa = messages.length > 0;
  // Quando há especialista ativo mas sem mensagens, vai direto pro chat (não mostra empty state)
  const mostrarEmptyState = !temConversa && !loading && !especialistaAtivo;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-paper-dark">
      {/* ── Header ChatGPT-like ── */}
      <header
        className={cn(
          'sticky top-0 z-30 flex items-center gap-2 border-b border-ink-200/70 bg-white/80 px-3 pt-safe backdrop-blur dark:border-ink-800 dark:bg-paper-dark/80',
          'h-14 min-h-[56px]',
        )}
      >
        <button
          onClick={() => setShowSessoes(true)}
          aria-label="Conversas"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800/60"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          {especialistaAtivo ? (
            <div className="flex items-center justify-center gap-1.5">
              <SpecialistIcon id={especialistaAtivo.id} className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <h1 className="truncate text-[14.5px] font-semibold tracking-[-0.01em] text-ink-900 dark:text-white">
                {especialistaAtivo.nome}
              </h1>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <h1 className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink-900 dark:text-white">
                Assistente Ministerial
              </h1>
            </div>
          )}
          {especialistaAtivo && (
            <p className="-mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-violet-600 dark:text-violet-400">
              Especialista Ativo
            </p>
          )}
        </div>

        <button
          onClick={() => void criarSessao(especialistaId)}
          aria-label="Nova conversa"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800/60"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {/* ── Sidebar de sessões ── */}
      <AnimatePresence>
        {showSessoes && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setShowSessoes(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[85vw] flex-col border-r border-ink-200 bg-white shadow-xl dark:border-ink-800 dark:bg-paper-dark"
            >
              <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3 dark:border-ink-800">
                <h3 className="text-[14px] font-semibold text-ink-900 dark:text-white">
                  {sessoesTab === 'historico' ? 'Histórico' : 'Esboço'}
                </h3>
                <button
                  onClick={() => setShowSessoes(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs: Histórico / Esboço (igual ChatGPT) */}
              <div className="flex gap-1 border-b border-ink-200 px-3 py-2 dark:border-ink-800">
                <button
                  onClick={() => setSessoesTab('historico')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                    sessoesTab === 'historico'
                      ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                      : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
                  )}
                >
                  <History className="h-3.5 w-3.5" /> Histórico
                </button>
                <button
                  onClick={() => setSessoesTab('esboco')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                    sessoesTab === 'esboco'
                      ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                      : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
                  )}
                >
                  <ListChecks className="h-3.5 w-3.5" /> Esboço
                </button>
              </div>

              {sessoesTab === 'historico' ? (
                <>
                  <button
                    onClick={() => void criarSessao(especialistaId)}
                    className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 py-2.5 text-[13px] text-ink-600 transition-colors hover:border-ink-400 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300"
                  >
                    <Plus className="h-4 w-4" /> Nova conversa
                  </button>
                  <div className="flex-1 overflow-y-auto px-3 py-2">
                    {(sessoes ?? []).length === 0 && (
                      <p className="px-2 py-6 text-center text-[12px] text-ink-400">
                        Nenhuma conversa ainda
                      </p>
                    )}
                    {(sessoes ?? []).map((s) => {
                      const esp = getSpecialist(s.especialistaId ?? null);
                      return (
                        <div
                          key={s.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => void carregarSessao(s)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void carregarSessao(s); } }}
                          className={cn(
                            'group mb-1 flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors',
                            sessionId === s.id
                              ? 'bg-ink-100 text-ink-900 dark:bg-ink-800/60 dark:text-white'
                              : 'text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800/40',
                          )}
                        >
                          {esp ? (
                            <SpecialistIcon id={esp.id} className="h-3.5 w-3.5 flex-shrink-0 text-violet-500" />
                          ) : (
                            <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{s.titulo}</div>
                            {esp && (
                              <div className="text-[10.5px] text-ink-400">
                                {esp.nome}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void deletarSessao(s.id); }}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-ink-400 hover:text-red-500" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {ctxOutline.titulo || ctxOutline.tema || ctxOutline.pontos.length > 0 ? (
                    <div className="space-y-3 text-[13px] text-ink-700 dark:text-ink-200">
                      {ctxOutline.titulo && (
                        <div>
                          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">Título</div>
                          <div>{ctxOutline.titulo}</div>
                        </div>
                      )}
                      {ctxOutline.tema && (
                        <div>
                          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">Tema</div>
                          <div>{ctxOutline.tema}</div>
                        </div>
                      )}
                      {ctxOutline.textoBase && (
                        <div>
                          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">Texto Base</div>
                          <div>{ctxOutline.textoBase}</div>
                        </div>
                      )}
                      {ctxOutline.pontos.length > 0 && (
                        <div>
                          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
                            Pontos ({ctxOutline.pontos.length})
                          </div>
                          <ol className="list-decimal space-y-1 pl-4">
                            {ctxOutline.pontos.map((p) => (
                              <li key={p.id}>{p.texto}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="px-2 py-6 text-center text-[12px] text-ink-400">
                      Nenhum esboço em construção ainda. Peça pra criar uma pregação, estudo ou esboço na conversa.
                    </p>
                  )}
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Conteúdo principal ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Empty state: 9 cards de especialistas ── */}
        {mostrarEmptyState ? (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-4 py-8">
              <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40">
                <Sparkles className="h-7 w-7 text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="mb-1 text-center text-[22px] font-semibold tracking-[-0.01em] text-ink-900 dark:text-white">
                Como posso te ajudar hoje?
              </h2>
              <p className="mb-8 text-center text-[13.5px] text-ink-500 dark:text-ink-400">
                Escolha um especialista abaixo para começar.
              </p>

              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {SPECIALISTS.map((esp) => (
                  <button
                    key={esp.id}
                    onClick={() => void ativarEspecialista(esp)}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-2xl border border-ink-200 bg-white px-3.5 py-2.5 text-left transition-all',
                      'hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-md',
                      'dark:border-ink-800 dark:bg-ink-900/40 dark:hover:border-ink-700',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                        esp.cor,
                      )}
                    >
                      <SpecialistIcon id={esp.id} className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold leading-tight text-ink-900 dark:text-white">
                        {esp.nome}
                      </div>
                      <div className="truncate text-[11px] leading-snug text-ink-500 dark:text-ink-400">
                        {esp.descricao}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <p className="mt-8 text-center text-[11px] text-ink-400">
                O especialista permanece ativo até você trocar de card ou iniciar nova conversa.
              </p>
            </div>
          </div>
        ) : (
          /* ── Mensagens ── */
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-4 py-6">
              {/* Indicador discreto de especialista ativo acima da conversa */}
              {especialistaAtivo && (
                <div className="mb-4 flex items-center justify-center">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1 text-[11px] font-medium text-violet-700 dark:border-violet-800/60 dark:bg-violet-900/20 dark:text-violet-300">
                    <SpecialistIcon id={especialistaAtivo.id} className="h-3 w-3" />
                    <span>Especialista ativo: {especialistaAtivo.nome}</span>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  copiado={copiadoId === msg.id}
                  melhorando={improvingId === msg.id}
                  loading={loading}
                  onCopiar={() => copiarMensagem(msg.id, msg.content)}
                  onCompartilhar={() => compartilharMensagem(msg.content)}
                  onEsboco={() => void adicionarAoEsboco(msg)}
                  onMelhorar={() => melhorarResposta(msg)}
                />
              ))}

              {loading && (
                <div className="mb-4 flex items-center gap-2 text-[13px] text-ink-500 dark:text-ink-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Pensando…</span>
                  <button
                    onClick={cancelarStream}
                    className="ml-2 rounded-lg border border-ink-200 px-2 py-0.5 text-[11px] hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {error && !loading && (
                <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* ── Input fixo no rodapé (estilo ChatGPT) ── */}
        <div className="border-t border-ink-200/70 bg-white px-4 py-3 dark:border-ink-800 dark:bg-paper-dark">
          <div className="mx-auto max-w-3xl">
            {/* Banner de gravação (estilo ChatGPT) */}
            <AnimatePresence>
              {speech.isListening && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mb-2 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30"
                >
                  <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />
                    <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white">
                      <Mic className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-red-700 dark:text-red-300">
                      Gravando…
                    </div>
                    <div className="truncate text-[12px] text-red-600/80 dark:text-red-400/80">
                      {speech.transcript || speech.interimTranscript || 'Fale agora'}
                    </div>
                  </div>
                  <button
                    onClick={toggleMicrofone}
                    className="flex h-9 items-center gap-1.5 rounded-full bg-red-500 px-3 text-[12px] font-medium text-white transition-colors hover:bg-red-600"
                  >
                    <Square className="h-3 w-3 fill-white" />
                    Concluir
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Erro de microfone */}
            {speech.error && !speech.isListening && (
              <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                {speech.error}
              </div>
            )}

            {/* Caixa de input — mesmo padrão visual do chat de Início */}
            <div
              className={cn(
                'flex items-center gap-2 rounded-3xl border bg-white px-3.5 py-2.5 shadow-lg shadow-ink-900/10 transition-all dark:bg-ink-900/40 dark:shadow-black/20',
                speech.isListening
                  ? 'border-red-300 ring-2 ring-red-200 dark:border-red-800/60'
                  : 'border-ink-200 focus-within:border-ink-400 focus-within:shadow-xl focus-within:shadow-ink-900/15 dark:border-ink-700 dark:focus-within:border-ink-600',
              )}
            >
              <textarea
                ref={inputRef}
                value={speech.isListening ? (speech.transcript + (speech.interimTranscript ? ' ' + speech.interimTranscript : '')) : input}
                onChange={(e) => !speech.isListening && setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !speech.isListening) {
                    e.preventDefault();
                    void enviarMensagem();
                  }
                }}
                placeholder={
                  speech.isListening
                    ? 'Fale algo…'
                    : especialistaAtivo
                      ? `Pergunte ao especialista em ${especialistaAtivo.nome}…`
                      : 'Pergunte qualquer coisa…'
                }
                rows={1}
                disabled={speech.isListening}
                className={cn(
                  'flex-1 resize-none bg-transparent px-1 text-[14px] leading-relaxed outline-none',
                  speech.isListening
                    ? 'cursor-default text-red-900 placeholder:text-[12.5px] placeholder:text-red-400/70 dark:text-red-100'
                    : 'text-ink-900 placeholder:text-[12.5px] placeholder:text-ink-400 dark:text-white dark:placeholder:text-ink-500',
                )}
                style={{ maxHeight: '160px' }}
              />

              {/* Mic button (esquerda do send, estilo ChatGPT) */}
              {!input.trim() && !speech.isListening && (
                <button
                  onClick={toggleMicrofone}
                  disabled={loading}
                  aria-label="Gravar áudio"
                  className={cn(
                    'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all',
                    'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white',
                    loading && 'opacity-50',
                  )}
                >
                  {speech.isSupported ? (
                    <Mic className="h-[22px] w-[22px]" />
                  ) : (
                    <MicOff className="h-[22px] w-[22px] opacity-50" />
                  )}
                </button>
              )}

              {/* Send button */}
              <button
                onClick={() => void enviarMensagem()}
                disabled={!input.trim() || loading || speech.isListening}
                aria-label="Enviar"
                className={cn(
                  'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all',
                  input.trim() && !loading && !speech.isListening
                    ? 'bg-ink-900 text-white shadow-md hover:bg-ink-800 active:scale-95 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-200'
                    : 'bg-ink-100 text-ink-300 dark:bg-ink-800 dark:text-ink-600',
                )}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-[22px] w-[22px]" />
                )}
              </button>
            </div>

            <p className="mt-1.5 text-center text-[10.5px] text-ink-400">
              IA pode cometer erros. Verifique sempre as referências bíblicas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bubble de mensagem ─────────────────────────────────────────────────────

function MessageBubble({
  msg,
  copiado,
  melhorando,
  loading,
  onCopiar,
  onCompartilhar,
  onEsboco,
  onMelhorar,
}: {
  msg: ChatMessage;
  copiado: boolean;
  melhorando: boolean;
  loading: boolean;
  onCopiar: () => void;
  onCompartilhar: () => void;
  onEsboco: () => void;
  onMelhorar: () => void;
}) {
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('mb-5 flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div className={cn('flex max-w-[88%] flex-col gap-1', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed',
            isUser
              ? 'bg-violet-600 text-white'
              : 'bg-ink-100 text-ink-900 dark:bg-ink-800/60 dark:text-ink-100',
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
          ) : (
            <MarkdownRenderer
              content={msg.content}
              onCopySection={(text) => { navigator.clipboard.writeText(text).catch(() => {}); }}
              onShareSection={(text) => {
                if (navigator.share) navigator.share({ text }).catch(() => {});
                else navigator.clipboard.writeText(text).catch(() => {});
              }}
              onAddSectionToOutline={(text, title) => {
                const store = useCopilotOutlineStore.getState();
                const novoPonto = { id: crypto.randomUUID(), texto: `${title}\n\n${text}`.trim(), subpontos: [], aplicacoes: [] };
                store.importar({ pontos: [...store.pontos, novoPonto] });
                useUIStore.getState().mostrarToast('Adicionado ao esboço', 'sucesso');
                void autoGenerateSlides(store).catch(() => {});
              }}
            />
          )}
        </div>

        {isUser ? (
          <div className="px-1 text-[10.5px] text-ink-400">
            {formatarRelativo(msg.timestamp)}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-1.5 px-1">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-ink-400">{formatarRelativo(msg.timestamp)}</span>
              {melhorando && (
                <span className="flex items-center gap-1 text-[10.5px] text-amber-600 dark:text-amber-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Melhorando…
                </span>
              )}
            </div>
            {/* Ações — sempre visíveis, não só no hover; ícone em cima, texto embaixo */}
            <div className="flex items-stretch gap-1.5">
              <MsgActionBtn
                icon={copiado ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                label={copiado ? 'Copiado' : 'Copiar'}
                onClick={onCopiar}
                variant={copiado ? 'success' : 'ghost'}
              />
              <MsgActionBtn
                icon={<Share2 className="h-4 w-4" />}
                label="Compartilhar"
                onClick={onCompartilhar}
                variant="ghost"
              />
              <MsgActionBtn
                icon={<ClipboardList className="h-4 w-4" />}
                label="Esboço"
                onClick={onEsboco}
                variant="ghost"
              />
              <MsgActionBtn
                icon={melhorando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                label="Melhorar"
                onClick={onMelhorar}
                variant="ghost"
                disabled={loading}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Botão de ação da bolha de mensagem ─────────────────────────────────────

function MsgActionBtn({
  icon,
  label,
  onClick,
  variant = 'ghost',
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'ghost' | 'success';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        'flex min-w-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-all active:scale-95 sm:flex-none',
        variant === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:bg-ink-50 hover:text-ink-800 dark:border-ink-700 dark:bg-ink-900/40 dark:text-ink-400 dark:hover:bg-ink-800/60 dark:hover:text-ink-200',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {icon}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}