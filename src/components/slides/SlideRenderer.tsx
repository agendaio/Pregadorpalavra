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
        'relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#0c0c14] px-6 py-8',
        className,
      )}
      style={style}
    >
      {/* Ornamental gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-br from-amber-500/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-gradient-to-tl from-indigo-500/5 to-transparent blur-3xl" />
      </div>
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ─── Slide: Capa ─────────────────────────────────────────────────────────────

function SlideCapaView({ content }: { content: SlideCapa }) {
  return (
    <SlideBase>
      {/* Decorative top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />

      <div className="flex flex-col items-center gap-6 text-center">
        {/* Cross ornament */}
        <div className="mb-2 flex items-center gap-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-400/50" />
          <BookOpen className="h-6 w-6 text-amber-400/70" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-400/50" />
        </div>

        {/* Animated wrapper — framer-motion fica DENTRO do scale do thumbnail */}
        <div className="contents">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-bold leading-tight tracking-tight text-white"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {content.titulo || 'Sem título'}
          </motion.h1>

          {content.referencia && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="text-[13px] font-medium tracking-wide text-amber-300">{content.referencia}</span>
            </motion.div>
          )}

          {content.subtitulo && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="max-w-sm text-[14px] leading-relaxed text-ink-300"
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
      <div className="flex h-full w-full flex-col items-center justify-center gap-8">
        {/* Opening quote mark */}
        <div className="text-8xl font-serif leading-none text-amber-400/30">"</div>

        <div className="contents">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative max-w-xl text-center"
          >
            {/* Left quote line */}
            <div className="absolute -left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-amber-400/40 to-transparent" />
            {/* Right quote line */}
            <div className="absolute -right-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-amber-400/40 to-transparent" />

            <p
              className="text-xl leading-relaxed text-white"
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
            <div className="h-px w-10 bg-amber-400/40" />
            <span className="text-[12px] font-bold tracking-widest text-amber-400 uppercase">
              {content.referencia || '—'}
            </span>
            <div className="h-px w-10 bg-amber-400/40" />
          </motion.div>
        </div>
      </div>
    </SlideBase>
  );
}

// ─── Slide: Conteúdo (N pontos) ─────────────────────────────────────────────

function SlideConteudoView({ content }: { content: SlideConteudo }) {
  const cores = [
    'from-indigo-600/20 to-indigo-800/10 border-indigo-500/30',
    'from-emerald-600/20 to-emerald-800/10 border-emerald-500/30',
    'from-amber-600/20 to-amber-800/10 border-amber-500/30',
    'from-rose-600/20 to-rose-800/10 border-rose-500/30',
    'from-sky-600/20 to-sky-800/10 border-sky-500/30',
    'from-violet-600/20 to-violet-800/10 border-violet-500/30',
  ];

  return (
    <SlideBase>
      <div className="flex h-full w-full flex-col gap-6">
        {/* Header */}
        {content.titulo && (
          <div className="flex items-center gap-3">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-amber-400/50 to-transparent" />
            <h2 className="text-[15px] font-bold tracking-wide text-amber-300 uppercase">
              {content.titulo}
            </h2>
            <div className="h-0.5 flex-1 bg-gradient-to-l from-amber-400/50 to-transparent" />
          </div>
        )}

        {/* Points */}
        <div className={cn('flex-1 grid gap-4', content.pontos.length <= 2 ? 'grid-cols-1' : content.pontos.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2')}>
          {content.pontos.map((ponto, i) => {
            const cor = cores[i % cores.length];
            return (
              <div
                key={i}
                className={cn('relative flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-sm', `bg-gradient-to-br ${cor}`)}
              >
                {/* Number badge */}
                <div className="absolute -top-3 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#0c0c14] border border-ink-600">
                  <span className="text-[14px] font-bold text-white">{ponto.numero}</span>
                </div>

                <h3 className="pt-1 text-[16px] font-semibold leading-snug text-white">{ponto.titulo || `Ponto ${ponto.numero}`}</h3>
                {ponto.descricao && (
                  <p className="text-[13px] leading-relaxed text-ink-300">{ponto.descricao}</p>
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
  const cols = content.cards.length <= 2 ? 1 : content.cards.length === 3 ? 3 : 2;

  return (
    <SlideBase>
      <div className="flex h-full w-full flex-col gap-5">
        {content.titulo && (
          <div className="flex items-center gap-3">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-emerald-400/50 to-transparent" />
            <h2 className="text-[15px] font-bold tracking-wide text-emerald-300 uppercase">
              {content.titulo}
            </h2>
            <div className="h-0.5 flex-1 bg-gradient-to-l from-emerald-400/50 to-transparent" />
          </div>
        )}

        <div className={cn('flex-1 grid gap-4', cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
          {content.cards.map((card, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600/15 to-emerald-800/10 p-5 backdrop-blur-sm"
            >
              <h3 className="text-[15px] font-bold text-emerald-200">{card.titulo || `Card ${i + 1}`}</h3>
              {card.descricao && (
                <p className="text-[12px] leading-relaxed text-ink-300">{card.descricao}</p>
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
      <div className="flex h-full w-full flex-col items-center justify-center gap-8 text-center">
        <div className="contents">
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold leading-tight tracking-tight text-white"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {content.titulo || 'Chamada'}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-md space-y-4"
          >
            {content.texto.split('\n').map((linha, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-ink-200">{linha}</p>
            ))}
          </motion.div>

          {content.cta && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-2 flex flex-col items-center gap-3"
            >
              <div className="rounded-full border border-amber-400/40 bg-amber-400/10 px-8 py-3">
                <span className="text-[15px] font-bold text-amber-300">{content.cta}</span>
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
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
        <div className="h-6 w-px bg-gradient-to-b from-amber-400/60 to-transparent" />
        <div className="h-0.5 w-6 bg-amber-400/60" />
      </div>

      <div className="flex h-full w-full flex-col items-center justify-center gap-6 text-center">
        <div className="contents">
          {content.titulo && (
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-[14px] font-bold tracking-widest text-rose-300 uppercase"
            >
              {content.titulo}
            </motion.h2>
          )}

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-lg space-y-3"
          >
            {content.texto.split('\n').map((linha, i) => (
              <p
                key={i}
                className="text-[15px] leading-relaxed text-white"
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
            className="flex items-center gap-4 pt-2"
          >
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-rose-400/40" />
            <span className="text-[11px] text-rose-400/60">Em nome de Jesus</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-rose-400/40" />
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

export function SlideRenderer({ slide }: { slide: Slide }) {
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
