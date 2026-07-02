/**
 * SlideEditor — Editor de slides mobile-first (layout tipo PowerPoint).
 *
 * UX princípios:
 * - Mobile: preview grande em cima, edição em baixo com tabs, strip de thumbnails
 * - Desktop: split view com preview grande à esquerda e editor à direita
 * - Cada slide tem ações rápidas visíveis: duplicar, mover ↑↓, excluir
 * - Live preview renderizado via SlideRenderer
 * - Adicionar slide: modal com preview visual de cada tipo
 */

import { useState, useCallback, useRef } from 'react';
import {
  Plus, Trash2, Copy, ChevronUp, ChevronDown,
  Layers, Sparkles, X, Check,
  GripVertical, Eye, Share2, Play, Download, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SlideRenderer } from './SlideRenderer';
import { FormCapa, FormVerso, FormConteudo, FormCategorias, FormChamada, FormOracao } from './SlideForm';
import type {
  Slide,
  SlideType,
} from '@/types/mensagem';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function novoSlide(tipo: SlideType): Slide {
  const id = crypto.randomUUID();
  const base = { id };
  switch (tipo) {
    case 'capa':
      return { ...base, tipo, content: { tipo: 'capa', titulo: '', referencia: '', subtitulo: '' } };
    case 'verso':
      return { ...base, tipo, content: { tipo: 'verso', citacao: '', referencia: '' } };
    case 'conteudo':
      return { ...base, tipo, content: { tipo: 'conteudo', titulo: '', pontos: [] } };
    case 'categorias':
      return { ...base, tipo, content: { tipo: 'categorias', titulo: '', cards: [] } };
    case 'chamada':
      return { ...base, tipo, content: { tipo: 'chamada', titulo: '', texto: '', cta: 'Vamos orar' } };
    case 'oracao':
      return { ...base, tipo, content: { tipo: 'oracao', titulo: 'Oração', texto: '' } };
  }
}

const TIPO_META: Record<SlideType, { label: string; cor: string; corBg: string; emoji: string }> = {
  capa:       { label: 'Capa',       cor: 'text-purple-300',       corBg: 'bg-purple-500/20 border-purple-500/40',  emoji: '📌' },
  verso:      { label: 'Verso',      cor: 'text-blue-300',        corBg: 'bg-blue-500/20 border-blue-500/40',       emoji: '📖' },
  conteudo:   { label: 'Conteúdo',   cor: 'text-indigo-300',      corBg: 'bg-indigo-500/20 border-indigo-500/40',  emoji: '📋' },
  categorias: { label: 'Categorias',  cor: 'text-emerald-300',     corBg: 'bg-emerald-500/20 border-emerald-500/40',emoji: '🏷️' },
  chamada:    { label: 'Chamada',     cor: 'text-amber-300',       corBg: 'bg-amber-500/20 border-amber-500/40',   emoji: '📢' },
  oracao:     { label: 'Oração',     cor: 'text-rose-300',        corBg: 'bg-rose-500/20 border-rose-500/40',      emoji: '🙏' },
};

// ─── SlideForm — exports dos forms existentes ────────────────────────────────

export { FormCapa, FormVerso, FormConteudo, FormCategorias, FormChamada, FormOracao };

// ─── SlideThumbnail — mini preview na strip ───────────────────────────────────

