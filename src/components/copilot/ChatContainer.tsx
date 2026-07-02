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
  BookOpen, ArrowRight, PanelRightOpen,
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
import { autoGenerateSlides } from '@/lib/autoGenerateSlides';
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
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
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
        const vercelRes = await fetch('/api/chat-fast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-stream': 'true' },
          body: JSON.stringify({ messages: messagesForApi, systemPrompt, temperature: 0.7, maxTokens: 600 }),
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);

        if (!vercelRes.ok) {
          const errData = await vercelRes.json().catch(() => ({})) as { error?: string };
          throw new Error(errData.error ?? `Erro HTTP ${vercelRes.status}`);
        }

        const acc = await streamSSE(vercelRes, assistantId);

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
                'group relative max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed',
                msg.role === 'user'
                  ? 'ml-auto bg-sky-100 text-sky-900 dark:bg-sky-200 dark:text-sky-900'
                  : 'border border-ink-200 bg-white text-ink-900 dark:border-ink-700 dark:bg-sky-50 dark:text-ink-900',
              )}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={msg.content} />
              </div>
              {msg.role === 'assistant' && (
                <div className="mt-2 flex items-center gap-2 border-t border-ink-100 pt-1.5 dark:border-ink-800">
                  <span className="text-[10.5px] text-ink-400">
                    {formatarRelativo(msg.timestamp)}
                  </span>
                  <button
                    onClick={() => copiarMensagem(msg.id, msg.content)}
                    title="Copiar"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    {copiadoId === msg.id ? (
                      <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-ink-400" />
                    )}
                  </button>
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

      {/* Input */}
      <div className="border-t border-ink-200/70 bg-white px-4 py-3 dark:border-ink-800 dark:bg-sky-50">
        <div className="flex items-end gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-3 transition-colors focus-within:border-ink-400 dark:border-ink-700 dark:bg-sky-50/80">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void enviarMensagem();
              }
            }}
            placeholder="Pergunte qualquer coisa sobre a Bíblia..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-400"
            style={{ maxHeight: '140px' }}
          />
          <button
            onClick={() => void enviarMensagem()}
            disabled={!input.trim() || loading}
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-all',
              input.trim() && !loading
                ? 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900'
                : 'bg-ink-100 text-ink-400 dark:bg-sky-100 dark:text-sky-300',
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10.5px] text-ink-400">
          {modo === 'chat' ? 'Resposta rápida — sem contexto de esboço.' : 'Modo pregação — criando esboço.'} Verifique sempre as referências bíblicas.
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

// ─── Markdown renderer simples ─────────────────────────────────────────────

function MarkdownRenderer({ content }: { content: string }) {
  const parts = parseMarkdown(content);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.type === 'h1') return <h1 key={i} className="text-[16px] font-bold text-ink-900 dark:text-white">{part.text}</h1>;
        if (part.type === 'h2') return <h2 key={i} className="text-[15px] font-semibold text-ink-900 dark:text-white">{part.text}</h2>;
        if (part.type === 'h3') return <h3 key={i} className="text-[13.5px] font-semibold text-ink-800 dark:text-white">{part.text}</h3>;
        if (part.type === 'li') return <li key={i} className="ml-4 list-disc text-[13px] text-ink-700 dark:text-ink-200">{part.text}</li>;
        if (part.type === 'bold') return <strong key={i} className="font-semibold text-ink-900 dark:text-white">{part.text}</strong>;
        if (part.type === 'italic') return <em key={i} className="italic text-ink-600 dark:text-ink-300">{part.text}</em>;
        if (part.type === 'code') return <code key={i} className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[12px] text-ink-800 dark:bg-ink-800 dark:text-ink-200">{part.text}</code>;
        if (part.type === 'ref') return <span key={i} className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[12px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{part.text}</span>;
        return <p key={i} className="text-[13.5px] leading-relaxed text-ink-700 dark:text-ink-200">{part.text}</p>;
      })}
    </div>
  );
}

function parseMarkdown(content: string): Array<{ type: string; text: string }> {
  const parts: Array<{ type: string; text: string }> = [];
  const lines = content.split('\n');
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) { inList = false; parts.push({ type: 'blank', text: '' }); }
      continue;
    }
    if (trimmed.startsWith('# ')) {
      parts.push({ type: 'h1', text: trimmed.slice(2).replace(/\*\*(.+?)\*\*/g, '$1') });
    } else if (trimmed.startsWith('## ')) {
      parts.push({ type: 'h2', text: trimmed.slice(3).replace(/\*\*(.+?)\*\*/g, '$1') });
    } else if (trimmed.startsWith('### ')) {
      parts.push({ type: 'h3', text: trimmed.slice(4).replace(/\*\*(.+?)\*\*/g, '$1') });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      parts.push({ type: 'li', text: trimmed.slice(2) });
      inList = true;
    } else if (/^\d+\)\s/.test(trimmed)) {
      parts.push({ type: 'li', text: trimmed.replace(/^\d+\)\s/, '') });
      inList = true;
    } else {
      if (inList) inList = false;
      let processed = trimmed
        .replace(/\*\*(.+?)\*\*/g, '§§bold§§$1§§endbold§§')
        .replace(/\*(.+?)\*/g, '§§italic§§$1§§enditalic§§')
        .replace(/`(.+?)`/g, '§§code§§$1§§endcode§§');
      processed = processed.replace(/([\w\s]+:\s*)([\d]+[,:;\s\d]+)/g, '§§ref§§$1$2§§endref§§');
      // O split precisa incluir também os marcadores de fechamento — senão
      // "§§endref§§" fica colado no texto e aparece cru na tela.
      const segments = processed.split(/§§(bold|endbold|italic|enditalic|code|endcode|ref|endref)§§/);
      let currentType = 'text';
      for (const seg of segments) {
        if (seg === 'bold') { currentType = 'bold'; continue; }
        if (seg === 'endbold') { currentType = 'text'; continue; }
        if (seg === 'italic') { currentType = 'italic'; continue; }
        if (seg === 'enditalic') { currentType = 'text'; continue; }
        if (seg === 'code') { currentType = 'code'; continue; }
        if (seg === 'endcode') { currentType = 'text'; continue; }
        if (seg === 'ref') { currentType = 'ref'; continue; }
        if (seg === 'endref') { currentType = 'text'; continue; }
        if (seg) parts.push({ type: currentType, text: seg });
      }
    }
  }
  return parts;
}
