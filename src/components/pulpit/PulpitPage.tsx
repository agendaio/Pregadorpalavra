/**
 * /pulpit â€” Modo Pregação Premium
 *
 * Tela em tempo real usada durante cultos e ministrações.
 * Mobile-first, fullscreen, segura contra toques acidentais, e desenhada
 * para que o pregador NUNCA se perca: o ponto atual está sempre no centro,
 * o próximo sobe automaticamente, e tudo que já foi ministrado permanece
 * visível (com opacidade reduzida e check) para referência rápida.
 *
 * Não altera stores, parser ou modelo de dados â€” apenas consome o que existe.
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

// â”€â”€â”€ Tipos internos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Classificação semântica dos capítulos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Decidida pelo título â€” pregador escreve "Introdução", "Ponto 1 â€” A fé",
// "Aplicação", "Ilustração", "Conclusão" e a UI cuida do resto.

const RE_INTRO    = /^(intro|introdução|introducao|abertura|abertura|contextualização|contextualizacao)/i;
const RE_APLIC    = /^(aplica|aplicação|aplicacao|desafio|encerramento|prática|pratica)/i;
const RE_ILUST    = /^(ilustra|ilustração|ilustracao|história|historia|exemplo|metáfora|metafora|parábola|parabola)/i;
const RE_CONCL    = /^(conclus|conclusão|conclusao|fechamento|final|call\s*to\s*action|cta|apelo)/i;
const RE_PONTO    = /^ponto\s*\d|^p\s*\d|^parte\s*\d|^i{1,3}\s*[-â€“â€”]/i;

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

// â”€â”€â”€ Hook: detecção de long-press â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Componente: linha de conteúdo (marca simples) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  const eSubtitulo = texto.startsWith('â–Œ');
  const eSubSub = texto.startsWith('  â—¦');
  const isLista = texto.startsWith('â€¢');

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

// â”€â”€â”€ Componente: card de seção (accordion inteligente) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      {/* Header â€” accordion + long-press para concluir */}
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
          aria-label={`${capitulo.titulo} â€” ${feito ? 'concluído' : aberto ? 'aberto' : 'fechado'}`}
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
                  <span aria-hidden>Â·</span>
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
              {/* Botão explícito "Concluir esta seção" â€” além do long-press */}
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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function destacarTermo(texto: string, termo: string) {
  if (!termo) return texto;
  // Para o React, devolvemos o texto original (sem dangerouslySetInnerHTML).
  // O destaque visual é feito via classes condicionais em BlocoLinha.
  return texto;
}

