import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  Trash2,
  Mic,
  MicOff,
  Copy,
  BookmarkPlus,
  RefreshCw,
  Lightbulb,
  Image as ImageIcon,
  Quote,
  StickyNote,
  ChevronRight,
  Plus,
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
  SYSTEM_APPENDS,
  type MensagemPersistida,
  type StatsIA,
} from '@/lib/ai';
import { useMensagensStore } from '@/stores/mensagens';
import { useUIStore } from '@/stores/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Button } from '@/components/ui/Button';
import { cn, formatarRelogio } from '@/lib/utils';

const ACOES_RAPIDAS = [
  { id: 'esboco', rotulo: 'Criar Esboço', emoji: '📖', cor: 'bg-amber-50 text-amber-700' },
  { id: 'estudo', rotulo: 'Estudo Bíblico', emoji: '📚', cor: 'bg-blue-50 text-blue-700' },
  { id: 'sermao_expositivo', rotulo: 'Sermão Expositivo', emoji: '🎤', cor: 'bg-purple-50 text-purple-700' },
  { id: 'sermao_tematico', rotulo: 'Sermão Temático', emoji: '📝', cor: 'bg-pink-50 text-pink-700' },
  { id: 'sermao_textual', rotulo: 'Sermão Textual', emoji: '📜', cor: 'bg-orange-50 text-orange-700' },
  { id: 'versiculo', rotulo: 'Explicar Versículo', emoji: '🧠', cor: 'bg-teal-50 text-teal-700' },
  { id: 'contexto', rotulo: 'Contexto Histórico', emoji: '🌍', cor: 'bg-green-50 text-green-700' },
  { id: 'cruzamentos', rotulo: 'Ref. Cruzadas', emoji: '🔗', cor: 'bg-indigo-50 text-indigo-700' },
  { id: 'aplicacoes', rotulo: 'Aplicações', emoji: '💡', cor: 'bg-yellow-50 text-yellow-700' },
  { id: 'ilustracoes', rotulo: 'Ilustrações', emoji: '🎯', cor: 'bg-red-50 text-red-700' },
  { id: 'celula', rotulo: 'Estudo p/ Célula', emoji: '👨‍👩‍👧', cor: 'bg-cyan-50 text-cyan-700' },
  { id: 'serie', rotulo: 'Série Mensagens', emoji: '🎙', cor: 'bg-violet-50 text-violet-700' },
];

// ─── MICROFONE ────────────────────────────────────────────────────────────────
type ModoVoz = 'idle' | 'Ouvindo' | 'processando';

function useMicrofone(onFinal: (texto: string) => void) {
  const [modoVoz, setModoVoz] = useState<ModoVoz>('idle');
  const [transcricao, setTranscricao] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const modoVozRef = useRef<ModoVoz>('idle');

  const suportado =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const iniciar = useCallback(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscricao(interim || final);
      if (final) {
        setModoVoz('processando');
        modoVozRef.current = 'processando';
        setTimeout(() => {
          onFinal(final.trim());
          setModoVoz('idle');
          modoVozRef.current = 'idle';
          setTranscricao('');
        }, 600);
      }
    };

    recognition.onerror = () => {
      setModoVoz('idle');
      modoVozRef.current = 'idle';
      setTranscricao('');
    };

    recognition.onend = () => {
      if (modoVozRef.current === 'Ouvindo') {
        setModoVoz('idle');
        modoVozRef.current = 'idle';
        setTranscricao('');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setModoVoz('Ouvindo');
    modoVozRef.current = 'Ouvindo';
  }, [onFinal]);

  const parar = useCallback(() => {
    recognitionRef.current?.stop();
    setModoVoz('idle');
    modoVozRef.current = 'idle';
    setTranscricao('');
  }, []);

  return { modoVoz, transcricao, setTranscricao, iniciar, parar, suportado };
}

