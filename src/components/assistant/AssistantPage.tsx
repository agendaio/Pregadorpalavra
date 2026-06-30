import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ChevronDown,
  BookOpen,
  Cpu,
  Coins,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  aiDB,
  adicionarMensagem,
  enviarComFallback,
  gerarTitulo,
  hashInput,
  listarMensagens,
  limparSessao,
  obterOuCriarSessao,
  obterProviderAtivoId,
  obterStats,
  registrarUso,
  construirMensagens,
  SYSTEM_APPENDS,
  type ChatMessage,
  type MensagemPersistida,
  type StatsIA,
} from '@/lib/ai';
import { useMensagensStore } from '@/stores/mensagens';
import { useUIStore } from '@/stores/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Button } from '@/components/ui/Button';
import { cn, formatarRelogio } from '@/lib/utils';

const ACOES_RAPIDAS = [
  { id: 'esboco', rotulo: 'Montar esboço', emoji: '📜' },
  { id: 'ilustracoes', rotulo: 'Sugerir ilustrações', emoji: '🎨' },
  { id: 'aplicacoes', rotulo: 'Aplicações práticas', emoji: '🎯' },
  { id: 'cruzamentos', rotulo: 'Referências cruzadas', emoji: '🔗' },
  { id: 'perguntas', rotulo: 'Perguntas p/ grupo', emoji: '❓' },
  { id: 'contextualizar', rotulo: 'Explicar contexto', emoji: '🌍' },
];

