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
  Layers, Sparkles, X,
  Eye, Share2, Download, ExternalLink,
  LayoutTemplate, BookOpen, ListOrdered, LayoutGrid, Megaphone, Heart,
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

// Paleta única e neutra — só um acento (violeta, o mesmo do resto do app) em
// vez de uma cor por tipo. Ícones lucide no lugar de emoji: fica com cara de
// app nativo, não de apresentação colorida.
const TIPO_META: Record<SlideType, { label: string; icon: typeof LayoutTemplate }> = {
  capa:       { label: 'Capa',       icon: LayoutTemplate },
  verso:      { label: 'Verso',      icon: BookOpen },
  conteudo:   { label: 'Conteúdo',   icon: ListOrdered },
  categorias: { label: 'Categorias', icon: LayoutGrid },
  chamada:    { label: 'Chamada',    icon: Megaphone },
  oracao:     { label: 'Oração',     icon: Heart },
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
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border transition-colors',
        ativo
          ? 'border-violet-400 bg-violet-50/60 dark:border-violet-500 dark:bg-violet-950/20'
          : 'border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900/40',
      )}
    >
      <button type="button" onClick={onClick} className="flex flex-col gap-1.5 p-1.5 text-left">
        {/* Mini preview escuro */}
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-[#0c0c14]">
          <div className="h-full w-full scale-[0.25] origin-top-left transform">
            <SlideRenderer slide={slide} />
          </div>
        </div>

        {/* Índice + tipo */}
        <div className="flex items-center gap-1.5 px-0.5">
          <span className={cn(
            'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
            ativo ? 'bg-violet-600 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
          )}>
            {indice + 1}
          </span>
          <Icon className={cn('h-3 w-3 flex-shrink-0', ativo ? 'text-violet-600 dark:text-violet-400' : 'text-ink-400')} />
          <span className="truncate text-[10.5px] font-medium text-ink-600 dark:text-ink-300">
            {meta.label}
          </span>
        </div>
      </button>

      {/* Ações — sempre visíveis (hover não é confiável em telas de toque) */}
      <div className="flex items-center gap-0.5 border-t border-ink-100 px-1 py-0.5 dark:border-ink-800">
        <ActionBtn icon={<ChevronUp className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} title="Mover acima" />
        <ActionBtn icon={<ChevronDown className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} title="Mover abaixo" />
        <ActionBtn icon={<Copy className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Duplicar" />
        <ActionBtn icon={<Trash2 className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Excluir" danger />
      </div>
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
        'flex h-6 flex-1 items-center justify-center rounded-md transition-colors',
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

// Tela cheia (não popup) — mais fácil de ler, entender e usar. Fecha rápido
// pelo X e volta exatamente pro editor de slides de onde saiu.
function AddSlideModal({ onAdd, onClose }: { onAdd: (tipo: SlideType) => void; onClose: () => void }) {
  const tipos = Object.entries(TIPO_META) as [SlideType, typeof TIPO_META[SlideType]][];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex flex-col overflow-x-hidden bg-white pt-safe dark:bg-ink-950"
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-ink-200/70 px-5 py-3.5 dark:border-ink-800">
        <div>
          <h2 className="text-[16px] font-semibold text-ink-900 dark:text-white">
            Adicionar slide
          </h2>
          <p className="text-[11.5px] text-ink-400">Escolha o tipo para começar</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Grid de tipos — telas grandes, fáceis de tocar, sem rolagem lateral */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto px-5 py-5 pb-safe">
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
          {tipos.map(([tipo, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={tipo}
                onClick={() => { onAdd(tipo); onClose(); }}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-center transition-all hover:border-violet-300 hover:bg-violet-50/40 active:scale-95 dark:border-ink-700 dark:bg-ink-900/40 dark:hover:border-violet-700 dark:hover:bg-violet-950/20"
              >
                {/* Mini preview do slide */}
                <div className="h-20 w-full overflow-hidden rounded-xl bg-[#0c0c14]">
                  <div className="h-full w-full scale-[0.28] origin-top-left transform">
                    <SlideRenderer slide={novoSlide(tipo)} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-ink-500 group-hover:text-violet-600 dark:text-ink-400 dark:group-hover:text-violet-400" />
                  <span className="text-[13px] font-semibold text-ink-700 dark:text-ink-200">{meta.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
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
    // Rola a grade (verticalmente, junto com a página) até o novo slide
    setTimeout(() => {
      thumbnailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40">
            <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
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
                className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-[11.5px] font-medium text-ink-700 transition hover:bg-ink-50 active:scale-95 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 sm:px-2"
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
              className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-[11.5px] font-medium text-ink-700 transition hover:bg-ink-50 active:scale-95 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Regenerar</span>
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-[11.5px] font-semibold text-white transition hover:bg-violet-500 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {slides.length === 0 && (
        <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-50 dark:bg-ink-800/50">
            <Layers className="h-8 w-8 text-ink-300 dark:text-ink-600" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink-700 dark:text-ink-200">
              Nenhum slide ainda
            </p>
            <p className="mt-1 text-[12px] text-ink-400 max-w-xs">
              Adicione slides para projetar durante a ministração ou use a geração automática a partir do esboço.
            </p>
          </div>
          {onGerarSlides && (
            <button
              onClick={onGerarSlides}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-violet-500 active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              Gerar automaticamente
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-5 py-3 text-[13px] font-medium text-ink-600 transition hover:bg-ink-50 active:scale-95 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
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
                <span className="flex items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
                  <Eye className="h-3 w-3" />
                  {TIPO_META[selected.content.tipo].label}
                </span>
              </div>
            </div>
          )}

          {/* ── Grade de thumbnails — sem rolagem lateral, quebra em linhas
               e rola verticalmente junto com o resto da página ── */}
          <div
            ref={thumbnailRef}
            className="grid grid-cols-2 gap-2.5 border-b border-ink-200/70 bg-ink-50/80 p-3 dark:border-ink-800 dark:bg-ink-900/50 sm:grid-cols-4"
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

            {/* Botão adicionar no final da grade */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex min-h-[74px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink-300 text-ink-400 transition-colors hover:border-violet-400 hover:text-violet-500 dark:border-ink-700 dark:text-ink-500 dark:hover:border-violet-600 dark:hover:text-violet-400"
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
                  <span className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
                    {(() => {
                      const Icon = TIPO_META[selected.content.tipo].icon;
                      return <Icon className="h-3 w-3" />;
                    })()}
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
