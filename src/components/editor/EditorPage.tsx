import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Save,
  Trash2,
  Tag as TagIcon,
  Plus,
  X,
  Sparkles,
  PanelRightOpen,
  PanelRightClose,
  MoreVertical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/db/schema';
import { useMensagensStore } from '@/stores/mensagens';
import { useUIStore } from '@/stores/ui';
import { RichEditor } from '@/components/editor/RichEditor';
import { SlideEditor } from '@/components/slides/SlideEditor';
import { AIPanel } from '@/components/ai/AIPanel';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PulpitFab } from '@/components/layout/PulpitFab';
import { useIsMobile } from '@/lib/responsive';
import { cn, formatarRelativo } from '@/lib/utils';
import { SPRING_IOS } from '@/lib/motion';

const STATUS_OPCOES = [
  { id: 'rascunho',  label: 'Rascunho' },
  { id: 'pronta',    label: 'Pronta' },
  { id: 'pregada',   label: 'Pregada' },
  { id: 'arquivada', label: 'Arquivada' },
] as const;

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mensagem = useMensagensStore((s) => s.atual);
  const carregar = useMensagensStore((s) => s.carregar);
  const limpar = useMensagensStore((s) => s.limpar);
  const patch = useMensagensStore((s) => s.patch);
  const salvar = useMensagensStore((s) => s.salvar);
  const iaAberta = useUIStore((s) => s.iaAberta);
  const setIA = useUIStore((s) => s.setIA);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const [novaTag, setNovaTag] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [showMeta, setShowMeta] = useState(!isMobile);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (id) carregar(id);
    return () => limpar();
  }, [id, carregar, limpar]);

  // Auto-save com debounce de 4 segundos (já tratado pelo store via salvarDebounced)
  // Removido daqui para evitar dupla execução — o store já dispara salvarDebounced no patchComIndicador()

  // Indicador de salvamento automático
  useEffect(() => {
    if (!mensagem) return;
    const t = setTimeout(() => {
      setSalvando(false);
    }, 4000); // Reseta o indicador 4s após última edição
    return () => clearTimeout(t);
  }, [mensagem?.atualizadoEm]);

  // Wrapper do patch que também ativa o indicador
  const patchComIndicador = (parcial: Parameters<typeof patch>[0]) => {
    setSalvando(true);
    patchComIndicador(parcial);
  };

  if (!mensagem) {
    return (
      <div className="flex h-full items-center justify-center text-ink-500 dark:text-ink-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-300 border-t-ink-900 dark:border-ink-700 dark:border-t-white" />
          <span className="text-[13px]">Carregando mensagem…</span>
        </div>
      </div>
    );
  }

  const handleSalvar = async () => {
    setSalvando(true);
    await salvar();
    mostrarToast('Mensagem salva', 'sucesso');
    setSalvando(false);
  };

  const handleExcluir = async () => {
    if (!confirm('Excluir esta mensagem? O histórico também será removido.')) return;
    await db.removerMensagem(mensagem.id);
    mostrarToast('Mensagem excluída', 'sucesso');
    navigate('/biblioteca');
  };

  const adicionarTag = () => {
    const t = novaTag.trim().toLowerCase();
    if (!t) return;
    if (!mensagem.tags.includes(t)) patchComIndicador({ tags: [...mensagem.tags, t] });
    setNovaTag('');
  };

  const removerTag = (t: string) => patchComIndicador({ tags: mensagem.tags.filter((x) => x !== t) });

  return (
    <div className="flex h-full flex-col bg-paper text-ink-900 dark:bg-paper-dark dark:text-ink-100">
      <MobileHeader
        title={mensagem.titulo || 'Sem título'}
        subtitle={`Atualizada ${formatarRelativo(mensagem.atualizadoEm)} · v${mensagem.versao}`}
        back={() => navigate('/biblioteca')}
        right={
          <>
            {!isMobile && (
              <button
                onClick={handleSalvar}
                aria-label="Salvar"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 active:bg-ink-200 dark:text-ink-200 dark:hover:bg-ink-800/60"
              >
                <Save className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => setIA(!iaAberta)}
              aria-label="Alternar IA"
              className="hidden md:flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 active:bg-ink-200 dark:text-ink-200 dark:hover:bg-ink-800/60"
            >
              {iaAberta ? (
                <PanelRightClose className="h-5 w-5" />
              ) : (
                <PanelRightOpen className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Mais opções"
              className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 active:bg-ink-200 dark:text-ink-200 dark:hover:bg-ink-800/60"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Coluna principal */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-32 md:pb-12">
            <div className="px-5 pt-4 md:px-8 md:pt-6">
              <input
                value={mensagem.titulo}
                onChange={(e) => patchComIndicador({ titulo: e.target.value })}
                placeholder="Título da mensagem"
                className="w-full bg-transparent text-[22px] font-semibold tracking-[-0.018em] text-ink-900 outline-none placeholder:text-ink-300 dark:text-white md:text-[26px]"
              />
              {mensagem.textoBase && (
                <div className="mt-1.5 inline-flex items-center rounded-full bg-ink-100 px-2.5 py-0.5 text-[11.5px] font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                  {mensagem.textoBase}
                </div>
              )}
            </div>

            {showMeta && (
              <div className="mx-auto max-w-3xl px-5 pt-5 md:px-8">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:gap-y-4">
                  <div>
                    <Label>Tema</Label>
                    <Input value={mensagem.tema} onChange={(e) => patchComIndicador({ tema: e.target.value })} placeholder="Tema central" />
                  </div>
                  <div>
                    <Label>Texto-base</Label>
                    <Input value={mensagem.textoBase} onChange={(e) => patchComIndicador({ textoBase: e.target.value })} placeholder="Ex: Romanos 8:28-30" />
                  </div>
                  <div>
                    <Label>Livro</Label>
                    <Input value={mensagem.livroBiblico} onChange={(e) => patchComIndicador({ livroBiblico: e.target.value })} placeholder="Romanos…" />
                  </div>
                  <div>
                    <Label>Série</Label>
                    <Input value={mensagem.serie ?? ''} onChange={(e) => patchComIndicador({ serie: e.target.value || null })} placeholder="Opcional" />
                  </div>
                  <div>
                    <Label>Objetivo</Label>
                    <Input value={mensagem.objetivo} onChange={(e) => patchComIndicador({ objetivo: e.target.value })} placeholder="O que o ouvinte deve levar" />
                  </div>
                  <div>
                    <Label>Público</Label>
                    <Input value={mensagem.publico} onChange={(e) => patchComIndicador({ publico: e.target.value })} placeholder="Igreja, jovens…" />
                  </div>
                  <div>
                    <Label>Ocasião</Label>
                    <Input value={mensagem.ocasiao} onChange={(e) => patchComIndicador({ ocasiao: e.target.value })} placeholder="Culto…" />
                  </div>
                  <div>
                    <Label>Tempo (min)</Label>
                    <Input type="number" min={1} value={mensagem.tempoEstimado} onChange={(e) => patchComIndicador({ tempoEstimado: Number(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {STATUS_OPCOES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => patchComIndicador({ status: s.id })}
                      className={cn(
                        'rounded-full px-3 py-1 text-[12px] font-medium transition-all active:scale-95',
                        mensagem.status === s.id
                          ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-950'
                          : 'bg-white border border-ink-200/80 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900/40 dark:text-ink-300',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {mensagem.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[12px] text-ink-700 dark:bg-ink-800 dark:text-ink-200"
                      >
                        <TagIcon className="h-3 w-3" />
                        {t}
                        <button onClick={() => removerTag(t)} className="ml-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1 rounded-full border border-dashed border-ink-300 px-2 py-0.5 dark:border-ink-600">
                      <Plus className="h-3 w-3 text-ink-400" />
                      <input
                        value={novaTag}
                        onChange={(e) => setNovaTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && adicionarTag()}
                        onBlur={adicionarTag}
                        placeholder="tag"
                        className="w-16 bg-transparent text-[12px] outline-none placeholder:text-ink-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="my-5 border-t border-ink-200/70 dark:border-ink-800" />
              </div>
            )}

            {!showMeta && (
              <div className="px-5 pt-2 md:hidden">
                <button
                  onClick={() => setShowMeta(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-[12px] font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200"
                >
                  Detalhes da mensagem
                </button>
              </div>
            )}

            <div className="mx-auto max-w-3xl px-5 pb-6 md:px-8">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[13.5px] font-semibold tracking-tight text-ink-900 dark:text-white">Esboço</h2>
                <span className="text-[11px] text-ink-500 dark:text-ink-400">dica: peça ao assistente →</span>
              </div>
              <RichEditor
                value={mensagem.esboco}
                onChange={(html) => patchComIndicador({ esboco: html })}
                placeholder="Estrutura da mensagem. Comece pelos pontos principais."
              />
            </div>

            <div className="mx-auto max-w-3xl px-5 pb-6 md:px-8">
              <h2 className="mb-2 text-[13.5px] font-semibold tracking-tight text-ink-900 dark:text-white">Mensagem completa</h2>
              <RichEditor
                value={mensagem.conteudo}
                onChange={(html) => patchComIndicador({ conteudo: html })}
                placeholder="O sermão completo. Aplicações, ilustrações, conclusão."
              />
            </div>

            {/* Slides do púlpito */}
            <div className="mx-auto max-w-3xl px-5 pb-6 md:px-8">
              <SlideEditor
                slides={mensagem.slides}
                onChange={(slides) => patchComIndicador({ slides })}
              />
            </div>

            <div className="mx-auto max-w-3xl px-5 pb-24 md:px-8">
              <h2 className="mb-2 text-[13.5px] font-semibold tracking-tight text-ink-900 dark:text-white">Observações</h2>
              <Textarea
                value={mensagem.observacoes}
                onChange={(e) => patchComIndicador({ observacoes: e.target.value })}
                placeholder="Anotações só suas. Insights, dúvidas, próximas ações."
                className="min-h-[100px]"
              />
            </div>
          </div>
        </div>

        {/* Painel IA (desktop) */}
        {!isMobile && iaAberta && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="flex-shrink-0 overflow-hidden border-l border-ink-200/70 bg-paper dark:border-ink-800 dark:bg-paper-dark"
          >
            <div className="h-full w-[380px]">
              <AIPanel />
            </div>
          </motion.aside>
        )}
      </div>

      {/* Bottom sheet IA em mobile */}
      {isMobile && (
        <BottomSheet open={iaAberta} onClose={() => setIA(false)} title="Assistente Ministerial" height="lg">
          <AIPanel />
        </BottomSheet>
      )}

      <PulpitFab to={`/pulpit/${mensagem.id}`} />

      {/* Menu flutuante */}
      <BottomSheet open={showMenu} onClose={() => setShowMenu(false)} title="Ações">
        <div className="px-4 pb-4">
          <div className="overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900/40">
            <button
              onClick={() => { handleSalvar(); setShowMenu(false); }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-[14px] transition-colors active:bg-ink-50 dark:active:bg-ink-800/40"
            >
              <Save className="h-[18px] w-[18px] text-ink-700 dark:text-ink-200" /> Salvar agora
            </button>
            <button
              onClick={() => { setShowMeta(!showMeta); setShowMenu(false); }}
              className="flex w-full items-center gap-3 border-t border-ink-100 px-4 py-3.5 text-[14px] transition-colors active:bg-ink-50 dark:border-ink-800 dark:active:bg-ink-800/40"
            >
              <TagIcon className="h-[18px] w-[18px] text-ink-700 dark:text-ink-200" /> {showMeta ? 'Ocultar' : 'Mostrar'} detalhes
            </button>
            <button
              onClick={() => { setIA(!iaAberta); setShowMenu(false); }}
              className="flex w-full items-center gap-3 border-t border-ink-100 px-4 py-3.5 text-[14px] transition-colors active:bg-ink-50 dark:border-ink-800 dark:active:bg-ink-800/40"
            >
              <Sparkles className="h-[18px] w-[18px] text-ink-700 dark:text-ink-200" /> {iaAberta ? 'Fechar' : 'Abrir'} Assistente
            </button>
            <button
              onClick={() => { handleExcluir(); setShowMenu(false); }}
              className="flex w-full items-center gap-3 border-t border-red-100 px-4 py-3.5 text-[14px] text-red-600 transition-colors active:bg-red-50/50 dark:border-red-500/20 dark:text-red-400 dark:active:bg-red-500/10"
            >
              <Trash2 className="h-[18px] w-[18px]" /> Excluir mensagem
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
