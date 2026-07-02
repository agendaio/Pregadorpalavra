/**
 * ChatContainer — Interface de chat estilo ChatGPT para o Pregador OS.
 *
 * Arquitetura dual-path:
 * - Chat mode: IndexedDB cache (instantâneo) → Vercel Edge Function (~50ms cold start)
 * - Sermon mode: Supabase Edge Function (contexto completo, parsing, esboço)
 *
 * Funcionalidades:
 * - Saudação personalizada por horário
 * - Streaming de respostas (SSE)
 * - Seleção de texto → menu flutuante
 * - Histórico de conversas (IndexedDB via AiDB)
 * - Sugestões de perguntas rápidas
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, Loader2, RotateCcw, Trash2, Copy, CheckCheck,
  AlertCircle, Plus, MessageSquare, ChevronLeft, ChevronRight,
  BookOpen, ArrowRight, PanelRightOpen, Share2, Wand2, Download,
  Pencil, Mic, MicOff, Square, X,
} from 'lucide-react';
import { SYSTEM_PROMPT, SYSTEM_PROMPT_CHAT, SERMON_PARSING_INSTRUCTION } from '@/lib/ai/prompt';
import { construirContextoMemoria } from '@/lib/ai/memory';
import { detectarIntencao } from '@/lib/ai/intent';
import { useCopilotOutlineStore } from '@/stores/copilotOutline';
import {
  aiDB, listarSessoesRecentes, adicionarMensagem,
  obterOuCriarSessao, atualizarSessao, excluirSessao,
  listarMensagens, limparMensagens,
  obterCache, salvarCache,
} from '@/lib/ai';
import type { Sessao } from '@/lib/ai';
import { cn, formatarRelativo } from '@/lib/utils';
import { SelectionMenu } from './SelectionMenu';
import { FolderPicker } from './FolderPicker';
import { MarkdownRenderer } from './MarkdownRenderer';
import { autoGenerateSlides } from '@/lib/autoGenerateSlides';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import type { SeleçãoAção, SessionContext, PontoEsboço } from '@/types/copilotOutline';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const SUGESTÕES = [
  'Como foi a história de Sansão?',
  'Explique Romanos 8',
  'Crie um sermão sobre fé',
  'Faça um estudo sobre Davi',
  'Explique Apocalipse 21',
  'Monte um estudo para célula',
  'Explique João 3:16',
  'Crie um esboço sobre oração',
  'Encontre referências cruzadas',
  'Explique o contexto histórico',
];

function getSaudação(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia!';
  if (hora < 18) return 'Boa tarde!';
  return 'Boa noite!';
}

/** Gera chave de cache (mesma fórmula do edge function — precisa bater) */
function buildCacheKey(systemPrompt: string, lastUserMsg: string): string {
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${norm(systemPrompt).slice(0, 80)}|${norm(lastUserMsg)}`;
}

interface ChatContainerProps {
  onTogglePanel?: () => void;
  onEsboçoPending?: (pending: boolean) => void;
}

export function ChatContainer({ onTogglePanel, onEsboçoPending }: ChatContainerProps) {
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamContent, setStreamContent] = useState('');
  const [streamId, setStreamId] = useState<string | null>(null);

  // ── Gravação de voz (Web Speech API) ──────────────────────────────────
  const speech = useSpeechRecognition('pt-BR');
  // Quando o usuário para de gravar, coloca o texto no input (pode editar)
  useEffect(() => {
    if (!speech.isListening && speech.transcript) {
      setInput(prev => {
        const novo = speech.transcript.trim();
        if (!novo) return prev;
        return prev ? prev + ' ' + novo : novo;
      });
      // Limpa o buffer depois de jogar pro input
      window.setTimeout(() => speech.reset(), 100);
    }
  }, [speech.isListening]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [improvingId, setImprovingId] = useState<string | null>(null);
  const [modo, setModo] = useState<'chat' | 'sermon'>('chat');
  const [sermonAtivado, setSermonAtivado] = useState(false);
  const [selection, setSelection] = useState<{
    text: string;
    position: { x: number; y: number };
    messageId: string;
    ação?: SeleçãoAção;
  } | null>(null);

  const [folderPickerState, setFolderPickerState] = useState<{
    ação: SeleçãoAção;
    açãoLabel: string;
    açãoIcon: string;
    texto: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const outline = useCopilotOutlineStore();

  const sessoes = useLiveQuery(() => aiDB.sessoes.orderBy('updatedAt').reverse().limit(20).toArray(), []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [mensagens, loading, scrollToBottom]);

  const carregarSessao = useCallback(async (sessao: Sessao) => {
    setSessaoId(sessao.id);
    const msgs = await listarMensagens(sessao.id);
    setMensagens(msgs as unknown as ChatMessage[]);
    setSidebarAberta(false);
  }, []);

  const novaSessao = useCallback(async () => {
    const sessao = await obterOuCriarSessao();
    setSessaoId(sessao.id);
    outline.setConversaId(sessao.id);
    setMensagens([]);
    setSidebarAberta(false);
  }, [outline]);

  const deletarSessao = useCallback(async (id: string) => {
    await excluirSessao(id);
    if (sessaoId === id) { await novaSessao(); }
  }, [sessaoId, novaSessao]);

  // ─── Seleção de texto ───────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) { setSelection(null); return; }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelection({
        text: sel.toString().trim(),
        position: { x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 8 },
        messageId: '',
      });
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // ─── Parsing do outline (sermon mode) ──────────────────────────────────
  const parseRespostaParaOutline = useCallback((content: string) => {
    const store = useCopilotOutlineStore.getState();
    const patch: Partial<SessionContext> = {};

    const tituloMatch = content.match(/^#?\s*(?:Título|Title)[:\s]+(.+)/im);
    if (tituloMatch && !store.titulo) patch.titulo = tituloMatch[1].trim();

    const subtituloMatch = content.match(/Subtítulo|Subtítulo|Subtitulo[:\s]+(.+)/im);
    if (subtituloMatch && !store.subtitulo) patch.subtitulo = subtituloMatch[1].trim();

    const temaMatch = content.match(/^[*_]?Tema[*_]?[:\s]+(.+)/im);
    if (temaMatch && !store.tema) patch.tema = temaMatch[1].trim();

    const textoMatch = content.match(/Text[oO]\s*(?:Base|base)[:\s]+(.+)/im);
    if (textoMatch && !store.textoBase) patch.textoBase = textoMatch[1].trim();

    const pontoRegex = /^[#]?\s*(?:\d+[.)]\s*|\-\s*)(.+)/gm;
    let match;
    const novosPontos: PontoEsboço[] = [];
    while ((match = pontoRegex.exec(content)) !== null) {
      const pontoTexto = match[1].trim();
      if (pontoTexto.length > 10 && pontoTexto.length < 200) {
        const existe = store.pontos.some(p => p.texto === pontoTexto) || novosPontos.some(p => p.texto === pontoTexto);
        if (!existe) {
          novosPontos.push({ id: crypto.randomUUID(), texto: pontoTexto, subpontos: [], aplicacoes: [] });
        }
      }
    }
    if (novosPontos.length > 0) patch.pontos = [...store.pontos, ...novosPontos];

    if (content.includes('Introdução') || content.includes('## Introdução')) {
      const introMatch = content.match(/Introdução[:\s]*\n([\s\S]+?)(?=\n##|\n#|$)/i);
      if (introMatch && !store.introducao) patch.introducao = introMatch[1].trim().slice(0, 500);
    }

    if (content.includes('Conclusão') || content.includes('## Conclusão')) {
      const conclMatch = content.match(/Conclus(?:ão|ao)[:\s]*\n([\s\S]+?)(?=\n##|\n#|$)/i);
      if (conclMatch && !store.conclusao) patch.conclusao = conclMatch[1].trim().slice(0, 500);
    }

    if (Object.keys(patch).length > 0) store.importar(patch);
  }, []);

  // ─── Stream SSE genérico (com acumulador de conteúdo) ───────────────────
  const streamSSE = useCallback((
    res: Response,
    assistantId: string,
  ): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      if (!res.body) { reject(new Error('Resposta vazia.')); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const evt of events) {
            const data = evt.replace(/^data:\s*/, '').trim();
            if (!data || data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data) as { content?: string; error?: string; message?: string };
              if (parsed.error) throw new Error(parsed.message ?? parsed.error);
              if (parsed.content) {
                acc += parsed.content;
                setStreamContent(prev => prev + parsed.content!);
                setMensagens(prev => {
                  const exists = prev.some(m => m.id === assistantId);
                  if (exists) {
                    return prev.map(m => m.id === assistantId ? { ...m, content: m.content + parsed.content! } : m);
                  } else {
                    return [...prev, { id: assistantId, role: 'assistant' as const, content: acc, timestamp: Date.now() }];
                  }
                });
              }
            } catch { /* skip */ }
          }
        }
      } catch (err) { reject(err); return; }

      resolve(acc);
    });
  }, []);

  // ─── Enviar mensagem — DUAL PATH ───────────────────────────────────────
  const enviarMensagem = useCallback(async (texto?: string) => {
    const textoFinal = (texto ?? input).trim();
    if (!textoFinal || loading) return;

    // 1. Detectar intenção (síncrono, <1ms)
    const intent = detectarIntencao(textoFinal);
    const isSermonMode = intent.modo === 'sermon';
    setModo(isSermonMode ? 'sermon' : 'chat');

    if (isSermonMode) setSermonAtivado(true);
    if (isSermonMode) onEsboçoPending?.(true);

    // 2. Setup de sessão
    let sid = sessaoId;
    if (!sid) {
      const sessao = await obterOuCriarSessao();
      sid = sessao.id;
      setSessaoId(sid);
      outline.setConversaId(sid);
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: textoFinal, timestamp: Date.now() };
    const todasMensagens = [...mensagens, userMsg];
    setMensagens(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);
    setStreamContent('');
    const assistantId = crypto.randomUUID();
    setStreamId(assistantId);

    await adicionarMensagem(sid, 'user', textoFinal);
    await atualizarSessao(sid, {});

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // ════════════════════════════════════════════════════════
      // CAMINHO RÁPIDO — Chat mode (sem contexto, sem esboço)
      // ════════════════════════════════════════════════════════
      if (!isSermonMode) {
        const systemPrompt = SYSTEM_PROMPT_CHAT;
        const cacheK = buildCacheKey(systemPrompt, textoFinal);

        // 2a. Cache local (instantâneo — 0ms de rede)
        const cachedResp = await obterCache(cacheK);
        if (cachedResp) {
          const cachedMsg: ChatMessage = { id: assistantId, role: 'assistant', content: cachedResp, timestamp: Date.now() };
          setMensagens(prev => [...prev.slice(0, -1), cachedMsg]);
          setLoading(false);
          setStreamId(null);
          await adicionarMensagem(sid, 'assistant', cachedResp);
          await atualizarSessao(sid, {});
          return;
        }

        // 2b. Vercel Edge Function — cold start ~50ms (vs ~8s do Supabase)
        const messagesForApi = todasMensagens.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        const timeoutId = window.setTimeout(() => controller.abort(), 90_000);
        let chatRes: Response | null = null;
        try {
          chatRes = await fetch('/api/chat-fast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-stream': 'true' },
            body: JSON.stringify({ messages: messagesForApi, systemPrompt, temperature: 0.7, maxTokens: 600 }),
            signal: controller.signal,
          });
        } catch { /* rede falhou — cai pro fallback abaixo */ }

        // Fallback: Supabase ai-chat (modo chat) — cobre dev local (Vite não
        // serve /api/*) e qualquer indisponibilidade da função Vercel.
        if (!chatRes || !chatRes.ok) {
          const supabaseLib = await import('@/lib/supabase');
          const sb = supabaseLib.supabase();
          const { data: sessData } = await sb?.auth.getSession() ?? {};
          const userToken = (sessData?.session as { access_token?: string } | null | undefined)?.access_token;
          const token = userToken ?? supabaseLib.SUPABASE_ANON_KEY;
          if (!token) throw new Error('Não autenticado');

          chatRes = await fetch(`${supabaseLib.SUPABASE_URL}/functions/v1/ai-chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'apikey': supabaseLib.SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              messages: messagesForApi,
              stream: true,
              temperature: 0.7,
              maxTokens: 600,
              modo: 'chat',
              systemPrompt,
            }),
            signal: controller.signal,
          });
        }
        window.clearTimeout(timeoutId);

        if (!chatRes.ok) {
          const errData = await chatRes.json().catch(() => ({})) as { error?: string; message?: string };
          throw new Error(errData.message ?? errData.error ?? `Erro HTTP ${chatRes.status}`);
        }

        const acc = await streamSSE(chatRes, assistantId);

        // Salva no cache IndexedDB (24h) + persiste mensagem
        if (acc) {
          await salvarCache(cacheK, acc).catch(() => {});
          await adicionarMensagem(sid, 'assistant', acc);
          await atualizarSessao(sid, {});
        }
        setLoading(false);
        setStreamContent('');
        setStreamId(null);
        return;
      }

      // ════════════════════════════════════════════════════════
      // CAMINHO COMPLETO — Sermon mode (contexto + parsing + esboço)
      // ════════════════════════════════════════════════════════
      const contextoMemoria = construirContextoMemoria(useCopilotOutlineStore.getState());
      const systemPrompt = SYSTEM_PROMPT;
      const systemAppend = contextoMemoria
        ? `${contextoMemoria}\n\n${SERMON_PARSING_INSTRUCTION}`
        : SERMON_PARSING_INSTRUCTION;

      const supabaseLib = await import('@/lib/supabase');
      const sb = supabaseLib.supabase();
      const { data: sessData } = await sb?.auth.getSession() ?? {};
      const userToken = (sessData?.session as { access_token?: string } | null | undefined)?.access_token;
      const token = userToken ?? supabaseLib.SUPABASE_ANON_KEY;
      if (!token) throw new Error('Não autenticado');

      const messagesForApi = todasMensagens.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const timeoutId = window.setTimeout(() => controller.abort(), 120_000);
      const res = await fetch(`${supabaseLib.SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'apikey': supabaseLib.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          messages: messagesForApi,
          stream: true,
          temperature: 0.7,
          maxTokens: 2500,
          modo: 'sermon',
          systemPrompt,
          session_context: useCopilotOutlineStore.getState(),
          systemAppend,
        }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(errData.message ?? `Erro HTTP ${res.status}`);
      }

      const acc = await streamSSE(res, assistantId);

      parseRespostaParaOutline(acc);
      await adicionarMensagem(sid, 'assistant', acc);
      await atualizarSessao(sid, {});
      setLoading(false);
      setStreamContent('');
      setStreamId(null);
      onEsboçoPending?.(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
      setLoading(false);
      const errorMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: `⚠️ Não consegui responder: ${msg}`, timestamp: Date.now() };
      setMensagens(prev => [...prev, errorMsg]);
      await adicionarMensagem(sid, 'assistant', errorMsg.content).catch(() => {});
      setStreamContent('');
      setStreamId(null);
      if (isSermonMode) onEsboçoPending?.(false);
    }
  }, [input, loading, sessaoId, mensagens, streamSSE, parseRespostaParaOutline, outline, onEsboçoPending]);

  const cancelarStream = () => {
    abortRef.current?.abort();
    setLoading(false);
    setStreamContent('');
    setStreamId(null);
    setMensagens(prev => prev.filter(m => m.id !== streamId));
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

  const adicionarAoEsboco = (msg: ChatMessage) => {
    setFolderPickerState({
      ação: 'adicionar_esboco',
      açãoLabel: 'Adicionar ao Esboço',
      açãoIcon: '📋',
      texto: msg.content,
    });
  };

  const melhorarResposta = async (msg: ChatMessage) => {
    if (loading || improvingId) return;
    const improvePrompt = `Analise e melhore esta resposta bíblica/teológica. A resposta atual é:\n\n${msg.content}\n\nPor favor, melhore: corrija imprecisões teológicas, enriqueça com mais detalhes bíblicos (versículos, contexto histórico), melhore a clareza e organização, e adicione aplicações práticas relevantes. Responda em português brasileiro, com formatação clara usando markdown (## Títulos, **negrito**, listas).`;

    // Add "improving" user message and re-send
    setImprovingId(msg.id);
    setInput(improvePrompt);
    inputRef.current?.focus();
  };

  const handleSugestão = (sug: string) => {
    setInput(sug);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarAberta(s => !s)}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 dark:hover:bg-sky-100 md:hidden"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-ink-900 dark:text-white">
                Assistente Ministerial
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                {loading ? 'Digitando…' : 'Online'}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void novaSessao()}
            className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-[12px] font-medium text-ink-600 hover:bg-ink-50 dark:border-sky-300 dark:bg-sky-100 dark:text-sky-700 dark:hover:bg-sky-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo
          </button>
          {onTogglePanel && (
            <button
              onClick={onTogglePanel}
              className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-[12px] font-medium text-ink-600 hover:bg-ink-50 dark:border-sky-300 dark:bg-sky-100 dark:text-sky-700 dark:hover:bg-sky-200"
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Esboço</span>
            </button>
          )}
        </div>
      </div>

      {/* Sidebar de sessões (mobile overlay) */}
      <AnimatePresence>
        {sidebarAberta && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-paper dark:bg-sky-50 shadow-2xl md:hidden"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
                <h2 className="text-[14px] font-semibold text-ink-900 dark:text-white">Conversas</h2>
                <button onClick={() => setSidebarAberta(false)} className="rounded-lg p-1 text-ink-500">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              <div className="p-3">
                <button
                  onClick={() => void novaSessao()}
                  className="flex w-full items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 py-2.5 text-[12px] text-ink-600 hover:bg-ink-50 dark:border-sky-300 dark:text-sky-700 dark:hover:bg-sky-100"
                >
                  <Plus className="h-4 w-4" /> Nova conversa
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-4">
                {(sessoes ?? []).map(s => (
                  <button
                    key={s.id}
                    onClick={() => void carregarSessao(s)}
                    className={cn(
                      'group mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[12.5px] transition-colors',
                      sessaoId === s.id
                        ? 'bg-sky-100 text-sky-900 dark:bg-sky-200 dark:text-sky-900'
                        : 'text-ink-600 hover:bg-ink-50 dark:text-sky-700 dark:hover:bg-sky-100',
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{s.titulo}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); void deletarSessao(s.id); }}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-ink-400 hover:text-red-500" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {mensagens.length === 0 && !loading && (
          <Greeting onSugestão={handleSugestão} />
        )}

        {mensagens.map(msg => (
          <div key={msg.id} className="mb-4 flex animate-fade-in" data-message-id={msg.id}>
            <div
              className={cn(
                'group relative max-w-[88%] rounded-2xl px-4 pt-3 pb-2 text-[13.5px] leading-relaxed',
                msg.role === 'user'
                  ? 'ml-auto bg-sky-100 text-sky-900 dark:bg-sky-200 dark:text-sky-900'
                  : 'border border-ink-200 bg-white text-ink-900 dark:border-ink-700 dark:bg-sky-50 dark:text-ink-900',
              )}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer
                  content={msg.content}
                  onCopySection={(text) => {
                    navigator.clipboard.writeText(text).catch(() => {});
                  }}
                  onShareSection={(text) => {
                    if (navigator.share) {
                      navigator.share({ text }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(text).catch(() => {});
                    }
                  }}
                  onAddSectionToOutline={(text, title) => {
                    // Adiciona o conteúdo da seção como ponto/observação no esboço atual
                    const store = useCopilotOutlineStore.getState();
                    const novoPonto = {
                      id: crypto.randomUUID(),
                      texto: `${title}\n\n${text}`.trim(),
                      subpontos: [],
                      aplicacoes: [],
                    };
                    store.importar({ pontos: [...store.pontos, novoPonto] });
                    void autoGenerateSlides(store).catch(() => {});
                  }}
                />
              </div>

              {msg.role === 'assistant' && (
                <div className="mt-3 border-t border-ink-100 pt-2 dark:border-ink-200">
                  {/* Meta row */}
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10.5px] text-ink-400">
                      {formatarRelativo(msg.timestamp)}
                    </span>
                    {improvingId === msg.id && (
                      <span className="flex items-center gap-1 text-[10.5px] text-amber-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Melhorando…
                      </span>
                    )}
                  </div>

                  {/* Action bar — sempre visível */}
                  <div className="flex flex-wrap items-center gap-1">
                    {/* Copiar */}
                    <ActionBtn
                      icon={copiadoId === msg.id ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      label={copiadoId === msg.id ? 'Copiado!' : 'Copiar'}
                      onClick={() => copiarMensagem(msg.id, msg.content)}
                      variant={copiadoId === msg.id ? 'success' : 'ghost'}
                    />

                    {/* Compartilhar */}
                    <ActionBtn
                      icon={<Share2 className="h-3.5 w-3.5" />}
                      label="Compartilhar"
                      onClick={() => compartilharMensagem(msg.content)}
                      variant="ghost"
                    />

                    {/* Adicionar ao esboço */}
                    <ActionBtn
                      icon={<BookOpen className="h-3.5 w-3.5" />}
                      label="Adicionar"
                      onClick={() => adicionarAoEsboco(msg)}
                      variant="ghost"
                    />

                    {/* Melhorar */}
                    <ActionBtn
                      icon={improvingId === msg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      label="Melhorar"
                      onClick={() => melhorarResposta(msg)}
                      variant="ghost"
                      disabled={loading || !!improvingId}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && !streamContent && (
          <div className="mb-4 flex justify-start animate-fade-in">
            <div className="flex items-start gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-3 dark:border-ink-700 dark:bg-sky-50/50">
              <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-ink-400" />
              <span className="text-[13px] text-ink-500">Pensando…</span>
              <button
                onClick={cancelarStream}
                className="ml-2 rounded-lg border border-ink-200 px-2 py-1 text-[11px] hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Erro na resposta</p>
              <p className="text-[12px] opacity-80">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input — Layout ChatGPT */}
      <div className="border-t border-ink-200/70 bg-white px-3 py-3 dark:border-ink-700 dark:bg-sky-50 sm:px-4 sm:py-4">
        {/* Faixa de transcrição em tempo real (durante gravação) */}
        <AnimatePresence>
          {speech.isListening && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden rounded-xl border border-red-200 bg-red-50/60 dark:border-red-700/40 dark:bg-red-900/10"
            >
              <div className="flex items-start gap-2 px-3 py-2.5">
                <div className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-300">
                    Gravando… clique no ■ para concluir
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-700 dark:text-ink-100">
                    {speech.interimTranscript || speech.transcript || <span className="opacity-50">Fale agora…</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => speech.stop()}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition-all hover:bg-red-600 active:scale-95"
                  aria-label="Concluir gravação"
                >
                  <Square className="h-3 w-3 fill-current" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Erro de voz */}
        {speech.error && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1">{speech.error}</span>
            <button
              type="button"
              onClick={() => speech.reset()}
              className="text-amber-700/70 hover:text-amber-700 dark:text-amber-200/70 dark:hover:text-amber-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div
          className={cn(
            'flex items-end gap-1.5 rounded-3xl border bg-white px-3 py-2.5 transition-all',
            speech.isListening
              ? 'border-red-300 ring-2 ring-red-200 dark:border-red-700/60 dark:bg-sky-100/80 dark:ring-red-900/30'
              : 'border-ink-200 focus-within:border-ink-400 dark:border-ink-700 dark:bg-sky-100/60 dark:focus-within:border-sky-400',
          )}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !speech.isListening) {
                e.preventDefault();
                void enviarMensagem();
              }
            }}
            placeholder={
              speech.isListening
                ? 'Fale algo…'
                : 'Pergunte qualquer coisa sobre a Bíblia...'
            }
            rows={1}
            disabled={speech.isListening}
            className="flex-1 resize-none bg-transparent px-1 text-[14.5px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-400 disabled:opacity-60 dark:text-ink-900 dark:placeholder:text-ink-500"
            style={{ maxHeight: '160px' }}
          />

          {/* Mic — ChatGPT style */}
          {speech.isSupported && !loading && (
            <button
              type="button"
              onClick={() => (speech.isListening ? speech.stop() : speech.start())}
              className={cn(
                'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all',
                speech.isListening
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-sky-700 dark:hover:bg-sky-200 dark:hover:text-sky-900',
              )}
              aria-label={speech.isListening ? 'Concluir gravação' : 'Gravar áudio'}
              title={speech.isListening ? 'Concluir' : 'Falar'}
            >
              {speech.isListening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
            </button>
          )}

          {/* Send */}
          <button
            type="button"
            onClick={() => void enviarMensagem()}
            disabled={!input.trim() || loading || speech.isListening}
            className={cn(
              'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all',
              input.trim() && !loading && !speech.isListening
                ? 'bg-ink-900 text-white hover:bg-ink-800 active:scale-95 dark:bg-ink-900 dark:text-white'
                : 'bg-ink-100 text-ink-400 dark:bg-sky-200 dark:text-sky-400',
            )}
            aria-label="Enviar"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10.5px] text-ink-400 dark:text-ink-500">
          {speech.isListening
            ? 'Fale com clareza. O texto aparece abaixo em tempo real.'
            : 'IA pode cometer erros. Verifique sempre as referências bíblicas. Enter para enviar · Shift+Enter para nova linha.'}
        </p>
      </div>

      {/* Selection menu */}
      {selection && (
        <SelectionMenu
          selectedText={selection.text}
          position={selection.position}
          onAction={(ação, _texto) => {
            setSelection(null);
            const açõesDeEsboço: SeleçãoAção[] = [
              'adicionar_esboco', 'adicionar_introducao', 'adicionar_ponto',
              'adicionar_subponto', 'adicionar_aplicacao', 'adicionar_ilustracao',
              'adicionar_conclusao', 'adicionar_referencia',
            ];
            if (!açõesDeEsboço.includes(ação as SeleçãoAção)) return;

            const AÇÃO_LABELS: Record<string, string> = {
              adicionar_esboco: 'Adicionar ao Esboço',
              adicionar_introducao: 'Adicionar como Introdução',
              adicionar_ponto: 'Adicionar como Ponto',
              adicionar_subponto: 'Adicionar como Subponto',
              adicionar_aplicacao: 'Adicionar Aplicação',
              adicionar_ilustracao: 'Adicionar Ilustração',
              adicionar_conclusao: 'Adicionar como Conclusão',
              adicionar_referencia: 'Adicionar Referência',
            };
            const AÇÃO_ICONS: Record<string, string> = {
              adicionar_esboco: '📋',
              adicionar_introducao: '📖',
              adicionar_ponto: '1️⃣',
              adicionar_subponto: '2️⃣',
              adicionar_aplicacao: '✅',
              adicionar_ilustracao: '💡',
              adicionar_conclusao: '🏁',
              adicionar_referencia: '📚',
            };
            setFolderPickerState({
              ação,
              açãoLabel: AÇÃO_LABELS[ação] ?? ação,
              açãoIcon: AÇÃO_ICONS[ação] ?? '📋',
              texto: selection.text,
            });
          }}
          onClose={() => setSelection(null)}
        />
      )}

      {/* Folder picker */}
      <AnimatePresence>
        {folderPickerState && (
          <FolderPicker
            textoSelecionado={folderPickerState.texto}
            açãoLabel={folderPickerState.açãoLabel}
            açãoIcon={folderPickerState.açãoIcon}
            onConfirm={async () => {
              setFolderPickerState(null);
              try {
                const store = useCopilotOutlineStore.getState();
                await autoGenerateSlides(store);
              } catch (err) {
                console.warn('[autoGenerateSlides]', err);
              }
            }}
            onClose={() => setFolderPickerState(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ActionBtn — botão da barra de ações ───────────────────────────────

function ActionBtn({
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
        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium transition-all active:scale-95',
        variant === 'success'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800/60 dark:hover:text-ink-200',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ─── Greeting ──────────────────────────────────────────────────────────────

function Greeting({ onSugestão }: { onSugestão: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
        <Sparkles className="h-8 w-8" />
      </div>
      <h2 className="mb-1.5 text-[18px] font-semibold text-ink-900 dark:text-white">
        {getSaudação()}
      </h2>
      <p className="mb-5 max-w-sm text-[13.5px] text-ink-500 dark:text-ink-400">
        Como posso ajudar na preparação da sua mensagem hoje?
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGESTÕES.map(sug => (
          <button
            key={sug}
            onClick={() => onSugestão(sug)}
            className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11.5px] text-ink-600 transition-colors hover:border-ink-400 hover:bg-ink-50 dark:border-sky-300 dark:bg-sky-100 dark:text-sky-700 dark:hover:bg-sky-200"
          >
            {sug}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Markdown renderer — agora em ./MarkdownRenderer.tsx ────────────────────
