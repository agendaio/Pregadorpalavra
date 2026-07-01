import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  Loader2,
  Trash2,
  Mic,
  MicOff,
  Copy,
  Plus,
  RefreshCw,
  Lightbulb,
  Image as ImageIcon,
  Quote,
  StickyNote,
  BookOpen,
  FileText,
  Mic2,
  Globe,
  Hash,
  Target,
  Users,
  Layers,
  ChevronDown,
  X,
  Menu,
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
import { useAuthAdminStore } from '@/stores/authAdmin';
import { useIsMobile } from '@/lib/responsive';
import { Button } from '@/components/ui/Button';
import { cn, formatarRelogio } from '@/lib/utils';
import { EASE_OUT } from '@/lib/motion';

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
  { id: 'esboco',            rotulo: 'Criar Esboço',       icon: FileText,    idAcao: 'esboco'            },
  { id: 'estudo',            rotulo: 'Estudo Bíblico',     icon: BookOpen,    idAcao: 'estudo'            },
  { id: 'sermao_expositivo', rotulo: 'Sermão Expositivo', icon: Mic2,        idAcao: 'sermao_expositivo' },
  { id: 'sermao_tematico',  rotulo: 'Sermão Temático',    icon: Quote,       idAcao: 'sermao_tematico'  },
  { id: 'versiculo',        rotulo: 'Explicar Versículo', icon: Lightbulb,   idAcao: 'versiculo'        },
  { id: 'contexto',         rotulo: 'Contexto Histórico', icon: Globe,       idAcao: 'contexto'         },
  { id: 'cruzamentos',       rotulo: 'Ref. Cruzadas',      icon: Hash,        idAcao: 'cruzamentos'       },
  { id: 'aplicacoes',       rotulo: 'Aplicações',         icon: Target,      idAcao: 'aplicacoes'       },
];

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

// ─── RENDERIZADOR MINIMALISTA ─────────────────────────────────────────────────
function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<strong key={key++}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="mb-2 mt-1 text-[19px] font-bold leading-snug text-ink-900 dark:text-white">
          {parseInline(line.slice(2))}
        </h1>,
      );
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="mb-1.5 mt-4 text-[15px] font-semibold text-ink-800 dark:text-ink-100">
          {parseInline(line.slice(3))}
        </h2>,
      );
      i++; continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="mb-1 mt-3 text-[13.5px] font-semibold text-amber-700 dark:text-amber-400">
          {parseInline(line.slice(4))}
        </h3>,
      );
      i++; continue;
    }
    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      elements.push(<hr key={i} className="my-3 border-ink-200 dark:border-ink-700" />);
      i++; continue;
    }
    if (line.match(/^(\-|\*|\•)\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^(\-|\*|\•)\s+/)) {
        items.push(lines[i].replace(/^(\-|\*|\•)\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-1.5 list-none space-y-1 pl-3">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-700 dark:text-ink-200">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-1.5 list-none space-y-1 pl-3">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-700 dark:text-ink-200">
              <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                {j + 1}
              </span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }
    if (!line.trim()) { i++; continue; }
    elements.push(
      <p key={i} className="my-1.5 text-[13.5px] leading-relaxed text-ink-700 dark:text-ink-200">
        {parseInline(line)}
      </p>,
    );
    i++;
  }
  return <>{elements}</>;
}