// â”€â”€â”€ Componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€â”€ Inicialização: parsear esboço quando mensagem muda â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!mensagem) return;
    const fonte = mensagem.esboco || mensagem.conteudo;
    if (!fonte) return;
    inicializarProgresso(parsearEsboco(fonte));
  }, [mensagem?.id, mensagem, inicializarProgresso]);

  // â”€â”€â”€ Capítulos classificados por tipo semântico â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const capitulosClassificados: SecaoClassificada[] = useMemo(() => {
    return capitulos.map((c) => ({
      ...c,
      tipo: classificarCapitulo(c.titulo),
      cor: CORES[classificarCapitulo(c.titulo)],
    }));
  }, [capitulos]);

  // â”€â”€â”€ Capítulos com cor recalculada após classificar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const capitulosColoridos = useMemo(() => {
    return capitulos.map((c) => {
      const tipo = classificarCapitulo(c.titulo);
      return { ...c, tipo, cor: CORES[tipo] } as SecaoClassificada;
    });
  }, [capitulos]);

  // â”€â”€â”€ Relógio parede (1Hz) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // â”€â”€â”€ Tick cronômetro (5Hz para precisão sem queimar CPU) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!iniciadaEm || pausada) return;
    const t = window.setInterval(tickAgora, 200);
    return () => window.clearInterval(t);
  }, [iniciadaEm, pausada, tickAgora]);

  // â”€â”€â”€ Entrar/sair do modo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    entrar();
    return () => sair();
  }, [entrar, sair]);

  // â”€â”€â”€ Refs para scroll inteligente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const registrarRef = useCallback((id: number) => (el: HTMLElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  // â”€â”€â”€ Próximo / atual â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalFeitos = capitulosFeitos.size;
  const totalCaps = capitulos.length;
  const todosFeitos = totalCaps > 0 && totalFeitos === totalCaps;
  const primeiroNaoFeitoIdx = capitulos.findIndex((c) => !capitulosFeitos.has(c.id));
  const capituloAtual = primeiroNaoFeitoIdx >= 0 ? capitulosColoridos[primeiroNaoFeitoIdx] : null;

  // â”€â”€â”€ Scroll inteligente: quando um capítulo vira feito, o próximo vai pro centro â”€â”€
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

  // â”€â”€â”€ Ações â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Busca: Cmd/Ctrl+K ou botão â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Atalhos extras â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Cronômetro derivado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let duracaoMs = 0;
  if (iniciadaEm) duracaoMs = pausada ? tempoPausadoMs : Date.now() - iniciadaEm;
  const progressoTempo =
    iniciadaEm && mensagem?.tempoEstimado && mensagem.tempoEstimado > 0
      ? Math.min(100, (duracaoMs / 1000 / 60 / mensagem.tempoEstimado) * 100)
      : 0;
  const restanteMs = mensagem?.tempoEstimado
    ? Math.max(0, mensagem.tempoEstimado * 60_000 - duracaoMs)
    : 0;

  // â”€â”€â”€ Lock body scroll enquanto /pulpit está ativo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!mensagem) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0a0a14] text-white/60">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <span className="text-sm">Carregando mensagemâ€¦</span>
        </div>
      </div>
    );
  }

  // Paleta tema â€” dark sempre (pregação é noturna/luz baixa)
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
        background: '#0a0a14',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TOP BAR COLLAPSIBLE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <header
        className={cn(
          'relative z-30 flex flex-shrink-0 items-center gap-2 border-b border-amber-300/10 px-3 py-2 sm:gap-3 sm:px-5 sm:py-3',
          'bg-black/40 backdrop-blur-md',
        )}
      >
        <button
          type="button"
          onClick={() => navigate(`/editar/${id}`)}
          aria-label="Voltar para o editor"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-amber-300/80 transition-colors hover:bg-amber-300/10 active:bg-amber-300/15 touch-manipulation"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[13.5px] font-semibold leading-tight text-amber-100 sm:text-[14.5px]">
            {mensagem.titulo || 'Sem título'}
          </h1>
          <div className="truncate text-[10px] text-white/50">
            {mensagem.textoBase && <span>{mensagem.textoBase}</span>}
            {mensagem.livroBiblico && <span> Â· {mensagem.livroBiblico}</span>}
          </div>
        </div>

        {/* Cronômetro central */}
        <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/[0.04] px-2.5 py-1 sm:gap-2 sm:px-3 sm:py-1.5">
          <Clock className="h-3 w-3 text-amber-300/80" />
          <span className="font-mono text-[13.5px] font-semibold tabular-nums leading-none text-amber-100 sm:text-[15px]">
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
          <div className="font-mono text-[12px] leading-none tabular-nums text-white/55">
            {formatarRelogio(agora)}
          </div>
        </div>

        {/* Botão play/pause */}
        <button
          type="button"
          onClick={handleIniciarOuPausar}
          aria-label={!iniciadaEm ? 'Iniciar' : pausada ? 'Retomar' : 'Pausar'}
          className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all touch-manipulation active:scale-95',
            !iniciadaEm || pausada
              ? 'bg-amber-300 text-amber-950 shadow-[0_0_20px_rgba(252,211,77,0.3)]'
              : 'bg-white/10 text-white hover:bg-white/15',
          )}
        >
          {!iniciadaEm || pausada ? (
            <Play className="h-4 w-4 fill-current" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </button>
      </header>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• BARRA DE NAVEGAÃ‡ÃƒO RÁPIDA (chips) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {!modoFoco && (
        <div
          className="flex flex-shrink-0 items-center gap-1.5 overflow-x-auto border-b border-amber-300/10 bg-black/20 px-3 py-2 sm:px-5 scrollbar-none"
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
                  if (feito) handleReabrirSecao(cap.id);
                  else {
                    abrirCapitulo(cap.id);
                    requestAnimationFrame(() => {
                      cardRefs.current.get(cap.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    });
                  }
                }}
                className={cn(
                  'flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium transition-all touch-manipulation active:scale-95',
                  feito
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : aberto
                      ? 'bg-amber-300/20 text-amber-100 border border-amber-300/40'
                      : ehProximo
                        ? 'bg-amber-300/10 text-amber-200 border border-amber-300/30 animate-pulse-soft'
                        : 'bg-white/[0.04] text-white/55 hover:bg-white/[0.08]',
                )}
              >
                {feito ? <CheckCircle2 className="h-3 w-3" /> : <span className="tabular-nums">{String(cap.id + 1).padStart(2, '0')}</span>}
                <span className="max-w-[120px] truncate sm:max-w-[180px]">{cap.titulo}</span>
              </button>
            );
          })}
          {todosFeitos && (
            <button
              type="button"
              onClick={handleRecomecar}
              className="ml-auto flex flex-shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/30 active:scale-95 touch-manipulation"
            >
              <RotateCcw className="h-3 w-3" />
              Recomeçar
            </button>
          )}
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• CORPO: lista de seções â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 88px)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:space-y-10 sm:px-6 sm:py-10">
          {capitulosColoridos.map((cap, idx) => {
            const feito = capitulosFeitos.has(cap.id);
            const ehProximo = cap.id === primeiroNaoFeitoIdx;
            return (
              <CapituloCardNovo
                key={cap.id}
                capitulo={cap}
                indice={idx + 1}
                feito={feito}
                ehProximo={ehProximo}
                linhasMarcadas={linhasMarcadas}
                toggleLinha={toggleLinhaStore}
                tamanhoFonte={tamanhoFonte}
                termoBusca={termoBusca}
              />
            );
          })}

          {capitulosColoridos.length === 0 && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
              <div className="mb-4 text-5xl">ðŸ“–</div>
              <p className="text-[15px] font-semibold text-amber-100">Nenhum esboço carregado</p>
              <p className="mt-2 text-[12px] text-white/55">Volte ao editor e escreva o sermão.</p>
            </div>
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• ORAÃ‡ÃƒO FINAL (sempre no fim) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {capitulosColoridos.length > 0 && (
            <div className="mt-12 mb-4 flex flex-col items-center text-center">
              <div className="mb-4 text-5xl text-amber-300">âœ</div>
              <h2 className="mb-6 text-[28px] font-bold text-amber-300 sm:text-[32px]">Oração</h2>
              <p className="max-w-md italic text-[15.5px] leading-relaxed text-white/80 sm:text-[16px]">
                Senhor, que a Tua Palavra seja luz nos nossos caminhos.<br />
                Que a fé que ouvimos hoje se faça obra em nossas vidas.<br />
                Em nome de Jesus. <span className="font-semibold text-amber-300">Amém.</span>
              </p>
              <div className="mt-8 h-px w-32 bg-amber-300/40" />
            </div>
          )}
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• BARRA FLUTUANTE COMPACTA â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {!modoFoco && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-amber-300/15 bg-black/70 px-1.5 py-1.5 shadow-2xl backdrop-blur-xl sm:gap-1 sm:px-2">
            <BarraBotao
              icon={<ChevronDown className="h-4 w-4" />}
              label="Aâˆ’"
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
              icon={<Search className="h-4 w-4" />}
              label="Buscar"
              onClick={() => setBuscaAberta((v) => !v)}
              ariaLabel="Buscar"
              destaque={buscaAberta}
            />
            <BarraSeparador />
            <BarraBotao
              icon={<Focus className="h-4 w-4" />}
              label="Foco"
              onClick={() => setModoFoco((v) => !v)}
              ariaLabel="Modo foco"
              destaque={modoFoco}
            />
            <BarraSeparador />
            <BarraBotao
              icon={<Sun className="h-4 w-4" />}
              label="Tema"
              onClick={() => {
                const novo = !temaEscuro;
                setTemaEscuro(novo);
                mostrarToast(novo ? 'Tema claro ativado' : 'Tema escuro ativado', 'info');
              }}
              ariaLabel="Alternar tema"
            />
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• BUSCA (overlay) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <AnimatePresence>
        {buscaAberta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-md"
            onClick={() => setBuscaAberta(false)}
          >
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
              className="flex items-center gap-2 border-b border-amber-300/15 bg-black/60 px-4 py-3"
              onClick={(e) => e.stopPropagation()}
            >
              <Search className="h-4 w-4 text-amber-300/80" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar no esboçoâ€¦"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="flex-1 bg-transparent text-[15px] text-white placeholder:text-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => { setTermoBusca(''); setBuscaAberta(false); }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
            {resultadosBusca.length > 0 && (
              <div className="flex-1 overflow-y-auto px-4 py-2" onClick={(e) => e.stopPropagation()}>
                {resultadosBusca.map((r, i) => (
                  <button
                    key={`${r.capituloId}-${r.blocoId}-${i}`}
                    type="button"
                    onClick={() => {
                      abrirCapitulo(r.capituloId);
                      cardRefs.current.get(r.capituloId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setBuscaAberta(false);
                    }}
                    className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                  >
                    <div className="text-[10.5px] uppercase tracking-wider text-amber-300/70">{r.contexto}</div>
                    <div className="text-[14px] text-white">{r.texto}</div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-white/40">
              <span>â†‘â†“ navegar Â· â†µ abrir Â· Esc fechar</span>
              <span>{resultadosBusca.length} resultados</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// â”€â”€â”€ Componente: card de seção (design profissional dark+gold) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CapituloCardNovo = memo(function CapituloCardNovo({
  capitulo,
  indice,
  feito,
  ehProximo,
  linhasMarcadas,
  toggleLinha,
  tamanhoFonte,
  termoBusca,
}: {
  capitulo: SecaoClassificada;
  indice: number;
  feito: boolean;
  ehProximo: boolean;
  linhasMarcadas: Set<number>;
  toggleLinha: (id: number) => void;
  tamanhoFonte: number;
  termoBusca: string;
}) {
  const numero = String(indice).padStart(2, '0');

  // Separa os blocos em grupos: subtítulos, citações, listas, parágrafos
  type Item =
    | { kind: 'subtitulo'; texto: string }
    | { kind: 'citacao'; texto: string; ref?: string }
    | { kind: 'lista'; texto: string }
    | { kind: 'paragrafo'; texto: string };

  const itens: Item[] = [];
  let i = 0;
  while (i < capitulo.blocos.length) {
    const b = capitulo.blocos[i];
    const txt = b.texto;
    if (txt.startsWith('â–Œ')) {
      itens.push({ kind: 'subtitulo', texto: txt.replace(/^â–Œ\s*/, '').trim() });
    } else if (txt.match(/^\d+\.\s+/) || txt.match(/^[â€¢\-]\s+/)) {
      itens.push({ kind: 'lista', texto: txt.replace(/^(\d+\.|[â€¢\-])\s+/, '').trim() });
    } else if (txt.length > 60 && txt.match(/[A-Z][a-z]+/)) {
      // Detecta citação bíblica (heurística: aspas ou nome de livro)
      const citMatch = txt.match(/["""]([^"""]+)["""]?/);
      const refMatch = txt.match(/\(([A-ZÁÃ‰ÍÃ“Ãš][a-zç]+\s+\d+[:\.]\d+[^)]*)\)/);
      if (citMatch || refMatch) {
        itens.push({
          kind: 'citacao',
          texto: citMatch ? citMatch[1] : txt,
          ref: refMatch ? refMatch[1] : undefined,
        });
      } else {
        itens.push({ kind: 'paragrafo', texto: txt });
      }
    } else {
      itens.push({ kind: 'paragrafo', texto: txt });
    }
    i++;
  }

  // Agrupa listas em colunas (2 colunas em desktop)
  const grupos: { tipo: 'header' | 'cards' | 'lista' | 'citacao'; items: Item[] }[] = [];
  let current: { tipo: 'header' | 'cards' | 'lista' | 'citacao'; items: Item[] } | null = null;
  for (const it of itens) {
    if (it.kind === 'subtitulo') {
      current = { tipo: 'cards', items: [] };
      grupos.push(current);
    } else if (it.kind === 'citacao') {
      grupos.push({ tipo: 'citacao', items: [it] });
      current = null;
    } else if (it.kind === 'lista') {
      if (!current || current.tipo !== 'lista') {
        current = { tipo: 'lista', items: [] };
        grupos.push(current);
      }
      current.items.push(it);
    } else {
      if (!current || current.tipo !== 'cards') {
        current = { tipo: 'cards', items: [] };
        grupos.push(current);
      }
      current.items.push(it);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: feito ? 0.45 : 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 0.9, 0.3, 1] }}
      className="space-y-5"
    >
      {/* Header do capítulo â€” numeração grande + título em ouro */}
      <div className="border-b border-amber-300/15 pb-3">
        <h2 className="font-serif text-[26px] font-bold leading-tight text-amber-300 sm:text-[30px]">
          {numero}. {capitulo.titulo}
        </h2>
        {ehProximo && !feito && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
            Agora
          </div>
        )}
        {feito && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Concluído
          </div>
        )}
      </div>

      {/* Cards de pontos (subtítulos viram cards em grid) */}
      {grupos.map((g, gi) => {
        if (g.tipo === 'cards') {
          const subtitulo = g.items[0]?.kind === 'subtitulo' ? (g.items[0] as Item & { kind: 'subtitulo' }).texto : null;
          const resto = subtitulo ? g.items.slice(1) : g.items;
          return (
            <div key={gi} className="space-y-3">
              {subtitulo && (
                <h3 className="flex items-center gap-2 text-[15px] font-semibold text-amber-200">
                  <span className="h-px w-6 bg-amber-300/60" />
                  {subtitulo}
                </h3>
              )}
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {resto.map((it, idx) => (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 transition-colors hover:bg-white/[0.04]"
                  >
                    {/* Borda dourada lateral */}
                    <div className="absolute inset-y-0 left-0 w-0.5 bg-amber-300/60" />
                    <div className="space-y-2 pl-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-300/20 text-[12px] font-bold text-amber-200">
                        {idx + 1}
                      </div>
                      <h4 className="font-serif text-[16px] font-bold text-white">
                        {it.kind === 'subtitulo' ? it.texto : extractTitle(it.texto)}
                      </h4>
                      <p className="text-[13px] leading-relaxed text-white/65">
                        {it.kind === 'subtitulo' ? '' : extractDescription(it.texto)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (g.tipo === 'lista') {
          return (
            <ol key={gi} className="relative space-y-4 pl-2">
              {/* Linha tracejada dourada */}
              <div className="absolute left-[18px] top-3 bottom-3 w-px border-l-2 border-dashed border-amber-300/30" />
              {g.items.map((it, idx) => (
                <li key={idx} className="relative flex gap-4 pl-2">
                  <div className="z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-300/90 text-[13px] font-bold text-amber-950 shadow-[0_0_12px_rgba(252,211,77,0.25)]">
                    {idx + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-baseline gap-3">
                      <h4 className="font-serif text-[15.5px] font-bold text-white">
                        {it.kind === 'lista' ? extractTitle(it.texto) : ''}
                      </h4>
                      {extractRef(it.texto) && (
                        <span className="font-mono text-[10.5px] italic text-amber-300/80">
                          {extractRef(it.texto)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-white/70">
                      {it.kind === 'lista' ? extractDescription(it.texto) : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          );
        }
        if (g.tipo === 'citacao') {
          const cit = g.items[0] as Item & { kind: 'citacao' };
          return (
            <div key={gi} className="relative mx-auto max-w-md rounded-xl border border-amber-300/20 bg-white/[0.03] p-6 sm:p-8">
              {/* Aspas grandes douradas */}
              <div className="absolute -top-3 left-4 font-serif text-[64px] leading-none text-amber-300/80">"</div>
              <p className="mt-4 text-center font-serif text-[15.5px] italic leading-relaxed text-white/85 sm:text-[16.5px]">
                {cit.texto}
              </p>
              {cit.ref && (
                <>
                  <div className="my-4 h-px w-16 mx-auto bg-amber-300/40" />
                  <p className="text-center font-mono text-[12px] font-bold text-amber-300">
                    {cit.ref}
                  </p>
                </>
              )}
            </div>
          );
        }
        return null;
      })}

      {/* Texto-base do capítulo (se não tem cards, mostra direto) */}
      {grupos.length === 0 && (
        <p className="text-[14px] leading-relaxed text-white/70">
          {capitulo.blocos.map((b) => b.texto).join(' ')}
        </p>
      )}
    </motion.section>
  );
});

function extractTitle(texto: string): string {
  // Pega a primeira frase até ":" ou "." ou "-"
  const m = texto.split(/[:.\-â€“â€”]/)[0];
  return (m || texto).slice(0, 60).trim();
}

function extractDescription(texto: string): string {
  // Pega tudo depois do primeiro ":" ou "-"
  const parts = texto.split(/[:\-â€“â€”]/);
  if (parts.length > 1) {
    return parts.slice(1).join(':').trim().slice(0, 240);
  }
  return texto.length > 60 ? texto.slice(60) : '';
}

function extractRef(texto: string): string | null {
  const m = texto.match(/\(([A-ZÁÃ‰ÍÃ“Ãš][^)]*\d+[:\.][^)]*)\)/);
  return m ? m[1] : null;
}

// â”€â”€â”€ Subcomponentes da barra flutuante â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        'group relative flex h-9 min-w-[2.25rem] items-center justify-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-medium transition-all touch-manipulation active:scale-95',
        desabilitado
          ? 'cursor-not-allowed text-white/25'
          : destaque
            ? 'bg-amber-300/20 text-amber-200 hover:bg-amber-300/30'
            : 'text-white/65 hover:bg-white/10 hover:text-white',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
