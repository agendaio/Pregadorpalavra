/**
 * EditorPage — Página principal de edição de mensagens.
 *
 * Layout responsivo:
 *  - Mobile portrait: Header + Slide preview + Tab bar (Slides / Esboco / Detalhes / Obs)
 *  - Mobile landscape: Split — preview 50% | tab content 50%
 *  - Desktop: 3 colunas — outline | slides | meta
 *
 * Dados: store `useMensagensStore` (única fonte de verdade, auto-save 4s)
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save, Trash2, MoreVertical, Sparkles, Download,
  FileText, FileType2, FileCode, Loader2,
  Layers, ScrollText, Tag, StickyNote,
  Play, Mic, MicOff,
} from 'lucide-react';
import { useSpeechToText } from '@/lib/useSpeechToText';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/db/schema';
import { useMensagensStore } from '@/stores/mensagens';
import { useUIStore } from '@/stores/ui';
import { exportarMensagem, type FormatoExport } from '@/lib/exporters';
import { SlideEditor } from '@/components/slides/SlideEditor';
import { SlideRenderer } from '@/components/slides/SlideRenderer';
import { AIPanel } from '@/components/ai/AIPanel';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { RichEditor } from '@/components/editor/RichEditor';
import { useIsMobile, useIsLandscape, useIsDesktop } from '@/lib/responsive';
import { cn, formatarRelativo } from '@/lib/utils';
import { gerarSlides } from '@/lib/slideGenerator';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'slides',   label: 'Slides',    icon: Layers },
  { id: 'esboco',   label: 'Esboço',    icon: ScrollText },
  { id: 'detalhes', label: 'Detalhes',  icon: Tag },
  { id: 'obs',      label: 'Obs',       icon: StickyNote },
] as const;

type TabId = typeof TABS[number]['id'];

const STATUS_OPCOES = [
  { id: 'rascunho',  label: 'Rascunho' },
  { id: 'pronta',    label: 'Pronta' },
  { id: 'pregada',   label: 'Pregada' },
  { id: 'arquivada', label: 'Arquivada' },
] as const;

// ─── Sub-componentes ─────────────────────────────────────────────────────────

/** Preview do slide atual — aparece sempre no topo */
function SlidePreview({ mensagem, onClick }: { mensagem: import('@/types/mensagem').Mensagem; onClick: () => void }) {
  const slide = mensagem.slides[0];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl bg-[#0c0c14] shadow-lg"
      style={{ aspectRatio: '16/9' }}
      title="Tocar apresentação"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {slide ? (
          <SlideRenderer slide={slide} preview />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Layers className="h-7 w-7 text-white/40" />
            </div>
            <span className="text-[13px] font-medium text-white/40">Toque para criar slides</span>
          </div>
        )}
      </div>
      {/* Overlay play */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-5 w-5 text-white" />
        </div>
      </div>
    </button>
  );
}

/** Tab bar de navegação mobile */
function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <nav className="flex border-t border-ink-200/70 bg-white dark:border-ink-800 dark:bg-paper-dark ios-blur">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors',
            active === id
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-ink-400 active:bg-ink-50 dark:text-ink-500 dark:active:bg-ink-800/40',
          )}
        >
          <Icon className="h-5 w-5" />
          <span className="text-[10px] font-semibold">{label}</span>
        </button>
      ))}
    </nav>
  );
}

