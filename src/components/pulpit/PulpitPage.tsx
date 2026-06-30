/**
 * /pulpit — Modo Pregação Premium
 *
 * Tela em tempo real usada durante cultos e ministrações.
 * Mobile-first, fullscreen, segura contra toques acidentais, e desenhada
 * para que o pregador NUNCA se perca: o ponto atual está sempre no centro,
 * o próximo sobe automaticamente, e tudo que já foi ministrado permanece
 * visível (com opacidade reduzida e check) para referência rápida.
 *
 * Não altera stores, parser ou modelo de dados — apenas consome o que existe.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  X,
  Type,
  CheckCircle2,
  ChevronRight,
  Search,
  Sun,
  Moon,
  Focus,
  Eye,
  ChevronUp,
  ChevronDown,
  Clock,
  BookOpen,
} from 'lucide-react';
import { db } from '@/db/schema';
import { usePulpitStore } from '@/stores/pulpit';
import { useProgressoStore, type Capitulo } from '@/stores/progressoPulpit';
import { useUIStore } from '@/stores/ui';
import { parsearEsboco } from '@/lib/esbocoParser';
import { cn, formatarRelogio, formatarDuracao } from '@/lib/utils';

// ─── Tipos internos ─────────────────────────────────────────────────────────

type TipoSecao = 'introducao' | 'ponto' | 'aplicacao' | 'ilustracao' | 'conclusao' | 'conteudo';

interface SecaoClassificada extends Capitulo {
  tipo: TipoSecao;
  cor: {
    borda: string;   // cor de destaque
    fundo: string;   // fundo do card
    ativo: string;   // fundo quando é o ponto atual
    check: string;   // cor do check
    texto: string;   // cor do título
  };
}

interface ResultadoBusca {
  capituloId: number;
  blocoId: number;
  texto: string;
  contexto: string;
}

// ─── Classificação semântica dos capítulos ──────────────────────────────────
//
// Decidida pelo título — pregador escreve "Introdução", "Ponto 1 — A fé",
// "Aplicação", "Ilustração", "Conclusão" e a UI cuida do resto.

const RE_INTRO    = /^(intro|introdução|introducao|abertura|abertura|contextualização|contextualizacao)/i;
const RE_APLIC    = /^(aplica|aplicação|aplicacao|desafio|encerramento|prática|pratica)/i;
const RE_ILUST    = /^(ilustra|ilustração|ilustracao|história|historia|exemplo|metáfora|metafora|parábola|parabola)/i;
const RE_CONCL    = /^(conclus|conclusão|conclusao|fechamento|final|call\s*to\s*action|cta|apelo)/i;
const RE_PONTO    = /^ponto\s*\d|^p\s*\d|^parte\s*\d|^i{1,3}\s*[-–—]/i;

function classificarCapitulo(titulo: string): TipoSecao {
  const t = (titulo || '').trim();
  if (!t) return 'conteudo';
  if (RE_INTRO.test(t)) return 'introducao';
  if (RE_APLIC.test(t)) return 'aplicacao';
  if (RE_ILUST.test(t)) return 'ilustracao';
  if (RE_CONCL.test(t)) return 'conclusao';
  if (RE_PONTO.test(t)) return 'ponto';
  return 'ponto'; // default razoável
}

const CORES: Record<TipoSecao, SecaoClassificada['cor']> = {
  introducao: {
    borda:    'border-sky-400/30',
    fundo:    'bg-sky-500/[0.06]',
    ativo:    'bg-sky-500/[0.12] ring-1 ring-sky-400/40',
    check:    'text-sky-300',
    texto:    'text-sky-100',
  },
  ponto: {
    borda:    'border-indigo-400/25',
    fundo:    'bg-indigo-500/[0.05]',
    ativo:    'bg-indigo-500/[0.14] ring-1 ring-indigo-400/50',
    check:    'text-indigo-300',
    texto:    'text-indigo-100',
  },
  aplicacao: {
    borda:    'border-emerald-400/30',
    fundo:    'bg-emerald-500/[0.07]',
    ativo:    'bg-emerald-500/[0.16] ring-1 ring-emerald-400/50',
    check:    'text-emerald-300',
    texto:    'text-emerald-100',
  },
  ilustracao: {
    borda:    'border-amber-400/30',
    fundo:    'bg-amber-500/[0.06]',
    ativo:    'bg-amber-500/[0.14] ring-1 ring-amber-400/40',
    check:    'text-amber-300',
    texto:    'text-amber-100',
  },
  conclusao: {
    borda:    'border-violet-400/30',
    fundo:    'bg-violet-500/[0.07]',
    ativo:    'bg-violet-500/[0.16] ring-1 ring-violet-400/50',
    check:    'text-violet-300',
    texto:    'text-violet-100',
  },
  conteudo: {
    borda:    'border-white/10',
    fundo:    'bg-white/[0.03]',
    ativo:    'bg-white/[0.08] ring-1 ring-white/20',
    check:    'text-white/70',
    texto:    'text-white/90',
  },
};

const ROTULO_TIPO: Record<TipoSecao, string> = {
  introducao: 'Introdução',
  ponto: 'Ponto',
  aplicacao: 'Aplicação',
  ilustracao: 'Ilustração',
  conclusao: 'Conclusão',
  conteudo: 'Conteúdo',
};

// ─── Hook: detecção de long-press ──────────────────────────────────────────

function useLongPress(onLongPress: () => void, delay = 600) {
  const timer = useRef<number | null>(null);
  const triggered = useRef(false);

  const start = useCallback(() => {
    triggered.current = false;
    timer.current = window.setTimeout(() => {
      triggered.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    // Sinaliza pro consumidor se o último gesto foi long-press (não disparar onClick)
    foiLongPress: () => triggered.current,
  };
}

// ─── Componente: linha de conteúdo (marca simples) ────────────────────────

const BlocoLinha = memo(function BlocoLinha({
  texto,
  index,
  marcada,
  emDestaque,
  onToggle,
  tamanhoFonte,
}: {
  texto: string;
  index: number;
  marcada: boolean;
  emDestaque: boolean;
  onToggle: () => void;
  tamanhoFonte: number;
}) {
  const eSubtitulo = texto.startsWith('▌');
  const eSubSub = texto.startsWith('  ◦');
  const isLista = texto.startsWith('•');

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'group flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-left transition-all duration-150 select-none',
        'touch-manipulation active:scale-[0.995]',
        emDestaque
          ? 'bg-amber-400/10 ring-1 ring-amber-300/40'
          : marcada
            ? 'bg-amber-500/15 text-amber-100'
            : eSubtitulo
              ? 'bg-white/[0.04] text-cyan-100'
              : eSubSub
                ? 'pl-10 text-white/55'
                : isLista
                  ? 'text-white/80 hover:bg-white/[0.04]'
                  : 'text-white/85 hover:bg-white/[0.05]',
      )}
      style={{ fontSize: `${tamanhoFonte}px`, lineHeight: 1.55 }}
      aria-pressed={marcada}
    >
      <span
        className={cn(
          'mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold tabular-nums transition-colors',
          marcada
            ? 'bg-amber-400/40 text-amber-900'
            : emDestaque
              ? 'bg-amber-300/30 text-amber-100'
              : 'bg-white/10 text-white/40',
        )}
      >
        {marcada ? <CheckCircle2 className="h-3 w-3" /> : String(index + 1).padStart(2, '0')}
      </span>
      <span
        className={cn(
          'flex-1 leading-snug transition-opacity',
          marcada && !emDestaque ? 'opacity-50' : 'opacity-100',
        )}
      >
        {texto}
      </span>
    </button>
  );
});

// ─── Componente: card de seção (accordion inteligente) ─────────────────────

interface CapituloCardProps {
  capitulo: SecaoClassificada;
  aberto: boolean;
  feito: boolean;
  ehProximo: boolean;
  ehAtual: boolean;
  linhasMarcadas: Set<number>;
  toggleCapitulo: () => void;
  toggleLinha: (id: number) => void;
  concluirSecao: () => void;
  reabrirSecao: () => void;
  registerRef: (el: HTMLElement | null) => void;
  tamanhoFonte: number;
  termoBusca: string;
}

const CapituloCard = memo(function CapituloCard({
  capitulo,
  aberto,
  feito,
  ehProximo,
  ehAtual,
  linhasMarcadas,
  toggleCapitulo,
  toggleLinha,
  concluirSecao,
  reabrirSecao,
  registerRef,
  tamanhoFonte,
  termoBusca,
}: CapituloCardProps) {
  const longPress = useLongPress(concluirSecao, 600);

  const total = capitulo.blocos.length;
  const marcados = capitulo.blocos.filter((b) => linhasMarcadas.has(b.id)).length;
  const progresso = total > 0 ? (marcados / total) * 100 : 0;
  const cor = CORES[capitulo.tipo];

  const handleHeaderClick = () => {
    if (longPress.foiLongPress()) return;
    if (feito) {
      reabrirSecao();
      return;
    }
    toggleCapitulo();
  };

  return (
    <motion.section
      ref={registerRef as any}
      layout="position"
      initial={false}
      animate={{
        opacity: feito ? 0.5 : 1,
        scale: ehAtual ? 1.0 : 0.99,
      }}
      transition={{ duration: 0.25, ease: [0.22, 0.9, 0.3, 1] }}
      data-capitulo-id={capitulo.id}
      data-capitulo-atual={ehAtual ? 'true' : 'false'}
      className={cn(
        'overflow-hidden rounded-2xl border backdrop-blur-sm transition-colors',
        feito
          ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
          : ehAtual
            ? cn(cor.ativo, cor.borda)
            : aberto
              ? cn('border-white/15', cor.fundo)
              : cn('border-white/8', 'bg-white/[0.015]'),
      )}
    >
      {/* Header — accordion + long-press para concluir */}
      <div
        onPointerDown={longPress.onPointerDown}
        onPointerUp={longPress.onPointerUp}
        onPointerLeave={longPress.onPointerLeave}
        onPointerCancel={longPress.onPointerCancel}
        className="relative"
      >
        <button
          type="button"
          onClick={handleHeaderClick}
          aria-expanded={aberto && !feito}
          aria-label={`${capitulo.titulo} — ${feito ? 'concluído' : aberto ? 'aberto' : 'fechado'}`}
          className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors touch-manipulation"
        >
          {/* Badge lateral */}
          <div
            className={cn(
              'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors',
              feito
                ? 'bg-emerald-500/30 text-emerald-200'
                : ehProximo && !ehAtual
                  ? 'bg-amber-400/20 text-amber-200 animate-pulse-soft'
                  : ehAtual
                    ? cn(cor.check, 'bg-white/10')
                    : 'bg-white/[0.06] text-white/55',
            )}
          >
            {feito ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : ehAtual ? (
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
            ) : (
              String(capitulo.id + 1).padStart(2, '0')
            )}
          </div>

          {/* Título + subtítulo + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'truncate text-[15px] font-semibold leading-tight transition-colors',
                  feito ? 'text-emerald-200/80 line-through' : cn(cor.texto),
                )}
              >
                {destacarTermo(capitulo.titulo, termoBusca)}
              </span>
              {ehAtual && (
                <span className="rounded-full bg-amber-300/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
                  Agora
                </span>
              )}
              {feito && (
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                  Concluído
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10.5px] text-white/45">
              <span className="uppercase tracking-[0.08em]">{ROTULO_TIPO[capitulo.tipo]}</span>
              {total > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">
                    {feito ? `${total} linhas` : `${marcados}/${total}`}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Seta */}
          <motion.div
            animate={{ rotate: aberto && !feito ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 text-white/40"
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        </button>

        {/* Barra de progresso */}
        {total > 0 && !feito && (
          <div className="px-4 pb-3">
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className={cn('h-full rounded-full', ehAtual ? 'bg-amber-300/70' : 'bg-white/30')}
                animate={{ width: `${progresso}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Hint long-press (só no capítulo atual) */}
        {ehAtual && !feito && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden sm:block">
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-white/40">
              segure p/ concluir
            </span>
          </div>
        )}
      </div>

      {/* Conteúdo expandido */}
      <AnimatePresence initial={false}>
        {aberto && !feito && capitulo.blocos.length > 0 && (
          <motion.div
            key="conteudo"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 0.9, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-1 px-3 pb-3 pt-1">
              {capitulo.blocos.map((bloco, i) => {
                const emDestaque =
                  !!termoBusca &&
                  bloco.texto.toLowerCase().includes(termoBusca.toLowerCase());
                return (
                  <BlocoLinha
                    key={bloco.id}
                    texto={destacarTermo(bloco.texto, termoBusca)}
                    index={i}
                    marcada={linhasMarcadas.has(bloco.id)}
                    emDestaque={emDestaque}
                    onToggle={() => toggleLinha(bloco.id)}
                    tamanhoFonte={tamanhoFonte}
                  />
                );
              })}
              {/* Botão explícito "Concluir esta seção" — além do long-press */}
              <button
                type="button"
                onClick={concluirSecao}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5 text-[12px] font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 active:scale-[0.99] touch-manipulation"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Concluir esta seção
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function destacarTermo(texto: string, termo: string) {
  if (!termo) return texto;
  // Para o React, devolvemos o texto original (sem dangerouslySetInnerHTML).
  // O destaque visual é feito via classes condicionais em BlocoLinha.
  return texto;
}

// ─── Componente principal ───────────────────────────────────────────────────

export function PulpitPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mensagem = useLiveQuery(() => (id ? db.mensagens.get(id) : undefined), [id]);

  // Stores
  const ativa           = usePulpitStore((s) => s.ativa);
  const entrar          = usePulpitStore((s) => s.entrar);
  const sair            = usePulpitStore((s) => s.sair);
  const toggleLinhaStore= usePulpitStore((s) => s.toggleLinha);
  const linhasMarcadas  = usePulpitStore((s) => s.linhasMarcadas);
  const desmarcarTudo   = usePulpitStore((s) => s.desmarcarTudo);
  const tamanhoFonte    = usePulpitStore((s) => s.tamanhoFonte);
  const setTamanhoFonte = usePulpitStore((s) => s.setTamanhoFonte);
  const iniciadaEm      = usePulpitStore((s) => s.iniciadaEm);
  const pausada         = usePulpitStore((s) => s.pausada);
  const tempoPausadoMs  = usePulpitStore((s) => s.tempoPausadoMs);
  const iniciar         = usePulpitStore((s) => s.iniciar);
  const pausar          = usePulpitStore((s) => s.pausar);
  const resetar         = usePulpitStore((s) => s.resetar);
  const tickAgora       = usePulpitStore((s) => s.tickAgora);

  const capitulos          = useProgressoStore((s) => s.capitulos);
  const capitulosAbertos   = useProgressoStore((s) => s.capitulosAbertos);
  const capitulosFeitos    = useProgressoStore((s) => s.capitulosFeitos);
  const inicializarProgresso = useProgressoStore((s) => s.inicializar);
  const toggleCapituloStore  = useProgressoStore((s) => s.toggleCapitulo);
  const abrirCapitulo        = useProgressoStore((s) => s.abrirCapitulo);
  const marcarFeitoEAvanca   = useProgressoStore((s) => s.marcarFeitoEAvanca);
  const resetarProgresso     = useProgressoStore((s) => s.resetar);

  const [agora, setAgora] = useState(Date.now());
  const [modoFoco, setModoFoco] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [temaEscuro, setTemaEscuro] = useState(true); // /pulpit é sempre dark por design

  const mostrarToast = useUIStore((s) => s.mostrarToast);

  // ─── Inicialização: parsear esboço quando mensagem muda ───────────────────
  useEffect(() => {
    if (!mensagem) return;
    const fonte = mensagem.esboco || mensagem.conteudo;
    if (!fonte) return;
    inicializarProgresso(parsearEsboco(fonte));
  }, [mensagem?.id, mensagem, inicializarProgresso]);

  // ─── Capítulos classificados por tipo semântico ─────────────────────────
  const capitulosClassificados: SecaoClassificada[] = useMemo(() => {
    return capitulos.map((c) => ({
      ...c,
      tipo: classificarCapitulo(c.titulo),
      cor: CORES[classificarCapitulo(c.titulo)],
    }));
  }, [capitulos]);

  // ─── Capítulos com cor recalculada após classificar ────────────────────
  const capitulosColoridos = useMemo(() => {
    return capitulos.map((c) => {
      const tipo = classificarCapitulo(c.titulo);
      return { ...c, tipo, cor: CORES[tipo] } as SecaoClassificada;
    });
  }, [capitulos]);

  // ─── Relógio parede (1Hz) ───────────────────────────────────────────────
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // ─── Tick cronômetro (5Hz para precisão sem queimar CPU) ────────────────
  useEffect(() => {
    if (!iniciadaEm || pausada) return;
    const t = window.setInterval(tickAgora, 200);
    return () => window.clearInterval(t);
  }, [iniciadaEm, pausada, tickAgora]);

  // ─── Entrar/sair do modo ────────────────────────────────────────────────
  useEffect(() => {
    entrar();
    return () => sair();
  }, [entrar, sair]);

  // ─── Refs para scroll inteligente ───────────────────────────────────────
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const registrarRef = useCallback((id: number) => (el: HTMLElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  // ─── Próximo / atual ────────────────────────────────────────────────────
  const totalFeitos = capitulosFeitos.size;
  const totalCaps = capitulos.length;
  const todosFeitos = totalCaps > 0 && totalFeitos === totalCaps;
  const primeiroNaoFeitoIdx = capitulos.findIndex((c) => !capitulosFeitos.has(c.id));
  const capituloAtual = primeiroNaoFeitoIdx >= 0 ? capitulosColoridos[primeiroNaoFeitoIdx] : null;

  // ─── Scroll inteligente: quando um capítulo vira feito, o próximo vai pro centro ──
  const ultimoFeitoRef = useRef<number>(-1);
  useEffect(() => {
    if (primeiroNaoFeitoIdx < 0) return;
    // Detecta mudança: o que era "próximo" agora é "atual"
    const totalFeitosAgora = capitulosFeitos.size;
    if (totalFeitosAgora === ultimoFeitoRef.current) return;
    ultimoFeitoRef.current = totalFeitosAgora;

    // Espera o layout assentar (framer-motion anima)
    const t = window.setTimeout(() => {
      const el = cardRefs.current.get(primeiroNaoFeitoIdx);
      const container = scrollContainerRef.current;
      if (!el || !container) return;
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        // Fallback sem smooth
        el.scrollIntoView({ block: 'center' });
      }
    }, 320);
    return () => window.clearTimeout(t);
  }, [capitulosFeitos, primeiroNaoFeitoIdx]);

  // ─── Ações ──────────────────────────────────────────────────────────────
  const handleIniciarOuPausar = useCallback(() => {
    if (!iniciadaEm) {
      iniciar();
      mostrarToast('Ministração iniciada', 'sucesso');
    } else if (pausada) {
      iniciar();
    } else {
      pausar();
    }
  }, [iniciadaEm, pausada, iniciar, pausar, mostrarToast]);

  const handleConcluirAtual = useCallback(() => {
    if (primeiroNaoFeitoIdx < 0) return;
    marcarFeitoEAvanca(primeiroNaoFeitoIdx);
  }, [primeiroNaoFeitoIdx, marcarFeitoEAvanca]);

  const handleConcluirSecao = useCallback(
    (id: number) => {
      marcarFeitoEAvanca(id);
    },
    [marcarFeitoEAvanca],
  );

  const handleReabrirSecao = useCallback(
    (id: number) => {
      // Remove dos feitos e força abrir
      const state = useProgressoStore.getState();
      const novosFeitos = new Set(state.capitulosFeitos);
      novosFeitos.delete(id);
      const novosAbertos = new Set(state.capitulosAbertos);
      novosAbertos.add(id);
      useProgressoStore.setState({
        capitulosFeitos: novosFeitos,
        capitulosAbertos: novosAbertos,
      });
    },
    [],
  );

  const handleRecomecar = useCallback(() => {
    resetar();
    resetarProgresso();
    setTermoBusca('');
  }, [resetar, resetarProgresso]);

  // ─── Busca: Cmd/Ctrl+K ou botão ─────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscaAberta(true);
      }
      if (e.key === 'Escape') {
        if (buscaAberta) {
          setBuscaAberta(false);
          setTermoBusca('');
        } else {
          navigate(`/editar/${id}`);
        }
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [buscaAberta, id, navigate]);

  // Resultados da busca
  const resultadosBusca: ResultadoBusca[] = useMemo(() => {
    if (!termoBusca || termoBusca.length < 2) return [];
    const t = termoBusca.toLowerCase();
    const out: ResultadoBusca[] = [];
    for (const cap of capitulosColoridos) {
      // Procura no título
      if (cap.titulo.toLowerCase().includes(t)) {
        out.push({ capituloId: cap.id, blocoId: -1, texto: cap.titulo, contexto: 'Título' });
      }
      // Procura nas linhas
      for (const bloco of cap.blocos) {
        if (bloco.texto.toLowerCase().includes(t)) {
          out.push({ capituloId: cap.id, blocoId: bloco.id, texto: bloco.texto, contexto: cap.titulo });
          if (out.length > 30) return out;
        }
      }
    }
    return out;
  }, [termoBusca, capitulosColoridos]);

  // ─── Atalhos extras ─────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleIniciarOuPausar();
      }
      if (e.key === '+' || e.key === '=') setTamanhoFonte(Math.min(96, tamanhoFonte + 2));
      if (e.key === '-' || e.key === '_') setTamanhoFonte(Math.max(18, tamanhoFonte - 2));
      if (e.key === '0') setTamanhoFonte(32);
      if (e.key === 'f' || e.key === 'F') setModoFoco((v) => !v);
      if (e.key === 'ArrowDown' || e.key === 'j') {
        const next = Math.min(totalCaps - 1, primeiroNaoFeitoIdx + 1);
        if (next !== primeiroNaoFeitoIdx) abrirCapitulo(next);
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        const prev = Math.max(0, primeiroNaoFeitoIdx - 1);
        if (prev !== primeiroNaoFeitoIdx) abrirCapitulo(prev);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [
    handleIniciarOuPausar,
    tamanhoFonte,
    setTamanhoFonte,
    primeiroNaoFeitoIdx,
    totalCaps,
    abrirCapitulo,
  ]);

  // ─── Cronômetro derivado ────────────────────────────────────────────────
  let duracaoMs = 0;
  if (iniciadaEm) duracaoMs = pausada ? tempoPausadoMs : Date.now() - iniciadaEm;
  const progressoTempo =
    iniciadaEm && mensagem?.tempoEstimado && mensagem.tempoEstimado > 0
      ? Math.min(100, (duracaoMs / 1000 / 60 / mensagem.tempoEstimado) * 100)
      : 0;
  const restanteMs = mensagem?.tempoEstimado
    ? Math.max(0, mensagem.tempoEstimado * 60_000 - duracaoMs)
    : 0;

  // ─── Lock body scroll enquanto /pulpit está ativo ───────────────────────
  useLayoutEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevHeight = document.body.style.height;
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100dvh';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.height = prevHeight;
    };
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────
  if (!mensagem) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0a0a14] text-white/60">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <span className="text-sm">Carregando mensagem…</span>
        </div>
      </div>
    );
  }

  // Paleta tema — dark sempre (pregação é noturna/luz baixa)
  const tema = {
    bg: '#07070d',
    bgGrad: 'linear-gradient(180deg, #0a0a18 0%, #07070f 60%, #050509 100%)',
    texto: 'text-white',
    textoSuave: 'text-white/55',
    textoMudo: 'text-white/35',
    card: 'bg-white/[0.025]',
    divisor: 'border-white/[0.07]',
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-40 flex flex-col overflow-hidden text-white transition-opacity',
        ativa ? 'opacity-100' : 'opacity-0',
      )}
      style={{
        background: tema.bgGrad,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* ════════════════ TOP BAR ════════════════ */}
      <header
        className={cn(
          'relative z-30 flex flex-shrink-0 items-center gap-2 border-b px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3',
          tema.divisor,
          'bg-black/30 backdrop-blur-md',
        )}
      >
        <button
          type="button"
          onClick={() => navigate(`/editar/${id}`)}
          aria-label="Voltar para o editor"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 active:bg-white/15 touch-manipulation"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[14px] font-semibold leading-tight sm:text-[15px]">
            {mensagem.titulo || 'Sem título'}
          </h1>
          <div className={cn('truncate text-[10.5px]', tema.textoSuave)}>
            {mensagem.textoBase && <span>{mensagem.textoBase}</span>}
            {mensagem.livroBiblico && mensagem.textoBase && <span> · </span>}
            {mensagem.livroBiblico && <span>{mensagem.livroBiblico}</span>}
          </div>
        </div>

        {/* Cronômetro central (sempre visível) */}
        <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
          <Clock className="h-3.5 w-3.5 text-amber-300/80" />
          <span className="font-mono text-[15px] font-semibold tabular-nums leading-none sm:text-[17px]">
            {formatarDuracao(duracaoMs)}
          </span>
          {mensagem.tempoEstimado > 0 && (
            <span className="hidden text-[10px] text-white/40 sm:inline">
              / {formatarDuracao(mensagem.tempoEstimado * 60_000)}
            </span>
          )}
        </div>

        {/* Relógio parede */}
        <div className="hidden flex-shrink-0 text-right sm:block">
          <div className="font-mono text-[14px] leading-none tabular-nums text-white/70">
            {formatarRelogio(agora)}
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-white/35">
            agora
          </div>
        </div>

        {/* Botão play/pause (sempre visível) */}
        <button
          type="button"
          onClick={handleIniciarOuPausar}
          aria-label={!iniciadaEm ? 'Iniciar' : pausada ? 'Retomar' : 'Pausar'}
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all touch-manipulation',
            'active:scale-95',
            !iniciadaEm || pausada
              ? 'bg-amber-300 text-amber-950 shadow-[0_0_20px_rgba(252,211,77,0.25)]'
              : 'bg-white/10 text-white hover:bg-white/15',
          )}
        >
          {!iniciadaEm || pausada ? (
            <Play className="h-4 w-4 fill-current" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </button>

        {/* Foco / Sair */}
        <button
          type="button"
          onClick={() => setModoFoco((v) => !v)}
          aria-label="Modo foco"
          aria-pressed={modoFoco}
          className={cn(
            'hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors touch-manipulation sm:flex',
            modoFoco ? 'bg-amber-300/20 text-amber-200' : 'text-white/70 hover:bg-white/10',
          )}
        >
          <Focus className="h-4.5 w-4.5" />
        </button>

        <button
          type="button"
          onClick={() => navigate(`/editar/${id}`)}
          aria-label="Sair do modo pregação"
          className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 touch-manipulation sm:flex"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </header>

      {/* ════════════════ BARRA DE PROGRESSO DO TEMPO ════════════════ */}
      <div
        className="relative h-0.5 flex-shrink-0 bg-white/[0.05]"
        role="progressbar"
        aria-valuenow={Math.round(progressoTempo)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-300/60 to-amber-200"
          initial={false}
          animate={{ width: `${progressoTempo}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
        {progressoTempo > 85 && (
          <motion.div
            className="absolute inset-y-0 right-0 w-1 bg-red-400/80"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </div>

      {/* ════════════════ MODO FOCO (overlay) ════════════════ */}
      <AnimatePresence>
        {modoFoco && capituloAtual && (
          <motion.div
            key="foco"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6"
            style={{ background: tema.bgGrad }}
          >
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.3 }}
              className="w-full max-w-2xl text-center"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-300/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
                Em pregação
              </div>

              <h2 className="mb-6 text-balance text-2xl font-bold leading-tight sm:text-4xl md:text-5xl">
                {capituloAtual.titulo}
              </h2>

              {capituloAtual.blocos[0] && (
                <p
                  className="mx-auto max-w-xl text-balance text-white/75 sm:text-lg"
                  style={{ fontSize: `${Math.max(20, tamanhoFonte - 6)}px`, lineHeight: 1.5 }}
                >
                  “{capituloAtual.blocos[0].texto.replace(/^[▌•]+\s*/, '').trim()}”
                </p>
              )}

              <div className="mt-10 flex items-center justify-center gap-6 sm:gap-10">
                <div className="text-center">
                  <div className="font-mono text-3xl font-semibold tabular-nums sm:text-5xl">
                    {formatarDuracao(duracaoMs)}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/40">
                    decorrido
                  </div>
                </div>
                <div className="h-12 w-px bg-white/10" />
                <div className="text-center">
                  <div className="font-mono text-3xl font-semibold tabular-nums text-white/70 sm:text-5xl">
                    {totalFeitos}/{totalCaps}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/40">
                    progresso
                  </div>
                </div>
                {restanteMs > 0 && mensagem.tempoEstimado > 0 && (
                  <>
                    <div className="h-12 w-px bg-white/10" />
                    <div className="text-center">
                      <div className="font-mono text-3xl font-semibold tabular-nums text-white/70 sm:text-5xl">
                        −{formatarDuracao(restanteMs)}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/40">
                        restante
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleConcluirAtual}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-5 py-2.5 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/30 active:scale-95 touch-manipulation"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Concluir este ponto
                </button>
                <button
                  type="button"
                  onClick={handleIniciarOuPausar}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 active:scale-95 touch-manipulation"
                >
                  {!iniciadaEm || pausada ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4" />}
                  {!iniciadaEm ? 'Iniciar' : pausada ? 'Retomar' : 'Pausar'}
                </button>
                <button
                  type="button"
                  onClick={() => setModoFoco(false)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 active:scale-95 touch-manipulation"
                >
                  <Eye className="h-4 w-4" />
                  Sair do foco
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════ HERO: ponto atual (sempre visível no topo do scroll) ════════════════ */}
      {!modoFoco && capituloAtual && (
        <div
          className={cn(
            'relative z-10 flex-shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4',
            tema.divisor,
            'bg-gradient-to-b from-amber-300/[0.07] to-transparent',
          )}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-300/20 text-amber-200 sm:h-12 sm:w-12">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-300/80">
                Agora
              </div>
              <div className="truncate text-[15px] font-semibold leading-tight sm:text-[17px]">
                {capituloAtual.titulo}
              </div>
            </div>
            <button
              type="button"
              onClick={handleConcluirAtual}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-2 text-[12px] font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/30 active:scale-95 touch-manipulation sm:px-4 sm:text-[13px]"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Concluir</span>
            </button>
          </div>
        </div>
      )}

      {/* ════════════════ CHIPS DE NAVEGAÇÃO ════════════════ */}
      {!modoFoco && (
        <div
          className={cn(
            'flex flex-shrink-0 items-center gap-1.5 overflow-x-auto border-b px-3 py-2 sm:px-6',
            tema.divisor,
            'scrollbar-none',
          )}
          style={{ scrollbarWidth: 'none' }}
        >
          {capitulosColoridos.map((cap) => {
            const feito = capitulosFeitos.has(cap.id);
            const aberto = capitulosAbertos.has(cap.id);
            const ehProximo = cap.id === primeiroNaoFeitoIdx;
            return (
              <button
                key={cap.id}
                type="button"
                onClick={() => {
                  if (feito) {
                    handleReabrirSecao(cap.id);
                  } else {
                    abrirCapitulo(cap.id);
                    // scroll até o card
                    requestAnimationFrame(() => {
                      cardRefs.current.get(cap.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    });
                  }
                }}
                className={cn(
                  'flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium transition-all touch-manipulation active:scale-95',
                  feito
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : aberto
                      ? cn('text-white', cap.cor.fundo, 'border', cap.cor.borda)
                      : ehProximo
                        ? 'bg-amber-300/15 text-amber-200 border border-amber-300/30 animate-pulse-soft'
                        : 'bg-white/[0.05] text-white/55 hover:bg-white/[0.08]',
                )}
              >
                {feito ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <span className="tabular-nums">{String(cap.id + 1).padStart(2, '0')}</span>
                )}
                <span className="max-w-[120px] truncate sm:max-w-[180px]">{cap.titulo}</span>
              </button>
            );
          })}
          {todosFeitos && (
            <button
              type="button"
              onClick={handleRecomecar}
              className="ml-auto flex flex-shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/30 active:scale-95 touch-manipulation"
            >
              <RotateCcw className="h-3 w-3" />
              Recomeçar
            </button>
          )}
        </div>
      )}

      {/* ════════════════ CORPO: lista de seções ════════════════ */}
      {!modoFoco && (
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 84px)', // espaço p/ barra flutuante
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="mx-auto max-w-2xl space-y-2.5 px-3 py-4 sm:space-y-3 sm:px-4 sm:py-6">
            {capitulosColoridos.map((cap) => (
              <CapituloCard
                key={cap.id}
                capitulo={cap}
                aberto={capitulosAbertos.has(cap.id) && !capitulosFeitos.has(cap.id)}
                feito={capitulosFeitos.has(cap.id)}
                ehProximo={cap.id === primeiroNaoFeitoIdx}
                ehAtual={cap.id === primeiroNaoFeitoIdx && capitulos.length > 0}
                linhasMarcadas={linhasMarcadas}
                toggleCapitulo={() => toggleCapituloStore(cap.id)}
                toggleLinha={toggleLinhaStore}
                concluirSecao={() => handleConcluirSecao(cap.id)}
                reabrirSecao={() => handleReabrirSecao(cap.id)}
                registerRef={registrarRef(cap.id)}
                tamanhoFonte={tamanhoFonte}
                termoBusca={termoBusca}
              />
            ))}

            {/* Empty state */}
            {capitulosColoridos.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center text-white/55">
                <BookOpen className="h-8 w-8 opacity-40" />
                <p className="text-sm">Este esboço ainda não tem conteúdo estruturado.</p>
                <button
                  type="button"
                  onClick={() => navigate(`/editar/${id}`)}
                  className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/15"
                >
                  Abrir editor
                </button>
              </div>
            )}

            {/* Footer info */}
            {capitulosColoridos.length > 0 && (
              <div className="pt-2 text-center text-[10.5px] uppercase tracking-[0.12em] text-white/30">
                {totalFeitos}/{totalCaps} seções · {linhasMarcadas.size} linhas marcadas
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════ BARRA FLUTUANTE ════════════════ */}
      {!modoFoco && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 pointer-events-none"
        >
          <div
            className={cn(
              'pointer-events-auto flex items-center gap-0.5 rounded-full border border-white/15 bg-black/70 px-1.5 py-1.5 shadow-2xl backdrop-blur-xl',
              'sm:gap-1 sm:px-2',
            )}
          >
            <BarraBotao
              icon={<ChevronDown className="h-4 w-4" />}
              label="A−"
              onClick={() => setTamanhoFonte(Math.max(18, tamanhoFonte - 2))}
              ariaLabel="Diminuir fonte"
            />
            <BarraBotao
              icon={<ChevronUp className="h-4 w-4" />}
              label="A+"
              onClick={() => setTamanhoFonte(Math.min(96, tamanhoFonte + 2))}
              ariaLabel="Aumentar fonte"
            />
            <BarraSeparador />
            <BarraBotao
              icon={<Type className="h-4 w-4" />}
              label="Fonte"
              onClick={() => setTamanhoFonte(tamanhoFonte === 32 ? 40 : tamanhoFonte === 40 ? 24 : 32)}
              ariaLabel="Tamanho da fonte"
            />
            <BarraSeparador />
            <BarraBotao
              icon={temaEscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              label="Tema"
              onClick={() => setTemaEscuro((v) => !v)}
              ariaLabel="Alternar tema"
            />
            <BarraSeparador />
            <BarraBotao
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Concluir"
              onClick={handleConcluirAtual}
              ariaLabel="Concluir ponto atual"
              destaque
              desabilitado={primeiroNaoFeitoIdx < 0}
            />
            <BarraSeparador />
            <BarraBotao
              icon={<Search className="h-4 w-4" />}
              label="Buscar"
              onClick={() => setBuscaAberta(true)}
              ariaLabel="Buscar no sermão"
            />
            <BarraSeparador />
            <BarraBotao
              icon={pausada || !iniciadaEm ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4" />}
              label="Tempo"
              onClick={handleIniciarOuPausar}
              ariaLabel="Controle de tempo"
            />
          </div>
        </div>
      )}

      {/* ════════════════ BUSCA (modal) ════════════════ */}
      <AnimatePresence>
        {buscaAberta && (
          <motion.div
            key="busca"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setBuscaAberta(false);
              setTermoBusca('');
            }}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-3 mt-16 overflow-hidden rounded-2xl border border-white/15 bg-[#0d0d18] shadow-2xl sm:mx-auto sm:max-w-2xl"
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <Search className="h-4 w-4 text-white/50" />
                <input
                  type="text"
                  autoFocus
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  placeholder="Buscar no sermão…"
                  className="flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
                />
                {termoBusca && (
                  <button
                    type="button"
                    onClick={() => setTermoBusca('')}
                    className="rounded-full p-1 text-white/40 hover:bg-white/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="max-h-[50vh] overflow-y-auto">
                {termoBusca.length < 2 ? (
                  <div className="px-4 py-8 text-center text-[12px] text-white/40">
                    Digite pelo menos 2 letras para buscar
                  </div>
                ) : resultadosBusca.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[12px] text-white/40">
                    Nenhum resultado para “{termoBusca}”
                  </div>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {resultadosBusca.map((r, i) => (
                      <li key={`${r.capituloId}-${r.blocoId}-${i}`}>
                        <button
                          type="button"
                          onClick={() => {
                            abrirCapitulo(r.capituloId);
                            setBuscaAberta(false);
                            requestAnimationFrame(() => {
                              cardRefs.current.get(r.capituloId)?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                              });
                            });
                          }}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
                        >
                          <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/30" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-medium text-white/90">
                              {r.texto}
                            </div>
                            <div className="truncate text-[10.5px] text-white/40">
                              {r.contexto}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-white/40">
                <span>↑↓ navegar · ↵ abrir · Esc fechar</span>
                <span>{resultadosBusca.length} resultados</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Subcomponentes da barra flutuante ──────────────────────────────────────

function BarraSeparador() {
  return <div className="mx-0.5 h-5 w-px bg-white/10 sm:mx-1" />;
}

function BarraBotao({
  icon,
  label,
  onClick,
  ariaLabel,
  destaque = false,
  desabilitado = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  ariaLabel: string;
  destaque?: boolean;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      aria-label={ariaLabel}
      className={cn(
        'group relative flex h-10 min-w-[2.5rem] items-center justify-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-all touch-manipulation active:scale-95',
        desabilitado
          ? 'cursor-not-allowed text-white/25'
          : destaque
            ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
            : 'text-white/70 hover:bg-white/10 hover:text-white',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
