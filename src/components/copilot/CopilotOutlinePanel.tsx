/**
 * CopilotOutlinePanel — Painel lateral que mostra o esboço
 * sendo construído automaticamente enquanto o usuário conversa.
 *
 * Desktop: painel fixo na direita
 * Mobile: bottom sheet (Drawer)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, ChevronUp, ChevronDown, Trash2, Plus, Clock,
  BookOpen, Target, MessageSquare, Users, FolderOpen,
  X, GripVertical, CheckCircle2, Sparkles,
} from 'lucide-react';
import { useCopilotOutlineStore } from '@/stores/copilotOutline';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui';
import { db } from '@/db/schema';
import { novaMensagem } from '@/types/mensagem';

interface CopilotOutlinePanelProps {
  /** Mostrar como bottom sheet (mobile) */
  asBottomSheet?: boolean;
  /** Callback quando o painel é fechado (bottom sheet) */
  onClose?: () => void;
}

export function CopilotOutlinePanel({ asBottomSheet = false, onClose }: CopilotOutlinePanelProps) {
  const store = useCopilotOutlineStore();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showPanel, setShowPanel] = useState(true);

  const hasContent = store.titulo || store.tema || store.pontos.length > 0;

  const handleIniciarPregacao = async () => {
    // Salva o esboço como mensagem no IndexedDB
    const mensagem = novaMensagem({
      titulo: store.titulo || 'Pregação em preparação',
      tema: store.tema,
      textoBase: store.textoBase,
      objetivo: store.objetivo,
      esboco: formatarEsbocoTexto(store),
      categoria: 'pregacao',
      status: 'rascunho',
    });
    await db.salvarMensagem(mensagem);
    navigate(`/pulpit/${mensagem.id}`);
  };

  const startEditing = (id: string, value: string) => {
    setEditingId(id);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (!editingId) return;
    switch (editingId) {
      case 'titulo': store.patchTitulo(editValue); break;
      case 'tema': store.patchTema(editValue); break;
      case 'objetivo': store.patchObjetivo(editValue); break;
      case 'textoBase': store.patchTextoBase(editValue); break;
      case 'publico': store.patchPublico(editValue); break;
      case 'serie': store.patchSerie(editValue); break;
      case 'introducao': store.patchIntroducao(editValue); break;
      case 'conclusao': store.patchConclusao(editValue); break;
      case 'resumo': store.patchResumo(editValue); break;
    }
    setEditingId(null);
  };

  const content = (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h2 className="text-[13px] font-semibold text-ink-900 dark:text-white">
            Copiloto de Pregação
          </h2>
          {hasContent && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              ●
            </span>
          )}
        </div>
        {!asBottomSheet && (
          <button
            onClick={() => setShowPanel(p => !p)}
            className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!hasContent ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {/* Campos principais */}
            <Section title="Título" icon={<BookOpen className="h-3.5 w-3.5" />} value={store.titulo} editingId={editingId} editValue={editValue} editingField="titulo"
              onEdit={startEditing} onChange={setEditValue} onSave={saveEdit} onCancel={() => setEditingId(null)} placeholder="Título da pregação" />
            <Section title="Texto Base" icon={<BookOpen className="h-3.5 w-3.5" />} value={store.textoBase} editingId={editingId} editValue={editValue} editingField="textoBase"
              onEdit={startEditing} onChange={setEditValue} onSave={saveEdit} onCancel={() => setEditingId(null)} placeholder="João 3:16" />
            <Section title="Tema" icon={<Target className="h-3.5 w-3.5" />} value={store.tema} editingId={editingId} editValue={editValue} editingField="tema"
              onEdit={startEditing} onChange={setEditValue} onSave={saveEdit} onCancel={() => setEditingId(null)} placeholder="Tema central" />
            <Section title="Objetivo" icon={<Target className="h-3.5 w-3.5" />} value={store.objetivo} editingId={editingId} editValue={editValue} editingField="objetivo"
              onEdit={startEditing} onChange={setEditValue} onSave={saveEdit} onCancel={() => setEditingId(null)} placeholder="Objetivo da mensagem" />
            <Section title="Público" icon={<Users className="h-3.5 w-3.5" />} value={store.publico} editingId={editingId} editValue={editValue} editingField="publico"
              onEdit={startEditing} onChange={setEditValue} onSave={saveEdit} onCancel={() => setEditingId(null)} placeholder="A quem se dirige?" />
            <Section title="Série" icon={<FolderOpen className="h-3.5 w-3.5" />} value={store.serie} editingId={editingId} editValue={editValue} editingField="serie"
              onEdit={startEditing} onChange={setEditValue} onSave={saveEdit} onCancel={() => setEditingId(null)} placeholder="Faz parte de uma série?" />

            {/* Introdução */}
            <Section title="Introdução" icon={<MessageSquare className="h-3.5 w-3.5" />} value={store.introducao} editingId={editingId} editValue={editValue} editingField="introducao"
              onEdit={startEditing} onChange={setEditValue} onSave={saveEdit} onCancel={() => setEditingId(null)} multiline placeholder="Conteúdo da introdução..." />

            {/* Pontos */}
            {store.pontos.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Pontos ({store.pontos.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {store.pontos.map((ponto, i) => (
                    <div key={ponto.id} className="rounded-xl border border-ink-200/60 bg-white dark:border-ink-700 dark:bg-ink-900/30">
                      <div className="flex items-start gap-2 px-3 py-2.5">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-white dark:bg-white dark:text-ink-900">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-ink-800 dark:text-ink-100">{ponto.texto}</p>
                          {ponto.subpontos.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {ponto.subpontos.map((sp, j) => (
                                <li key={j} className="flex items-start gap-1.5 text-[12px] text-ink-600 dark:text-ink-400">
                                  <span className="mt-1 text-[10px] text-ink-400">{String.fromCharCode(97 + j)})</span>
                                  <span>{sp}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {ponto.aplicacoes.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Aplicações:</span>
                              {ponto.aplicacoes.map((app, j) => (
                                <p key={j} className="text-[11.5px] text-emerald-700 dark:text-emerald-300">→ {app}</p>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-shrink-0 flex-col gap-0.5">
                          <button
                            onClick={() => i > 0 && store.reorderPontos(i, i - 1)}
                            disabled={i === 0}
                            className="rounded p-0.5 text-ink-400 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => i < store.pontos.length - 1 && store.reorderPontos(i, i + 1)}
                            disabled={i === store.pontos.length - 1}
                            className="rounded p-0.5 text-ink-400 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => store.removePonto(ponto.id)}
                            className="rounded p-0.5 text-ink-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conclusão */}
            <Section title="Conclusão" icon={<CheckCircle2 className="h-3.5 w-3.5" />} value={store.conclusao} editingId={editingId} editValue={editValue} editingField="conclusao"
              onEdit={startEditing} onChange={setEditValue} onSave={saveEdit} onCancel={() => setEditingId(null)} multiline placeholder="Resumo e chamado..." />

            {/* Resumo */}
            <Section title="Resumo" icon={<MessageSquare className="h-3.5 w-3.5" />} value={store.resumo} editingId={editingId} editValue={editValue} editingField="resumo"
              onEdit={startEditing} onChange={setEditValue} onSave={saveEdit} onCancel={() => setEditingId(null)} multiline placeholder="Resumo executivo..." />
          </div>
        )}
      </div>

      {/* Footer: ação + tempo */}
      <div className="border-t border-ink-200/70 px-4 py-3 dark:border-ink-800">
        <div className="mb-2 flex items-center justify-between text-[11px] text-ink-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {store.tempoEstimado > 0 ? `${store.tempoEstimado} min` : '—'}
          </span>
          {store.pontos.length > 0 && (
            <span>{store.pontos.length} ponto{store.pontos.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {hasContent && (
          <button
            onClick={handleIniciarPregacao}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-[13px] font-semibold text-white shadow-sm transition-all hover:from-amber-600 hover:to-orange-600 active:scale-[0.98]"
          >
            <Play className="h-4 w-4" fill="currentColor" />
            Iniciar Pregação
          </button>
        )}
      </div>
    </div>
  );

  if (asBottomSheet) {
    return (
      <>
        {/* Overlay */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowPanel(false); onClose?.(); }}
              className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
            />
          )}
        </AnimatePresence>
        {/* Sheet */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col rounded-t-3xl border-t border-ink-200/80 bg-paper dark:border-ink-800 dark:bg-ink-900 shadow-2xl md:hidden"
            >
              {/* Drag handle */}
              <div className="flex justify-center py-2">
                <div className="h-1 w-10 rounded-full bg-ink-200 dark:bg-ink-700" />
              </div>
              {content}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="flex h-full w-full flex-col border-l border-ink-200/70 bg-paper dark:border-ink-800 dark:bg-ink-900/20">
      {content}
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20">
        <Sparkles className="h-6 w-6 text-amber-400" />
      </div>
      <p className="text-[13px] font-medium text-ink-700 dark:text-ink-300">
        Esboço em construção
      </p>
      <p className="mt-1 text-[11.5px] text-ink-400 dark:text-ink-500">
        Converse com o Assistente Ministerial e o esboço será montado automaticamente.
      </p>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  value: string;
  editingId: string | null;
  editValue: string;
  editingField: string;
  onEdit: (field: string, value: string) => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  multiline?: boolean;
  placeholder?: string;
}

function Section({ title, icon, value, editingId, editValue, editingField, onEdit, onChange, onSave, onCancel, multiline, placeholder }: SectionProps) {
  const isEditing = editingId === editingField;

  if (isEditing) {
    return (
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
          {icon}
          {title}
        </div>
        {multiline ? (
          <textarea
            autoFocus
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onSave}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel();
              if (e.key === 'Enter' && e.ctrlKey) onSave();
            }}
            rows={3}
            placeholder={placeholder}
            className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-[13px] text-ink-900 outline-none focus:border-ink-900 dark:border-ink-600 dark:bg-ink-800 dark:text-white"
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder={placeholder}
            className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-[13px] text-ink-900 outline-none focus:border-ink-900 dark:border-ink-600 dark:bg-ink-800 dark:text-white"
          />
        )}
        <p className="mt-0.5 text-[10px] text-ink-400">Enter para salvar · Esc para cancelar</p>
      </div>
    );
  }

  if (!value) return null;

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
        {icon}
        {title}
      </div>
      <button
        onClick={() => onEdit(editingField, value)}
        className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-[13px] text-ink-800 transition-colors hover:border-ink-200 hover:bg-ink-50 dark:text-ink-100 dark:hover:border-ink-700 dark:hover:bg-ink-800/40"
      >
        {value}
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatarEsbocoTexto(store: ReturnType<typeof useCopilotOutlineStore.getState>): string {
  const linhas: string[] = [];
  if (store.titulo) linhas.push(`# ${store.titulo}`);
  if (store.textoBase) linhas.push(`Texto Base: ${store.textoBase}`);
  if (store.tema) linhas.push(`Tema: ${store.tema}`);
  if (store.objetivo) linhas.push(`Objetivo: ${store.objetivo}`);
  if (store.introducao) linhas.push(`\n## Introdução\n${store.introducao}`);
  store.pontos.forEach((p, i) => {
    linhas.push(`\n## ${i + 1}. ${p.texto}`);
    p.subpontos.forEach((sp, j) => linhas.push(`   ${String.fromCharCode(97 + j)}) ${sp}`));
    p.aplicacoes.forEach(app => linhas.push(`   → ${app}`));
  });
  if (store.conclusao) linhas.push(`\n## Conclusão\n${store.conclusao}`);
  return linhas.join('\n');
}
