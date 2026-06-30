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
  History,
  ArrowLeft,
  MoreVertical,
  Edit3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/db/schema';
import { useMensagensStore } from '@/stores/mensagens';
import { useUIStore } from '@/stores/ui';
import { RichEditor } from '@/components/editor/RichEditor';
import { AIPanel } from '@/components/ai/AIPanel';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { PulpitFab } from '@/components/layout/PulpitFab';
import { useIsMobile } from '@/lib/responsive';
import { cn, formatarRelativo } from '@/lib/utils';

const STATUS_OPCOES = [
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'pronta', label: 'Pronta' },
  { id: 'pregada', label: 'Pregada' },
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

  const historico = useLiveQuery(
    () => (id ? db.historico.where('mensagemId').equals(id).reverse().sortBy('versao') : []),
    [id],
  );

  const [novaTag, setNovaTag] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [showMeta, setShowMeta] = useState(!isMobile); // mobile começa fechado
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (id) carregar(id);
    return () => limpar();
  }, [id, carregar, limpar]);

  useEffect(() => {
    if (!mensagem) return;
    const t = setTimeout(async () => {
      await salvar();
    }, 2500);
    return () => clearTimeout(t);
  }, [mensagem, salvar]);

  if (!mensagem) {
    return (
      <div className="flex h-full items-center justify-center text-ink-500">
        Carregando mensagem…
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
    if (!mensagem.tags.includes(t)) patch({ tags: [...mensagem.tags, t] });
    setNovaTag('');
  };

  const removerTag = (t: string) => patch({ tags: mensagem.tags.filter((x) => x !== t) });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <MobileHeader
        title={mensagem.titulo || 'Sem título'}
        subtitle={`Atualizada ${formatarRelativo(mensagem.atualizadoEm)} · v${mensagem.versao}`}
        back={() => navigate('/biblioteca')}
        right={
          <>
            {!isMobile && (
              <Button variant="ghost" size="icon" onClick={handleSalvar} aria-label="Salvar">
                <Save className="h-5 w-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIA(!iaAberta)} aria-label="Alternar IA" className="md:flex">
              {iaAberta ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)} aria-label="Mais opções">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </>
        }
      />

      {/* Editor + Painel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Coluna principal */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-32 md:pb-12">
            {/* Título grande editável inline */}
            <div className="px-5 pt-4 md:px-8 md:pt-6">
              <input
                value={mensagem.titulo}
                onChange={(e) => patch({ titulo: e.target.value })}
                placeholder="Título da mensagem"
                className="w-full bg-transparent text-[20px] font-semibold tracking-tight text-ink-900 outline-none placeholder:text-ink-300 md:text-2xl"
              />
              {mensagem.textoBase && (
                <div className="mt-1 inline-flex items-center rounded-full bg-ink-100 px-2.5 py-0.5 text-[11px] font-medium text-ink-700">
                  {mensagem.textoBase}
                </div>
              )}
            </div>

            {/* Metadados (sheet em mobile / inline em desktop) */}
            {showMeta && (
              <div className="mx-auto max-w-3xl px-5 pt-5 md:px-8">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:gap-y-4">
                  <div>
                    <Label>Tema</Label>
                    <Input value={mensagem.tema} onChange={(e) => patch({ tema: e.target.value })} placeholder="Tema central" />
                  </div>
                  <div>
                    <Label>Texto-base</Label>
                    <Input value={mensagem.textoBase} onChange={(e) => patch({ textoBase: e.target.value })} placeholder="Ex: Romanos 8:28-30" />
                  </div>
                  <div>
                    <Label>Livro</Label>
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
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {STATUS_OPCOES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => patch({ status: s.id })}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                        mensagem.status === s.id
                          ? 'bg-ink-900 text-white'
                          : 'bg-white border border-ink-200/80 text-ink-600',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Tags */}
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {mensagem.tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11.5px] text-ink-700">
                        <TagIcon className="h-3 w-3" />
                        {t}
                        <button onClick={() => removerTag(t)} className="ml-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1 rounded-full border border-dashed border-ink-300 px-2 py-0.5">
                      <Plus className="h-3 w-3 text-ink-400" />
                      <input
                        value={novaTag}
                        onChange={(e) => setNovaTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && adicionarTag()}
                        onBlur={adicionarTag}
                        placeholder="tag"
                        className="w-16 bg-transparent text-[11.5px] outline-none placeholder:text-ink-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="my-5 border-t border-ink-200/70" />
              </div>
            )}

            {/* Botão "mostrar metadados" em mobile */}
            {!showMeta && (
              <div className="px-5 pt-2 md:hidden">
                <button
                  onClick={() => setShowMeta(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-[11.5px] font-medium text-ink-700"
                >
                  <Edit3 className="h-3 w-3" /> Detalhes da mensagem
                </button>
              </div>
            )}

            {/* Esboço */}
            <div className="mx-auto max-w-3xl px-5 pb-6 md:px-8">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[13px] font-semibold tracking-tight text-ink-900">Esboço</h2>
                <span className="text-[10.5px] text-ink-500">dica: peça ao assistente →</span>
              </div>
              <RichEditor
                value={mensagem.esboco}
                onChange={(html) => patch({ esboco: html })}
                placeholder="Estrutura da mensagem. Comece pelos pontos principais."
              />
            </div>

            {/* Conteúdo principal */}
            <div className="mx-auto max-w-3xl px-5 pb-6 md:px-8">
              <h2 className="mb-2 text-[13px] font-semibold tracking-tight text-ink-900">Mensagem completa</h2>
              <RichEditor
                value={mensagem.conteudo}
                onChange={(html) => patch({ conteudo: html })}
                placeholder="O sermão completo. Aplicações, ilustrações, conclusão."
              />
            </div>

            {/* Observações */}
            <div className="mx-auto max-w-3xl px-5 pb-24 md:px-8">
              <h2 className="mb-2 text-[13px] font-semibold tracking-tight text-ink-900">Observações</h2>
              <Textarea
                value={mensagem.observacoes}
                onChange={(e) => patch({ observacoes: e.target.value })}
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
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 overflow-hidden border-l border-ink-200/70 bg-paper"
          >
            <div className="h-full w-[360px]">
              <AIPanel />
            </div>
          </motion.aside>
        )}
      </div>

      {/* Bottom sheet da IA em mobile */}
      {isMobile && (
        <AnimatePresence>
          {iaAberta && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-ink-950/30 backdrop-blur-sm"
                onClick={() => setIA(false)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 360, damping: 36 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 120) setIA(false);
                }}
                className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-3xl bg-paper shadow-ring"
              >
                <div className="flex flex-shrink-0 items-center justify-center py-2">
                  <div className="h-1 w-10 rounded-full bg-ink-300" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <AIPanel />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* FAB do Modo Púlpito */}
      <PulpitFab to={`/pulpit/${mensagem.id}`} />

      {/* Menu flutuante "..." */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="fixed right-2 top-14 z-40 w-56 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-ring"
            >
              <button onClick={() => { handleSalvar(); setShowMenu(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-ink-50">
                <Save className="h-4 w-4 text-ink-700" /> Salvar agora
              </button>
              <button onClick={() => { setShowMeta(!showMeta); setShowMenu(false); }} className="flex w-full items-center gap-2.5 border-t border-ink-100 px-4 py-2.5 text-[13px] hover:bg-ink-50">
                <Edit3 className="h-4 w-4 text-ink-700" /> {showMeta ? 'Ocultar' : 'Mostrar'} detalhes
              </button>
              <button onClick={() => { setIA(!iaAberta); setShowMenu(false); }} className="flex w-full items-center gap-2.5 border-t border-ink-100 px-4 py-2.5 text-[13px] hover:bg-ink-50">
                <Sparkles className="h-4 w-4 text-ink-700" /> {iaAberta ? 'Fechar' : 'Abrir'} Assistente
              </button>
              <button onClick={() => { handleExcluir(); setShowMenu(false); }} className="flex w-full items-center gap-2.5 border-t border-ink-100 px-4 py-2.5 text-[13px] text-accent hover:bg-accent-soft">
                <Trash2 className="h-4 w-4" /> Excluir mensagem
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}