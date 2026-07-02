/**
 * SlideEditor — Editor de slides do púlpito (layout tipo PowerPoint).
 *
 * Cada mensagem pode ter múltiplos slides de tipos visuais diferentes.
 * O editor mostra uma lista de slides + formulário de edição inline.
 */

import { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronRight,
  Image,
  Type,
  List,
  Grid3x3,
  MessageSquare,
  Heart,
  Layers,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '@/lib/utils';
import type {
  Slide,
  SlideType,
  SlideCapa,
  SlideVerso,
  SlideConteudo,
  SlideCategorias,
  SlideChamada,
  SlideOracao,
} from '@/types/mensagem';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function novoSlide(tipo: SlideType): Slide {
  const id = crypto.randomUUID();
  const base = { id };
  switch (tipo) {
    case 'capa':
      return { ...base, tipo, content: { tipo: 'capa', titulo: '', referencia: '' } as SlideCapa };
    case 'verso':
      return { ...base, tipo, content: { tipo: 'verso', citacao: '', referencia: '' } as SlideVerso };
    case 'conteudo':
      return { ...base, tipo, content: { tipo: 'conteudo', titulo: '', pontos: [] } as SlideConteudo };
    case 'categorias':
      return { ...base, tipo, content: { tipo: 'categorias', titulo: '', cards: [] } as SlideCategorias };
    case 'chamada':
      return { ...base, tipo, content: { tipo: 'chamada', titulo: '', texto: '', cta: 'Vamos orar' } as SlideChamada };
    case 'oracao':
      return { ...base, tipo, content: { tipo: 'oracao', titulo: 'Oração', texto: '' } as SlideOracao };
  }
}

const TIPO_META: Record<SlideType, { label: string; icon: React.ReactNode; cor: string }> = {
  capa: { label: 'Capa', icon: <Layers className="h-4 w-4" />, cor: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  verso: { label: 'Verso', icon: <Image className="h-4 w-4" />, cor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  conteudo: { label: 'Conteúdo', icon: <List className="h-4 w-4" />, cor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  categorias: { label: 'Categorias', icon: <Grid3x3 className="h-4 w-4" />, cor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  chamada: { label: 'Chamada', icon: <MessageSquare className="h-4 w-4" />, cor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  oracao: { label: 'Oração', icon: <Heart className="h-4 w-4" />, cor: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
};

// ─── Mini preview de cada tipo ───────────────────────────────────────────────

function SlidePreview({ slide }: { slide: Slide }) {
  const c = slide.content;
  switch (c.tipo) {
    case 'capa':
      return (
        <div className="space-y-1 text-left">
          <div className="text-[13px] font-bold text-white line-clamp-1">{c.titulo || 'Sem título'}</div>
          {c.referencia && <div className="text-[10px] text-white/50">{c.referencia}</div>}
        </div>
      );
    case 'verso':
      return (
        <div className="space-y-1 text-left">
          <div className="text-[10px] italic text-white/80 line-clamp-2 leading-snug">{c.citacao || 'Sem citação'}</div>
          <div className="text-[9px] text-white/40">{c.referencia}</div>
        </div>
      );
    case 'conteudo':
      return (
        <div className="space-y-0.5 text-left">
          <div className="text-[11px] font-semibold text-white/90 line-clamp-1">{c.titulo || 'Sem título'}</div>
          {c.pontos.slice(0, 2).map((p) => (
            <div key={p.numero} className="flex items-start gap-1">
              <span className="text-[9px] text-white/50 shrink-0">{p.numero}.</span>
              <span className="text-[9px] text-white/70 line-clamp-1">{p.titulo}</span>
            </div>
          ))}
          {c.pontos.length > 2 && <div className="text-[8px] text-white/40">+{c.pontos.length - 2} mais</div>}
        </div>
      );
    case 'categorias':
      return (
        <div className="space-y-0.5 text-left">
          <div className="text-[11px] font-semibold text-white/90 line-clamp-1">{c.titulo || 'Sem título'}</div>
          <div className="flex flex-wrap gap-1">
            {c.cards.slice(0, 3).map((card, i) => (
              <span key={i} className="rounded bg-white/10 px-1 py-0.5 text-[8px] text-white/70">{card.titulo}</span>
            ))}
          </div>
        </div>
      );
    case 'chamada':
      return (
        <div className="space-y-1 text-left">
          <div className="text-[11px] font-semibold text-white/90 line-clamp-1">{c.titulo || 'Sem título'}</div>
          <div className="text-[9px] text-white/60 line-clamp-1">{c.texto}</div>
          {c.cta && <div className="text-[8px] text-amber-400">{c.cta}</div>}
        </div>
      );
    case 'oracao':
      return (
        <div className="space-y-0.5 text-left">
          <div className="text-[10px] font-semibold text-white/80">{c.titulo || 'Oração'}</div>
          <div className="text-[9px] text-white/50 line-clamp-2">{c.texto || 'Sem texto'}</div>
        </div>
      );
  }
}

// ─── Formulário de edição por tipo ──────────────────────────────────────────

function FormCapa({ content, onChange }: { content: SlideCapa; onChange: (c: SlideCapa) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-ink-500 dark:text-ink-400">Título</label>
        <Input value={content.titulo} onChange={(e) => onChange({ ...content, titulo: e.target.value })} placeholder="Título da mensagem" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-ink-500 dark:text-ink-400">Referência bíblica</label>
        <Input value={content.referencia ?? ''} onChange={(e) => onChange({ ...content, referencia: e.target.value })} placeholder="Mateus 17:20" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-ink-500 dark:text-ink-400">Subtítulo <span className="text-ink-400">(opcional)</span></label>
        <Input value={content.subtitulo ?? ''} onChange={(e) => onChange({ ...content, subtitulo: e.target.value })} placeholder="Uma mensagem sobre..." />
      </div>
    </div>
  );
}

function FormVerso({ content, onChange }: { content: SlideVerso; onChange: (c: SlideVerso) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-ink-500 dark:text-ink-400">Citação bíblica</label>
        <textarea
          value={content.citacao}
          onChange={(e) => onChange({ ...content, citacao: e.target.value })}
          placeholder="Se tiverdes fé do tamanho de um grão de mostarda..."
          rows={4}
          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[13px] text-ink-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white dark:focus:border-blue-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-ink-500 dark:text-ink-400">Referência</label>
        <Input value={content.referencia} onChange={(e) => onChange({ ...content, referencia: e.target.value })} placeholder="Mateus 17:20" />
      </div>
    </div>
  );
}

function FormConteudo({ content, onChange }: { content: SlideConteudo; onChange: (c: SlideConteudo) => void }) {
  const addPonto = () => onChange({ ...content, pontos: [...content.pontos, { numero: content.pontos.length + 1, titulo: '', descricao: '' }] });
  const updatePonto = (i: number, p: Partial<typeof content.pontos[0]>) => {
    const pts = [...content.pontos];
    pts[i] = { ...pts[i], ...p };
    onChange({ ...content, pontos: pts });
  };
  const removePonto = (i: number) => onChange({ ...content, pontos: content.pontos.filter((_, idx) => idx !== i) });
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-ink-500 dark:text-ink-400">Título do slide</label>
        <Input value={content.titulo} onChange={(e) => onChange({ ...content, titulo: e.target.value })} placeholder="01. O que é a Fé?" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-ink-500 dark:text-ink-400">Pontos</label>
          <button onClick={addPonto} className="flex items-center gap-1 rounded-lg bg-indigo-100 px-2 py-1 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            <Plus className="h-3 w-3" /> Adicionar ponto
          </button>
        </div>
        {content.pontos.map((p, i) => (
          <div key={i} className="rounded-xl border border-ink-200/80 bg-white p-3 dark:border-ink-700 dark:bg-ink-900/30">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">{p.numero}</span>
              <button onClick={() => removePonto(i)} className="text-ink-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="space-y-2">
              <Input value={p.titulo} onChange={(e) => updatePonto(i, { titulo: e.target.value })} placeholder="Título do ponto" />
              <textarea
                value={p.descricao}
                onChange={(e) => updatePonto(i, { descricao: e.target.value })}
                placeholder="Descrição ou aplicação..."
                rows={2}
                className="w-full rounded-lg border border-ink-200 bg-paper px-2.5 py-2 text-[12px] text-ink-900 outline-none transition focus:border-indigo-400 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white dark:focus:border-indigo-400"
              />
            </div>
          </div>
        ))}
        {content.pontos.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink-300 py-6 text-center text-[12px] text-ink-400 dark:border-ink-600">
            Nenhum ponto ainda. Clique em "Adicionar ponto".
          </div>
        )}
      </div>
    </div>
  );
}

function FormCategorias({ content, onChange }: { content: SlideCategorias; onChange: (c: SlideCategorias) => void }) {
  const addCard = () => onChange({ ...content, cards: [...content.cards, { titulo: '', descricao: '', referencia: '' }] });
  const updateCard = (i: number, card: Partial<typeof content.cards[0]>) => {
    const cards = [...content.cards];
    cards[i] = { ...cards[i], ...card };
    onChange({ ...content, cards });
  };
  const removeCard = (i: number) => onChange({ ...content, cards: content.cards.filter((_, idx) => idx !== i) });
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-ink-500 dark:text-ink-400">Título</label>
        <Input value={content.titulo} onChange={(e) => onChange({ ...content, titulo: e.target.value })} placeholder="As montanhas que enfrentamos" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-ink-500 dark:text-ink-400">Cards</label>
          <button onClick={addCard} className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            <Plus className="h-3 w-3" /> Adicionar card
          </button>
        </div>
        {content.cards.map((card, i) => (
          <div key={i} className="rounded-xl border border-ink-200/80 bg-white p-3 dark:border-ink-700 dark:bg-ink-900/30">
            <div className="mb-2 flex items-center justify-end">
              <button onClick={() => removeCard(i)} className="text-ink-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="space-y-2">
              <Input value={card.titulo} onChange={(e) => updateCard(i, { titulo: e.target.value })} placeholder="Nome do card (ex: Doença)" />
              <textarea
                value={card.descricao}
                onChange={(e) => updateCard(i, { descricao: e.target.value })}
                placeholder="Descrição curta..."
                rows={2}
                className="w-full rounded-lg border border-ink-200 bg-paper px-2.5 py-2 text-[12px] text-ink-900 outline-none transition focus:border-emerald-400 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white dark:focus:border-emerald-400"
              />
              <Input value={card.referencia ?? ''} onChange={(e) => updateCard(i, { referencia: e.target.value })} placeholder="Referência (ex: 2 Co 4:16)" />
            </div>
          </div>
        ))}
        {content.cards.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink-300 py-6 text-center text-[12px] text-ink-400 dark:border-ink-600">
            Nenhum card ainda. Clique em "Adicionar card".
          </div>
        )}
      </div>
    </div>
  );
}

function FormChamada({ content, onChange }: { content: SlideChamada; onChange: (c: SlideChamada) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-ink-500 dark:text-ink-400">Título</label>
        <Input value={content.titulo} onChange={(e) => onChange({ ...content, titulo: e.target.value })} placeholder="Hoje é o Dia de Crer" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-ink-500 dark:text-ink-400">Texto</label>
        <textarea
          value={content.texto}
          onChange={(e) => onChange({ ...content, texto: e.target.value })}
          placeholder="Texto da chamada..."
          rows={4}
          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[13px] text-ink-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white dark:focus:border-amber-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-ink-500 dark:text-ink-400">Botão / CTA</label>
        <Input value={content.cta ?? ''} onChange={(e) => onChange({ ...content, cta: e.target.value })} placeholder="Vamos orar" />
      </div>
    </div>
  );
}

function FormOracao({ content, onChange }: { content: SlideOracao; onChange: (c: SlideOracao) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-ink-500 dark:text-ink-400">Título <span className="text-ink-400">(opcional)</span></label>
        <Input value={content.titulo ?? ''} onChange={(e) => onChange({ ...content, titulo: e.target.value })} placeholder="Oração de Entrega" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-ink-500 dark:text-ink-400">Texto da oração</label>
        <textarea
          value={content.texto}
          onChange={(e) => onChange({ ...content, texto: e.target.value })}
          placeholder="Senhor, eu creio — ajuda-me na minha incredulidade..."
          rows={6}
          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[13px] text-ink-900 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white dark:focus:border-rose-400"
        />
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

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
  const [expanded, setExpanded] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const selected = slides.find((s) => s.id === selectedId) ?? null;

  const updateContent = useCallback(
    (id: string, content: Slide['content']) => {
      onChange(slides.map((s) => (s.id === id ? { ...s, tipo: content.tipo, content } : s)));
    },
    [slides, onChange],
  );

  const addSlide = (tipo: SlideType) => {
    const novo = novoSlide(tipo);
    onChange([...slides, novo]);
    setSelectedId(novo.id);
    setShowAddMenu(false);
  };

  const removeSlide = (id: string) => {
    const idx = slides.findIndex((s) => s.id === id);
    onChange(slides.filter((s) => s.id !== id));
    if (selectedId === id) {
      const next = slides[idx + 1] ?? slides[idx - 1] ?? null;
      setSelectedId(next?.id ?? null);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-ink-200/80 bg-white dark:border-ink-800 dark:bg-paper-dark">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-500" />
          <span className="text-[13px] font-semibold text-ink-900 dark:text-white">
            Slides do Púlpito
          </span>
          <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300">
            {slides.length}
          </span>
        </div>
        <ChevronRight className={cn('h-4 w-4 text-ink-400 transition-transform', expanded && 'rotate-90')} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-ink-200/70 dark:border-ink-800">
              {slides.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                    <Layers className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-medium text-ink-700 dark:text-ink-200">Nenhum slide ainda</p>
                    <p className="mt-1 text-[11px] text-ink-400">
                      Escreva o esboço no editor acima usando <strong>títulos (H1)</strong> para separar seções — o gerador vai criar os slides automaticamente.
                    </p>
                  </div>
                  <div className="mt-1 flex flex-col gap-2">
                    {onGerarSlides && (
                      <button
                        onClick={onGerarSlides}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-indigo-700 active:scale-95"
                      >
                        <Sparkles className="h-4 w-4" /> Gerar slides automaticamente
                      </button>
                    )}
                    {!onGerarSlides && (
                      <button
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-indigo-700 active:scale-95"
                      >
                        <Plus className="h-4 w-4" /> Adicionar slide
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-[480px]">
                  {/* Sidebar — lista de slides */}
                  <div className="flex w-48 flex-col border-r border-ink-200/70 dark:border-ink-800">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Slides</span>
                      <div className="relative flex items-center gap-1">
                        {onGerarSlides && (
                          <button
                            onClick={onGerarSlides}
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 text-white transition hover:bg-amber-600"
                            title="Regenerar slides a partir do esboço"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setShowAddMenu(!showAddMenu)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        {showAddMenu && (
                          <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-ink-200 bg-white py-1 shadow-lg dark:border-ink-700 dark:bg-ink-900">
                            {(Object.entries(TIPO_META) as [SlideType, typeof TIPO_META[SlideType]][]).map(([tipo, meta]) => (
                              <button
                                key={tipo}
                                onClick={() => addSlide(tipo)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition hover:bg-ink-50 dark:hover:bg-ink-800"
                              >
                                <span className={cn('rounded px-1 py-0.5 text-[9px] font-bold border', meta.cor)}>
                                  {meta.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Reorder.Group
                      axis="y"
                      values={slides}
                      onReorder={(novo) => onChange(novo)}
                      className="flex-1 space-y-1 overflow-y-auto px-2 pb-3"
                    >
                      {slides.map((slide) => {
                        const meta = TIPO_META[slide.tipo];
                        return (
                          <Reorder.Item key={slide.id} value={slide}>
                            <button
                              onClick={() => setSelectedId(slide.id)}
                              className={cn(
                                'group relative flex w-full items-start gap-2 rounded-xl border p-2 text-left transition',
                                selectedId === slide.id
                                  ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/30'
                                  : 'border-ink-200 bg-white hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900/40 dark:hover:border-ink-600',
                              )}
                            >
                              <GripVertical className="mt-0.5 h-3 w-3 shrink-0 cursor-grab text-ink-300 opacity-0 group-hover:opacity-100" />
                              <div className="min-w-0 flex-1">
                                <div className={cn('mb-1.5 w-fit rounded px-1 py-0.5 text-[9px] font-bold border', meta.cor)}>
                                  {meta.label}
                                </div>
                                <SlidePreview slide={slide} />
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-ink-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </button>
                          </Reorder.Item>
                        );
                      })}
                    </Reorder.Group>
                  </div>

                  {/* Área de edição */}
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    {selected ? (
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn('rounded px-2 py-1 text-[11px] font-bold border', TIPO_META[selected.tipo].cor)}>
                              {TIPO_META[selected.tipo].label}
                            </div>
                          </div>
                          <button
                            onClick={() => removeSlide(selected.id)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remover
                          </button>
                        </div>
                        {(() => {
                          const c = selected.content;
                          switch (c.tipo) {
                            case 'capa':      return <FormCapa content={c} onChange={(x) => updateContent(selected.id, x)} />;
                            case 'verso':     return <FormVerso content={c} onChange={(x) => updateContent(selected.id, x)} />;
                            case 'conteudo':  return <FormConteudo content={c} onChange={(x) => updateContent(selected.id, x)} />;
                            case 'categorias':return <FormCategorias content={c} onChange={(x) => updateContent(selected.id, x)} />;
                            case 'chamada':   return <FormChamada content={c} onChange={(x) => updateContent(selected.id, x)} />;
                            case 'oracao':    return <FormOracao content={c} onChange={(x) => updateContent(selected.id, x)} />;
                          }
                        })()}
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-[13px] text-ink-400">
                        Selecione um slide para editar
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
