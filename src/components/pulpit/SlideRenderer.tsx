/**
 * SlideRenderer — Visualização profissional de cada tipo de slide.
 *
 * Design: dark premium, tipografia grande, cores distintas por tipo,
 * animações suaves, totalmente responsivo (mobile-first).
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type {
  Slide,
  SlideCapa,
  SlideVerso,
  SlideConteudo,
  SlideCategorias,
  SlideChamada,
  SlideOracao,
} from '@/types/mensagem';

// ─── Paletas por tipo ─────────────────────────────────────────────────────────

const TEMA = {
  capa: {
    fundo: 'bg-gradient-to-br from-[#0d0a14] via-[#1a1040] to-[#0d0a14]',
    accent: 'text-amber-300',
    accentBg: 'bg-amber-300',
    tagBg: 'bg-amber-300/15',
    tagText: 'text-amber-300',
    title: 'text-white',
    subtitle: 'text-white/60',
    border: 'border-amber-300/20',
  },
  verso: {
    fundo: 'bg-gradient-to-br from-[#0a0d1a] via-[#0f1a2e] to-[#0a0d1a]',
    accent: 'text-blue-300',
    accentBg: 'bg-blue-300',
    tagBg: 'bg-blue-300/15',
    tagText: 'text-blue-300',
    title: 'text-white',
    subtitle: 'text-white/60',
    border: 'border-blue-300/20',
  },
  conteudo: {
    fundo: 'bg-[#0a0a14]',
    accent: 'text-indigo-300',
    accentBg: 'bg-indigo-300',
    tagBg: 'bg-indigo-300/15',
    tagText: 'text-indigo-300',
    title: 'text-white',
    subtitle: 'text-white/60',
    border: 'border-indigo-300/20',
  },
  categorias: {
    fundo: 'bg-gradient-to-br from-[#0a1410] via-[#0f1e18] to-[#0a1410]',
    accent: 'text-emerald-300',
    accentBg: 'bg-emerald-300',
    tagBg: 'bg-emerald-300/15',
    tagText: 'text-emerald-300',
    title: 'text-white',
    subtitle: 'text-white/60',
    border: 'border-emerald-300/20',
  },
  chamada: {
    fundo: 'bg-gradient-to-br from-[#1a1200] via-[#2a1a00] to-[#1a1200]',
    accent: 'text-amber-400',
    accentBg: 'bg-amber-400',
    tagBg: 'bg-amber-400/15',
    tagText: 'text-amber-400',
    title: 'text-white',
    subtitle: 'text-white/60',
    border: 'border-amber-400/20',
  },
  oracao: {
    fundo: 'bg-gradient-to-br from-[#1a0a14] via-[#2a0f1e] to-[#1a0a14]',
    accent: 'text-rose-300',
    accentBg: 'bg-rose-300',
    tagBg: 'bg-rose-300/15',
    tagText: 'text-rose-300',
    title: 'text-white',
    subtitle: 'text-white/60',
    border: 'border-rose-300/20',
  },
} satisfies Record<string, {
  fundo: string;
  accent: string;
  accentBg: string;
  tagBg: string;
  tagText: string;
  title: string;
  subtitle: string;
  border: string;
}>;

// ─── Tag helper ───────────────────────────────────────────────────────────────

function SlideTag({ label, tipo }: { label: string; tipo: keyof typeof TEMA }) {
  const t = TEMA[tipo];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider', t.tagBg, t.tagText)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', t.accentBg)} />
      {label}
    </span>
  );
}

// ─── Slide: CAPA ─────────────────────────────────────────────────────────────

function SlideCapaRender({ content, tema }: { content: SlideCapa; tema: typeof TEMA[keyof typeof TEMA] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      {/* Ícone decorativo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-300/10 backdrop-blur-sm">
          <svg className="h-8 w-8 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
      </motion.div>

      {/* Referência bíblica */}
      {content.referencia && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-4"
        >
          <span className={cn('rounded-full border px-4 py-1 text-[12px] font-medium uppercase tracking-widest', tema.border, tema.accent)}>
            {content.referencia}
          </span>
        </motion.div>
      )}

      {/* Título principal */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="font-serif text-[clamp(28px,6vw,56px)] font-bold leading-tight tracking-tight text-white"
      >
        {content.titulo || 'Sem título'}
      </motion.h1>

      {/* Subtítulo */}
      {content.subtitulo && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-4 max-w-lg text-[clamp(14px,2.5vw,18px)] leading-relaxed text-white/55"
        >
          {content.subtitulo}
        </motion.p>
      )}

      {/* Decoração inferior */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
      >
        <div className="h-px w-24 rounded-full bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
      </motion.div>
    </div>
  );
}

// ─── Slide: VERSO ─────────────────────────────────────────────────────────────

