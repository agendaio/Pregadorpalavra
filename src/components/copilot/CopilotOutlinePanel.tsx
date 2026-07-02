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
  X, GripVertical, CheckCircle2, Sparkles, Layout,
  Maximize2, Minimize2, AlignLeft,
} from 'lucide-react';
import { useCopilotOutlineStore } from '@/stores/copilotOutline';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui';
import { db } from '@/db/schema';
import { novaMensagem } from '@/types/mensagem';
import { gerarSlides } from '@/lib/slideGenerator';

interface CopilotOutlinePanelProps {
  /** Mostrar como bottom sheet (mobile) */
  asBottomSheet?: boolean;
  /** Callback quando o painel é fechado (bottom sheet) */
  onClose?: () => void;
  /** Callback para mudar a pasta — abre o FolderPicker */
  onChangeFolder?: () => void;
}

export function CopilotOutlinePanel({ asBottomSheet = false, onClose, onChangeFolder }: CopilotOutlinePanelProps) {
  const store = useCopilotOutlineStore();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showPanel, setShowPanel] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

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
    
    // Gera slides automaticamente a partir do esboço
    const { slides } = gerarSlides({ mensagem });
    mensagem.slides = slides;
    
    await db.salvarMensagem(mensagem);
    
    // Se tem slides, vai pro editor primeiro pra revisar/editar
    if (slides.length > 0) {
      navigate(`/editar/${mensagem.id}`);
    } else {
      navigate(`/pulpit/${mensagem.id}`);
    }
  };

  const startEditing = (id: string, value: string) => {
    setEditingId(id);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (!editingId) return;
    switch (editingId) {
      case 'titulo': store.patchTitulo(editValue); break;
      case 'subtitulo': store.patchSubtitulo(editValue); break;
      case 'tema': store.patchTema(editValue); break;
      case 'objetivo': store.patchObjetivo(editValue); break;
      case 'textoBase': store.patchTextoBase(editValue); break;
      case 'publico': store.patchPublico(editValue); break;
      case 'serie': store.patchSerie(editValue); break;
      case 'introducao': store.patchIntroducao(editValue); break;
      case 'conclusao': store.patchConclusao(editValue); break;
      case 'resumo': store.patchResumo(editValue); break;
      default: {
        // Formato "ponto_<uuid>" para edição de ponto
        if (editingId?.startsWith('ponto_')) {
          const pontoId = editingId.replace('ponto_', '');
          store.patchPonto(pontoId, editValue);
        }
        break;
      }
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
        {/* Info da pasta selecionada */}
        {store.pastaNome ? (
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{
                backgroundColor: (store.pastaCor ?? '#7c3aed') + '18',
                color: store.pastaCor ?? '#7c3aed',
                border: `1px solid ${(store.pastaCor ?? '#7c3aed')}30`,
              }}
            >
              <FolderOpen className="h-3 w-3" />
              {store.pastaNome}
            </div>
            {onChangeFolder && (
              <button
                onClick={onChangeFolder}
                title="Mudar pasta"
                className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                <ChevronUp className="h-3 w-3 rotate-180" />
              </button>
            )}
          </div>
        ) : (
          onChangeFolder && (
            <button
              onClick={onChangeFolder}
              className="flex items-center gap-1 rounded-full border border-dashed border-ink-300 px-2.5 py-1 text-[11px] text-ink-400 transition-colors hover:border-violet-300 hover:text-violet-600 dark:border-ink-600 dark:hover:border-violet-600 dark:hover:text-violet-400"
            >
              <FolderOpen className="h-3 w-3" />
              Escolher pasta
            </button>
          )
        )}
        {!asBottomSheet && (
          <button
            onClick={() => setFullscreen(f => !f)}
            className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
            title={fullscreen ? 'Modo normal' : 'Tela cheia'}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}
        {(onClose || asBottomSheet) && (
          <button
            onClick={() => onClose?.()}
            className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
            title="Fechar painel"
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
            <Section title="Subtítulo" icon={<AlignLeft className="h-3.5 w-3.5" />} value={store.subtitulo} editingId={editingId} editValue={editValue} editingField="subtitulo"
              onEdit={startEditing} onChange={setEditValue} onSave={saveEdit} onCancel={() => setEditingId(null)} placeholder="Subtítulo (opcional)" />
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
                    <div key={ponto.id} className="rounded-xl border border-ink-200/60 bg-white dark:border-ink-700 dark:bg-sky-50/50">
                      <div className="flex items-start gap-2 px-3 py-2.5">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-white dark:bg-white dark:text-ink-900">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-ink-800 dark:text-sky-900">{ponto.texto}</p>
                          {ponto.subpontos.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {ponto.subpontos.map((sp, j) => (
                                <li key={j} className="flex items-start gap-1.5 text-[12px] text-ink-600 dark:text-sky-700">
                                  <span className="mt-1 text-[10px] text-sky-500">{String.fromCharCode(97 + j)})</span>
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
          <div className="flex gap-2">
            <button
              onClick={handleIniciarPregacao}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-[13px] font-semibold text-white shadow-sm transition-all hover:from-amber-600 hover:to-orange-600 active:scale-[0.98]"
            >
              <Layout className="h-4 w-4" />
              Editar Slides
            </button>
            <button
              onClick={async () => {
                // Salva rapidamente e vai direto pro púlpito
                const mensagem = novaMensagem({
                  titulo: store.titulo || 'Pregação',
                  tema: store.tema,
                  textoBase: store.textoBase,
                  objetivo: store.objetivo,
                  esboco: formatarEsbocoTexto(store),
                  categoria: 'pregacao',
                  status: 'rascunho',
                });
                const { slides } = gerarSlides({ mensagem });
                mensagem.slides = slides;
                await db.salvarMensagem(mensagem);
                navigate(`/pulpit/${mensagem.id}`);
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-4 py-3 text-[13px] font-semibold text-white shadow-sm transition-all hover:from-emerald-600 hover:to-cyan-700 active:scale-[0.98]"
            >
              <Play className="h-4 w-4" fill="currentColor" />
              Apresentar
            </button>
          </div>
        )}
      </div>
    </div>
  );

  {/* ─── MODO TELA CHEIA ─────────────────────────────────────────── */}
  <AnimatePresence>
    {fullscreen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col"
        style={{ background: 'linear-gradient(180deg, #f8f7f4 0%, #f4f3f0 100%)' }}
      >
        {/* Header da tela cheia */}
        <div className="flex items-center justify-between border-b border-ink-200/60 bg-white/80 px-6 py-3 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/80">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span className="font-semibold text-ink-800 dark:text-white">Editor de Pregação</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFullscreen(false)}
              className="flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
            >
              <Minimize2 className="h-4 w-4" />
              Minimizar
            </button>
          </div>
        </div>

        {/* Corpo da tela cheia */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Área do título grande */}
          <div className="flex-shrink-0 border-b border-ink-200/50 bg-white px-6 py-6 dark:border-ink-800 dark:bg-ink-900/50">
            {/* Título grande */}
            <div className="mb-3">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                Título
              </label>
              {editingId === 'titulo' ? (
                <input
                  autoFocus
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                  placeholder="Título da pregação..."
                  className="w-full bg-transparent text-[28px] font-bold leading-tight text-ink-900 placeholder:text-ink-300 outline-none dark:text-white"
                />
              ) : (
                <button
                  onClick={() => startEditing('titulo', store.titulo)}
                  className="w-full text-left text-[28px] font-bold leading-tight text-ink-900 placeholder:text-ink-300 hover:text-ink-600 dark:text-white dark:hover:text-ink-300"
                >
                  {store.titulo || <span className="text-ink-300">Título da pregação...</span>}
                </button>
              )}
            </div>

            {/* Subtítulo */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                Subtítulo
              </label>
              {editingId === 'subtitulo' ? (
                <input
                  autoFocus
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                  placeholder="Subtítulo (opcional)"
                  className="w-full bg-transparent text-[18px] leading-relaxed text-ink-600 placeholder:text-ink-300 outline-none dark:text-ink-400"
                />
              ) : (
                <button
                  onClick={() => startEditing('subtitulo', store.subtitulo)}
                  className="w-full text-left text-[18px] leading-relaxed text-ink-600 placeholder:text-ink-300 hover:text-ink-400 dark:text-ink-400 dark:hover:text-ink-300"
                >
                  {store.subtitulo || <span className="text-ink-300">Subtítulo (opcional)...</span>}
                </button>
              )}
            </div>
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-6">
              {/* Texto Base */}
              <FullscreenField
                label="Texto Base" icon={<BookOpen className="h-4 w-4" />}
                value={store.textoBase}
                editingId={editingId} editValue={editValue} editingField="textoBase"
                startEdit={startEditing} setEditValue={setEditValue} saveEdit={saveEdit} cancelEdit={() => setEditingId(null)}
                placeholder="João 3:16 — Porque Deus amou o mundo..."
              />
              {/* Tema */}
              <FullscreenField
                label="Tema Central" icon={<Target className="h-4 w-4" />}
                value={store.tema}
                editingId={editingId} editValue={editValue} editingField="tema"
                startEdit={startEditing} setEditValue={setEditValue} saveEdit={saveEdit} cancelEdit={() => setEditingId(null)}
                placeholder="Qual o tema central da mensagem?"
              />
              {/* Objetivo */}
              <FullscreenField
                label="Objetivo" icon={<Target className="h-4 w-4" />}
                value={store.objetivo}
                editingId={editingId} editValue={editValue} editingField="objetivo"
                startEdit={startEditing} setEditValue={setEditValue} saveEdit={saveEdit} cancelEdit={() => setEditingId(null)}
                placeholder="O que o pregador quer que o povo leve?"
              />
              {/* Introdução */}
              <FullscreenField
                label="Introdução" icon={<MessageSquare className="h-4 w-4" />}
                value={store.introducao}
                editingId={editingId} editValue={editValue} editingField="introducao"
                startEdit={startEditing} setEditValue={setEditValue} saveEdit={saveEdit} cancelEdit={() => setEditingId(null)}
                multiline placeholder="Contextualize o tema para a congregação..."
              />
              {/* Pontos */}
              {store.pontos.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      Pontos ({store.pontos.length})
                    </span>
                  </div>
                  <div className="space-y-3">
                    {store.pontos.map((ponto, i) => (
                      <FullscreenPontoCard
                        key={ponto.id}
                        ponto={ponto}
                        index={i}
                        editingId={editingId}
                        editValue={editValue}
                        startEdit={startEditing}
                        setEditValue={setEditValue}
                        saveEdit={saveEdit}
                        cancelEdit={() => setEditingId(null)}
                        onReorderUp={() => i > 0 && store.reorderPontos(i, i - 1)}
                        onReorderDown={() => i < store.pontos.length - 1 && store.reorderPontos(i, i + 1)}
                        onRemove={() => store.removePonto(ponto.id)}
                        canReorderUp={i > 0}
                        canReorderDown={i < store.pontos.length - 1}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* Conclusão */}
              <FullscreenField
                label="Conclusão" icon={<CheckCircle2 className="h-4 w-4" />}
                value={store.conclusao}
                editingId={editingId} editValue={editValue} editingField="conclusao"
                startEdit={startEditing} setEditValue={setEditValue} saveEdit={saveEdit} cancelEdit={() => setEditingId(null)}
                multiline placeholder="Resumo e chamado para ação..."
              />
              {/* Resumo */}
              <FullscreenField
                label="Resumo" icon={<MessageSquare className="h-4 w-4" />}
                value={store.resumo}
                editingId={editingId} editValue={editValue} editingField="resumo"
                startEdit={startEditing} setEditValue={setEditValue} saveEdit={saveEdit} cancelEdit={() => setEditingId(null)}
                multiline placeholder="Resumo executivo da pregação..."
              />
            </div>
          </div>

          {/* Footer da tela cheia */}
          <div className="flex-shrink-0 border-t border-ink-200/60 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-[12px] text-ink-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {store.tempoEstimado > 0 ? `${store.tempoEstimado} min` : '—'}
                </span>
                {store.pontos.length > 0 && (
                  <span>{store.pontos.length} ponto{store.pontos.length !== 1 ? 's' : ''}</span>
                )}
                {store.textoBase && (
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 dark:bg-ink-800">{store.textoBase}</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const mensagem = novaMensagem({
                      titulo: store.titulo || 'Pregação',
                      tema: store.tema,
                      textoBase: store.textoBase,
                      objetivo: store.objetivo,
                      esboco: formatarEsbocoTexto(store),
                      categoria: 'pregacao',
                      status: 'rascunho',
                    });
                    const { slides } = gerarSlides({ mensagem });
                    mensagem.slides = slides;
                    db.salvarMensagem(mensagem);
                    navigate(`/editar/${mensagem.id}`);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:from-amber-600 hover:to-orange-600 active:scale-[0.98]"
                >
                  <Layout className="h-4 w-4" />
                  Editar Slides
                </button>
                <button
                  onClick={() => {
                    const mensagem = novaMensagem({
                      titulo: store.titulo || 'Pregação',
                      tema: store.tema,
                      textoBase: store.textoBase,
                      objetivo: store.objetivo,
                      esboco: formatarEsbocoTexto(store),
                      categoria: 'pregacao',
                      status: 'rascunho',
                    });
                    const { slides } = gerarSlides({ mensagem });
                    mensagem.slides = slides;
                    db.salvarMensagem(mensagem);
                    navigate(`/pulpit/${mensagem.id}`);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:from-emerald-600 hover:to-cyan-700 active:scale-[0.98]"
                >
                  <Play className="h-4 w-4" fill="currentColor" />
                  Apresentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>

  {/* ─── MODO NORMAL / BOTTOM SHEET ───────────────────────────────── */}
  if (asBottomSheet) {
    return (
      <>
        {/* Overlay — acima da barra de navegação (z-40) pra não vazar clique nela */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowPanel(false); onClose?.(); }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            />
          )}
        </AnimatePresence>
        {/* Sheet — quase tela cheia, sempre acima da barra de navegação inferior
            (mesma z-40 do BottomNav causava sobreposição imprevisível dos
            botões "Editar Slides"/"Apresentar" com o menu) */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 top-[max(env(safe-area-inset-top),16px)] z-50 flex flex-col overflow-hidden rounded-t-3xl border-t border-ink-200/80 bg-paper pb-safe dark:border-ink-800 dark:bg-sky-50 shadow-2xl md:hidden"
            >
              {/* Drag handle */}
              <div className="flex flex-shrink-0 justify-center py-2">
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
    <div className="flex h-full w-full flex-col border-l border-ink-200/70 bg-paper dark:border-ink-800 dark:bg-sky-50/80">
      {content}
    </div>
  );
}

// ─── Subcomponentes de tela cheia ─────────────────────────────────────────

interface FullscreenFieldProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  editingId: string | null;
  editValue: string;
  editingField: string;
  startEdit: (field: string, value: string) => void;
  setEditValue: (v: string) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  multiline?: boolean;
  placeholder?: string;
}

function FullscreenField({
  label, icon, value, editingId, editValue, editingField,
  startEdit, setEditValue, saveEdit, cancelEdit, multiline, placeholder,
}: FullscreenFieldProps) {
  const isEditing = editingId === editingField;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {icon}
        {label}
      </div>
      {isEditing ? (
        multiline ? (
          <textarea
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={e => {
              if (e.key === 'Escape') cancelEdit();
              if (e.key === 'Enter' && e.ctrlKey) saveEdit();
            }}
            rows={4}
            placeholder={placeholder}
            className="w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[15px] leading-relaxed text-ink-900 placeholder:text-ink-300 outline-none focus:border-amber-400 dark:border-ink-600 dark:bg-ink-800 dark:text-white"
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            placeholder={placeholder}
            className="w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[16px] text-ink-900 placeholder:text-ink-300 outline-none focus:border-amber-400 dark:border-ink-600 dark:bg-ink-800 dark:text-white"
          />
        )
      ) : (
        <button
          onClick={() => startEdit(editingField, value)}
          className="w-full rounded-xl border border-transparent px-4 py-3 text-left text-[15px] text-ink-700 transition-colors hover:border-ink-200 hover:bg-ink-50 dark:text-ink-300 dark:hover:border-ink-700 dark:hover:bg-ink-800"
        >
          {value || <span className="text-ink-300">{placeholder}</span>}
        </button>
      )}
    </div>
  );
}

interface FullscreenPontoCardProps {
  ponto: { id: string; texto: string; subpontos: string[]; aplicacoes: string[] };
  index: number;
  editingId: string | null;
  editValue: string;
  startEdit: (field: string, value: string) => void;
  setEditValue: (v: string) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  onReorderUp: () => void;
  onReorderDown: () => void;
  onRemove: () => void;
  canReorderUp: boolean;
  canReorderDown: boolean;
}

function FullscreenPontoCard({
  ponto, index, editingId, editValue,
  startEdit, setEditValue, saveEdit, cancelEdit,
  onReorderUp, onReorderDown, onRemove,
  canReorderUp, canReorderDown,
}: FullscreenPontoCardProps) {
  const isEditingPonto = editingId === `ponto_${ponto.id}`;
  return (
    <div className="rounded-2xl border border-ink-200 bg-white shadow-sm dark:border-ink-700 dark:bg-ink-900/50">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[14px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          {isEditingPonto ? (
            <textarea
              autoFocus
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={e => {
                if (e.key === 'Escape') cancelEdit();
                if (e.key === 'Enter' && e.ctrlKey) saveEdit();
              }}
              rows={3}
              className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-[15px] leading-relaxed text-ink-900 outline-none focus:border-amber-400 dark:border-ink-600 dark:bg-ink-800 dark:text-white"
            />
          ) : (
            <button
              onClick={() => startEdit(`ponto_${ponto.id}`, ponto.texto)}
              className="w-full text-left text-[15px] font-semibold text-ink-800 hover:text-ink-600 dark:text-ink-100 dark:hover:text-ink-300"
            >
              {ponto.texto}
            </button>
          )}
          {ponto.subpontos.length > 0 && (
            <ul className="mt-2 space-y-1 pl-2">
              {ponto.subpontos.map((sp, j) => (
                <li key={j} className="flex items-start gap-2 text-[13px] text-ink-500 dark:text-ink-400">
                  <span className="mt-0.5 text-[10px] text-ink-400">{String.fromCharCode(97 + j)})</span>
                  <span>{sp}</span>
                </li>
              ))}
            </ul>
          )}
          {ponto.aplicacoes.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Aplicações:</span>
              {ponto.aplicacoes.map((app, j) => (
                <p key={j} className="text-[12.5px] text-emerald-700 dark:text-emerald-300">→ {app}</p>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-col gap-1">
          <button onClick={onReorderUp} disabled={!canReorderUp} className="rounded p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-20 dark:hover:bg-ink-800">
            <ChevronUp className="h-4 w-4" />
          </button>
          <button onClick={onReorderDown} disabled={!canReorderDown} className="rounded p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-20 dark:hover:bg-ink-800">
            <ChevronDown className="h-4 w-4" />
          </button>
          <button onClick={onRemove} className="rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
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
      <p className="text-[13px] font-medium text-ink-700 dark:text-sky-700">
        Esboço em construção
      </p>
      <p className="mt-1 text-[11.5px] text-ink-400 dark:text-sky-600">
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
        className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-[13px] text-ink-800 transition-colors hover:border-ink-200 hover:bg-ink-50 dark:text-sky-900 dark:hover:border-sky-300 dark:hover:bg-sky-100"
      >
        {value}
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatarEsbocoTexto(store: ReturnType<typeof useCopilotOutlineStore.getState>): string {
  const linhas: string[] = [];
  if (store.titulo) linhas.push(`<h1>${store.titulo}</h1>`);
  if (store.subtitulo) linhas.push(`<h2>${store.subtitulo}</h2>`);
  if (store.textoBase) linhas.push(`<p><strong>Texto Base:</strong> ${store.textoBase}</p>`);
  if (store.tema) linhas.push(`<p><strong>Tema:</strong> ${store.tema}</p>`);
  if (store.objetivo) linhas.push(`<p><strong>Objetivo:</strong> ${store.objetivo}</p>`);
  if (store.introducao) linhas.push(`<h2>Introdução</h2><p>${store.introducao}</p>`);
  store.pontos.forEach((p, i) => {
    linhas.push(`<h2>${i + 1}. ${p.texto}</h2>`);
    p.subpontos.forEach((sp, j) => linhas.push(`<h3>${String.fromCharCode(97 + j)}) ${sp}</h3>`));
    p.aplicacoes.forEach(app => linhas.push(`<p>→ ${app}</p>`));
  });
  if (store.conclusao) linhas.push(`<h2>Conclusão</h2><p>${store.conclusao}</p>`);
  return linhas.join('');
}
