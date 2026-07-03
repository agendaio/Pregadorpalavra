/**
 * SlideRenderer — Renderiza cada tipo de slide com layout tipo PowerPoint.
 * Dark+gold aesthetic, mobile-first, fullscreen.
 */

import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
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
  compact = false,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#0c0c14] px-4 py-3 sm:px-8 sm:py-6',
        className,
      )}
    >
      {/* Ornamental gradient orbs — hide in compact mode */}
      {!compact && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-br from-amber-500/5 to-transparent blur-3xl" />
          <div className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-gradient-to-tl from-indigo-500/5 to-transparent blur-3xl" />
        </div>
      )}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ─── Slide: Capa ─────────────────────────────────────────────────────────────

function SlideCapaView({ content, compact }: { content: SlideCapa; compact?: boolean }) {
  return (
    <SlideBase compact={compact}>
      {/* Decorative bars */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

      <div className="flex flex-col items-center gap-3 text-center sm:gap-5">
        {/* Ornament */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/60 sm:w-14" />
          <BookOpen className={cn('text-amber-400/80', compact ? 'h-3 w-3' : 'h-5 w-5')} />
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400/60 sm:w-14" />
        </div>

        {/* Title — no motion in compact */}
        {compact ? (
          <h1
            className={cn(
              'font-bold leading-tight tracking-tight text-white',
              compact ? 'text-[11px]' : 'text-[28px] sm:text-4xl',
            )}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {content.titulo || 'Sem título'}
          </h1>
        ) : (
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[28px] font-bold leading-tight tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {content.titulo || 'Sem título'}
          </motion.h1>
        )}

        {content.referencia && (
          <div className={cn(
            'flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10',
            compact ? 'px-2 py-1' : 'px-4 py-1.5',
          )}>
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className={cn(
              'font-medium tracking-wide text-amber-300',
              compact ? 'text-[8px]' : 'text-[12px] sm:text-[13px]',
            )}>
              {content.referencia}
            </span>
          </div>
        )}

        {content.subtitulo && !compact && (
          <p className="max-w-xs text-[13px] leading-relaxed text-white/60 sm:max-w-sm sm:text-[14px]">
            {content.subtitulo}
          </p>
        )}
      </div>
    </SlideBase>
  );
}

// ─── Slide: Verso bíblico ────────────────────────────────────────────────────

function SlideVersoView({ content, compact }: { content: SlideVerso; compact?: boolean }) {
  return (
    <SlideBase compact={compact}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 sm:gap-6">
        {/* Opening quote mark */}
        <div className={cn('font-serif leading-none text-amber-400/25', compact ? 'text-4xl' : 'text-7xl sm:text-8xl')}>"</div>

        {compact ? (
          <div className="relative max-w-lg text-center sm:max-w-xl">
            <p
              className="text-[12px] leading-relaxed text-white sm:text-[17px]"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
            >
              {content.citacao || 'Sem citação'}
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative max-w-lg text-center sm:max-w-xl"
          >
            <div className="absolute -left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-amber-400/30 to-transparent sm:-left-8" />
            <div className="absolute -right-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-amber-400/30 to-transparent sm:-right-8" />
            <p
              className="text-[17px] leading-relaxed text-white sm:text-xl"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
            >
              {content.citacao || 'Sem citação'}
            </p>
          </motion.div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-px w-6 bg-amber-400/40 sm:w-8" />
          <span className={cn(
            'font-bold tracking-widest text-amber-400 uppercase',
            compact ? 'text-[8px]' : 'text-[11px] sm:text-[12px]',
          )}>
            {content.referencia || '—'}
          </span>
          <div className="h-px w-6 bg-amber-400/40 sm:w-8" />
        </div>
      </div>
    </SlideBase>
  );
}

// ─── Slide: Conteúdo (N pontos) ─────────────────────────────────────────────

function SlideConteudoView({ content, compact }: { content: SlideConteudo; compact?: boolean }) {
  const cores = [
    { bg: 'from-indigo-600/25 to-indigo-800/15', border: 'border-indigo-400/40', text: 'text-indigo-200' },
    { bg: 'from-emerald-600/25 to-emerald-800/15', border: 'border-emerald-400/40', text: 'text-emerald-200' },
    { bg: 'from-amber-600/25 to-amber-800/15', border: 'border-amber-400/40', text: 'text-amber-200' },
    { bg: 'from-rose-600/25 to-rose-800/15', border: 'border-rose-400/40', text: 'text-rose-200' },
    { bg: 'from-sky-600/25 to-sky-800/15', border: 'border-sky-400/40', text: 'text-sky-200' },
    { bg: 'from-violet-600/25 to-violet-800/15', border: 'border-violet-400/40', text: 'text-violet-200' },
  ];

  // In compact: single column, smaller text
  const cols = compact
    ? 'grid-cols-1'
    : content.pontos.length === 1
    ? 'grid-cols-1'
    : content.pontos.length === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : content.pontos.length === 3
    ? 'grid-cols-1 sm:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <SlideBase compact={compact}>
      <div className="flex h-full w-full flex-col gap-2 sm:gap-4">
        {/* Header */}
        {content.titulo && (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-amber-400/50 to-transparent" />
            <h2 className={cn(
              'font-bold tracking-widest text-amber-300 uppercase',
              compact ? 'text-[8px]' : 'text-[12px] sm:text-[14px]',
            )}>
              {content.titulo}
            </h2>
            <div className="h-0.5 flex-1 bg-gradient-to-l from-amber-400/50 to-transparent" />
          </div>
        )}

        {/* Points grid */}
        <div className={cn('flex-1 grid gap-2 sm:gap-3', cols)}>
          {content.pontos.slice(0, compact ? 2 : undefined).map((ponto, i) => {
            const cor = cores[i % cores.length];
            return (
              <div
                key={i}
                className={cn(
                  'relative flex flex-col gap-1.5 rounded-xl border p-3 backdrop-blur-sm sm:rounded-2xl sm:p-4 sm:gap-2.5',
                  `bg-gradient-to-br ${cor.bg} ${cor.border}`
                )}
              >
                {/* Number badge */}
                <div className={cn(
                  'absolute -top-2 left-2.5 flex items-center justify-center rounded-full font-bold sm:-top-2.5 sm:left-3',
                  `bg-[#0c0c14] ${cor.border} ${cor.text}`,
                  compact ? 'h-4 w-4 text-[9px] sm:h-5 sm:w-5 sm:text-[10px]' : 'h-5 w-5 text-[11px] sm:h-7 sm:w-7 sm:text-[12px]',
                )}>
                  {ponto.numero}
                </div>

                <h3 className={cn('font-semibold leading-snug', cor.text, compact ? 'pt-0.5 text-[9px] sm:text-[10px]' : 'pt-1 text-[14px] sm:text-[15px]')}>
                  {ponto.titulo || `Ponto ${ponto.numero}`}
                </h3>
                {!compact && ponto.descricao && (
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

function SlideCategoriasView({ content, compact }: { content: SlideCategorias; compact?: boolean }) {
  const cols = compact
    ? 'grid-cols-1'
    : content.cards.length <= 2
    ? 'grid-cols-1'
    : content.cards.length === 3
    ? 'grid-cols-1 sm:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2';

  return (
    <SlideBase compact={compact}>
      <div className="flex h-full w-full flex-col gap-2 sm:gap-4">
        {content.titulo && (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-emerald-400/50 to-transparent" />
            <h2 className={cn(
              'font-bold tracking-widest text-emerald-300 uppercase',
              compact ? 'text-[8px]' : 'text-[12px] sm:text-[14px]',
            )}>
              {content.titulo}
            </h2>
            <div className="h-0.5 flex-1 bg-gradient-to-l from-emerald-400/50 to-transparent" />
          </div>
        )}

        <div className={cn('flex-1 grid gap-2 sm:gap-3', cols)}>
          {content.cards.slice(0, compact ? 2 : undefined).map((card, i) => (
            <div
              key={i}
              className="flex flex-col gap-1.5 rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 p-3 backdrop-blur-sm sm:rounded-2xl sm:p-4 sm:gap-2"
            >
              <h3 className={cn('font-bold text-emerald-200', compact ? 'text-[9px] sm:text-[10px]' : 'text-[14px] sm:text-[15px]')}>
                {card.titulo || `Card ${i + 1}`}
              </h3>
              {!compact && card.descricao && (
                <p className="text-[12px] leading-relaxed text-white/60 sm:text-[13px]">{card.descricao}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </SlideBase>
  );
}

// ─── Slide: Chamada ──────────────────────────────────────────────────────────

function SlideChamadaView({ content, compact }: { content: SlideChamada; compact?: boolean }) {
  return (
    <SlideBase compact={compact}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center sm:gap-8">
        <h2
          className={cn(
            'font-bold leading-tight tracking-tight text-white',
            compact ? 'text-[11px]' : 'text-2xl sm:text-3xl',
          )}
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {content.titulo || 'Chamada'}
        </h2>

        {!compact && content.texto && (
          <div className="max-w-md space-y-2">
            {content.texto.split('\n').map((linha, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-white/80">{linha}</p>
            ))}
          </div>
        )}

        {content.cta && (
          <div className={cn(
            'rounded-full border border-amber-400/40 bg-amber-400/10',
            compact ? 'px-2 py-1' : 'px-6 py-2 sm:px-8 sm:py-3',
          )}>
            <span className={cn(
              'font-bold text-amber-300',
              compact ? 'text-[8px]' : 'text-[15px]',
            )}>
              {content.cta}
            </span>
          </div>
        )}
      </div>
    </SlideBase>
  );
}

// ─── Slide: Oração ──────────────────────────────────────────────────────────

function SlideOracaoView({ content, compact }: { content: SlideOracao; compact?: boolean }) {
  return (
    <SlideBase compact={compact}>
      {/* Ornamental cross */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 sm:top-6">
        <div className="h-3 w-px bg-gradient-to-b from-amber-400/60 to-transparent sm:h-6" />
        <div className="h-0.5 w-3 bg-amber-400/60 sm:w-6" />
      </div>

      <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center sm:gap-6">
        {content.titulo && (
          <h2 className={cn(
            'font-bold tracking-widest text-rose-300 uppercase',
            compact ? 'text-[8px]' : 'text-[14px]',
          )}>
            {content.titulo}
          </h2>
        )}

        {!compact && content.texto && (
          <div className="max-w-lg space-y-2">
            {content.texto.split('\n').map((linha, i) => (
              <p
                key={i}
                className="text-[15px] leading-relaxed text-white"
                style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
              >
                {linha}
              </p>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-rose-400/40 sm:w-12" />
          <span className={cn('text-rose-400/60', compact ? 'text-[7px]' : 'text-[11px]')}>Em nome de Jesus</span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-rose-400/40 sm:w-12" />
        </div>
      </div>
    </SlideBase>
  );
}

// ─── Main renderer ──────────────────────────────────────────────────────────

export function SlideRenderer({ slide, compact = false }: { slide: Slide; compact?: boolean }) {
  const c = slide.content;
  switch (c.tipo) {
    case 'capa':       return <SlideCapaView content={c} compact={compact} />;
    case 'verso':       return <SlideVersoView content={c} compact={compact} />;
    case 'conteudo':   return <SlideConteudoView content={c} compact={compact} />;
    case 'categorias': return <SlideCategoriasView content={c} compact={compact} />;
    case 'chamada':    return <SlideChamadaView content={c} compact={compact} />;
    case 'oracao':     return <SlideOracaoView content={c} compact={compact} />;
  }
}