function SlideThumbnail({
  slide,
  ativo,
  onClick,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  indice,
}: {
  slide: Slide;
  ativo: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  indice: number;
}) {
  const meta = TIPO_META[slide.tipo];

  return (
    <div className="relative flex-shrink-0">
      {/* Card do thumbnail */}
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.97 }}
        className={cn(
          'group relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all w-[88px]',
          ativo
            ? 'border-indigo-400 bg-indigo-950/60 shadow-[0_0_0_2px_rgba(99,102,241,0.4)]'
            : 'border-ink-200 bg-white/80 hover:border-indigo-300 hover:bg-white dark:border-ink-700 dark:bg-ink-900/60 dark:hover:border-indigo-600',
        )}
      >
        {/* Mini preview escuro */}
        <div className="h-14 w-full overflow-hidden rounded-xl bg-[#0c0c14]">
          <div className="h-full w-full scale-[0.25] origin-top-left transform">
            <SlideRenderer slide={slide} />
          </div>
        </div>

        {/* Índice + tipo */}
        <div className="flex w-full items-center gap-1">
          <span className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold',
            ativo ? 'bg-indigo-500 text-white' : 'bg-ink-200 text-ink-600 dark:bg-ink-700 dark:text-ink-300',
          )}>
            {indice + 1}
          </span>
          <span className="truncate text-[9px] font-medium text-ink-500 dark:text-ink-400">
            {meta.label}
          </span>
        </div>

        {/* Ações — aparecem NO HOVER/TAP, abaixo do card */}
        <div className={cn(
          'absolute -bottom-10 left-1/2 z-10 flex -translate-x-1/2 gap-0.5 rounded-xl bg-white/95 dark:bg-ink-900/95 px-1.5 py-1 shadow-lg border border-ink-200/50 dark:border-ink-700 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity',
        )}>
          <ActionBtn icon={<ChevronUp className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} title="Mover acima" />
          <ActionBtn icon={<ChevronDown className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} title="Mover abaixo" />
          <ActionBtn icon={<Copy className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Duplicar" />
          <ActionBtn icon={<Trash2 className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Excluir" danger />
        </div>
      </motion.button>
    </div>
  );
}

function ActionBtn({
  icon,
  onClick,
  disabled,
  title,
  danger,
}: {
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-lg transition-colors',
        danger
          ? 'text-ink-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10'
          : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-white',
        disabled && 'opacity-30 cursor-not-allowed',
      )}
    >
      {icon}
    </button>
  );
}

// ─── Add Slide Modal ─────────────────────────────────────────────────────────

