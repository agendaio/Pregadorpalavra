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
  Cpu,
  Coins,
  Plus,
  ScrollText,
  BookOpen,
  FileText,
  Mic2,
  Globe,
  Link2,
  Target,
  Users,
  Layers,
  Hash,
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
import { SPRING_IOS, EASE_OUT } from '@/lib/motion';

// Gradientes por ação — cada uma com cor distinta e profissional
const GRADIENTES: Record<string, string> = {
  esboco:            'from-violet-500 to-purple-600',
  estudo:            'from-emerald-500 to-teal-600',
  sermao_expositivo: 'from-rose-500 to-pink-600',
  sermao_tematico:   'from-amber-500 to-orange-500',
  sermao_textual:    'from-sky-500 to-blue-600',
  versiculo:         'from-yellow-400 to-amber-500',
  contexto:          'from-cyan-500 to-blue-500',
  cruzamentos:       'from-indigo-500 to-violet-600',
  aplicacoes:        'from-orange-500 to-red-500',
  ilustracoes:       'from-pink-500 to-rose-500',
  celula:            'from-lime-500 to-green-500',
  serie:             'from-fuchsia-500 to-purple-600',
};

const ACOES_RAPIDAS = [
  { id: 'esboco',            rotulo: 'Criar Esboço',       icon: ScrollText,  idAcao: 'esboco'            },
  { id: 'estudo',            rotulo: 'Estudo Bíblico',     icon: BookOpen,   idAcao: 'estudo'            },
  { id: 'sermao_expositivo', rotulo: 'Sermão Expositivo', icon: Mic2,       idAcao: 'sermao_expositivo' },
  { id: 'sermao_tematico',  rotulo: 'Sermão Temático',    icon: FileText,   idAcao: 'sermao_tematico'  },
  { id: 'sermao_textual',   rotulo: 'Sermão Textual',     icon: Quote,      idAcao: 'sermao_textual'   },
  { id: 'versiculo',        rotulo: 'Explicar Versículo', icon: Lightbulb,  idAcao: 'versiculo'        },
  { id: 'contexto',         rotulo: 'Contexto Histórico', icon: Globe,      idAcao: 'contexto'         },
  { id: 'cruzamentos',       rotulo: 'Ref. Cruzadas',      icon: Hash,       idAcao: 'cruzamentos'       },
  { id: 'aplicacoes',       rotulo: 'Aplicações',         icon: Target,     idAcao: 'aplicacoes'       },
  { id: 'ilustracoes',      rotulo: 'Ilustrações',        icon: ImageIcon,  idAcao: 'ilustracoes'      },
  { id: 'celula',           rotulo: 'Estudo p/ Célula',   icon: Users,      idAcao: 'celula'           },
  { id: 'serie',            rotulo: 'Série Mensagens',    icon: Layers,     idAcao: 'serie'            },
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
    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;
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
    <div className="flex flex-col items-center px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: EASE_OUT }}
        className="mb-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700 text-white shadow-lg dark:from-ink-800 dark:to-ink-700">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-ink-900 dark:text-white">{s}</h2>
        {temContexto && tituloMsg && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-4 py-1.5 text-sm text-ink-700 dark:bg-ink-800 dark:text-ink-200">
            <BookOpen className="h-4 w-4" />
            Contexto: {tituloMsg}
          </p>
        )}
      </motion.div>

      {/* Card de ações */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.32, ease: EASE_OUT }}
        className="w-full max-w-xl rounded-3xl border border-ink-200/80 bg-white px-5 py-6 shadow-md dark:border-ink-800 dark:bg-ink-900/30 sm:max-w-2xl"
      >
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-ink-400 dark:text-ink-500">
          Ações rápidas
        </p>
        {/* Grid responsivo: 3 colunas em lg, 2 em sm+ */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ACOES_RAPIDAS.map((acao, i) => {
            const Icon = acao.icon;
            const gradiente = GRADIENTES[acao.idAcao] ?? 'from-ink-600 to-ink-800';
            return (
              <motion.button
                key={acao.id}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.022, duration: 0.22, ease: EASE_OUT }}
                onClick={() =>
                  onAcao(
                    acaoParaTexto(acao.idAcao, temContexto, tituloMsg),
                    acao.idAcao,
                  )
                }
                disabled={enviando}
                className="group flex flex-col items-center gap-2.5 rounded-2xl border border-ink-100 bg-paper px-3 py-4 text-center transition-all hover:border-ink-200 hover:shadow-sm active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:border-ink-800 dark:bg-ink-900/40 sm:flex-row sm:gap-3 sm:rounded-xl sm:border sm:px-4 sm:py-3 sm:text-left"
              >
                <span className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', gradiente)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium leading-snug text-ink-800 group-hover:text-ink-900 dark:text-ink-100 dark:group-hover:text-white">
                  {acao.rotulo}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Dica */}
      <p className="mt-5 text-center text-sm text-ink-400 dark:text-ink-500">
        Abra uma mensagem pelo editor para contexto completo
      </p>
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
        <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-ink-900 px-4 py-3 text-[14px] leading-relaxed text-white dark:bg-white dark:text-ink-950">
          {m.content}
        </div>
      </motion.div>
    );
  }

  const acoes = [
    { id: 'adicionar_esboco', rotulo: 'Esboço', icon: Plus,       cor: 'text-amber-600' },
    { id: 'fixar',           rotulo: 'Fixar',  icon: BookmarkPlus, cor: 'text-blue-600' },
    { id: 'copiar',          rotulo: 'Copiar', icon: Copy,       cor: 'text-ink-600' },
    { id: 'reescrever',      rotulo: 'Reescrever', icon: RefreshCw, cor: 'text-purple-600' },
    { id: 'aplicacao',       rotulo: 'Aplicação', icon: Lightbulb, cor: 'text-yellow-600' },
    { id: 'ilustracao',      rotulo: 'Ilustração', icon: ImageIcon, cor: 'text-pink-600' },
    { id: 'texto_base',      rotulo: 'Texto-base', icon: Quote,    cor: 'text-teal-600' },
    { id: 'observacao',      rotulo: 'Observação', icon: StickyNote, cor: 'text-orange-600' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ink-900 to-ink-700 text-white dark:from-white dark:to-ink-100 dark:text-ink-950">
        <Sparkles className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 max-w-[88%] flex-1">
        <div
          className={cn(
            'rounded-2xl rounded-tl-sm border border-ink-200/80 bg-white px-4 py-3 dark:border-ink-800 dark:bg-ink-900/40',
            m.resposta && 'rounded-br-sm',
          )}
        >
          <pre className="whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed text-ink-800 dark:text-ink-100">
            {m.content}
          </pre>
        </div>

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
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors active:scale-95',
                    aberto
                      ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-950'
                      : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700',
                  )}
                >
                  <Icon className={cn('h-3 w-3', acao.cor && !aberto && acao.cor)} />
                  {acao.rotulo}
                </button>
              </div>
            );
          })}
        </div>

        {m.resposta && (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-1.5 text-[10.5px] text-ink-500 dark:border-ink-800 dark:text-ink-400">
            <span className="inline-flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {m.resposta.provider}
            </span>
            <span>·</span>
            <span className="tabular-nums">{m.resposta.tokensTotal} tok</span>
            <span>·</span>
            <span className="tabular-nums">${m.resposta.custoUSD.toFixed(5)}</span>
            <span>·</span>
            <span className="tabular-nums">{(m.resposta.duracaoMs / 1000).toFixed(1)}s</span>
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

  const { modoVoz, transcricao, setTranscricao, iniciar, parar, suportado } = useMicrofone((texto) => {
    setInput((prev) => prev + (prev ? ' ' : '') + texto);
    inputRef.current?.focus();
  });

  const temConversa = mensagens.length > 0;

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

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  useEffect(() => {
    if (transcricao) setInput(transcricao);
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
    <div className="flex flex-col bg-paper text-ink-900 dark:bg-paper-dark dark:text-ink-100">
      <MobileHeader
        title={temConversa ? (sessao?.titulo ?? 'Assistente') : 'Assistente Ministerial'}
        subtitle={temContexto ? mensagem!.titulo || 'Com contexto' : 'Sem contexto'}
        right={
          <div className="flex items-center gap-0.5">
            {temConversa && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleLimpar}
                aria-label="Limpar conversa"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      <div className="ios-blur flex flex-shrink-0 items-center gap-2 border-b border-ink-200/70 bg-paper/80 px-4 py-2 text-[11px] dark:border-ink-800 dark:bg-paper-dark/80">
        <div className="flex items-center gap-1.5">
          {providerAtivo === 'openai' || providerAtivo === 'anthropic' ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                Assistente Ministerial
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                {providerAtivo === 'local' ? 'Respostas locais' : providerAtivo}
              </span>
            </>
          )}
          {temContexto && (
            <>
              <span className="text-ink-300 dark:text-ink-600">·</span>
              <span className="text-emerald-600 dark:text-emerald-400">contexto ativo</span>
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-ink-400 tabular-nums">
          <Coins className="h-3 w-3" />
          <span>{stats?.requisicoes ?? 0} req</span>
        </div>
      </div>

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
            {mensagens.map((m) => (
              <BlocoIA key={m.id} m={m} onAcaoBloco={handleAcaoBloco} />
            ))}

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
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ink-900 to-ink-700 text-white dark:from-white dark:to-ink-100 dark:text-ink-950">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-ink-200/80 bg-white px-4 py-3 text-[13px] text-ink-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Pensando…
                </div>
              </div>
            )}

            {fallbackAviso && (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div>{fallbackAviso}</div>
              </div>
            )}

            <div ref={fimRef} />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-paper/95 pb-[calc(env(safe-area-inset-bottom)+8px)] ios-blur">
        <div className="mx-auto max-w-2xl px-3 pt-2">
          <AnimatePresence>
            {modoVoz === 'Ouvindo' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 flex items-center gap-2 overflow-hidden rounded-2xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10"
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500"
                />
                <span className="flex-1 text-[12.5px] text-red-700 dark:text-red-300">
                  {transcricao || 'Ouvindo…'}
                </span>
                <button
                  onClick={parar}
                  className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/20 dark:text-red-200"
                >
                  <MicOff className="h-3 w-3" /> Parar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex items-end gap-2">
            {suportado && (
              <button
                onClick={modoVoz === 'Ouvindo' ? parar : iniciar}
                disabled={enviando && modoVoz !== 'Ouvindo'}
                aria-label={modoVoz === 'Ouvindo' ? 'Parar gravação' : 'Gravar com voz'}
                className={cn(
                  'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all active:scale-95',
                  modoVoz === 'Ouvindo'
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800/60 dark:hover:text-ink-200',
                  enviando && modoVoz !== 'Ouvindo' && 'opacity-40 cursor-not-allowed',
                )}
              >
                {modoVoz === 'Ouvindo' ? (
                  <motion.div animate={{ scale: [1, 0.85, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
                    <MicOff className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            )}

            <div className="relative flex-1 overflow-hidden rounded-full border border-ink-200/80 bg-white shadow-sm transition-all focus-within:border-ink-300 focus-within:shadow-md dark:border-ink-800 dark:bg-ink-900/40">
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
                    ? 'Digite sua pergunta…'
                    : 'Abra uma mensagem para contexto completo'
                }
                rows={1}
                disabled={enviando}
                className="max-h-48 w-full resize-none bg-transparent px-4 py-2.5 pr-14 text-[14.5px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-400 disabled:opacity-50 dark:text-white dark:placeholder:text-ink-500"
              />

              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                <button
                  onClick={() => enviar(input)}
                  disabled={(!input.trim() && modoVoz === 'idle') || enviando}
                  aria-label="Enviar mensagem"
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90',
                    input.trim() && !enviando
                      ? 'bg-ink-900 text-white hover:bg-ink-700 dark:bg-white dark:text-ink-950'
                      : 'bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500',
                  )}
                >
                  {enviando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="mb-1 mt-1.5 text-center text-[10px] text-ink-400 dark:text-ink-500">
            <span className="hidden sm:inline">
              Enter envia · Shift+Enter nova linha
              {suportado && ' · Microfone ativado'}
            </span>
            <span className="sm:hidden">
              Enter envia{suportado && ' · Mic ativado'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function acaoParaTexto(acao: string, temContexto: boolean, tituloMsg?: string): string {
  const ref = temContexto && tituloMsg ? ` para "${tituloMsg}"` : '';
  const map: Record<string, string> = {
    esboco: `Monte um esboço completo e estruturado${ref}. Inclua: introdução, pontos principais com subpontos, aplicações e conclusão.`,
    estudo: `Faça um estudo bíblico profundo${ref}. Analise: contexto histórico, hebraico/grego de palavras-chave, cruzamentos, aplicações e perguntas para reflexão.`,
    sermao_expositivo: `Crie um sermão expositivo completo${ref}. Estrutura: texto-base, contexto histórico, divisão em pontos expositivos, aplicações práticas e conclusão.`,
    sermao_tematico: `Elabore um sermão temático estruturado${ref}. Estrutura: tema, texto-base, 3 pontos desenvolvidos, ilustrações, aplicações e apelo.`,
    sermao_textual: `Prepare um sermão textual${ref}. Análise: passagem, contexto, significado original, aplicação contemporânea e esboço.`,
    versiculo: `Explique este versículo em profundidade${ref}: significado original, contexto, aplicações para hoje e como pregá-lo.`,
    contexto: `Descreva o contexto histórico-cultural desta passagem${ref}. Inclua: época, geografia, costumes, personagens envolvidos e relevância.`,
    cruzamentos: `Liste referências bíblicas cruzadas${ref}: passagens paralelas, profecias, tipo/antítipo, eco no Novo Testamento e conexões temáticas.`,
    aplicacoes: `Sugira aplicações práticas${ref}: como esta verdade pode ser vivida no cotidiano, na família, no trabalho e na igreja.`,
    ilustracoes: `Sugira ilustrações concretas e memoráveis${ref}: histórias reais, analogias, exemplos do cotidiano e experiências.`,
    celular: `Crie perguntas para estudo em célula${ref}: abertura, estudo bíblico, aplicação e oração. Para 8-12 pessoas.`,
    serie: `Planeje uma série de mensagens${ref}: tema geral, número de mensagens, título de cada uma e progressão teológica.`,
  };
  return map[acao] ?? acao;
}
