/**
 * SlideForm — Formulários de edição para cada tipo de slide.
 * Reexportados pelo SlideEditor principal.
 */

import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import type {
  SlideCapa,
  SlideVerso,
  SlideConteudo,
  SlideCategorias,
  SlideChamada,
  SlideOracao,
} from '@/types/mensagem';

// ─── Capa ─────────────────────────────────────────────────────────────────────

export function FormCapa({ content, onChange }: { content: SlideCapa; onChange: (c: SlideCapa) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Título da mensagem">
        <Input
          value={content.titulo}
          onChange={(e) => onChange({ ...content, titulo: e.target.value })}
          placeholder="Ex: A Fé que Move Montanhas"
        />
      </Field>
      <Field label="Referência bíblica">
        <Input
          value={content.referencia ?? ''}
          onChange={(e) => onChange({ ...content, referencia: e.target.value })}
          placeholder="Ex: Mateus 17:20"
        />
      </Field>
      <Field label="Subtítulo (opcional)">
        <Input
          value={content.subtitulo ?? ''}
          onChange={(e) => onChange({ ...content, subtitulo: e.target.value })}
          placeholder="Uma palavra sobre a fé cristã"
        />
      </Field>
    </div>
  );
}

// ─── Verso ─────────────────────────────────────────────────────────────────────

export function FormVerso({ content, onChange }: { content: SlideVerso; onChange: (c: SlideVerso) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Citação bíblica">
        <textarea
          value={content.citacao}
          onChange={(e) => onChange({ ...content, citacao: e.target.value })}
          placeholder="Se tiverdes fé do tamanho de um grão de mostarda..."
          rows={4}
          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[13px] text-ink-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white dark:focus:border-indigo-400 resize-y min-h-[60px] font-sans"
        />
      </Field>
      <Field label="Referência">
        <Input
          value={content.referencia}
          onChange={(e) => onChange({ ...content, referencia: e.target.value })}
          placeholder="Mateus 17:20"
        />
      </Field>
    </div>
  );
}

// ─── Conteúdo ────────────────────────────────────────────────────────────────