function AddSlideModal({ onAdd, onClose }: { onAdd: (tipo: SlideType) => void; onClose: () => void }) {
  const tipos = Object.entries(TIPO_META) as [SlideType, typeof TIPO_META[SlideType]][];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 340 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border-t border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-[15px] font-semibold text-ink-900 dark:text-white">
            Adicionar slide
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grid de tipos */}
        <div className="grid grid-cols-2 gap-3 px-5 pb-6 sm:grid-cols-3">
          {tipos.map(([tipo, meta]) => (
            <button
              key={tipo}
              onClick={() => { onAdd(tipo); onClose(); }}
              className={cn(
                'group flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-4 text-center transition-all hover:border-solid active:scale-95',
                meta.corBg,
                'hover:border-current dark:border-ink-700',
              )}
            >
              {/* Mini preview do slide */}
              <div className="h-16 w-full overflow-hidden rounded-xl bg-[#0c0c14]">
                <div className="h-full w-full scale-[0.28] origin-top-left transform">
                  <SlideRenderer slide={novoSlide(tipo)} />
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl">{meta.emoji}</span>
                <span className={cn('text-[12px] font-semibold', meta.cor)}>{meta.label}</span>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── EditContent — renderiza o form conforme tipo ────────────────────────────

function EditContent({
  slide,
  onChange,
}: {
  slide: Slide;
  onChange: (c: Slide['content']) => void;
}) {
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

// ─── Componente principal ─────────────────────────────────────────────────────

interface SlideEditorProps {
  slides: Slide[];
  onChange: (slides: Slide[]) => void;
  /** Callback para gerar slides automaticamente a partir do esboço */
  onGerarSlides?: () => void;
  /** Se true, mostra botão de regenerar */
  podeRegenerar?: boolean;
}

export function SlideEditor({ slides, onChange, onGerarSlides, podeRegenerar }: SlideEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(slides[0]?.id ?? null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  // Função para exportar slides
  const handleExport = async (formato: 'copy' | 'json' | 'print') => {
    setShowShareMenu(false);
    if (formato === 'copy') {
      const texto = slides.map((s, i) => {
        const meta = TIPO_META[s.content.tipo];
        const content = s.content;
        let texto = '';
        if (content.tipo === 'capa') texto = content.titulo || '';
        else if (content.tipo === 'verso') texto = content.citacao || '';
        else if (content.tipo === 'conteudo') texto = content.titulo || '';
        else if (content.tipo === 'chamada') texto = content.titulo || '';
        else if (content.tipo === 'oracao') texto = content.titulo || '';
        return `Slide ${i + 1} - ${meta.label}: ${texto}`;
      }).join('\n');
      await navigator.clipboard.writeText(texto);
    } else if (formato === 'json') {
      const json = JSON.stringify(slides, null, 2);
      await navigator.clipboard.writeText(json);
    } else if (formato === 'print') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<html><head><title>Slides</title><style>body{font-family:sans-serif;padding:20px;} .slide{margin-bottom:30px;border:1px solid #ccc;padding:20px;}</style></head><body>`);
        slides.forEach((s, i) => {
          const meta = TIPO_META[s.content.tipo];
          printWindow.document.write(`<div class="slide"><h3>Slide ${i + 1} - ${meta.label}</h3>`);
          const content = s.content as any;
          if (content.titulo) printWindow.document.write(`<p><strong>Título:</strong> ${content.titulo}</p>`);
          if (content.citacao) printWindow.document.write(`<p><strong>Citação:</strong> ${content.citacao}</p>`);
          if (content.texto) printWindow.document.write(`<p>${content.texto}</p>`);
          if (content.pontos) printWindow.document.write(`<ul>${content.pontos.map((p: any) => `<li>${p}</li>`).join('')}</ul>`);
          printWindow.document.write('</div>');
        });
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const selected = slides.find((s) => s.id === selectedId) ?? null;
  const selectedIdx = slides.findIndex((s) => s.id === selectedId);

  const updateContent = useCallback(
    (id: string, content: Slide['content']) => {
      onChange(slides.map((s) => (s.id === id ? { ...s, tipo: content.tipo, content } : s)));
    },
    [slides, onChange],
  );

  const addSlide = (tipo: SlideType) => {
    const novo = novoSlide(tipo);
    // Insere DEPOIS do slide selecionado (ou no fim)
    const idx = selectedIdx >= 0 ? selectedIdx + 1 : slides.length;
    const novos = [...slides];
    novos.splice(idx, 0, novo);
    onChange(novos);
    setSelectedId(novo.id);
    // Scroll thumbnail pro novo slide
    setTimeout(() => {
      thumbnailRef.current?.scrollTo({
        left: thumbnailRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }, 100);
  };

  const removeSlide = (id: string) => {
    const idx = slides.findIndex((s) => s.id === id);
    onChange(slides.filter((s) => s.id !== id));
    if (selectedId === id) {
      const next = slides[idx + 1] ?? slides[idx - 1] ?? null;
      setSelectedId(next?.id ?? null);
    }
  };

  const duplicateSlide = (id: string) => {
    const idx = slides.findIndex((s) => s.id === id);
    const original = slides[idx];
    if (!original) return;
    const copia: Slide = {
      ...original,
      id: crypto.randomUUID(),
      content: JSON.parse(JSON.stringify(original.content)),
    };
    const novos = [...slides];
    novos.splice(idx + 1, 0, copia);
    onChange(novos);
    setSelectedId(copia.id);
  };

  const moveSlide = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= slides.length) return;
    const novos = [...slides];
    const [moved] = novos.splice(fromIdx, 1);
    novos.splice(toIdx, 0, moved);
    onChange(novos);
    setSelectedId(moved.id);
  };

  return (
    <div className="mt-4 rounded-2xl border border-ink-200/80 bg-white dark:border-ink-800 dark:bg-paper-dark overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200/70 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
            <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-ink-900 dark:text-white">
              Slides do Púlpito
            </div>
            <div className="text-[10.5px] text-ink-400">
              {slides.length} slide{slides.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão Compartilhar */}
          {slides.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1.5 rounded-xl border border-ink-300 bg-white px-3 py-2 text-[11.5px] font-medium text-ink-700 transition hover:bg-ink-50 active:scale-95 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 sm:px-2"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Compartilhar</span>
              </button>
              {/* Menu de compartilhar */}
              {showShareMenu && (
                <div className="absolute right-0 top-full mt-2 z-20 w-48 rounded-xl border border-ink-200 bg-white shadow-xl dark:border-ink-700 dark:bg-ink-900">
                  <button
                    onClick={() => handleExport('copy')}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] hover:bg-ink-50 dark:hover:bg-ink-800"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar texto
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] hover:bg-ink-50 dark:hover:bg-ink-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Copiar JSON
                  </button>
                  <button
                    onClick={() => handleExport('print')}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] hover:bg-ink-50 dark:hover:bg-ink-800"
                  >
                    <Download className="h-4 w-4" />
                    Imprimir slides
                  </button>
                </div>
              )}
            </div>
          )}
          {onGerarSlides && podeRegenerar && (
            <button
              onClick={onGerarSlides}
              className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-[11.5px] font-medium text-amber-700 transition hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Regenerar</span>
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[11.5px] font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {slides.length === 0 && (
        <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30">
            <Layers className="h-8 w-8 text-indigo-300" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink-700 dark:text-ink-200">
              Nenhum slide ainda
            </p>
            <p className="mt-1 text-[12px] text-ink-400 max-w-xs">
              Adicione slides para投影ar durante a ministração ou use a geração automática.
            </p>
          </div>
          {onGerarSlides && (
            <button
              onClick={onGerarSlides}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              Gerar automaticamente
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-300 bg-white px-5 py-3 text-[13px] font-medium text-indigo-600 transition hover:bg-indigo-50 active:scale-95 dark:border-indigo-700 dark:bg-ink-900 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
          >
            <Plus className="h-4 w-4" />
            Criar manualmente
          </button>
        </div>
      )}

      {/* Editor com slides */}
      {slides.length > 0 && (
        <div className="flex flex-col">
          {/* ── Preview grande do slide ─────────────────────────────── */}
          {selected && (
            <div className="relative bg-[#0c0c14] pb-4">
              <div className="mx-auto max-h-[260px] w-full max-w-lg overflow-hidden pt-2 sm:max-h-[320px]">
                <SlideRenderer slide={selected} />
              </div>
              {/* Badge do tipo no preview */}
              <div className="absolute top-2 right-2">
                <span className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border backdrop-blur-sm',
                  TIPO_META[selected.content.tipo].corBg,
                  TIPO_META[selected.content.tipo].cor,
                )}>
                  <Eye className="h-3 w-3" />
                  {TIPO_META[selected.content.tipo].label}
                </span>
              </div>
            </div>
          )}

          {/* ── Strip de thumbnails ──────────────────────────────── */}
          <div
            ref={thumbnailRef}
            className="flex items-center gap-2 overflow-x-auto border-b border-ink-200/70 bg-ink-50/80 px-3 py-3 dark:border-ink-800 dark:bg-ink-900/50 scrollbar-none"
            style={{ scrollbarWidth: 'none' }}
          >
            {slides.map((slide, idx) => (
              <SlideThumbnail
                key={slide.id}
                slide={slide}
                ativo={slide.id === selectedId}
                onClick={() => setSelectedId(slide.id)}
                onDelete={() => removeSlide(slide.id)}
                onDuplicate={() => duplicateSlide(slide.id)}
                onMoveUp={() => moveSlide(idx, idx - 1)}
                onMoveDown={() => moveSlide(idx, idx + 1)}
                isFirst={idx === 0}
                isLast={idx === slides.length - 1}
                indice={idx}
              />
            ))}

            {/* Botão adicionar no final da strip */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex h-[88px] w-[88px] flex-shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-300 text-ink-400 transition-colors hover:border-indigo-400 hover:text-indigo-500 dark:border-ink-700 dark:text-ink-500 dark:hover:border-indigo-600 dark:hover:text-indigo-400"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[9px] font-medium">Adicionar</span>
            </button>
          </div>

          {/* ── Formulário de edição ────────────────────────────── */}
          {selected ? (
            <div className="px-4 py-4">
              {/* Header do editor */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold',
                    TIPO_META[selected.content.tipo].corBg,
                    TIPO_META[selected.content.tipo].cor,
                  )}>
                    {TIPO_META[selected.content.tipo].emoji}
                    {TIPO_META[selected.content.tipo].label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveSlide(selectedIdx, selectedIdx - 1)}
                    disabled={selectedIdx === 0}
                    title="Mover acima"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveSlide(selectedIdx, selectedIdx + 1)}
                    disabled={selectedIdx === slides.length - 1}
                    title="Mover abaixo"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => duplicateSlide(selected.id)}
                    title="Duplicar"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeSlide(selected.id)}
                    title="Excluir"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <EditContent
                slide={selected}
                onChange={(c) => updateContent(selected.id, c)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-[13px] text-ink-400">
              Selecione um slide para editar
            </div>
          )}
        </div>
      )}

      {/* Modal de adicionar */}
      <AnimatePresence>
        {showAddModal && (
          <AddSlideModal
            onAdd={addSlide}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