function SlideVersoRender({ content, tema }: { content: SlideVerso; tema: typeof TEMA[keyof typeof TEMA] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      {/* Aspas decorativas */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <span className="font-serif text-[80px] leading-none text-blue-300/30">"</span>
      </motion.div>

      {/* Citação */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="max-w-2xl font-serif text-[clamp(18px,4vw,32px)] italic leading-relaxed text-white/90"
      >
        {content.citacao || 'Sem citação'}
      </motion.p>

      {/* Referência */}
      {content.referencia && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-8"
        >
          <div className="h-px w-12 rounded-full bg-blue-300/40 mx-auto mb-4" />
          <span className="font-mono text-[14px] font-bold tracking-wider text-blue-300">
            {content.referencia}
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ─── Slide: CONTEÚDO ─────────────────────────────────────────────────────────

function SlideConteudoRender({ content, tema, numero }: { content: SlideConteudo; tema: typeof TEMA[keyof typeof TEMA]; numero: number }) {
  return (
    <div className="flex h-full flex-col px-6 py-8 sm:px-10 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex-shrink-0">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-300/15 text-[16px] font-bold text-indigo-300">
            {String(numero).padStart(2, '0')}
          </div>
          <span className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider', tema.border, tema.accent)}>
            Conteúdo
          </span>
        </div>
        <h2 className="font-serif text-[clamp(22px,4vw,38px)] font-bold leading-tight text-white">
          {content.titulo || 'Sem título'}
        </h2>
      </div>

      {/* Pontos */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-4">
          {content.pontos.map((ponto, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.08, duration: 0.35 }}
              className="group flex gap-4"
            >
              {/* Indicador lateral */}
              <div className="flex flex-col items-center">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-300/20 text-[13px] font-bold text-indigo-300 shadow-[0_0_16px_rgba(129,140,248,0.15)]">
                  {ponto.numero}
                </div>
                {idx < content.pontos.length - 1 && (
                  <div className="mt-2 h-6 w-px flex-1 bg-gradient-to-b from-indigo-300/30 to-transparent" />
                )}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 pb-4">
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 transition-colors group-hover:bg-white/[0.05]">
                  <div className="mb-2 font-serif text-[clamp(15px,2.5vw,20px)] font-bold text-white">
                    {ponto.titulo || `Ponto ${ponto.numero}`}
                  </div>
                  {ponto.descricao && (
                    <div className="text-[clamp(12px,2vw,15px)] leading-relaxed text-white/60">
                      {ponto.descricao}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {content.pontos.length === 0 && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-[14px] text-white/30">Nenhum ponto definido</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Slide: CATEGORIAS ────────────────────────────────────────────────────────

function SlideCategoriasRender({ content, tema }: { content: SlideCategorias; tema: typeof TEMA[keyof typeof TEMA] }) {
  return (
    <div className="flex h-full flex-col px-6 py-8 sm:px-10 sm:py-10">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="mb-3">
          <span className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider', tema.border, tema.accent)}>
            Temas
          </span>
        </div>
        <h2 className="font-serif text-[clamp(22px,4vw,38px)] font-bold leading-tight text-white">
          {content.titulo || 'Categorias'}
        </h2>
      </div>

      {/* Cards em grid */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {content.cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.1, duration: 0.35 }}
              className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition-colors hover:bg-white/[0.06]"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-serif text-[16px] font-bold text-white">{card.titulo || `Card ${idx + 1}`}</span>
              </div>
              {card.descricao && (
                <p className="text-[13px] leading-relaxed text-white/55">{card.descricao}</p>
              )}
              {card.referencia && (
                <p className="mt-2 font-mono text-[11px] text-emerald-400/80">{card.referencia}</p>
              )}
            </motion.div>
          ))}
        </div>

        {content.cards.length === 0 && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-[14px] text-white/30">Nenhum card definido</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Slide: CHAMADA ──────────────────────────────────────────────────────────

function SlideChamadaRender({ content, tema }: { content: SlideChamada; tema: typeof TEMA[keyof typeof TEMA] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      {/* Tag */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6"
      >
        <span className={cn('rounded-full border px-4 py-1 text-[11px] font-semibold uppercase tracking-widest', tema.border, tema.accent)}>
          Aplicação
        </span>
      </motion.div>

      {/* Título */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="mb-6 font-serif text-[clamp(22px,4vw,42px)] font-bold leading-tight text-white"
      >
        {content.titulo || 'Chamada para ação'}
      </motion.h2>

      {/* Texto */}
      {content.texto && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mb-10 max-w-lg text-[clamp(14px,2.5vw,18px)] leading-relaxed text-white/60"
        >
          {content.texto}
        </motion.p>
      )}

      {/* CTA Button */}
      {content.cta && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45 }}
        >
          <div className="inline-flex items-center gap-3 rounded-2xl bg-amber-400/15 border border-amber-400/30 px-8 py-4">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-serif text-[clamp(16px,3vw,22px)] font-bold text-amber-400">
              {content.cta}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Slide: ORAÇÃO ───────────────────────────────────────────────────────────

function SlideOracaoRender({ content, tema }: { content: SlideOracao; tema: typeof TEMA[keyof typeof TEMA] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      {/* Cruz decorativa */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-300/10 backdrop-blur-sm">
          <span className="font-serif text-[40px] leading-none text-rose-300">✝</span>
        </div>
      </motion.div>

      {/* Título */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mb-6 font-serif text-[clamp(24px,4vw,40px)] font-bold text-white"
      >
        {content.titulo || 'Oração'}
      </motion.h2>

      {/* Texto da oração */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="max-w-xl"
      >
        <p className="font-serif text-[clamp(15px,2.5vw,20px)] italic leading-relaxed text-white/75">
          {content.texto || 'Senhor, que a Tua Palavra seja luz nos nossos caminhos.\nQue a fé que ouvimos hoje se faça obra em nossas vidas.\nEm nome de Jesus. Amém.'}
        </p>
      </motion.div>

      {/* Amém decorativo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-px w-24 rounded-full bg-gradient-to-r from-transparent via-rose-300/40 to-transparent" />
          <span className="font-serif text-[18px] font-bold text-rose-300">Amém.</span>
          <div className="h-px w-24 rounded-full bg-gradient-to-r from-transparent via-rose-300/40 to-transparent" />
        </div>
      </motion.div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

interface SlideRendererProps {
  slide: Slide;
  /** Índice do slide atual (para numeração) */
  indice: number;
  /** Total de slides */
  total: number;
  className?: string;
}

export const SlideRenderer = memo(function SlideRenderer({ slide, indice, total, className }: SlideRendererProps) {
  const t = TEMA[slide.content.tipo] ?? TEMA.conteudo;

  return (
    <motion.div
      key={slide.id}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: [0.22, 0.9, 0.3, 1] }}
      className={cn('relative flex h-full flex-col overflow-hidden', t.fundo, className)}
    >
      {/* Gradiente decorativo sutil no topo */}
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-current/5 to-transparent opacity-30', t.accent)} />

      {/* Gradiente decorativo na base */}
      <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-current/5 to-transparent opacity-30', t.accent)} />

      {/* Conteúdo do slide */}
      <div className="relative z-10 flex flex-1">
        {(() => {
          const c = slide.content;
          switch (c.tipo) {
            case 'capa':
              return <SlideCapaRender content={c} tema={t} />;
            case 'verso':
              return <SlideVersoRender content={c} tema={t} />;
            case 'conteudo':
              return <SlideConteudoRender content={c} tema={t} numero={indice + 1} />;
            case 'categorias':
              return <SlideCategoriasRender content={c} tema={t} />;
            case 'chamada':
              return <SlideChamadaRender content={c} tema={t} />;
            case 'oracao':
              return <SlideOracaoRender content={c} tema={t} />;
            default:
              return null;
          }
        })()}
      </div>

      {/* Contador de slides (canto inferior direito) */}
      <div className="absolute bottom-4 right-5 z-20 flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: Math.min(total, 12) }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 rounded-full transition-all duration-300',
                i === indice
                  ? cn('w-4', t.accentBg)
                  : i < indice
                    ? 'w-1.5 bg-white/20'
                    : 'w-1.5 bg-white/10',
              )}
            />
          ))}
          {total > 12 && <span className="text-[10px] text-white/30">+{total - 12}</span>}
        </div>
      </div>

      {/* Número do slide (canto inferior esquerdo) */}
      <div className="absolute bottom-4 left-5 z-20">
        <span className="font-mono text-[12px] text-white/25">
          {indice + 1} / {total}
        </span>
      </div>
    </motion.div>
  );
});

// ─── Mini Slide Renderer — para miniaturas no painel inline ───────────────────

/** Miniatura compacta de um slide (sem animações, cor de fundo + texto básico) */
export function MiniSlideRenderer({ slide }: { slide: Slide }) {
  const t = TEMA[slide.content.tipo] ?? TEMA.conteudo;
  const c = slide.content;

  let label = '';
  switch (c.tipo) {
    case 'capa':        label = c.referencia || c.titulo || 'Capa'; break;
    case 'verso':        label = c.referencia || 'Verso'; break;
    case 'conteudo':     label = c.titulo || 'Conteúdo'; break;
    case 'categorias':   label = c.titulo || 'Temas'; break;
    case 'chamada':      label = c.titulo || 'Aplicação'; break;
    case 'oracao':       label = 'Oração'; break;
    default:             label = 'Slide';
  }

  return (
    <div className={cn('relative flex h-full w-full flex-col overflow-hidden', t.fundo)}>
      {/* Tipo tag */}
      <div className="absolute left-1.5 top-1.5 z-10">
        <span className={cn('rounded px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide', t.tagBg, t.tagText)}>
          {c.tipo}
        </span>
      </div>
      {/* Texto centralizado */}
      <div className="flex flex-1 items-center justify-center px-1.5 text-center">
        <span className="line-clamp-2 text-[8px] font-medium leading-tight text-white/80">
          {label}
        </span>
      </div>
    </div>
  );
}