// ─── HOME SCREEN DO ASSISTENTE ───────────────────────────────────────────────
function AssistenteHome({
  temContexto,
  tituloMsg,
  onAcao,
  enviando,
}: {
  temContexto: boolean;
  tituloMsg?: string;
  onAcao: (texto: string, id: string) => void;
  enviando: boolean;
}) {
  const saudacoes = [
    'Como deseja preparar sua mensagem hoje?',
    'O que o Senhor está colocando no seu coração?',
    'Qual mensagem o Espírito Santo está revelando?',
    'Em que posso ajudar na sua pregação?',
  ];
  const s = saudacoes[new Date().getDate() % saudacoes.length];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Saudação */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700 text-white shadow-soft">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-ink-900">{s}</h2>
        {temContexto && tituloMsg && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-[12px] text-ink-600">
            <BookOpen className="h-3.5 w-3.5" />
            Contexto: {tituloMsg}
          </p>
        )}
      </motion.div>

      {/* Cartões inteligentes */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
          Ações rápidas
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {ACOES_RAPIDAS.map((acao, i) => (
            <motion.button
              key={acao.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 + i * 0.025, duration: 0.2 }}
              onClick={() =>
                onAcao(
                  acaoParaTexto(acao.id, temContexto, tituloMsg),
                  acao.id,
                )
              }
              disabled={enviando}
              className="group flex items-center gap-3 rounded-2xl border border-ink-200/80 bg-white p-3.5 text-left transition-all hover:border-ink-300 hover:shadow-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xl">
                {acao.emoji}
              </span>
              <span className="text-[13px] font-medium leading-snug text-ink-800 group-hover:text-ink-900">
                {acao.rotulo}
              </span>
              <ChevronRight className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-ink-300 group-hover:text-ink-500" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Dicas */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center"
      >
        <p className="text-[12px] leading-relaxed text-ink-500">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" />
          Dica: abra uma mensagem pelo editor para o assistente trabalhar com contexto completo.
        </p>
      </motion.div>
    </div>
  );
}

// ─── BLOCO DE AÇÃO DO ASSISTENTE ─────────────────────────────────────────────
type BlocoAberto = string | null;

function BlocoIA({
  m,
  onAcaoBloco,
}: {
  m: MensagemPersistida;
  onAcaoBloco: (acao: string, texto: string) => void;
}) {
  const [blocoAberto, setBlocoAberto] = useState<BlocoAberto>(null);
  const isUser = m.role === 'user';

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-row-reverse gap-2.5"
      >
        <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-ink-900 px-4 py-3 text-[14px] leading-relaxed text-white">
          {m.content}
        </div>
      </motion.div>
    );
  }

  const acoes = [
    { id: 'adicionar_esboco', rotulo: 'Adicionar ao Esboço', icon: Plus, cor: 'text-amber-600' },
    { id: 'fixar', rotulo: 'Fixar', icon: BookmarkPlus, cor: 'text-blue-600' },
    { id: 'copiar', rotulo: 'Copiar', icon: Copy, cor: 'text-ink-600' },
    { id: 'reescrever', rotulo: 'Reescrever', icon: RefreshCw, cor: 'text-purple-600' },
    { id: 'aplicacao', rotulo: 'Transformar em Aplicação', icon: Lightbulb, cor: 'text-yellow-600' },
    { id: 'ilustracao', rotulo: 'Transformar em Ilustração', icon: ImageIcon, cor: 'text-pink-600' },
    { id: 'texto_base', rotulo: 'Definir como Texto Base', icon: Quote, cor: 'text-teal-600' },
    { id: 'observacao', rotulo: 'Salvar como Observação', icon: StickyNote, cor: 'text-orange-600' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ink-900 to-ink-700 text-white">
        <Sparkles className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 max-w-[88%] flex-1">
        {/* Conteúdo */}
        <div
          className={cn(
            'rounded-2xl rounded-tl-sm border border-ink-200/80 bg-white px-4 py-3',
            m.resposta && 'rounded-br-sm',
          )}
        >
          <pre className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-ink-800">
            {m.content}
          </pre>
        </div>

        {/* Ações rápidas do bloco */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {acoes.map((acao) => {
            const Icon = acao.icon;
            const aberto = blocoAberto === acao.id;
            return (
              <div key={acao.id} className="relative">
                <button
                  onClick={() => {
                    if (acao.id === 'copiar') {
                      navigator.clipboard.writeText(m.content);
                      onAcaoBloco('copiado', m.content);
                      return;
                    }
                    if (acao.id === 'reescrever') {
                      onAcaoBloco('reescrever', m.content);
                      return;
                    }
                    if (acao.id === 'adicionar_esboco') {
                      onAcaoBloco('adicionar_esboco', m.content);
                      return;
                    }
                    if (acao.id === 'aplicacao') {
                      onAcaoBloco('aplicacao', m.content);
                      return;
                    }
                    if (acao.id === 'ilustracao') {
                      onAcaoBloco('ilustracao', m.content);
                      return;
                    }
                    if (acao.id === 'observacao') {
                      onAcaoBloco('observacao', m.content);
                      return;
                    }
                    setBlocoAberto(aberto ? null : acao.id);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-medium transition-colors',
                    aberto
                      ? 'bg-ink-900 text-white'
                      : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
                  )}
                >
                  <Icon className={cn('h-3 w-3', acao.cor && !aberto && acao.cor)} />
                  {acao.rotulo}
                </button>
              </div>
            );
          })}
        </div>

        {/* Stats do modelo */}
        {m.resposta && (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-1.5 text-[10.5px] text-ink-500">
            <span className="inline-flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {m.resposta.provider}
            </span>
            <span>·</span>
            <span>{m.resposta.tokensTotal} tok</span>
            <span>·</span>
            <span>${m.resposta.custoUSD.toFixed(5)}</span>
            <span>·</span>
            <span>{(m.resposta.duracaoMs / 1000).toFixed(1)}s</span>
            <span className="ml-auto">{formatarRelogio(m.timestamp ?? Date.now())}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── ASSISTANT PAGE PRINCIPAL ─────────────────────────────────────────────────
export function AssistantPage() {
  const mensagem = useMensagensStore((s) => s.atual);
  const patch = useMensagensStore((s) => s.patch);
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

  const sessao = useLiveQuery(
    () => (sessaoId ? aiDB.sessoes.get(sessaoId) : undefined),
    [sessaoId],
  );

  // Microfone
  const { modoVoz, transcricao, setTranscricao, iniciar, parar, suportado } = useMicrofone((texto) => {
    setInput((prev) => prev + (prev ? ' ' : '') + texto);
    inputRef.current?.focus();
  });

  const temConversa = mensagens.length > 0;

  // Cria ou recupera sessão
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

  useEffect(() => {
    obterStats().then(setStats);
  }, [mensagens.length]);

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

  // Atualiza transcrição em tempo real
  useEffect(() => {
    if (transcricao) {
      setInput(transcricao);
    }
  }, [transcricao]);

  const enviar = useCallback(
    async (texto: string, acao?: string) => {
      if (!sessaoId || (!texto.trim() && !transcricao) || enviando) return;
      const textoLimpo = (texto || transcricao).trim();
      if (!textoLimpo) return;

      setFallbackAviso(null);
      setStreamAtual('');
      setEnviando(true);

      const userMsg: MensagemPersistida = {
        id: crypto.randomUUID(),
        sessaoId,
        role: 'user',
        content: textoLimpo,
        timestamp: Date.now(),
        meta: acao ? { acao } : undefined,
      };
      setMensagens((m) => [...m, userMsg]);
      setInput('');
      setTranscricao('');
      parar();
      await adicionarMensagem(userMsg);

      try {
        let cacheKey: string | null = null;
        if (acao && mensagem) {
          cacheKey = await hashInput([...mensagens.map((m) => m.content), textoLimpo].join('\n'));
          const cached = await aiDB.cache.get(cacheKey);
          if (cached && Date.now() - cached.cacheadaEm < 1000 * 60 * 60 * 24 * 7) {
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
            mostrarToast('Resposta do cache', 'sucesso');
            return;
          }
        }

        const sysAppend = acao ? SYSTEM_APPENDS[acao] : undefined;

        const { response, fallbackUsado, providerUsado } = await enviarComFallback({
          messages: [
            ...mensagens.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user' as const, content: textoLimpo },
          ],
          mensagemContexto: mensagem,
          systemAppend: sysAppend,
          stream: true,
          onChunk: (chunk: string) => setStreamAtual(chunk),
          maxTokens: 3000,
          temperature: 0.75,
        });

        if (fallbackUsado) {
          setFallbackAviso(
            providerUsado === 'local'
              ? 'Modo local ativo — configure a OpenAI em Configurações para respostas completas.'
              : `Provedor principal indisponível. Usando ${providerUsado}.`,
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

        if (cacheKey) {
          await aiDB.cache.put({
            chave: cacheKey,
            resposta: response,
            cacheadaEm: Date.now(),
            reutilizacoes: 1,
          });
        }

        await registrarUso(response);
        setStats(await obterStats());

        if (mensagens.filter((m) => m.role === 'user').length === 0) {
          const titulo = gerarTitulo(textoLimpo);
          await aiDB.sessoes.update(sessaoId, { titulo });
        }
      } catch (err) {
        const msg: MensagemPersistida = {
          id: crypto.randomUUID(),
          sessaoId,
          role: 'assistant',
          content:
            `**Erro do Assistente**\n\n${(err as Error).message}\n\n` +
            `Revise a chave da API em Configurações.`,
          timestamp: Date.now(),
        };
        setMensagens((m) => [...m, msg]);
        await adicionarMensagem(msg);
        mostrarToast('Erro ao consultar a IA', 'erro');
      } finally {
        setEnviando(false);
        setStreamAtual('');
      }
    },
    [sessaoId, enviando, mensagens, mensagem, transcricao, parar, mostrarToast],
  );

  const handleAcaoBloco = (acao: string, texto: string) => {
    switch (acao) {
      case 'copiado':
        mostrarToast('Copiado para a área de transferência', 'sucesso');
        break;
      case 'adicionar_esboco':
        if (mensagem) {
          patch({
            esboco:
              mensagem.esboco +
              (mensagem.esboco ? '\n\n' : '') +
              '## ' +
              texto.split('\n')[0].replace(/^#+\s*/, '') +
              '\n' +
              texto,
          });
          mostrarToast('Adicionado ao esboço', 'sucesso');
        } else {
          mostrarToast('Abra uma mensagem para adicionar ao esboço', 'info');
        }
        break;
      case 'aplicacao':
        if (mensagem) {
          patch({ aplicacoes: [...mensagem.aplicacoes, texto] });
          mostrarToast('Aplicação salva', 'sucesso');
        }
        break;
      case 'ilustracao':
        if (mensagem) {
          patch({ ilustracoes: [...mensagem.ilustracoes, texto] });
          mostrarToast('Ilustração salva', 'sucesso');
        }
        break;
      case 'observacao':
        if (mensagem) {
          patch({ observacoes: mensagem.observacoes + (mensagem.observacoes ? '\n\n' : '') + texto });
          mostrarToast('Observação salva', 'sucesso');
        }
        break;
      case 'reescrever':
        enviar(`Reescreva este texto de forma mais clara e impactante:\n\n${texto}`, 'reescrever');
        break;
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
      {/* Header */}
      <MobileHeader
        title={temConversa ? (sessao?.titulo ?? 'Assistente') : 'Assistente Ministerial'}
        subtitle={temContexto ? mensagem!.titulo || 'Com contexto' : 'Sem contexto'}
        right={
          <div className="flex items-center gap-1">
            {temConversa && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLimpar}
                aria-label="Limpar conversa"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {temConversa && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setMensagens([]);
                  handleLimpar();
                }}
                aria-label="Nova conversa"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      {/* Provider banner */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-ink-200/70 bg-paper px-4 py-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 text-ink-600">
          <Cpu className="h-3 w-3" />
          <span className="font-medium">
            {providerAtivo === 'openai' ? 'ChatGPT' : providerAtivo === 'local' ? 'Modo Local' : providerAtivo}
          </span>
          {temContexto && (
            <>
              <span className="text-ink-300">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                contexto ativo
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-ink-500 tabular-nums">
          <Coins className="h-3 w-3" />
          {stats?.requisicoes ?? 0} req · ${((stats?.custoTotalUSD ?? 0)).toFixed(4)}
        </div>
      </div>

      {/* Área de mensagens / Home */}
      <div className="flex-1 overflow-y-auto pb-32">
        {!temConversa ? (
          <AssistenteHome
            temContexto={temContexto}
            tituloMsg={mensagem?.titulo}
            onAcao={enviar}
            enviando={enviando}
          />
        ) : (
          <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
            {/* Histórico de mensagens */}
            {mensagens.map((m) => (
              <BlocoIA key={m.id} m={m} onAcaoBloco={handleAcaoBloco} />
            ))}

            {/* Streaming */}
            {enviando && streamAtual && (
              <BlocoIA
                m={{
                  id: 'stream',
                  sessaoId: sessaoId ?? '',
                  role: 'assistant',
                  content: streamAtual,
                  timestamp: Date.now(),
                }}
                onAcaoBloco={handleAcaoBloco}
              />
            )}
            {enviando && !streamAtual && (
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ink-900 to-ink-700 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-ink-200/80 bg-white px-4 py-3 text-[13px] text-ink-500">
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Pensando…
                  </motion.span>
                </div>
              </div>
            )}

            {/* Aviso fallback */}
            {fallbackAviso && (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                <div>{fallbackAviso}</div>
              </div>
            )}

            <div ref={fimRef} />
          </div>
        )}
      </div>

      {/* Input fixo com microfone */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+64px)] left-0 right-0 z-30 border-t border-ink-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-3 py-2.5">
          {/* Transcrição em tempo real */}
          <AnimatePresence>
            {modoVoz === 'Ouvindo' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 flex items-center gap-2 overflow-hidden rounded-xl border border-red-200 bg-red-50 px-3 py-2"
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500"
                />
                <span className="flex-1 text-[12.5px] text-red-700">{transcricao || 'Ouvindo…'}</span>
                <button
                  onClick={parar}
                  className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700"
                >
                  <MicOff className="h-3 w-3" /> Parar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Campo de input */}
          <div className="flex items-end gap-2 rounded-2xl border border-ink-200 bg-white p-1.5 shadow-soft focus-within:border-ink-300">
            {/* Botão microfone (estilo ChatGPT) */}
            {suportado && (
              <button
                onClick={modoVoz === 'Ouvindo' ? parar : iniciar}
                disabled={enviando && modoVoz !== 'Ouvindo'}
                aria-label={modoVoz === 'Ouvindo' ? 'Parar gravação' : 'Gravar com voz'}
                className={cn(
                  'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all',
                  modoVoz === 'Ouvindo'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700',
                  enviando && modoVoz !== 'Ouvindo' && 'opacity-40 cursor-not-allowed',
                )}
              >
                {modoVoz === 'Ouvindo' ? (
                  <motion.div
                    animate={{ scale: [1, 0.85, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    <MicOff className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            )}

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
              placeholder={
                temContexto
                  ? 'Pergunte sobre a mensagem…'
                  : 'Abra uma mensagem para contexto completo'
              }
              rows={1}
              disabled={enviando}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[14.5px] outline-none placeholder:text-ink-400 disabled:opacity-50"
              style={{ maxHeight: 200 }}
            />

            {/* Botão enviar */}
            <button
              onClick={() => enviar(input)}
              disabled={(!input.trim() && modoVoz === 'idle') || enviando}
              aria-label="Enviar"
              className={cn(
                'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors',
                input.trim() && !enviando
                  ? 'bg-ink-900 text-white hover:bg-ink-800'
                  : 'bg-ink-100 text-ink-400',
              )}
            >
              {enviando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mt-1 flex items-center justify-center gap-3 text-[10px] text-ink-400">
            <span>Enter envia</span>
            <span className="text-ink-300">·</span>
            <span>Shift+Enter nova linha</span>
            {suportado && (
              <>
                <span className="text-ink-300">·</span>
                <span className="flex items-center gap-1">
                  <Mic className="h-3 w-3" />
                  microfone
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function acaoParaTexto(acao: string, temContexto: boolean, tituloMsg?: string): string {
  const ref = temContexto && tituloMsg ? ` para "${tituloMsg}"` : '';
  const map: Record<string, string> = {
    esboco: `Monte um esboço completo e estruturado${ref}. Inclua: introdução, pontos principais com subpontos, aplicações e conclusão.`,
    estudo: `Faça um estudo bíblico profundo${ref}. Analise: contexto histórico,hebraico/grego ключевых слов, cruzamentos, aplicações e perguntas para reflexão.`,
    sermao_expositivo: `Crie um sermão expositivo completo${ref}. Estrutura: texto-base, contexto histórico, divisão em pontos expositivos, aplicações práticas e conclusão.`,
    sermao_tematico: `Elabore um sermão temático estruturado${ref}. Estrutura: tema, texto-base, 3 pontos desenvolvida, ilustrações, aplicações e apelo.`,
    sermao_textual: `Prepare um sermão textual${ref}. Análise: passagem, contexto, significado original, aplicação contemporânea e esboço.`,
    versiculo: `Explique este versículo em profundidade${ref}: significado original, contexto, aplicações para hoje e como pregá-lo.`,
    contexto: `Descreva o contexto histórico-cultural desta passagem${ref}. Inclua: época, geografia, costumes, personagens envolvidos e relevância.`,
    cruzamentos: `Liste referências bíblicas cruzadas${ref}: passagens paralelas, profecias, tipo/antítipo, eco no Novo Testamento e conexões temáticas.`,
    aplicacoes: `Sugira aplicações práticas${ref}: como esta verdade pode ser vivida no cotidiano, na família, no trabalho e na igreja.`,
    ilustracoes: `Sugira ilustrações concretas e memoráveis${ref}: histórias reais, analogias, ejemplos do cotidiano e experiências.`,
    celular: `Crie perguntas para estudo em célula${ref}: abertura, estudo bíblico, aplicação e oração. Para 8-12 pessoas.`,
    serie: `Planeje uma série de mensagens${ref}: tema geral, número de mensagens, título de cada uma eProgressão teológica.`,
  };
  return map[acao] ?? acao;
}
