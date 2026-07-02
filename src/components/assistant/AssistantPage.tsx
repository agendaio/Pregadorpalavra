import { useEffect, useRef, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Send, Sparkles, BookOpen, X, ChevronDown, Plus,
  RotateCcw, Trash2, Copy, CheckCheck, AlertCircle, Loader2,
  MessageSquare, Users, Clock, User, ArrowRight, UsersRound,
  ScrollText, Info, Calendar, Star,
} from 'lucide-react';
import { supabase, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { aiDB } from '@/lib/ai';
import { useUIStore } from '@/stores/ui';
import { cn, formatarRelativo } from '@/lib/utils';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { buscarPersonagens, CATEGORIAS, type PersonagemBiblico } from '@/lib/personagens';

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
  agenteId?: string;
  agenteNome?: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Componente principal ───────────────────────────────────────────────────

export function AssistantPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'personagens'>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentes, setAgentes] = useState<Array<{ id: string; nome: string; icon: string; cor: string }>>([]);
  const [agenteSelecionado, setAgenteSelecionado] = useState<string | null>(null);
  const [personagemBusca, setPersonagemBusca] = useState('');
  const [filtroTestamento, setFiltroTestamento] = useState<'todos' | 'AT' | 'NT'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [showSessoes, setShowSessoes] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Carregar sessões do IndexedDB
  const sessoes = useLiveQuery(() =>
    aiDB.sessoes.orderBy('updatedAt').reverse().limit(30).toArray() as Promise<ChatSession[]>,
  );

  // Carregar agentes do Supabase
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    sb
      .from('ia_agents')
      .select('id, nome, icon, cor')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }: { data: typeof agentes | null }) => {
        if (data) setAgentes(data);
      });
  }, []);

  // Criar nova sessão
  const criarSessao = useCallback(async (agente?: { id: string; nome: string; icon: string }) => {
    const sessao: ChatSession = {
      id: crypto.randomUUID(),
      titulo: `Conversa ${new Date().toLocaleDateString('pt-BR')}`,
      agenteId: agente?.id,
      agenteNome: agente?.nome,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await aiDB.sessoes.put(sessao);
    setSessionId(sessao.id);
    setMessages([]);
    setShowSessoes(false);
  }, []);

  // Carregar sessão existente
  const carregarSessao = useCallback(async (sessao: ChatSession) => {
    setSessionId(sessao.id);
    const msgs = await aiDB.mensagens
      .where('sessaoId')
      .equals(sessao.id)
      .sortBy('timestamp') as unknown as ChatMessage[];
    setMessages(msgs ?? []);
    setAgenteSelecionado(sessao.agenteId ?? null);
    setShowSessoes(false);
  }, []);

  // Deletar sessão
  const deletarSessao = async (id: string) => {
    await aiDB.sessoes.delete(id);
    await aiDB.mensagens.where('sessaoId').equals(id).delete();
    if (sessionId === id) {
      setSessionId(null);
      setMessages([]);
    }
  };

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Enviar mensagem (com streaming SSE)
  const enviarMensagem = async () => {
    const texto = input.trim();
    if (!texto || loading) return;

    let currentSessionId = sessionId;

    // Criar sessão se não existir — aguarda criação antes de prosseguir
    if (!currentSessionId) {
      const agente = agentes.find((a) => a.id === agenteSelecionado);
      await criarSessao(agente);
      // Busca a sessão recém-criada pelo updatedAt mais recente
      currentSessionId = (await aiDB.sessoes.orderBy('updatedAt').reverse().first())?.id ?? null;
      if (currentSessionId) setSessionId(currentSessionId);
    }

    if (!currentSessionId) {
      setError('Não foi possível criar sessão. Tente novamente.');
      setLoading(false);
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
      // Persistir mensagem do usuário imediatamente
      await aiDB.mensagens.put({ sessaoId: currentSessionId, ...userMsg });
      await aiDB.sessoes.update(currentSessionId, { updatedAt: Date.now() });

      // Montar histórico com a nova mensagem do usuário
      const todasMensagens = [...messages, userMsg];

      // Persistir mensagem do usuário
      await aiDB.mensagens.put({ sessaoId: currentSessionId, ...userMsg });
      await aiDB.sessoes.update(currentSessionId, { updatedAt: Date.now() });

      const chatHistory = todasMensagens.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Chamar Edge Function — usa token do usuário logado, ou ANON_KEY se não estiver logado
      const sb = supabase();
      const { data: sessData } = await sb?.auth.getSession() ?? {};
      const userToken = (sessData?.session as { access_token?: string } | null | undefined)?.access_token;
      // Usa token do usuário logado; se não estiver logado, usa ANON_KEY (funciona com RLS configurado)
      const token = userToken ?? SUPABASE_ANON_KEY;

      // Timeout de 120s — streaming de IA pode demorar na primeira requisição
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, 120_000);
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
              agente_id: agenteSelecionado,
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
          throw new Error('Tempo esgotado (2 min). A API está demorando demais. Tente uma pergunta mais curta.');
        }
        throw fetchErr;
      }

      window.clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(errData.message ?? `HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error('Resposta vazia do servidor. Tente novamente.');
      }

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[ai-chat] Erro na stream:', msg);
      // Remove mensagem placeholder da IA se existir
      setMessages((prev) => prev.filter((m) => m.id !== streamId));
      setError(msg);
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

  const personagensFiltrados = buscarPersonagens(personagemBusca).filter((p) => {
    if (filtroTestamento !== 'todos' && p.testamento !== filtroTestamento) return false;
    if (filtroCategoria !== 'todas' && p.categoria !== filtroCategoria) return false;
    return true;
  });

  const agenteAtivo = agentes.find((a) => a.id === agenteSelecionado);

  return (
    <div className="flex h-full flex-col bg-paper dark:bg-paper-dark">
      <MobileHeader
        title="Estudo"
        subtitle="Assistente Ministerial"
        back
        right={
          <button
            onClick={() => setShowSessoes(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800/60"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar de sessões (desktop) */}
        <AnimatePresence>
          {showSessoes && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden flex-shrink-0 overflow-hidden border-r border-ink-200/70 bg-paper dark:border-ink-800 dark:bg-paper-dark md:flex md:w-[280px]"
            >
              <div className="flex w-[280px] flex-col">
                <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3">
                  <h3 className="text-[13px] font-semibold text-ink-900 dark:text-white">Conversas</h3>
                  <button
                    onClick={() => setShowSessoes(false)}
                    className="rounded-lg p-1 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => void criarSessao()}
                  className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 py-2.5 text-[12.5px] text-ink-600 transition-colors hover:border-ink-400 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300"
                >
                  <Plus className="h-4 w-4" /> Nova conversa
                </button>
                <div className="flex-1 overflow-y-auto px-3 py-2">
                  {(sessoes ?? []).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => void carregarSessao(s)}
                      className={cn(
                        'group mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[12.5px] transition-colors',
                        sessionId === s.id
                          ? 'bg-ink-100 text-ink-900 dark:bg-ink-800/60 dark:text-white'
                          : 'text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800/40',
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
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Conteúdo principal */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-ink-200/70 bg-white dark:bg-ink-900/30">
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-[13px] font-medium transition-colors',
                activeTab === 'chat'
                  ? 'border-ink-900 text-ink-900 dark:border-white dark:text-white'
                  : 'border-transparent text-ink-500 hover:text-ink-700 dark:text-ink-400',
              )}
            >
              <Sparkles className="h-4 w-4" />
              Assistente
            </button>
            <button
              onClick={() => setActiveTab('personagens')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-[13px] font-medium transition-colors',
                activeTab === 'personagens'
                  ? 'border-ink-900 text-ink-900 dark:border-white dark:text-white'
                  : 'border-transparent text-ink-500 hover:text-ink-700 dark:text-ink-400',
              )}
            >
              <UsersRound className="h-4 w-4" />
              Personagens
            </button>
          </div>

          {/* ── ABA: CHAT ── */}
          <AnimatePresence>
            {activeTab === 'chat' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 flex-col overflow-hidden"
              >
                {/* Seletor de agente */}
                <div className="border-b border-ink-100 bg-ink-50/50 px-4 py-2.5 dark:border-ink-800 dark:bg-ink-900/20">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => { setAgenteSelecionado(null); void criarSessao(); }}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all',
                        agenteSelecionado === null
                          ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                          : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300',
                      )}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Geral
                    </button>
                    {agentes.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => { setAgenteSelecionado(a.id); void criarSessao(a); }}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all',
                          agenteSelecionado === a.id
                            ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                            : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300',
                        )}
                      >
                        <span>{a.icon}</span> {a.nome}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {messages.length === 0 && !loading && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40">
                        <Sparkles className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                      </div>
                      <h3 className="mb-1.5 text-[16px] font-semibold text-ink-900 dark:text-white">
                        {agenteAtivo ? `${agenteAtivo.icon} ${agenteAtivo.nome}` : 'Assistente Ministerial'}
                      </h3>
                      <p className="max-w-xs text-[13px] text-ink-500 dark:text-ink-400">
                        {agenteAtivo
                          ? 'Agente selecionado. Digite sua pergunta.'
                          : 'Pergunte sobre textos bíblicos, sermões, esboços, personagens ou qualquer tema teológico.'}
                      </p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {[
                          'Prepare um esboço sobre Romanos 8:28',
                          'Quem foi Abraão e qual sua importância?',
                          'Dê 3 ilustrações sobre a graça',
                          'Compare os 4 Evangelhos',
                        ].map((sug) => (
                          <button
                            key={sug}
                            onClick={() => setInput(sug)}
                            className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11.5px] text-ink-600 transition-colors hover:border-ink-400 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn('mb-4 flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'group relative max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed',
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-sky-50 border border-sky-200 text-ink-900 dark:bg-blue-950/50 dark:border-blue-800/40 dark:text-blue-100',
                        )}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <div className={cn('mt-1.5 flex items-center gap-2', msg.role === 'user' ? 'justify-end' : '')}>
                          <span className="text-[10.5px] text-ink-400">
                            {formatarRelativo(msg.timestamp)}
                          </span>
                          {msg.role === 'assistant' && (
                            <button
                              onClick={() => copiarMensagem(msg.id, msg.content)}
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                              title="Copiar"
                            >
                              {copiadoId === msg.id ? (
                                <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-ink-400" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-[13px] text-ink-500 dark:border-ink-700 dark:bg-ink-900/50 dark:text-ink-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Pensando…
                      <button
                        onClick={cancelarStream}
                        className="ml-2 rounded-lg border border-ink-200 px-2 py-1 text-[11px] hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"
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

                {/* Input */}
                <div className="border-t border-ink-200/70 bg-white px-4 py-3 dark:border-ink-800 dark:bg-ink-900/30">
                  <div className="flex items-end gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-2.5 transition-colors focus-within:border-ink-400 dark:border-ink-700 dark:bg-ink-900/50">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void enviarMensagem();
                        }
                      }}
                      placeholder="Pergunte sobre a Bíblia, sermões, personagens…"
                      rows={1}
                      className="flex-1 resize-none bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-400 dark:text-white dark:placeholder:text-ink-500"
                      style={{ maxHeight: '120px' }}
                    />
                    <button
                      onClick={() => void enviarMensagem()}
                      disabled={!input.trim() || loading}
                      className={cn(
                        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-all',
                        input.trim() && !loading
                          ? 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900'
                          : 'bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500',
                      )}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-center text-[10.5px] text-ink-400">
                    IA pode cometer erros. Verifique sempre as referências bíblicas.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── ABA: PERSONAGENS BÍBLICOS ── */}
          <AnimatePresence>
            {activeTab === 'personagens' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      value={personagemBusca}
                      onChange={(e) => setPersonagemBusca(e.target.value)}
                      placeholder="Buscar por nome, livro, período ou papel…"
                      className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-4 text-[14px] text-ink-900 outline-none transition-colors focus:border-ink-400 dark:border-ink-700 dark:bg-ink-900/50 dark:text-white dark:placeholder:text-ink-500"
                    />
                    {personagemBusca && (
                      <button
                        onClick={() => setPersonagemBusca('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    {(['todos', 'AT', 'NT'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFiltroTestamento(t)}
                        className={cn(
                          'rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors',
                          filtroTestamento === t
                            ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                            : 'border border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300',
                        )}
                      >
                        {t === 'todos' ? 'Todos' : t === 'AT' ? 'Antigo test.' : 'Novo test.'}
                      </button>
                    ))}
                    <select
                      value={filtroCategoria}
                      onChange={(e) => setFiltroCategoria(e.target.value)}
                      className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[11.5px] font-medium text-ink-600 dark:border-ink-700 dark:bg-ink-900/50 dark:text-ink-300"
                    >
                      <option value="todas">Todas categorias</option>
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <p className="mb-3 text-[11.5px] text-ink-400">
                    {personagensFiltrados.length} personagem{personagensFiltrados.length !== 1 ? 's' : ''}
                  </p>

                  {personagensFiltrados.length === 0 && (
                    <div className="py-12 text-center">
                      <UsersRound className="mx-auto mb-3 h-8 w-8 text-ink-300" />
                      <p className="text-[13px] text-ink-500">Nenhum personagem encontrado.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {personagensFiltrados.map((p) => (
                      <PersonagemCard
                        key={p.id}
                        personagem={p}
                        termo={personagemBusca}
                        expandido={expandedCard === p.id}
                        onToggle={() => setExpandedCard(expandedCard === p.id ? null : p.id)}
                        onAsk={(pergunta) => {
                          setActiveTab('chat');
                          setInput(pergunta);
                          setTimeout(() => inputRef.current?.focus(), 100);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Card de personagem ────────────────────────────────────────────────────

function PersonagemCard({
  personagem: p,
  termo,
  expandido,
  onToggle,
  onAsk,
}: {
  personagem: PersonagemBiblico;
  termo: string;
  expandido: boolean;
  onToggle: () => void;
  onAsk: (pergunta: string) => void;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    const texto = `${p.nome} — ${p.papel}\n\n${p.resumo}`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-ink-200 bg-white transition-all dark:border-ink-800 dark:bg-ink-900/40',
        expandido && 'shadow-soft',
      )}
    >
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ink-100 text-[16px] dark:bg-ink-800 dark:text-ink-100">
          {p.testamento === 'AT' ? '📜' : '✝️'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-ink-900 dark:text-white">
              {highlight(p.nome, termo)}
            </span>
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              p.testamento === 'AT'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
            )}>
              {p.testamento}
            </span>
          </div>
          <div className="mt-0.5 text-[12px] text-ink-500">{p.papel}</div>
          {p.dataAproximada && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-400">
              <Calendar className="h-3 w-3" /> {p.dataAproximada}
            </div>
          )}
        </div>
        <ChevronDown
          className={cn('h-4 w-4 flex-shrink-0 text-ink-400 transition-transform', expandido && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-ink-100 px-4 py-3 dark:border-ink-800"
          >
            <p className="mb-3 text-[13px] leading-relaxed text-ink-700 dark:text-ink-300">{p.resumo}</p>

            {p.caracteristicas.length > 0 && (
              <div className="mb-3">
                <h4 className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                  <Star className="h-3 w-3" /> Características
                </h4>
                <div className="flex flex-wrap gap-1">
                  {p.caracteristicas.map((c) => (
                    <span key={c} className="rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[11px] text-ink-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {p.principaisAcontecimentos.length > 0 && (
              <div className="mb-3">
                <h4 className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                  <ScrollText className="h-3 w-3" /> Principais feitos
                </h4>
                <ul className="space-y-1">
                  {p.principaisAcontecimentos.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-[12.5px] text-ink-600 dark:text-ink-300">
                      <ArrowRight className="mt-1 h-3 w-3 flex-shrink-0 text-ink-400" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.passagensRelevantes.length > 0 && (
              <div className="mb-3">
                <h4 className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                  <BookOpen className="h-3 w-3" /> Passagens
                </h4>
                <div className="flex flex-wrap gap-1">
                  {p.passagensRelevantes.map((ref) => (
                    <span key={ref} className="rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[11px] font-mono text-ink-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300">
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {p.relacionados && p.relacionados.length > 0 && (
              <div className="mb-3">
                <h4 className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                  <User className="h-3 w-3" /> Relacionados
                </h4>
                <div className="flex flex-wrap gap-1">
                  {p.relacionados.map((r) => (
                    <button
                      key={r}
                      onClick={() => onAsk(`Conte-me sobre ${r} na Bíblia.`)}
                      className="rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[11px] text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-ink-700 dark:bg-ink-800 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => onAsk(`Prepare um estudo completo sobre ${p.nome}.`)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-ink-50 py-2 text-[12px] font-medium text-ink-700 transition-colors hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
              >
                <Sparkles className="h-3.5 w-3.5" /> Estudar no assistente
              </button>
              <button
                onClick={copiar}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 px-3 py-2 text-[12px] text-ink-600 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
              >
                {copiado ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Highlight de busca ──────────────────────────────────────────────────────

function highlight(text: string, termo: string): React.ReactNode {
  if (!termo.trim()) return text;
  const regex = new RegExp(`(${termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="rounded bg-amber-200 px-0.5 dark:bg-amber-700/60">{part}</mark>
        ) : part,
      )}
    </>
  );
}