export function FormConteudo({ content, onChange }: { content: SlideConteudo; onChange: (c: SlideConteudo) => void }) {
  const addPonto = () => {
    onChange({
      ...content,
      pontos: [...content.pontos, { numero: content.pontos.length + 1, titulo: '', descricao: '' }],
    });
  };
  const updatePonto = (i: number, p: Partial<typeof content.pontos[0]>) => {
    const pts = [...content.pontos];
    pts[i] = { ...pts[i], ...p };
    onChange({ ...content, pontos: pts });
  };
  const removePonto = (i: number) => {
    onChange({ ...content, pontos: content.pontos.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-4">
      <Field label="Título do slide">
        <Input
          value={content.titulo}
          onChange={(e) => onChange({ ...content, titulo: e.target.value })}
          placeholder="Ex: 1. O que é a fé?"
        />
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Field label="Pontos" noMargin>
            <span className="text-[10px] text-ink-400">Toque para editar</span>
          </Field>
          <button
            onClick={addPonto}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar ponto
          </button>
        </div>

        {content.pontos.map((p, i) => (
          <div
            key={i}
            className="rounded-2xl border border-ink-200/80 bg-ink-50/60 p-4 dark:border-ink-700 dark:bg-ink-900/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                  {p.numero}
                </div>
                <span className="text-[11px] font-medium text-ink-500">Ponto {i + 1}</span>
              </div>
              <button
                onClick={() => removePonto(i)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              <Input
                value={p.titulo}
                onChange={(e) => updatePonto(i, { titulo: e.target.value })}
                placeholder="Título do ponto"
              />
              <textarea
                value={p.descricao}
                onChange={(e) => updatePonto(i, { descricao: e.target.value })}
                placeholder="Descrição ou aplicação (opcional)..."
                rows={2}
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[13px] text-ink-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white dark:focus:border-indigo-400 resize-y min-h-[60px] font-sans"
              />
            </div>
          </div>
        ))}

        {content.pontos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-300 py-8 text-center text-[12px] text-ink-400 dark:border-ink-600">
            Nenhum ponto. Clique em "Adicionar ponto" acima.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Categorias ────────────────────────────────────────────────────────────────

export function FormCategorias({ content, onChange }: { content: SlideCategorias; onChange: (c: SlideCategorias) => void }) {
  const addCard = () => {
    onChange({ ...content, cards: [...content.cards, { titulo: '', descricao: '', referencia: '' }] });
  };
  const updateCard = (i: number, card: Partial<typeof content.cards[0]>) => {
    const cards = [...content.cards];
    cards[i] = { ...cards[i], ...card };
    onChange({ ...content, cards });
  };
  const removeCard = (i: number) => {
    onChange({ ...content, cards: content.cards.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-4">
      <Field label="Título do slide">
        <Input
          value={content.titulo}
          onChange={(e) => onChange({ ...content, titulo: e.target.value })}
          placeholder="Ex: As montanhas que enfrentamos"
        />
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Field label="Cards" noMargin />
          <button
            onClick={addCard}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-emerald-500 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar card
          </button>
        </div>

        {content.cards.map((card, i) => (
          <div
            key={i}
            className="rounded-2xl border border-ink-200/80 bg-ink-50/60 p-4 dark:border-ink-700 dark:bg-ink-900/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Card {i + 1}</span>
              <button
                onClick={() => removeCard(i)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              <Input
                value={card.titulo}
                onChange={(e) => updateCard(i, { titulo: e.target.value })}
                placeholder="Nome (ex: Doença, Crise)"
              />
              <textarea
                value={card.descricao}
                onChange={(e) => updateCard(i, { descricao: e.target.value })}
                placeholder="Descrição curta..."
                rows={2}
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[13px] text-ink-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white dark:focus:border-indigo-400 resize-y min-h-[60px] font-sans"
              />
              <Input
                value={card.referencia ?? ''}
                onChange={(e) => updateCard(i, { referencia: e.target.value })}
                placeholder="Referência bíblica (opcional)"
              />
            </div>
          </div>
        ))}

        {content.cards.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-300 py-8 text-center text-[12px] text-ink-400 dark:border-ink-600">
            Nenhum card. Clique em "Adicionar card" acima.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chamada ──────────────────────────────────────────────────────────────────

export function FormChamada({ content, onChange }: { content: SlideChamada; onChange: (c: SlideChamada) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Título">
        <Input
          value={content.titulo}
          onChange={(e) => onChange({ ...content, titulo: e.target.value })}
          placeholder="Ex: Hoje é o Dia de Crer"
        />
      </Field>
      <Field label="Texto">
        <textarea
          value={content.texto}
          onChange={(e) => onChange({ ...content, texto: e.target.value })}
          placeholder="Texto da chamada para ação..."
          rows={4}
          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[13px] text-ink-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white dark:focus:border-indigo-400 resize-y min-h-[60px] font-sans"
        />
      </Field>
      <Field label="Botão / CTA (opcional)">
        <Input
          value={content.cta ?? ''}
          onChange={(e) => onChange({ ...content, cta: e.target.value })}
          placeholder="Vamos orar"
        />
      </Field>
    </div>
  );
}

// ─── Oração ──────────────────────────────────────────────────────────────────

export function FormOracao({ content, onChange }: { content: SlideOracao; onChange: (c: SlideOracao) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Título (opcional)">
        <Input
          value={content.titulo ?? ''}
          onChange={(e) => onChange({ ...content, titulo: e.target.value })}
          placeholder="Ex: Oração de Entrega"
        />
      </Field>
      <Field label="Texto da oração">
        <textarea
          value={content.texto}
          onChange={(e) => onChange({ ...content, texto: e.target.value })}
          placeholder="Senhor, eu creio — ajuda-me na minha incredulidade..."
          rows={6}
          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[13px] text-ink-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white dark:focus:border-indigo-400 resize-y min-h-[60px] font-sans"
        />
      </Field>
    </div>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  noMargin,
}: {
  label: string;
  children?: React.ReactNode;
  noMargin?: boolean;
}) {
  return (
    <div className={cn(noMargin ? '' : 'space-y-1.5')}>
      <label className="block text-[11.5px] font-semibold text-ink-600 dark:text-ink-400">
        {label}
      </label>
      {children}
    </div>
  );
}
