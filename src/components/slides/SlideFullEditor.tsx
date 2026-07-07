/**
 * SlideFullEditor — tela cheia para editar UM slide.
 *
 * Layout responsivo:
 *  - Portrait (mobile): preview 40% top + form 60% bottom (scrollable)
 *  - Landscape (mobile): preview 55% left + form 45% right
 *  - Desktop: preview 50% left + form 50% right
 *
 * Navegação entre slides: setas laterais + indicator de posição.
 * IA generator integrado no topo do form.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Copy, Trash2, Sparkles, Loader2, Wand2,
  LayoutTemplate, BookOpen, ListOrdered, LayoutGrid, Megaphone, Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlideRenderer } from './SlideRenderer';
import { FormCapa, FormVerso, FormConteudo, FormCategorias, FormChamada, FormOracao } from './SlideForm';
import { gerarConteudoSlideComIA, slideTipoLabel } from '@/lib/slideAI';
import { useUIStore } from '@/stores/ui';
import { useIsLandscape } from '@/lib/responsive';
import type { Mensagem, Slide, SlideType } from '@/types/mensagem';

const TIPO_ICON: Record<SlideType, typeof LayoutTemplate> = {
  capa: LayoutTemplate,
  verso: BookOpen,
  conteudo: ListOrdered,
  categorias: LayoutGrid,
  chamada: Megaphone,
  oracao: Heart,
};

function getTipoIcon(tipo: string): typeof LayoutTemplate {
  return TIPO_ICON[tipo as SlideType] ?? LayoutTemplate;
}

function EditContent({ slide, onChange }: { slide: Slide; onChange: (c: Slide['content']) => void }) {
  const c = slide.content;
  switch (c.tipo) {
    case 'capa':       return <FormCapa content={c} onChange={onChange as (c: any) => void} />;
    case 'verso':      return <FormVerso content={c} onChange={onChange as (c: any) => void} />;
    case 'conteudo':   return <FormConteudo content={c} onChange={onChange as (c: any) => void} />;
    case 'categorias': return <FormCategorias content={c} onChange={onChange as (c: any) => void} />;
    case 'chamada':    return <FormChamada content={c} onChange={onChange as (c: any) => void} />;
    case 'oracao':      return <FormOracao content={c} onChange={onChange as (c: any) => void} />;
  }
}

interface SlideFullEditorProps {
  slide: Slide;
  indice: number;
  total: number;
  mensagem: Mensagem;
  onChange: (content: Slide['content']) => void;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPrev: () => void;
  onNext: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function SlideFullEditor({
  slide,
  indice,
  total,
  mensagem,
  onChange,
  onClose,
  onDelete,
  onDuplicate,
  onPrev,
  onNext,
  onMoveUp,
  onMoveDown,
}: SlideFullEditorProps) {
  const [instrucaoIA, setInstrucaoIA] = useState('');
  const [gerandoIA, setGerandoIA] = useState(false);
  const [erroIA, setErroIA] = useState<string | null>(null);
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const isLandscape = useIsLandscape();

  const Icon = getTipoIcon(slide.tipo);

  const handleGerarIA = async () => {
    if (!instrucaoIA.trim()) return;
    setGerandoIA(true);
    setErroIA(null);
    try {
      const content = await gerarConteudoSlideComIA(slide.tipo, mensagem, instrucaoIA.trim());
      onChange(content);
      mostrarToast('Slide preenchido pela IA', 'sucesso');
      setInstrucaoIA('');
    } catch {
      setErroIA('Não consegui gerar agora. Tente novamente.');
    } finally {
      setGerandoIA(false);
    }
  };

  // ─── Portrait: preview top + form bottom ───────────────────────────────────
  if (!isLandscape) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0c0c14] pt-safe"
      >
        {/* Header — escuro pra combinar com preview */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2.5">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Icon className="h-4 w-4 flex-shrink-0 text-amber-400" />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-white">
                {slideTipoLabel(slide.tipo)}
              </div>
              <div className="text-[10.5px] text-white/40">{indice + 1} / {total}</div>
            </div>
          </div>
          {/* Indicador de posição */}
          <div className="flex items-center gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === indice ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/20',
                )}
              />
            ))}
          </div>
          <button onClick={onDuplicate} className="flex h-9 w-9 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="flex h-9 w-9 items-center justify-center rounded-full text-white/40 hover:bg-red-500/20 hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Preview — slide preenche mantendo 16:9, navegações dentro do container */}
        <div className="relative flex-shrink-0 overflow-hidden bg-[#0c0c14]">
          {/* Slide 16:9 centralizado */}
          <div className="relative mx-auto max-h-[45vh] w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <SlideRenderer slide={slide} />
          </div>
          {/* Navegação lateral */}
          <button
            onClick={onPrev}
            disabled={indice === 0}
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm transition',
              indice === 0 ? 'cursor-not-allowed text-white/10' : 'text-white/50 hover:bg-white/10 hover:text-white',
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={onNext}
            disabled={indice === total - 1}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm transition',
              indice === total - 1 ? 'cursor-not-allowed text-white/10' : 'text-white/50 hover:bg-white/10 hover:text-white',
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Form — 60% scrollable, fundo claro */}
        <div className="flex-1 overflow-y-auto rounded-t-3xl bg-paper dark:bg-paper-dark">
          <div className="px-4 pt-4">
            {/* IA generator */}
            <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-3.5 dark:border-violet-800/50 dark:bg-violet-950/20">
              <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-violet-700 dark:text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Preencher com IA
              </div>
              <div className="flex gap-2">
                <input
                  value={instrucaoIA}
                  onChange={(e) => setInstrucaoIA(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !gerandoIA) void handleGerarIA(); }}
                  placeholder="Ex: perseverança na fé…"
                  className="flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-[14px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-violet-400 dark:border-violet-800 dark:bg-ink-900 dark:text-white"
                />
                <button
                  onClick={() => void handleGerarIA()}
                  disabled={gerandoIA || !instrucaoIA.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {gerandoIA ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </button>
              </div>
              {erroIA && <p className="mt-1.5 text-[11px] text-red-600">{erroIA}</p>}
            </div>

            {/* Form fields */}
            <EditContent slide={slide} onChange={onChange} />

            {/* Navegação entre slides */}
            <div className="mb-6 mt-4 flex items-center justify-between rounded-2xl border border-ink-200/80 bg-white p-2 dark:border-ink-800 dark:bg-ink-900">
              <button
                onClick={onMoveUp}
                disabled={indice === 0}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl transition',
                  indice === 0 ? 'text-ink-300 cursor-not-allowed' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
                )}
                title="Mover acima"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={onPrev}
                disabled={indice === 0}
                className={cn(
                  'flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-medium transition',
                  indice === 0 ? 'text-ink-300 cursor-not-allowed' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
                )}
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <span className="text-[11px] text-ink-400">{indice + 1} / {total}</span>
              <button
                onClick={onNext}
                disabled={indice === total - 1}
                className={cn(
                  'flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-medium transition',
                  indice === total - 1 ? 'text-ink-300 cursor-not-allowed' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
                )}
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={onMoveDown}
                disabled={indice === total - 1}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl transition',
                  indice === total - 1 ? 'text-ink-300 cursor-not-allowed' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
                )}
                title="Mover abaixo"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── Landscape: preview left + form right ──────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex overflow-hidden bg-[#0c0c14] pt-safe"
    >
        {/* Preview — esquerda 55% */}
      <div className="relative flex w-[55%] flex-col">
        {/* Header mini */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
          <span className="text-[12px] font-medium text-white/80">{slideTipoLabel(slide.tipo)}</span>
          <span className="ml-auto text-[11px] text-white/40">{indice + 1}/{total}</span>
        </div>

        {/* Preview */}
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="relative max-h-[80vh] w-full overflow-hidden rounded-2xl shadow-2xl" style={{ aspectRatio: '16/9' }}>
            <SlideRenderer slide={slide} />
          </div>
        </div>

        {/* Navegação */}
        <div className="flex flex-shrink-0 items-center justify-center gap-4 border-t border-white/10 py-3">
          <button
            onClick={onPrev}
            disabled={indice === 0}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full transition',
              indice === 0 ? 'text-white/10 cursor-not-allowed' : 'text-white/50 hover:bg-white/10 hover:text-white',
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === indice ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/20',
                )}
              />
            ))}
          </div>
          <button
            onClick={onNext}
            disabled={indice === total - 1}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full transition',
              indice === total - 1 ? 'text-white/10 cursor-not-allowed' : 'text-white/50 hover:bg-white/10 hover:text-white',
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Form — direita 45%, scrollable, fundo claro */}
      <div className="flex w-[45%] flex-col overflow-hidden rounded-l-3xl bg-paper dark:bg-paper-dark">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="text-[14px] font-semibold text-ink-900 dark:text-white">{slideTipoLabel(slide.tipo)}</span>
          </div>
          <div className="flex gap-1">
            <button onClick={onMoveUp} disabled={indice === 0} className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition', indice === 0 ? 'text-ink-300' : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800')}>
              <ChevronUp className="h-4 w-4" />
            </button>
            <button onClick={onDuplicate} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800">
              <Copy className="h-4 w-4" />
            </button>
            <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-red-50 dark:text-ink-400 dark:hover:bg-red-500/10">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={onMoveDown} disabled={indice === total - 1} className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition', indice === total - 1 ? 'text-ink-300' : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800')}>
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4">
            {/* IA */}
            <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-3.5 dark:border-violet-800/50 dark:bg-violet-950/20">
              <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-violet-700 dark:text-violet-300">
                <Sparkles className="h-3.5 w-3.5" /> Preencher com IA
              </div>
              <div className="flex gap-2">
                <input
                  value={instrucaoIA}
                  onChange={(e) => setInstrucaoIA(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !gerandoIA) void handleGerarIA(); }}
                  placeholder="Ex: perseverança na fé…"
                  className="flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-[14px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-violet-400 dark:border-violet-800 dark:bg-ink-900 dark:text-white"
                />
                <button
                  onClick={() => void handleGerarIA()}
                  disabled={gerandoIA || !instrucaoIA.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {gerandoIA ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </button>
              </div>
              {erroIA && <p className="mt-1.5 text-[11px] text-red-600">{erroIA}</p>}
            </div>

            <EditContent slide={slide} onChange={onChange} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
