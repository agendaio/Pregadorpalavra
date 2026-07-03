/**
 * SlideRenderer — Renderiza cada tipo de slide com layout tipo PowerPoint.
 * Dark+gold aesthetic, mobile-first, fullscreen.
 */

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
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

// ─── Base slide wrapper ──────────────────────────────────────────────────────

function SlideBase({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#0c0c14] px-4 py-4 sm:px-8 sm:py-6',
        className,
      )}
      style={style}
    >
      {/* Ornamental gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-500/6 to-transparent blur-3xl" />
        <div className="absolute -bottom-24 -right-12 h-64 w-64 rounded-full bg-gradient-to-tl from-indigo-500/5 to-transparent blur-3xl" />
      </div>
      <div className="relative z-10 flex w-full flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ─── Slide: Capa ─────────────────────────────────────────────────────────────

function SlideCapaView({ content }: { content: SlideCapa }) {
  return (
    <SlideBase>
      {/* Decorative bars */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

      <div className="flex flex-col items-center gap-5 text-center">
        {/* Ornament */}
        <div className="flex items-center gap-4">
          <div className="h-px w-14 bg-gradient-to-r from-transparent to-amber-400/60" />
          <BookOpen className="h-5 w-5 text-amber-400/80" />
          <div className="h-px w-14 bg-gradient-to-l from-transparent to-amber-400/60" />
        </div>

        <div className="contents">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[28px] font-bold leading-tight tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {content.titulo || 'Sem título'}
          </motion.h1>

          {content.referencia && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="text-[12px] font-medium tracking-wide text-amber-300 sm:text-[13px]">{content.referencia}</span>
            </motion.div>
          )}

          {content.subtitulo && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="max-w-xs text-[13px] leading-relaxed text-white/60 sm:max-w-sm sm:text-[14px]"
            >
              {content.subtitulo}
            </motion.p>
          )}
        </div>
      </div>
    </SlideBase>
  );
}

// ─── Slide: Verso bíblico ────────────────────────────────────────────────────

