/**
 * SlideRenderer — Design profissional para pregações.
 *
 * Princípios:
 * 1. Texto é o herói — tipografia grande, hierarquia clara
 * 2. Alto contraste — fundo escuro, texto claro
 * 3. Apresentação minimalista — só o que importa na tela
 * 4. Escala com a tela — usa svh/vw para text sizing responsivo
 *
 * Modos:
 * - presentation (default): tela cheia, texto grande
 * - compact: thumbnail na grade do editor, texto proporcionalmente menor
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

// ─── Design tokens ────────────────────────────────────────────────────────────

/** Paleta de cores por tipo de conteúdo */
const COR = {
  introducao: { accent: '#38bdf8', label: 'Introdução',   bg: 'from-sky-600/30 to-sky-900/20', border: 'border-sky-400/40', text: 'text-sky-100', badge: 'bg-sky-400/20 text-sky-200 border border-sky-400/30' },
  ponto:      { accent: '#818cf8', label: 'Ponto',         bg: 'from-indigo-600/30 to-indigo-900/20', border: 'border-indigo-400/40', text: 'text-indigo-100', badge: 'bg-indigo-400/20 text-indigo-200 border border-indigo-400/30' },
  aplicacao:  { accent: '#34d399', label: 'Aplicação',    bg: 'from-emerald-600/30 to-emerald-900/20', border: 'border-emerald-400/40', text: 'text-emerald-100', badge: 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30' },
  ilustracao: { accent: '#fbbf24', label: 'Ilustração',   bg: 'from-amber-600/30 to-amber-900/20', border: 'border-amber-400/40', text: 'text-amber-100', badge: 'bg-amber-400/20 text-amber-200 border border-amber-400/30' },
  conclusao:  { accent: '#c084fc', label: 'Conclusão',    bg: 'from-violet-600/30 to-violet-900/20', border: 'border-violet-400/40', text: 'text-violet-100', badge: 'bg-violet-400/20 text-violet-200 border border-violet-400/30' },
  conteudo:  { accent: '#94a3b8', label: 'Conteúdo',     bg: 'from-slate-600/30 to-slate-900/20', border: 'border-slate-400/40', text: 'text-slate-100', badge: 'bg-slate-400/20 text-slate-200 border border-slate-400/30' },
} as const;

// ─── Base wrapper ─────────────────────────────────────────────────────────────

function SlideBase({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative flex w-full flex-col items-center justify-center overflow-hidden',
        'bg-[#090910]', // fundo quase preto com leve tom azulado
        className,
      )}
    >
      {/* Atmospheric glow — sutil, não distrai */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-gradient-to-br from-indigo-950/60 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-gradient-to-tl from-amber-950/30 to-transparent blur-3xl" />
      </div>

      {/* Content — z-10 fica acima do glow */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ─── Decorators ───────────────────────────────────────────────────────────────

function GoldDivider({ className }: { className?: string }) {
  return <div className={cn('h-px w-16 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent', className)} />;
}

function TipoBadge({ tipo, compact }: { tipo: keyof typeof COR; compact?: boolean }) {
  const c = COR[tipo];
  return (
    <span className={cn(
      'rounded-full font-bold uppercase tracking-widest',
      c.badge,
      compact ? 'px-2 py-0.5 text-[7px]' : 'px-3 py-1 text-[10px]'
    )}>
      {c.label}
    </span>
  );
}

// ─── Slide: Capa ─────────────────────────────────────────────────────────────

function SlideCapaView({ content, compact }: { content: SlideCapa; compact?: boolean }) {
  return (
    <SlideBase>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

      <div className={cn(
        'flex flex-col items-center justify-center gap-3 text-center px-4',
        compact ? 'gap-2 px-2' : 'gap-4 px-8'
      )}>
        {/* Ornament */}
        <div className={cn('flex items-center gap-3', compact ? 'gap-2' : 'gap-4')}>
          <GoldDivider className={cn('w-12', compact ? 'w-6' : 'w-16')} />
          <BookOpen className={cn('text-amber-400/70', compact ? 'h-4 w-4' : 'h-5 w-5')} />
          <GoldDivider className={cn('w-12', compact ? 'w-6' : 'w-16')} />
        </div>

        {/* Title */}
        <h1
          className={cn(
            'font-bold leading-tight tracking-tight text-white',
            compact
              ? 'text-[14px] sm:text-[16px]'
              : 'text-[2.5rem] sm:text-[3.5rem] md:text-[4rem]',
          )}
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {content.titulo || 'Sem título'}
        </h1>

        {/* Reference */}
        {content.referencia && (
          <div className={cn(
            'flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10',
            compact ? 'px-3 py-1' : 'px-5 py-2'
          )}>
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className={cn(
              'font-medium tracking-wide text-amber-300',
              compact ? 'text-[10px]' : 'text-[13px]'
            )}>
              {content.referencia}
            </span>
          </div>
        )}

        {/* Subtitle */}
        {content.subtitulo && !compact && (
          <p className="max-w-sm text-[1rem] leading-relaxed text-white/50">
            {content.subtitulo}
          </p>
        )}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
    </SlideBase>
  );
}

// ─── Slide: Verso bíblico ────────────────────────────────────────────────────

function SlideVersoView({ content, compact }: { content: SlideVerso; compact?: boolean }) {
  return (
    <SlideBase>
      <div className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-4 px-6',
        compact ? 'gap-2 px-3' : 'px-10 gap-6'
      )}>
        {/* Opening quote mark */}
        <div className={cn(
          'font-serif font-bold leading-none text-amber-400/30',
          compact ? 'text-5xl' : 'text-8xl md:text-9xl'
        )}>"</div>

        {/* Quote */}
        <blockquote
          className={cn(
            'max-w-3xl text-center leading-snug text-white',
            compact
              ? 'text-[11px] sm:text-[13px]'
              : 'text-[1.6rem] sm:text-[2rem] md:text-[2.4rem]',
          )}
          style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}
        >
          {content.citacao || 'Sem citação'}
        </blockquote>

        {/* Separator */}
        <GoldDivider />

        {/* Reference */}
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-amber-400/40" />
          <span className={cn(
            'font-bold uppercase tracking-[0.15em] text-amber-400',
            compact ? 'text-[9px]' : 'text-[11px] md:text-[13px]'
          )}>
            {content.referencia || '—'}
          </span>
          <div className="h-px w-8 bg-amber-400/40" />
        </div>
      </div>
    </SlideBase>
  );
}