export function AssistantPage() {
  const mensagem = useMensagensStore((s) => s.atual);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemPersistida[]>([]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [streamAtual, setStreamAtual] = useState('');
  const [fallbackAviso, setFallbackAviso] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsIA | null>(null);
  const [providerAtivo, setProviderAtivo] = useState<string>(obterProviderAtivoId());

  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sessao = useLiveQuery(() => (sessaoId ? aiDB.sessoes.get(sessaoId) : undefined), [sessaoId]);

  // Cria ou recupera sessão quando a mensagem em edição muda
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const s = await obterOuCriarSessao(mensagem?.id ?? null);
      if (cancelado) return;
      setSessaoId(s.id);
      const ms = await listarMensagens(s.id);
      setMensagens(ms);
    })();
    return () => {
      cancelado = true;
    };
  }, [mensagem?.id]);

  // Stats ao montar
  useEffect(() => {
    obterStats().then(setStats);
  }, [mensagens.length]);

  // Scroll pro fim ao receber mensagem
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens.length, streamAtual]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  const enviar = async (texto: string, acao?: string) => {
    if (!sessaoId || !texto.trim() || enviando) return;
    setFallbackAviso(null);
    setStreamAtual('');
    setEnviando(true);

    const userMsg: MensagemPersistida = {
      id: crypto.randomUUID(),
      sessaoId,
      role: 'user',
      content: texto.trim(),
      timestamp: Date.now(),
      meta: acao ? { acao } : undefined,
    };
    setMensagens((m) => [...m, userMsg]);
    setInput('');
    await adicionarMensagem(userMsg);

    // monta o array de mensagens com system + contexto
    const historico: ChatMessage[] = mensagens.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
    historico.push({ role: 'user', content: texto.trim(), timestamp: Date.now() });

    const sysAppend = acao ? SYSTEM_APPENDS[acao] : undefined;
    const msgs = construirMensagens(historico, mensagem ?? null, sysAppend);

    try {
      // cache check (só pra ações conhecidas e contexto estável)
      let cacheKey: string | null = null;
      if (acao && mensagem) {
        cacheKey = await hashInput(msgs.map((m) => m.content).join('\n'));
        const cached = await aiDB.cache.get(cacheKey);
        if (cached && Date.now() - cached.cacheadaEm < 1000 * 60 * 60 * 24 * 7) {
          // cache hit
          const aiMsg: MensagemPersistida = {
            id: crypto.randomUUID(),
            sessaoId,
            role: 'assistant',
            content: cached.resposta.content,
            timestamp: Date.now(),
            resposta: cached.resposta,
          };
          setMensagens((m) => [...m, aiMsg]);
          await adicionarMensagem(aiMsg);
          await aiDB.cache.update(cacheKey, { reutilizacoes: (cached.reutilizacoes ?? 0) + 1 });
          setEnviando(false);
          mostrarToast('Resposta recuperada do cache', 'sucesso');
          return;
        }
      }

      const { response, fallbackUsado, providerUsado } = await enviarComFallback({
        messages: msgs,
        mensagemContexto: mensagem,
        systemAppend: sysAppend,
        stream: true,
        onChunk: (chunk: string) => setStreamAtual(chunk),
        maxTokens: 2500,
        temperature: 0.7,
      });

      if (fallbackUsado) {
        setFallbackAviso(
          providerUsado === 'local'
            ? 'Usando resposta local (sem IA generativa). Configure a API OpenAI em Configurações para respostas personalizadas.'
            : `Provedor principal indisponível. Usando ${providerUsado} como fallback.`,
        );
      }

      setProviderAtivo(providerUsado);

      const aiMsg: MensagemPersistida = {
        id: crypto.randomUUID(),
        sessaoId,
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        resposta: response,
      };
      setMensagens((m) => [...m, aiMsg]);
      await adicionarMensagem(aiMsg);

      // cache
      if (cacheKey) {
        await aiDB.cache.put({
          chave: cacheKey,
          resposta: response,
          cacheadaEm: Date.now(),
          reutilizacoes: 1,
        });
      }

      // stats
      await registrarUso(response);
      setStats(await obterStats());

      // título da sessão (primeira msg do user)
      if (mensagens.filter((m) => m.role === 'user').length === 0) {
        const titulo = gerarTitulo(texto);
        await aiDB.sessoes.update(sessaoId, { titulo });
      }
    } catch (err) {
      const msg: MensagemPersistida = {
        id: crypto.randomUUID(),
        sessaoId,
        role: 'assistant',
        content:
          `**Erro do Assistente**\n\n${(err as Error).message}\n\n` +
          `Você pode tentar novamente, ou abrir as Configurações para revisar a chave da API.`,
        timestamp: Date.now(),
      };
      setMensagens((m) => [...m, msg]);
      await adicionarMensagem(msg);
      mostrarToast('Erro ao consultar a IA', 'erro');
    } finally {
      setEnviando(false);
      setStreamAtual('');
    }
  };

  const handleLimpar = async () => {
    if (!sessaoId) return;
    if (!confirm('Limpar o histórico desta conversa?')) return;
    await limparSessao(sessaoId);
    setMensagens([]);
    mostrarToast('Conversa limpa', 'sucesso');
  };

  const temContexto = !!mensagem;

  return (
    <div className="flex h-full flex-col bg-paper">
      <MobileHeader
        title="Assistente"
        subtitle={temContexto ? mensagem!.titulo || 'Mensagem em edição' : 'Sem mensagem aberta'}
        right={
          <Button variant="ghost" size="icon" onClick={handleLimpar} aria-label="Limpar conversa" disabled={mensagens.length === 0}>
            <Trash2 className="h-4.5 w-4.5" />
          </Button>
        }
      />

      {/* Provider banner */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-ink-200/70 bg-paper px-4 py-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 text-ink-600">
          <Cpu className="h-3 w-3" />
          <span className="font-medium">
            {providerAtivo === 'openai' ? 'ChatGPT' : providerAtivo === 'local' ? 'Local' : providerAtivo}
          </span>
          <span className="text-ink-400">·</span>
          <span className="text-ink-500">
            {temContexto ? 'com contexto da mensagem' : 'sem contexto'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-ink-500 tabular-nums">
          <Coins className="h-3 w-3" />
          {stats?.requisicoes ?? 0} req · {((stats?.custoTotalUSD ?? 0)).toFixed(4)} USD
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto pb-32">
        {mensagens.length === 0 && (
          <div className="mx-auto max-w-2xl px-4 py-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700 text-white shadow-soft">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-[18px] font-semibold tracking-tight text-ink-900">
                Assistente Ministerial
              </h2>
              <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink-600">
                Teologia, exegese, homilética, ilustrações e mentoria pastoral.
                {!temContexto && (
                  <>
                    {' '}
                    <span className="text-ink-700 font-medium">Abra uma mensagem</span> para o assistente trabalhar com contexto completo.
                  </>
                )}
              </p>
            </div>

            {/* Ações rápidas */}
            <div className="grid grid-cols-2 gap-2">
              {ACOES_RAPIDAS.map((a) => (
                <button
                  key={a.id}
                  onClick={() =>
                    enviar(
                      acaoParaTexto(a.id, temContexto, mensagem?.titulo),
                      a.id,
                    )
                  }
                  disabled={enviando || !temContexto}
                  className={cn(
                    'flex items-center gap-2.5 rounded-2xl border border-ink-200/80 bg-white p-3 text-left transition-all',
                    'hover:border-ink-300 hover:shadow-soft active:scale-[0.98]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <span className="text-xl">{a.emoji}</span>
                  <span className="text-[12.5px] font-medium text-ink-800">{a.rotulo}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-2xl space-y-3 px-4 py-4">
          {mensagens.map((m: MensagemPersistida) => (
            <Bolha key={m.id} m={m} />
          ))}

          {/* Streaming em tempo real */}
          {enviando && streamAtual && (
            <Bolha
              m={{
                id: 'stream',
                sessaoId: sessaoId ?? '',
                role: 'assistant',
                content: streamAtual,
                timestamp: Date.now(),
              }}
              streaming
            />
          )}
          {enviando && !streamAtual && (
            <div className="flex items-center gap-2 rounded-2xl border border-ink-200/80 bg-white px-4 py-3 text-[13px] text-ink-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Pensando…
            </div>
          )}

          {/* Aviso de fallback */}
          {fallbackAviso && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
              <div>{fallbackAviso}</div>
            </div>
          )}

          <div ref={fimRef} />
        </div>
      </div>

      {/* Input fixo */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+64px)] left-0 right-0 z-30 border-t border-ink-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-3 py-2.5">
          <div className="flex items-end gap-2 rounded-2xl border border-ink-200 bg-white p-1.5 shadow-soft focus-within:border-ink-300">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviar(input);
                }
              }}
              placeholder={temContexto ? 'Pergunte sobre a mensagem…' : 'Abra uma mensagem para o contexto completo'}
              rows={1}
              disabled={enviando}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] outline-none placeholder:text-ink-400 disabled:opacity-50"
              style={{ maxHeight: 200 }}
            />
            <button
              onClick={() => enviar(input)}
              disabled={!input.trim() || enviando}
              aria-label="Enviar"
              className={cn(
                'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors',
                input.trim() && !enviando
                  ? 'bg-ink-900 text-white hover:bg-ink-800'
                  : 'bg-ink-100 text-ink-400',
              )}
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-1 text-center text-[10px] text-ink-400">
            Enter envia · Shift+Enter nova linha
          </div>
        </div>
      </div>
    </div>
  );
}

function acaoParaTexto(acao: string, temContexto: boolean, titulo?: string): string {
  const ref = temContexto && titulo ? ` para "${titulo}"` : '';
  const map: Record<string, string> = {
    esboco: `Monte um esboço estruturado${ref}.`,
    ilustracoes: `Sugira 3 ilustrações concretas${ref}.`,
    aplicacoes: `Quais aplicações práticas posso fazer${ref}?`,
    cruzamentos: `Quais referências cruzadas são relevantes${ref}?`,
    perguntas: `Crie perguntas para discussão em grupo pequeno${ref}.`,
    contextualizar: `Explique o contexto histórico-cultural${ref}.`,
    resumir: `Faça um resumo executivo${ref}.`,
  };
  return map[acao] ?? acao;
}

function Bolha({ m, streaming }: { m: MensagemPersistida; streaming?: boolean }) {
  const isUser = m.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {!isUser && (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ink-900 to-ink-700 text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={cn(
          'min-w-0 max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed',
          isUser
            ? 'bg-ink-900 text-white'
            : 'border border-ink-200/80 bg-white text-ink-900',
          streaming && 'animate-pulse-soft',
        )}
      >
        <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
        {!isUser && m.resposta && (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-1.5 text-[10.5px] text-ink-500">
            <span className="inline-flex items-center gap-1">
              <Cpu className="h-3 w-3" /> {m.resposta.provider}
            </span>
            <span>·</span>
            <span>{m.resposta.tokensTotal} tokens</span>
            <span>·</span>
            <span>${m.resposta.custoUSD.toFixed(5)}</span>
            <span>·</span>
            <span>{(m.resposta.duracaoMs / 1000).toFixed(1)}s</span>
            <span className="ml-auto">{formatarRelogio(m.timestamp)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}