/** Painel de metadados da mensagem */
function MetaPanel({ mensagem, patch, micSupported, microphoneTarget, isListening, activateMicrophone, micOn }: {
  mensagem: import('@/types/mensagem').Mensagem;
  patch: (p: Partial<import('@/types/mensagem').Mensagem>) => void;
  micSupported: boolean;
  microphoneTarget: string | null;
  isListening: boolean;
  activateMicrophone: (target: string) => void;
  micOn: boolean;
}) {
  const [novaTag, setNovaTag] = useState('');

  const adicionarTag = () => {
    const t = novaTag.trim().toLowerCase();
    if (!t) return;
    if (!mensagem.tags.includes(t)) patch({ tags: [...mensagem.tags, t] });
    setNovaTag('');
  };

  const removerTag = (t: string) => patch({ tags: mensagem.tags.filter((x) => x !== x) });

  const micBtn = (target: string) => micSupported ? (
    <button
      type="button"
      onClick={() => activateMicrophone(target)}
      className={cn(
        'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-all',
        microphoneTarget === target && isListening
          ? 'bg-red-100 text-red-500 animate-pulse dark:bg-red-900/30'
          : 'text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800',
      )}
      title="Ditar"
    >
      {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
    </button>
  ) : null;

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label>Tema</Label>
            {micBtn('tema')}
          </div>
          <Input value={mensagem.tema} onChange={(e) => patch({ tema: e.target.value })} placeholder="Tema central" />
        </div>
        <div>
          <Label>Texto-base</Label>
          <Input value={mensagem.textoBase} onChange={(e) => patch({ textoBase: e.target.value })} placeholder="Romanos 8:28-30" />
        </div>
        <div>
          <Label>Livro bíblico</Label>
          <Input value={mensagem.livroBiblico} onChange={(e) => patch({ livroBiblico: e.target.value })} placeholder="Romanos…" />
        </div>
        <div>
          <Label>Série</Label>
          <Input value={mensagem.serie ?? ''} onChange={(e) => patch({ serie: e.target.value || null })} placeholder="Opcional" />
        </div>
        <div>
          <Label>Objetivo</Label>
          <Input value={mensagem.objetivo} onChange={(e) => patch({ objetivo: e.target.value })} placeholder="O que o ouvinte deve levar" />
        </div>
        <div>
          <Label>Público</Label>
          <Input value={mensagem.publico} onChange={(e) => patch({ publico: e.target.value })} placeholder="Igreja, jovens…" />
        </div>
        <div>
          <Label>Ocasião</Label>
          <Input value={mensagem.ocasiao} onChange={(e) => patch({ ocasiao: e.target.value })} placeholder="Culto…" />
        </div>
        <div>
          <Label>Tempo (min)</Label>
          <Input type="number" min={1} value={mensagem.tempoEstimado} onChange={(e) => patch({ tempoEstimado: Number(e.target.value) || 0 })} />
        </div>
      </div>

      {/* Status */}
      <div>
        <Label className="mb-2 block">Status</Label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPCOES.map((s) => (
            <button
              key={s.id}
              onClick={() => patch({ status: s.id })}
              className={cn(
                'rounded-full px-4 py-1.5 text-[12px] font-medium transition-all active:scale-95',
                mensagem.status === s.id
                  ? 'bg-violet-600 text-white'
                  : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label className="mb-2 block">Tags</Label>
        <div className="flex flex-wrap gap-1.5">
          {mensagem.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-0.5 text-[12px] text-ink-700 dark:bg-ink-800 dark:text-ink-200"
            >
              <Tag className="h-3 w-3" />
              {t}
              <button
                onClick={() => patch({ tags: mensagem.tags.filter((x) => x !== t) })}
                className="ml-0.5 text-ink-400 hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1 rounded-full border border-dashed border-ink-300 px-2.5 py-0.5 dark:border-ink-600">
            <input
              value={novaTag}
              onChange={(e) => setNovaTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionarTag()}
              onBlur={adicionarTag}
              placeholder="+ tag"
              className="w-20 bg-transparent text-[12px] outline-none placeholder:text-ink-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();
  const isDesktop = useIsDesktop();
  const mensagem = useMensagensStore((s) => s.atual);
  const carregar = useMensagensStore((s) => s.carregar);
  const limpar = useMensagensStore((s) => s.limpar);
  const patch = useMensagensStore((s) => s.patch);
  const salvar = useMensagensStore((s) => s.salvar);
  const iaAberta = useUIStore((s) => s.iaAberta);
  const setIA = useUIStore((s) => s.setIA);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const [tab, setTab] = useState<TabId>('slides');
  const [salvando, setSalvando] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [exportando, setExportando] = useState<FormatoExport | null>(null);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [showMeta, setShowMeta] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const ultimoEsbocoRef = useRef('');

  // Mic state
  const [microphoneTarget, setMicrophoneTarget] = useState<string | null>(null);

  const { isListening, isSupported: micSupported, toggle: toggleMic } = useSpeechToText({
    onTranscript: useCallback((text: string) => {
      if (!microphoneTarget || !mensagem) return;
      if (microphoneTarget === 'titulo') patch({ titulo: text });
      else if (microphoneTarget === 'esboco') patch({ esboco: text });
    }, [microphoneTarget, mensagem, patch]),
  });

  const activateMicrophone = (target: string) => {
    if (microphoneTarget === target && isListening) {
      toggleMic();
      setMicrophoneTarget(null);
      setMicOn(false);
    } else {
      if (microphoneTarget !== target && isListening) toggleMic();
      setMicrophoneTarget(target);
      if (!isListening) toggleMic();
      setMicOn(true);
    }
  };

  // Carrega mensagem ao montar
  useEffect(() => {
    if (id) carregar(id);
    return () => {
      void useMensagensStore.getState().flushSalvar();
      limpar();
    };
  }, [id, carregar, limpar]);

  // Auto-gera slides quando esboco muda e não há slides
  useEffect(() => {
    if (!mensagem) return;
    const esbocoAtual = mensagem.esboco || '';
    if (esbocoAtual === ultimoEsbocoRef.current) return;
    if ((mensagem.slides ?? []).length > 0) {
      ultimoEsbocoRef.current = esbocoAtual;
      return;
    }
    if (!esbocoAtual.trim()) return;
    ultimoEsbocoRef.current = esbocoAtual;
    try {
      const { slides } = gerarSlides({ mensagem });
      if (slides.length > 0) patch({ slides });
    } catch { /* ignore */ }
  }, [mensagem?.esboco, mensagem?.slides?.length]);

  // Indicador de salvamento
  useEffect(() => {
    if (!mensagem) return;
    const t = setTimeout(() => setSalvando(false), 4000);
    return () => clearTimeout(t);
  }, [mensagem?.atualizadoEm]);

  const patchComIndicador = (parcial: Parameters<typeof patch>[0]) => {
    setSalvando(true);
    patch(parcial);
  };

  const handleSalvar = async () => {
    setSalvando(true);
    await salvar();
    mostrarToast('Mensagem salva', 'sucesso');
    setSalvando(false);
  };

  const handleExcluir = async () => {
    if (!confirm('Excluir esta mensagem?')) return;
    await db.removerMensagem(mensagem!.id);
    mostrarToast('Mensagem excluída', 'sucesso');
    navigate('/biblioteca');
  };

  const handleExportar = async (formato: FormatoExport) => {
    setExportando(formato);
    setShowMenu(false);
    try {
      await exportarMensagem(mensagem!, formato);
      mostrarToast(`Exportado em ${formato.toUpperCase()}`, 'sucesso');
    } catch (e) {
      mostrarToast(`Erro: ${(e as Error).message}`, 'erro');
    } finally {
      setExportando(null);
    }
  };

  const handleGerarSlides = () => {
    if (!mensagem) return;
    ultimoEsbocoRef.current = mensagem.esboco || '';
    const { slides } = gerarSlides({ mensagem });
    patch({ slides: slides ?? [] });
  };

  /** Salva e navega pro púlpito — garante que edits estão persistidos */
  const navegarPulpit = async () => {
    setSalvando(true);
    await salvar(); // Salva imediatamente (sem debounce)
    navigate(`/pulpit/${mensagem!.id}`);
  };

  if (!mensagem) {
    return (
      <div className="flex h-full items-center justify-center text-ink-500 dark:text-ink-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-300 border-t-ink-900 dark:border-ink-700 dark:border-t-white" />
          <span className="text-[13px]">Carregando…</span>
        </div>
      </div>
    );
  }

  // ─── Mobile portrait: tabs + content ────────────────────────────────────────
  if (isMobile && !isLandscape) {
    return (
      <div className="flex h-full flex-col bg-paper dark:bg-paper-dark">
        {/* Header */}
        <MobileHeader
          title={mensagem.titulo || 'Sem título'}
          subtitle={salvando ? 'Salvando…' : `v${mensagem.versao}`}
          back={() => navigate('/biblioteca')}
          right={
            <>
              <button
                onClick={handleSalvar}
                aria-label="Salvar"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 active:bg-ink-200 dark:text-ink-200 dark:hover:bg-ink-800/60"
              >
                {salvando
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <Save className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                aria-label="Menu"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 active:bg-ink-200 dark:text-ink-200 dark:hover:bg-ink-800/60"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </>
          }
        />

        {/* Conteúdo — ocupa todo espaço restante */}
        <div className="flex-1 overflow-y-auto pb-20">
          {/* Preview sempre visível no topo */}
          <div className="px-4 pt-4">
            <SlidePreview
              mensagem={mensagem}
              onClick={navegarPulpit}
            />
          </div>

          {/* Tab: Slides */}
          <AnimatePresence mode="wait">
            {tab === 'slides' && (
              <motion.div
                key="slides"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="px-4 pt-4"
              >
                <SlideEditor
                  slides={mensagem.slides}
                  onChange={(slides) => patchComIndicador({ slides })}
                  mensagem={mensagem}
                  onGerarSlides={handleGerarSlides}
                  podeRegenerar
                />
              </motion.div>
            )}

            {/* Tab: Esboco */}
            {tab === 'esboco' && (
              <motion.div
                key="esboco"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-3 px-4 pt-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-semibold text-ink-900 dark:text-white">Esboço da pregação</h2>
                  <div className="flex gap-2">
                    {micSupported && (
                      <button
                        onClick={() => activateMicrophone('esboco')}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                          microphoneTarget === 'esboco' && isListening
                            ? 'bg-red-100 text-red-500 animate-pulse dark:bg-red-900/30'
                            : 'text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800',
                        )}
                        title="Ditar esboço"
                      >
                        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                      </button>
                    )}
                    <button
                      onClick={handleGerarSlides}
                      className="flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-violet-500 active:scale-95"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Gerar slides
                    </button>
                  </div>
                </div>
                <RichEditor
                  value={mensagem.esboco ?? ''}
                  onChange={(html) => patchComIndicador({ esboco: html })}
                  placeholder="Escreva aqui seu esboço… Use # para títulos, — para separadores, • para tópicos."
                />
              </motion.div>
            )}

            {/* Tab: Detalhes */}
            {tab === 'detalhes' && (
              <motion.div
                key="detalhes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <MetaPanel
                  mensagem={mensagem}
                  patch={patchComIndicador}
                  micSupported={micSupported}
                  microphoneTarget={microphoneTarget}
                  isListening={isListening}
                  activateMicrophone={activateMicrophone}
                  micOn={micOn}
                />
              </motion.div>
            )}

            {/* Tab: Obs */}
            {tab === 'obs' && (
              <motion.div
                key="obs"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-2 px-4 pt-4"
              >
                <h2 className="text-[14px] font-semibold text-ink-900 dark:text-white">Observações</h2>
                <Textarea
                  value={mensagem.observacoes ?? ''}
                  onChange={(e) => patchComIndicador({ observacoes: e.target.value })}
                  placeholder="Anotações só suas. Insights, dúvidas, próximas ações."
                  className="min-h-[200px]"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FAB Púlpito */}
        <a
          href={`/pulpit/${mensagem.id}`}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-[13px] font-semibold text-white shadow-lg transition hover:bg-violet-500 active:scale-95"
        >
          <Play className="h-4 w-4" />
          Púlpito
        </a>

        {/* Tab bar fixa no fundo */}
        <TabBar active={tab} onChange={setTab} />

        {/* Menu */}
        <BottomSheet open={showMenu} onClose={() => setShowMenu(false)} title="Ações">
          <div className="space-y-1 px-2 pb-4">
            <button onClick={() => { handleSalvar(); setShowMenu(false); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-[14px] transition-colors active:bg-ink-50 dark:active:bg-ink-800">
              <Save className="h-[18px] w-[18px] text-ink-700 dark:text-ink-200" /> Salvar agora
            </button>
            <button onClick={() => { setIA(true); setShowMenu(false); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-[14px] transition-colors active:bg-ink-50 dark:active:bg-ink-800">
              <Sparkles className="h-[18px] w-[18px] text-ink-700 dark:text-ink-200" /> Assistente IA
            </button>
            <div className="border-t border-ink-200/70 pt-1 dark:border-ink-800">
              <p className="px-4 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">Exportar</p>
              {([
                { fmt: 'pdf' as FormatoExport, icon: FileText, label: 'PDF' },
                { fmt: 'docx' as FormatoExport, icon: FileType2, label: 'Word' },
                { fmt: 'md' as FormatoExport, icon: FileCode, label: 'Markdown' },
              ]).map(({ fmt, icon: Icon, label }) => (
                <button
                  key={fmt}
                  onClick={() => { void handleExportar(fmt); }}
                  disabled={exportando !== null}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-[14px] transition-colors active:bg-ink-50 disabled:opacity-50 dark:active:bg-ink-800"
                >
                  {exportando === fmt ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Icon className="h-[18px] w-[18px]" />}
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => { handleExcluir(); setShowMenu(false); }} className="flex w-full items-center gap-3 rounded-xl border-t border-red-100 px-4 py-3.5 text-[14px] text-red-600 transition-colors active:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:active:bg-red-500/10">
              <Trash2 className="h-[18px] w-[18px]" /> Excluir mensagem
            </button>
          </div>
        </BottomSheet>

        {/* Bottom sheet IA */}
        {iaAberta && (
          <BottomSheet open={iaAberta} onClose={() => setIA(false)} title="Assistente" subtitle="Contexto carregado" height="full">
            <AIPanel showHeader={false} />
          </BottomSheet>
        )}
      </div>
    );
  }

  // ─── Mobile landscape: split view ─────────────────────────────────────────
  if (isMobile && isLandscape) {
    return (
      <div className="flex h-full flex-col bg-paper dark:bg-paper-dark">
        {/* Header compacta */}
        <div className="flex items-center gap-2 border-b border-ink-200/70 bg-white/80 px-3 py-2 dark:border-ink-800 dark:bg-ink-900/80 ios-blur">
          <button onClick={() => navigate('/biblioteca')} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <input
            value={mensagem.titulo}
            onChange={(e) => patchComIndicador({ titulo: e.target.value })}
            className="flex-1 bg-transparent text-[15px] font-semibold text-ink-900 outline-none dark:text-white"
            placeholder="Título"
          />
          <button onClick={handleSalvar} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">
            {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          </button>
          <button onClick={() => setShowMenu(!showMenu)} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        {/* Split: preview | tab content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Preview — esquerda */}
          <div className="flex w-1/2 flex-col overflow-hidden border-r border-ink-200/70 dark:border-ink-800">
            <div className="flex-1 overflow-y-auto p-3">
              <SlidePreview mensagem={mensagem} onClick={navegarPulpit} />
              <div className="mt-3 space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Slides</h3>
                <SlideEditor
                  slides={mensagem.slides}
                  onChange={(slides) => patchComIndicador({ slides })}
                  mensagem={mensagem}
                  onGerarSlides={handleGerarSlides}
                  podeRegenerar
                />
              </div>
            </div>
          </div>

          {/* Tab content — direita */}
          <div className="flex w-1/2 flex-col">
            <TabBar active={tab} onChange={setTab} />
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {tab === 'esboco' && (
                  <motion.div key="esboco" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-[13px] font-semibold text-ink-900 dark:text-white">Esboço</h3>
                      <button onClick={handleGerarSlides} className="flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white">
                        <Sparkles className="h-3 w-3" /> Gerar
                      </button>
                    </div>
                    <RichEditor
                      value={mensagem.esboco ?? ''}
                      onChange={(html) => patchComIndicador({ esboco: html })}
                      placeholder="Escreva seu esboço…"
                    />
                  </motion.div>
                )}
                {tab === 'detalhes' && (
                  <motion.div key="detalhes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <MetaPanel
                      mensagem={mensagem}
                      patch={patchComIndicador}
                      micSupported={micSupported}
                      microphoneTarget={microphoneTarget}
                      isListening={isListening}
                      activateMicrophone={activateMicrophone}
                      micOn={micOn}
                    />
                  </motion.div>
                )}
                {tab === 'obs' && (
                  <motion.div key="obs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3">
                    <Textarea
                      value={mensagem.observacoes ?? ''}
                      onChange={(e) => patchComIndicador({ observacoes: e.target.value })}
                      placeholder="Observações…"
                      className="min-h-full"
                    />
                  </motion.div>
                )}
                {tab === 'slides' && (
                  <motion.div key="slides-placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full items-center justify-center p-6 text-center">
                    <div>
                      <Layers className="mx-auto mb-3 h-10 w-10 text-ink-300 dark:text-ink-600" />
                      <p className="text-[13px] font-medium text-ink-400">Os slides aparecem na coluna da esquerda</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <BottomSheet open={showMenu} onClose={() => setShowMenu(false)} title="Ações">
          <div className="space-y-1 px-2 pb-4">
            <button onClick={() => { handleSalvar(); setShowMenu(false); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-[14px] active:bg-ink-50 dark:active:bg-ink-800">
              <Save className="h-[18px] w-[18px]" /> Salvar
            </button>
            <button onClick={() => { handleExcluir(); setShowMenu(false); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-[14px] text-red-600 active:bg-red-50 dark:text-red-400 dark:active:bg-red-500/10">
              <Trash2 className="h-[18px] w-[18px]" /> Excluir
            </button>
          </div>
        </BottomSheet>
      </div>
    );
  }

  // ─── Desktop: 3 colunas ────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col bg-paper dark:bg-paper-dark">
      {/* Header desktop */}
      <div className="flex items-center gap-3 border-b border-ink-200/70 bg-white/80 px-5 py-3 dark:border-ink-800 dark:bg-ink-900/80 ios-blur">
        <button onClick={() => navigate('/biblioteca')} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <input
          value={mensagem.titulo}
          onChange={(e) => patchComIndicador({ titulo: e.target.value })}
          className="flex-1 bg-transparent text-[18px] font-semibold tracking-[-0.018em] text-ink-900 outline-none dark:text-white"
          placeholder="Título da mensagem"
        />
        <div className="flex items-center gap-1 text-[12px] text-ink-400">
          {salvando ? (
            <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…</span>
          ) : (
            <span>Atualizada {formatarRelativo(mensagem.atualizadoEm)} · v{mensagem.versao}</span>
          )}
        </div>
        <button onClick={handleSalvar} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 active:bg-ink-200 dark:text-ink-200 dark:hover:bg-ink-800">
          <Save className="h-5 w-5" />
        </button>
        <button onClick={() => setIA(!iaAberta)} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">
          {iaAberta ? <Sparkles className="h-5 w-5 text-violet-600" /> : <Sparkles className="h-5 w-5" />}
        </button>
        <button onClick={() => setShowMenu(!showMenu)} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {/* 3 colunas: esboco | slides | meta */}
      <div className="flex flex-1 overflow-hidden">
        {/* Coluna 1: Esboco */}
        <div className="flex w-72 flex-shrink-0 flex-col border-r border-ink-200/70 overflow-y-auto dark:border-ink-800">
          <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
            <h2 className="text-[13px] font-semibold text-ink-900 dark:text-white">Esboço</h2>
            <div className="flex gap-2">
              {micSupported && (
                <button
                  onClick={() => activateMicrophone('esboco')}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                    microphoneTarget === 'esboco' && isListening
                      ? 'bg-red-100 text-red-500 animate-pulse dark:bg-red-900/30'
                      : 'text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800',
                  )}
                >
                  {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={handleGerarSlides}
                className="flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-violet-500"
              >
                <Sparkles className="h-3.5 w-3.5" /> Gerar slides
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <RichEditor
              value={mensagem.esboco ?? ''}
              onChange={(html) => patchComIndicador({ esboco: html })}
              placeholder="Escreva aqui seu esboço… Use # para capítulos, ## para subcapítulos."
            />
          </div>
        </div>

        {/* Coluna 2: Slides (centro,弹性) */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Preview */}
          <div className="border-b border-ink-200/70 p-4 dark:border-ink-800">
            <SlidePreview mensagem={mensagem} onClick={navegarPulpit} />
          </div>
          {/* Editor de slides */}
          <div className="flex-1 overflow-y-auto p-4">
            <SlideEditor
              slides={mensagem.slides}
              onChange={(slides) => patchComIndicador({ slides })}
              mensagem={mensagem}
              onGerarSlides={handleGerarSlides}
              podeRegenerar
            />
          </div>
        </div>

        {/* Coluna 3: Meta */}
        <div className="flex w-72 flex-shrink-0 flex-col overflow-y-auto border-l border-ink-200/70 dark:border-ink-800">
          <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
            <h2 className="text-[13px] font-semibold text-ink-900 dark:text-white">Detalhes</h2>
            <button
              onClick={() => setShowMeta(!showMeta)}
              className="text-[12px] text-violet-600 hover:underline dark:text-violet-400"
            >
              {showMeta ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {showMeta && (
            <MetaPanel
              mensagem={mensagem}
              patch={patchComIndicador}
              micSupported={micSupported}
              microphoneTarget={microphoneTarget}
              isListening={isListening}
              activateMicrophone={activateMicrophone}
              micOn={micOn}
            />
          )}
          <div className="border-t border-ink-200/70 p-4 dark:border-ink-800">
            <h3 className="mb-2 text-[13px] font-semibold text-ink-900 dark:text-white">Observações</h3>
            <Textarea
              value={mensagem.observacoes ?? ''}
              onChange={(e) => patchComIndicador({ observacoes: e.target.value })}
              placeholder="Anotações pessoais…"
              className="min-h-[120px]"
            />
          </div>
        </div>

        {/* Painel IA (direita, desliza) */}
        {iaAberta && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 overflow-hidden border-l border-ink-200/70 bg-paper dark:border-ink-800 dark:bg-paper-dark"
          >
            <div className="h-full w-[400px]">
              <AIPanel />
            </div>
          </motion.aside>
        )}
      </div>

      {/* FAB Púlpito desktop */}
      <a
        href={`/pulpit/${mensagem.id}`}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3.5 text-[13px] font-semibold text-white shadow-lg transition hover:bg-violet-500 active:scale-95"
      >
        <Play className="h-4 w-4" /> Modo Púlpito
      </a>

      <BottomSheet open={showMenu} onClose={() => setShowMenu(false)} title="Ações">
        <div className="space-y-1 px-2 pb-4">
          {([
            { fmt: 'pdf' as FormatoExport, icon: FileText, label: 'Exportar PDF' },
            { fmt: 'docx' as FormatoExport, icon: FileType2, label: 'Exportar Word' },
            { fmt: 'md' as FormatoExport, icon: FileCode, label: 'Exportar Markdown' },
          ]).map(({ fmt, icon: Icon, label }) => (
            <button
              key={fmt}
              onClick={() => { void handleExportar(fmt); }}
              disabled={exportando !== null}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-[14px] active:bg-ink-50 disabled:opacity-50 dark:active:bg-ink-800"
            >
              {exportando === fmt ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Icon className="h-[18px] w-[18px]" />}
              {label}
            </button>
          ))}
          <button onClick={() => { handleExcluir(); setShowMenu(false); }} className="flex w-full items-center gap-3 rounded-xl border-t border-red-100 px-4 py-3.5 text-[14px] text-red-600 active:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:active:bg-red-500/10">
            <Trash2 className="h-[18px] w-[18px]" /> Excluir mensagem
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