// ─── Slide: Conteúdo — o mais importante ───────────────────────────────────

/**
 * Design: UM ponto por vez, máximo impacto visual.
 * Hierarquia: Badge → Título → Sub-conteúdo
 */
function SlideConteudoView({ content, compact }: { content: SlideConteudo; compact?: boolean }) {
  // Se tem múltiplos pontos, mostra o primeiro com destaque
  const ponto = content.pontos[0];
  const cor = COR.ponto;

  if (!ponto) {
    return (
      <SlideBase>
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-white/40">Nenhum ponto</p>
        </div>
      </SlideBase>
    );
  }

  return (
    <SlideBase>
      <div className={cn(
        'flex h-full w-full flex-col gap-3 overflow-hidden px-5',
        compact ? 'gap-2 px-3' : 'gap-4 px-8'
      )}>
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          {content.titulo && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
              <span className={cn(
                'font-bold uppercase tracking-widest text-amber-400/80',
                compact ? 'text-[8px]' : 'text-[11px]'
              )}>
                {content.titulo}
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400/40 to-transparent" />
            </div>
          )}

          {/* Point badge */}
          <div className={cn(
            'flex items-center gap-2 rounded-full border',
            cor.badge,
            compact ? 'px-2 py-0.5 text-[8px]' : 'px-4 py-1.5 text-[11px]'
          )}>
            <span className="font-bold">{ponto.numero}°</span>
            <span>Ponto</span>
          </div>
        </div>

        {/* Main title */}
        <h2
          className={cn(
            'text-center font-bold leading-tight tracking-tight text-white',
            compact
              ? 'text-[12px] sm:text-[14px]'
              : 'text-[1.8rem] sm:text-[2.2rem] md:text-[2.8rem]',
          )}
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {ponto.titulo || `Ponto ${ponto.numero}`}
        </h2>

        {/* Description / sub-content */}
        {ponto.descricao && !compact && (
          <p className="max-w-2xl text-center text-[1.05rem] leading-relaxed text-white/70">
            {ponto.descricao}
          </p>
        )}

        {/* Se há mais pontos, mostra-os em mini cards */}
        {content.pontos.length > 1 && (
          <div className={cn(
            'mt-1 grid flex-1 gap-2 overflow-hidden',
            content.pontos.length === 2
              ? compact ? 'grid-cols-1' : 'grid-cols-2'
              : compact ? 'grid-cols-1' : 'grid-cols-1'
          )}>
            {content.pontos.slice(1).map((p, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2 rounded-xl border bg-white/[0.03] p-2',
                  cor.border,
                  compact ? 'p-1.5' : 'p-3'
                )}
              >
                <span className={cn(
                  'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border font-bold',
                  cor.badge,
                  compact ? 'h-4 w-4 text-[8px]' : 'text-[10px]'
                )}>
                  {p.numero}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'font-semibold leading-snug text-white truncate',
                    compact ? 'text-[9px]' : 'text-[13px]'
                  )}>
                    {p.titulo || `Ponto ${p.numero}`}
                  </p>
                  {!compact && p.descricao && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-white/50 line-clamp-2">
                      {p.descricao}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty space filler — empurra o conteúdo pro centro */}
        {content.pontos.length <= 1 && (
          <div className="flex-1" />
        )}
      </div>
    </SlideBase>
  );
}