// ─── MENSAGEM DO ASSISTENTE — ESTILO CHATGPT ─────────────────────────────────
function BlocoIA({
  m,
  onAcaoBloco,
}: {
  m: MensagemPersistida;
  onAcaoBloco: (acao: string, texto: string) => void;
}) {
  const [mostrarAcoes, setMostrarAcoes] = useState(false);
  const isUser = m.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-br-md bg-ink-900 px-4 py-3 text-[14px] leading-relaxed text-white dark:bg-white dark:text-ink-950">
          {m.content}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex gap-3"
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
        <Sparkles className="h-4 w-4" />
      </div>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1 max-w-[82%]">
        <MarkdownRenderer content={m.content} />

        {/* Ações — aparecem no hover, estilo ChatGPT */}
        <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => {
              navigator.clipboard.writeText(m.content);
              onAcaoBloco('copiado', m.content);
            }}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
          >
            <Copy className="h-3 w-3" /> Copiar
          </button>
          <button
            onClick={() => onAcaoBloco('reescrever', m.content)}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
          >
            <RefreshCw className="h-3 w-3" /> Reescrever
          </button>
          <button
            onClick={() => onAcaoBloco('adicionar_esboco', m.content)}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
          >
            <Plus className="h-3 w-3" /> Adicionar
          </button>
        </div>

        {m.resposta && (
          <div className="mt-2 flex items-center gap-2 text-[10.5px] text-ink-400">
            <Cpu className="h-3 w-3" />
            <span>{m.resposta.provider}</span>
            <span>·</span>
            <span>{m.resposta.tokensTotal} tok</span>
            <span>·</span>
            <span>${m.resposta.custoUSD.toFixed(5)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── HOME DO ASSISTENTE — ESTILO CHATGPT ─────────────────────────────────────
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
    'Como posso te ajudar hoje?',
    'O que o Senhor está colocando no seu coração?',
    'Qual mensagem o Espírito Santo está revelando?',
    'Em que posso ajudar na sua pregação?',
  ];
  const s = saudacoes[new Date().getDate() % saudacoes.length];

  const exemplos = [
    { texto: 'Criar um esboço para pregação sobre amor', id: 'esboco' },
    { texto: 'Explicar o contexto histórico de Gênesis 1', id: 'contexto' },
    { texto: 'Sugerir aplicações práticas de Romanos 8', id: 'aplicacoes' },
    { texto: 'Criar um sermão expositivo sobre João 3', id: 'sermao_expositivo' },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-start px-4 pt-12">
      {/* Título minimalista */}
      <div className="mb-8 w-full max-w-2xl text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
          {s}
        </h1>
        {temContexto && tituloMsg && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
            <BookOpen className="h-3.5 w-3.5" />
            Contexto: {tituloMsg}
          </p>
        )}
      </div>

      {/* Ações rápidas — grid minimalista estilo ChatGPT */}
      <div className="grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
        {ACOES_RAPIDAS.map((acao, i) => {
          const Icon = acao.icon;
          const gradiente = GRADIENTES[acao.idAcao] ?? 'from-ink-600 to-ink-800';
          return (
            <motion.button
              key={acao.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.25, ease: EASE_OUT }}
              onClick={() =>
                onAcao(acaoParaTexto(acao.idAcao, temContexto, tituloMsg), acao.idAcao)
              }
              disabled={enviando}
              className="group flex items-center gap-2.5 rounded-xl border border-ink-200/80 bg-white px-4 py-3 text-left transition-all hover:border-ink-300 hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-800 dark:bg-ink-900/30 dark:hover:border-ink-700"
            >
              <span className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm',
                gradiente,
              )}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[13px] font-medium text-ink-700 dark:text-ink-200">
                {acao.rotulo}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Exemplos minimalistas */}
      <div className="mt-6 w-full max-w-2xl space-y-2">
        <p className="text-center text-xs text-ink-400">ou tente um destes:</p>
        <div className="space-y-1.5">
          {exemplos.map((ex, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              onClick={() => onAcao(ex.texto, ex.id)}
              disabled={enviando}
              className="w-full rounded-xl border border-ink-200/60 bg-white/80 px-4 py-2.5 text-left text-[13px] text-ink-600 transition-all hover:border-ink-300 hover:bg-white dark:border-ink-800 dark:bg-ink-900/20 dark:text-ink-300 dark:hover:bg-ink-900/40 disabled:opacity-40"
            >
              {ex.texto}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ASSISTANT PAGE — CHATGPT STYLE ──────────────────────────────────────────
export function AssistantPage() {
  const mensagem = useMensagensStore((s) => s.atual);
  const patch = useMensagensStore((s) => s.patch);
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const isMobile = useIsMobile();

  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemPersistida[]>([]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [streamAtual, setStreamAtual] = useState('');
  const [stats, setStats] = useState<StatsIA | null>(null);
  const [providerAtivo, setProviderAtivo] = useState<string>(obterProviderAtivoId());
  const [mostrarSidebar, setMostrarSidebar] = useState(!isMobile);
  const admin = useAuthAdminStore((s) => s.admin);

  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sessao = useLiveQuery(
    () => (sessaoId ? aiDB.sessoes.get(sessaoId) : undefined),
    [sessaoId],
  );

  const todasSessoes = useLiveQuery(() => aiDB.sessoes.orderBy('atualizadoEm').reverse().limit(20).toArray(), []) ?? [];

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
    return () => { cancelado = true; };
  }, [mensagem?.id]);

  useEffect(() => { obterStats().then(setStats); }, [mensagens.length]);

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

  const carregarSessao = async (sid: string) => {
    setSessaoId(sid);
    const ms = await listarMensagens(sid);
    setMensagens(ms);
    setMostrarSidebar(false);
  };

  const enviar = useCallback(
    async (texto: string, acao?: string) => {
      if (!sessaoId || (!texto.trim() && !transcricao) || enviando) return;
      const textoLimpo = (texto || transcricao).trim();
      if (!textoLimpo) return;

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
              id: crypto.randomUUID(), sessaoId, role: 'assistant',
              content: cached.resposta.content, timestamp: Date.now(), resposta: cached.resposta,
            };
            setMensagens((m) => [...m, aiMsg]);
            await adicionarMensagem(aiMsg);
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

        setProviderAtivo(providerUsado);
        const aiMsg: MensagemPersistida = {
          id: crypto.randomUUID(), sessaoId, role: 'assistant',
          content: response.content, timestamp: Date.now(), resposta: response,
        };
        setMensagens((m) => [...m, aiMsg]);
        await adicionarMensagem(aiMsg);

        if (cacheKey) {
          await aiDB.cache.put({ chave: cacheKey, resposta: response, cacheadaEm: Date.now(), reutilizacoes: 1 });
        }

        await registrarUso(response);
        setStats(await obterStats());

        if (mensagens.filter((m) => m.role === 'user').length === 0) {
          const titulo = gerarTitulo(textoLimpo);
          await aiDB.sessoes.update(sessaoId, { titulo });
        }
      } catch (err) {
        const msg: MensagemPersistida = {
          id: crypto.randomUUID(), sessaoId, role: 'assistant',
          content: `**Erro do Assistente**\n\n${(err as Error).message}`,
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
          patch({ esboco: mensagem.esboco + (mensagem.esboco ? '\n\n' : '') + '## ' + texto.split('\n')[0].replace(/^#+\s*/, '') + '\n' + texto });
          mostrarToast('Adicionado ao esboço', 'sucesso');
        } else {
          mostrarToast('Abra uma mensagem para adicionar ao esboço', 'info');
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

  const handleNovaConversa = async () => {
    const s = await obterOuCriarSessao(null);
    setSessaoId(s.id);
    setMensagens([]);
    setMostrarSidebar(false);
  };

  const temContexto = !!mensagem;

  return (
    <div className="flex h-full overflow-hidden bg-paper dark:bg-paper-dark">
      {/* ── Sidebar de conversas ── */}
      <AnimatePresence>
        {mostrarSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="flex flex-col border-r border-ink-200/70 bg-paper dark:border-ink-800 dark:bg-paper-dark overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-ink-200/70">
              <span className="text-[13px] font-semibold text-ink-700 dark:text-ink-200">Conversas</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNovaConversa}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800"
                  title="Nova conversa"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setMostrarSidebar(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {todasSessoes.map((sess) => (
                <button
                  key={sess.id}
                  onClick={() => carregarSessao(sess.id)}
                  className={cn(
                    'flex w-full items-start gap-2 px-4 py-2.5 text-left text-[13px] transition-colors',
                    sess.id === sessaoId
                      ? 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-white'
                      : 'text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-900/30',
                    sess.id !== sessaoId && 'border-b border-ink-100 dark:border-ink-800',
                  )}
                >
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ink-400" />
                  <span className="line-clamp-1 flex-1">{sess.titulo || 'Nova conversa'}</span>
                </button>
              ))}
              {todasSessoes.length === 0 && (
                <p className="px-4 py-8 text-center text-xs text-ink-400">Nenhuma conversa ainda.</p>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Área principal ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header minimalista */}
        <header className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-ink-200/70 bg-paper px-4 dark:border-ink-800 dark:bg-paper-dark">
          {/* Toggle sidebar (desktop) */}
          <button
            onClick={() => setMostrarSidebar((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
            title="Conversas"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-[14px] font-semibold text-ink-800 dark:text-white">
              {temConversa ? (sessao?.titulo ?? 'Assistente') : 'Assistente Ministerial'}
            </span>
          </div>

          {temContexto && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              <BookOpen className="h-3 w-3" />
              contexto ativo
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {stats && (
              <span className="hidden text-[11px] text-ink-400 sm:block">
                {stats.requisicoes} req
              </span>
            )}
            {temConversa && (
              <button
                onClick={handleLimpar}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                title="Limpar conversa"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {/* Área de mensagens */}
        <div className="flex-1 overflow-y-auto">
          {!temConversa ? (
            <AssistenteHome
              temContexto={temContexto}
              tituloMsg={mensagem?.titulo}
              onAcao={enviar}
              enviando={enviando}
            />
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
              {mensagens.map((m) => (
                <BlocoIA key={m.id} m={m} onAcaoBloco={handleAcaoBloco} />
              ))}

              {enviando && streamAtual && (
                <BlocoIA
                  m={{ id: 'stream', sessaoId: sessaoId ?? '', role: 'assistant', content: streamAtual, timestamp: Date.now() }}
                  onAcaoBloco={handleAcaoBloco}
                />
              )}
              {enviando && !streamAtual && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 pt-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-400" />
                    <span className="text-[13px] text-ink-400">Pensando…</span>
                  </div>
                </div>
              )}

              <div ref={fimRef} />
            </div>
          )}
        </div>

        {/* Input — estilo ChatGPT: centralizado, flutuante */}
        <div className="flex-shrink-0 border-t border-ink-200/70 bg-paper px-4 pb-5 pt-3 dark:border-ink-800 dark:bg-paper-dark">
          <div className="mx-auto max-w-3xl">
            <AnimatePresence>
              {modoVoz === 'Ouvindo' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 flex items-center gap-2 overflow-hidden rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10"
                >
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500"
                  />
                  <span className="flex-1 text-[13px] text-red-700 dark:text-red-300">
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

            {/* Campo de input estilo ChatGPT */}
            <div className="relative flex items-end gap-2 rounded-2xl border border-ink-200/80 bg-white shadow-sm transition-all focus-within:border-ink-300 focus-within:shadow dark:border-ink-800 dark:bg-ink-900/40">
              {suportado && (
                <button
                  onClick={modoVoz === 'Ouvindo' ? parar : iniciar}
                  disabled={enviando && modoVoz !== 'Ouvindo'}
                  className={cn(
                    'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-l-2xl transition-colors active:scale-95',
                    modoVoz === 'Ouvindo'
                      ? 'text-red-500'
                      : 'text-ink-400 hover:text-ink-700 dark:hover:text-ink-200',
                    enviando && modoVoz !== 'Ouvindo' && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {modoVoz === 'Ouvindo' ? (
                    <MicOff className="h-4 w-4" />
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
                    void enviar(input);
                  }
                }}
                placeholder={
                  temContexto
                    ? 'Digite sua mensagem…'
                    : 'Abra uma mensagem para contexto completo'
                }
                rows={1}
                disabled={enviando}
                className="max-h-48 flex-1 resize-none bg-transparent px-2 py-3 text-[14.5px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-400 disabled:opacity-50 dark:text-white dark:placeholder:text-ink-500"
              />

              <button
                onClick={() => void enviar(input)}
                disabled={(!input.trim() && modoVoz === 'idle') || enviando}
                className={cn(
                  'm-1.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all',
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

            <p className="mt-1.5 text-center text-[10px] text-ink-400">
              Enter envia · Shift+Enter nova linha{suportado && ' · Mic ativado'}
            </p>
          </div>
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
    sermao_tematico: `Elabore um sermão temático${ref}. Estrutura: tema, texto-base, 3 pontos desenvolvidos, ilustrações, aplicações e apelo.`,
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
