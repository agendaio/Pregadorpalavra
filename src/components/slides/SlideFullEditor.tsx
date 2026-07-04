/**
 * SlideFullEditor — tela cheia para editar UM slide.
 *
 * Substitui o antigo "formulário embaixo da grade": tocar num slide agora
 * abre uma tela nova, dedicada, fácil de ler — com preview ao vivo, os
 * campos do tipo e um atalho de IA que preenche o slide sozinho.
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

  const Icon = getTipoIcon(slide.tipo);

  const handleGerarIA = async () => {
    setGerandoIA(true);
    setErroIA(null);
    try {
      const content = await gerarConteudoSlideComIA(slide.tipo, mensagem, instrucaoIA.trim());
      onChange(content);
      mostrarToast('Slide preenchido pela IA', 'sucesso');
      setInstrucaoIA('');
    } catch {
      setErroIA('Não consegui gerar agora. Tente de novo em alguns segundos.');
    } finally {
      setGerandoIA(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex flex-col overflow-x-hidden bg-white pt-safe dark:bg-ink-950"
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-ink-200/70 px-3 py-3 dark:border-ink-800">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon className="h-4 w-4 flex-shrink-0 text-violet-600 dark:text-violet-400" />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold text-ink-900 dark:text-white">
              {slideTipoLabel(slide.tipo)}
            </div>
            <div className="text-[10.5px] text-ink-400">Slide {indice + 1} de {total}</div>
          </div>
        </div>
        <button
          onClick={onDuplicate}
          title="Duplicar"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          title="Excluir"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Corpo — rola só verticalmente */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto pb-safe">
        {/* Preview ao vivo — 100% responsivo, não corta */}
        <div className="relative bg-[#0c0c14] px-4 pb-4 pt-3">
          <div className="mx-auto w-full max-w-lg">
            <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '16/9' }}>
              <SlideRenderer slide={slide} />
            </div>
          </div>
          {/* Navegação entre slides */}
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              onClick={onPrev}
              disabled={indice === 0}
              aria-label="Slide anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-20"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              <button onClick={onMoveUp} disabled={indice === 0} title="Mover acima" className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white/80 disabled:opacity-20">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button onClick={onMoveDown} disabled={indice === total - 1} title="Mover abaixo" className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white/80 disabled:opacity-20">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={onNext}
              disabled={indice === total - 1}
              aria-label="Próximo slide"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-20"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Assistente de IA — pede sugestão pronta pra esse tipo de slide */}
        <div className="mx-auto max-w-lg px-4 pt-4">
          <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-3.5 dark:border-violet-800/50 dark:bg-violet-950/20">
            <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-violet-700 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Preencher com IA
            </div>
            <input
              value={instrucaoIA}
              onChange={(e) => setInstrucaoIA(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !gerandoIA) void handleGerarIA(); }}
              placeholder={`Ex: fale sobre perseverança na fé…`}
              className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-[16px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-violet-400 dark:border-violet-800 dark:bg-ink-900 dark:text-white"
            />
            <button
              onClick={() => void handleGerarIA()}
              disabled={gerandoIA}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-[13px] font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
            >
              {gerandoIA ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {gerandoIA ? 'Gerando…' : 'Gerar conteúdo com IA'}
            </button>
            {erroIA && (
              <p className="mt-2 text-[11.5px] text-red-600 dark:text-red-400">{erroIA}</p>
            )}
            <p className="mt-2 text-[10.5px] text-violet-600/70 dark:text-violet-400/60">
              A IA preenche os campos abaixo — você revisa e ajusta como quiser.
            </p>
          </div>
        </div>

        {/* Campos do slide */}
        <div className="mx-auto max-w-lg px-4 py-4">
          <EditContent slide={slide} onChange={onChange} />
        </div>
      </div>
    </motion.div>
  );
}