// ─── Slide: Categorias ───────────────────────────────────────────────────────

function SlideCategoriasView({ content, compact }: { content: SlideCategorias; compact?: boolean }) {
  const cols = compact
    ? 'grid-cols-1'
    : content.cards.length <= 2
    ? 'grid-cols-1'
    : content.cards.length === 3
    ? 'grid-cols-1 sm:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2';

  return (
    <SlideBase>
      <div className={cn(
        'flex h-full w-full flex-col gap-3 overflow-hidden px-5',
        compact ? 'gap-2 px-3' : 'gap-4 px-8'
      )}>
        {/* Header */}
        {content.titulo && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
            <span className={cn(
              'font-bold uppercase tracking-widest text-emerald-400/80',
              compact ? 'text-[8px]' : 'text-[11px]'
            )}>
              {content.titulo}
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-emerald-400/40 to-transparent" />
          </div>
        )}

        {/* Cards grid */}
        <div className={cn('grid gap-2 overflow-hidden', cols)}>
          {content.cards.map((card, i) => (
            <div
              key={i}
              className={cn(
                'flex flex-col gap-1.5 rounded-2xl border border-emerald-400/30',
                'bg-gradient-to-br from-emerald-600/20 to-emerald-900/10',
                compact ? 'p-2' : 'p-4'
              )}
            >
              <h3 className={cn(
                'font-bold text-emerald-100',
                compact ? 'text-[10px]' : 'text-[15px]'
              )}>
                {card.titulo || `Card ${i + 1}`}
              </h3>
              {!compact && card.descricao && (
                <p className="text-[12px] leading-relaxed text-white/60">
                  {card.descricao}
                </p>
              )}
              {card.referencia && (
                <div className="mt-auto flex items-center gap-1.5">
                  <div className="h-1 w-1 rounded-full bg-emerald-400" />
                  <span className={cn(
                    'text-emerald-400/70',
                    compact ? 'text-[8px]' : 'text-[10px]'
                  )}>
                    {card.referencia}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SlideBase>
  );
}

// ─── Slide: Chamada ─────────────────────────────────────────────────────────

function SlideChamadaView({ content, compact }: { content: SlideChamada; compact?: boolean }) {
  return (
    <SlideBase>
      <div className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-4 text-center px-5',
        compact ? 'gap-2 px-3' : 'gap-6 px-10'
      )}>
        {/* Title */}
        <h2
          className={cn(
            'font-bold leading-tight tracking-tight text-white',
            compact
              ? 'text-[13px]'
              : 'text-[2rem] sm:text-[2.5rem] md:text-[3rem]',
          )}
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {content.titulo || 'Chamada'}
        </h2>

        {/* Text */}
        {content.texto && !compact && (
          <p className="max-w-xl text-[1.05rem] leading-relaxed text-white/70">
            {content.texto}
          </p>
        )}

        {/* CTA badge */}
        {content.cta && (
          <div className={cn(
            'rounded-full border-2 border-amber-400/60 bg-amber-400/10',
            compact ? 'px-3 py-1.5' : 'px-8 py-3'
          )}>
            <span className={cn(
              'font-bold text-amber-300',
              compact ? 'text-[10px]' : 'text-[15px]'
            )}>
              {content.cta}
            </span>
          </div>
        )}
      </div>
    </SlideBase>
  );
}

// ─── Slide: Oração ─────────────────────────────────────────────────────────

function SlideOracaoView({ content, compact }: { content: SlideOracao; compact?: boolean }) {
  return (
    <SlideBase>
      {/* Cross ornament */}
      <div className={cn(
        'absolute left-1/2 flex flex-col items-center gap-0.5',
        compact ? 'top-3' : 'top-5'
      )}>
        <div className={cn(
          'w-px bg-gradient-to-b from-amber-400/70 to-transparent',
          compact ? 'h-4' : 'h-6'
        )} />
        <div className={cn(
          'h-0.5 bg-amber-400/70',
          compact ? 'w-5' : 'w-6'
        )} />
      </div>

      <div className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-4 text-center px-5',
        compact ? 'gap-2 px-3' : 'gap-5 px-10'
      )}>
        {/* Title */}
        {content.titulo && (
          <h2 className={cn(
            'font-bold uppercase tracking-widest text-rose-300',
            compact ? 'text-[9px]' : 'text-[12px]'
          )}>
            {content.titulo}
          </h2>
        )}

        {/* Prayer text */}
        {content.texto && (
          <p
            className={cn(
              'max-w-2xl leading-snug text-white',
              compact
                ? 'text-[11px]'
                : 'text-[1.2rem] sm:text-[1.5rem] md:text-[1.8rem]',
            )}
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}
          >
            {content.texto}
          </p>
        )}

        {/* Signature */}
        <GoldDivider className="mt-1" />
        <span className={cn(
          'text-rose-400/60',
          compact ? 'text-[8px]' : 'text-[11px]'
        )}>
          Em nome de Jesus
        </span>
      </div>
    </SlideBase>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SlideRenderer({ slide, compact = false }: { slide: Slide; compact?: boolean }) {
  const c = slide.content;
  switch (c.tipo) {
    case 'capa':       return <SlideCapaView      content={c} compact={compact} />;
    case 'verso':       return <SlideVersoView     content={c} compact={compact} />;
    case 'conteudo':   return <SlideConteudoView  content={c} compact={compact} />;
    case 'categorias': return <SlideCategoriasView content={c} compact={compact} />;
    case 'chamada':    return <SlideChamadaView   content={c} compact={compact} />;
    case 'oracao':     return <SlideOracaoView    content={c} compact={compact} />;
  }
}