function SlideVersoView({ content }: { content: SlideVerso }) {
  return (
    <SlideBase>
      <div className="flex h-full w-full flex-col items-center justify-center gap-6">
        {/* Opening quote mark */}
        <div className="text-7xl font-serif leading-none text-amber-400/25 sm:text-8xl">"</div>

        <div className="contents">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative max-w-lg text-center sm:max-w-xl"
          >
            {/* Left quote line */}
            <div className="absolute -left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-amber-400/30 to-transparent sm:-left-8" />
            {/* Right quote line */}
            <div className="absolute -right-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-amber-400/30 to-transparent sm:-right-8" />

            <p
              className="text-[17px] leading-relaxed text-white sm:text-xl"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
            >
              {content.citacao || 'Sem citação'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="h-px w-8 bg-amber-400/40 sm:w-10" />
            <span className="text-[11px] font-bold tracking-widest text-amber-400 uppercase sm:text-[12px]">
              {content.referencia || '—'}
            </span>
            <div className="h-px w-8 bg-amber-400/40 sm:w-10" />
          </motion.div>
        </div>
      </div>
    </SlideBase>
  );
}

// ─── Slide: Conteúdo (N pontos) ─────────────────────────────────────────────

function SlideConteudoView({ content }: { content: SlideConteudo }) {
  const cores = [
    { bg: 'from-indigo-600/25 to-indigo-800/15', border: 'border-indigo-400/40', text: 'text-indigo-200', badge: 'bg-indigo-400/20 text-indigo-200' },
    { bg: 'from-emerald-600/25 to-emerald-800/15', border: 'border-emerald-400/40', text: 'text-emerald-200', badge: 'bg-emerald-400/20 text-emerald-200' },
    { bg: 'from-amber-600/25 to-amber-800/15', border: 'border-amber-400/40', text: 'text-amber-200', badge: 'bg-amber-400/20 text-amber-200' },
    { bg: 'from-rose-600/25 to-rose-800/15', border: 'border-rose-400/40', text: 'text-rose-200', badge: 'bg-rose-400/20 text-rose-200' },
    { bg: 'from-sky-600/25 to-sky-800/15', border: 'border-sky-400/40', text: 'text-sky-200', badge: 'bg-sky-400/20 text-sky-200' },
    { bg: 'from-violet-600/25 to-violet-800/15', border: 'border-violet-400/40', text: 'text-violet-200', badge: 'bg-violet-400/20 text-violet-200' },
  ];

  // Responsive grid: 1 col mobile, 2 cols tablet, up to 3 on larger screens
  const cols = content.pontos.length === 1
    ? 'grid-cols-1'
    : content.pontos.length === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : content.pontos.length === 3
    ? 'grid-cols-1 sm:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <SlideBase>
      <div className="flex h-full w-full flex-col gap-4">
        {/* Header */}
        {content.titulo && (
          <div className="flex items-center gap-3">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-amber-400/50 to-transparent" />
            <h2 className="text-[12px] font-bold tracking-widest text-amber-300 uppercase sm:text-[14px]">
              {content.titulo}
            </h2>
            <div className="h-0.5 flex-1 bg-gradient-to-l from-amber-400/50 to-transparent" />
          </div>
        )}

        {/* Points grid */}
        <div className={cn('flex-1 grid gap-3', cols)}>
          {content.pontos.map((ponto, i) => {
            const cor = cores[i % cores.length];
            return (
              <div
                key={i}
                className={cn(
                  'relative flex flex-col gap-2.5 rounded-2xl border p-4 backdrop-blur-sm sm:p-5',
                  `bg-gradient-to-br ${cor.bg} ${cor.border}`
                )}
              >
                {/* Number badge */}
                <div className={cn(
                  'absolute -top-2.5 left-3 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold sm:h-8 sm:w-8 sm:text-[13px]',
                  `bg-[#0c0c14] ${cor.border} ${cor.text}`
                )}>
                  {ponto.numero}
                </div>

                <h3 className={cn('pt-1 text-[14px] font-semibold leading-snug sm:text-[15px]', cor.text)}>
                  {ponto.titulo || `Ponto ${ponto.numero}`}
                </h3>
                {ponto.descricao && (
                  <p className="text-[12px] leading-relaxed text-white/60 sm:text-[13px]">{ponto.descricao}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SlideBase>
  );
}

// ─── Slide: Categorias (grid de cards) ──────────────────────────────────────

function SlideCategoriasView({ content }: { content: SlideCategorias }) {
  const cols = content.cards.length <= 2
    ? 'grid-cols-1'
    : content.cards.length === 3
    ? 'grid-cols-1 sm:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2';

  return (
    <SlideBase>
      <div className="flex h-full w-full flex-col gap-4">
        {content.titulo && (
          <div className="flex items-center gap-3">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-emerald-400/50 to-transparent" />
            <h2 className="text-[12px] font-bold tracking-widest text-emerald-300 uppercase sm:text-[14px]">
              {content.titulo}
            </h2>
            <div className="h-0.5 flex-1 bg-gradient-to-l from-emerald-400/50 to-transparent" />
          </div>
        )}

        <div className={cn('flex-1 grid gap-3', cols)}>
          {content.cards.map((card, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 p-4 backdrop-blur-sm sm:p-5"
            >
              <h3 className="text-[14px] font-bold text-emerald-200 sm:text-[15px]">{card.titulo || `Card ${i + 1}`}</h3>
              {card.descricao && (
                <p className="text-[12px] leading-relaxed text-white/60 sm:text-[13px]">{card.descricao}</p>
              )}
              {card.referencia && (
                <div className="mt-auto flex items-center gap-1.5 pt-1">
                  <div className="h-1 w-1 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-emerald-400/80">{card.referencia}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SlideBase>
  );
}

// ─── Slide: Chamada ──────────────────────────────────────────────────────────

function SlideChamadaView({ content }: { content: SlideChamada }) {
  return (
    <SlideBase>
      <div className="flex h-full w-full flex-col items-center justify-center gap-5 text-center">
        <div className="contents">
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-[22px] font-bold leading-tight tracking-tight text-white sm:text-3xl"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {content.titulo || 'Chamada'}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-xs space-y-3 sm:max-w-md sm:space-y-4"
          >
            {content.texto.split('\n').map((linha, i) => (
              <p key={i} className="text-[14px] leading-relaxed text-white/70 sm:text-[15px]">{linha}</p>
            ))}
          </motion.div>

          {content.cta && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-1 flex flex-col items-center gap-2"
            >
              <div className="rounded-full border border-amber-400/40 bg-amber-400/10 px-6 py-2.5 sm:px-8 sm:py-3">
                <span className="text-[13px] font-bold text-amber-300 sm:text-[15px]">{content.cta}</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </SlideBase>
  );
}

// ─── Slide: Oração ──────────────────────────────────────────────────────────

function SlideOracaoView({ content }: { content: SlideOracao }) {
  return (
    <SlideBase>
      {/* Ornamental cross */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 sm:top-6">
        <div className="h-5 w-px bg-gradient-to-b from-rose-400/60 to-transparent sm:h-6" />
        <div className="h-0.5 w-5 bg-rose-400/60 sm:w-6" />
      </div>

      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center sm:gap-6">
        <div className="contents">
          {content.titulo && (
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-[12px] font-bold tracking-widest text-rose-300 uppercase sm:text-[13px]"
            >
              {content.titulo}
            </motion.h2>
          )}

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-xs space-y-2.5 sm:max-w-lg sm:space-y-3"
          >
            {content.texto.split('\n').map((linha, i) => (
              <p
                key={i}
                className="text-[14px] leading-relaxed text-white sm:text-[15px]"
                style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
              >
                {linha}
              </p>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center gap-3 pt-1 sm:gap-4 sm:pt-2"
          >
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-rose-400/40 sm:w-12" />
            <span className="text-[11px] text-rose-400/60 sm:text-[11px]">Em nome de Jesus</span>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-rose-400/40 sm:w-12" />
          </motion.div>
        </div>
      </div>
    </SlideBase>
  );
}

// ─── Slide Navigator ────────────────────────────────────────────────────────

interface SlideNavigatorProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  label: string;
}

export function SlideNavigator({ current, total, onPrev, onNext, label }: SlideNavigatorProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-4 pb-4">
      <button
        onClick={onPrev}
        disabled={current === 0}
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/30 bg-[#0c0c14]/80 text-amber-400 transition hover:bg-amber-400/10 disabled:opacity-20 backdrop-blur-md"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-[#0c0c14]/80 px-3 py-2 backdrop-blur-md">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => {/* could jump to slide i */}}
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-all',
              i === current ? 'w-4 bg-amber-400' : 'bg-amber-400/40',
            )}
          />
        ))}
        <span className="ml-1 text-[10px] font-medium text-amber-400/70">{current + 1}/{total}</span>
      </div>

      <button
        onClick={onNext}
        disabled={current === total - 1}
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/30 bg-[#0c0c14]/80 text-amber-400 transition hover:bg-amber-400/10 disabled:opacity-20 backdrop-blur-md"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

// ─── Main renderer ──────────────────────────────────────────────────────────

export function SlideRenderer({ slide, className }: { slide: Slide; className?: string }) {
  const c = slide.content;
  switch (c.tipo) {
    case 'capa':       return <SlideCapaView content={c} />;
    case 'verso':       return <SlideVersoView content={c} />;
    case 'conteudo':   return <SlideConteudoView content={c} />;
    case 'categorias': return <SlideCategoriasView content={c} />;
    case 'chamada':    return <SlideChamadaView content={c} />;
    case 'oracao':     return <SlideOracaoView content={c} />;
  }
}

// Alias com className pra compatibilidade com código antigo
export function SlideRendererWithClass({ slide, className }: { slide: Slide; className?: string }) {
  return <SlideRenderer slide={slide} className={className} />;
}
