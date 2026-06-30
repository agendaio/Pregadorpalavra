import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  Save,
  Play,
  Star,
  Trash2,
  Tag as TagIcon,
  Plus,
  X,
  Sparkles,
  PanelRightOpen,
  PanelRightClose,
  History,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '@/db/schema';
import { useMensagensStore } from '@/stores/mensagens';
import { useUIStore } from '@/stores/ui';
import { RichEditor } from '@/components/editor/RichEditor';
import { AIPanel } from '@/components/ai/AIPanel';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
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
  const mensagem = useMensagensStore((s) => s.atual);
  const carregar = useMensagensStore((s) => s.carregar);
  const limpar = useMensagensStore((s) => s.limpar);
  const patch = useMensagensStore((s) => s.patch);
  const salvar = useMensagensStore((s) => s.salvar);
  const iaAberta = useUIStore((s) => s.iaAberta);
  const toggleIA = useUIStore((s) => s.toggleIA);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const historico = useLiveQuery(
    () => (id ? db.historico.where('mensagemId').equals(id).reverse().sortBy('versao') : []),
    [id],
  );

  const [novaTag, setNovaTag] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (id) carregar(id);
    return () => limpar();
  }, [id, carregar, limpar]);

  // auto-save a cada 2.5s quando há mudanças
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
    navigate('/');
  };

  const handleIniciarPulpit = () => {
    navigate(`/pulpit/${mensagem.id}`);
  };

  const adicionarTag = () => {
    const t = novaTag.trim().toLowerCase();
    if (!t) return;
    if (!mensagem.tags.includes(t)) patch({ tags: [...mensagem.tags, t] });
    setNovaTag('');
  };

  const removerTag = (t: string) => patch({ tags: mensagem.tags.filter((x) => x !== t) });

  return (
    <div className="flex h-full">
      {/* Coluna principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-ink-200/70 bg-paper px-6 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <input
                value={mensagem.titulo}
                onChange={(e) => patch({ titulo: e.target.value })}
                placeholder="Título da mensagem"
                className="w-full bg-transparent text-[18px] font-semibold tracking-tight text-ink-900 outline-none placeholder:text-ink-400"
              />
              <div className="mt-0.5 flex items-center gap-3 text-[11.5px] text-ink-500">
                <span>Atualizada {formatarRelativo(mensagem.atualizadoEm)}</span>
                <span>·</span>
                <span>v{mensagem.versao}</span>
                {historico && historico.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <History className="h-3 w-3" /> {historico.length} versões no histórico
                    </span>
                  </>
                )}
              </div>
            </div>

            <Button variant="ghost" onClick={handleSalvar} disabled={salvando}>
              <Save className="h-4 w-4" /> {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button variant="primary" onClick={handleIniciarPulpit}>
              <Play className="h-3.5 w-3.5" /> Modo Púlpito
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleIA} aria-label="Alternar painel de IA">
              {iaAberta ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-8">
            {/* Metadados */}
            <section className="mb-8 space-y-5">
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <div>
                  <Label>Tema</Label>
                  <Input
                    value={mensagem.tema}
                    onChange={(e) => patch({ tema: e.target.value })}
                    placeholder="Tema central"
                  />
                </div>
                <div>
                  <Label>Texto-base</Label>
                  <Input
                    value={mensagem.textoBase}
                    onChange={(e) => patch({ textoBase: e.target.value })}
                    placeholder="Ex: Romanos 8:28-30"
                  />
                </div>
                <div>
                  <Label>Livro bíblico</Label>
                  <Input
                    value={mensagem.livroBiblico}
                    onChange={(e) => patch({ livroBiblico: e.target.value })}
                    placeholder="Romanos, João, Salmos…"
                  />
                </div>
                <div>
                  <Label>Série</Label>
                  <Input
                    value={mensagem.serie ?? ''}
                    onChange={(e) => patch({ serie: e.target.value || null })}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <Label>Objetivo</Label>
                  <Input
                    value={mensagem.objetivo}
                    onChange={(e) => patch({ objetivo: e.target.value })}
                    placeholder="O que o ouvinte deve compreender/levar"
                  />
                </div>
                <div>
                  <Label>Público</Label>
                  <Input
                    value={mensagem.publico}
                    onChange={(e) => patch({ publico: e.target.value })}
                    placeholder="Igreja local, jovens, casal…"
                  />
                </div>
                <div>
                  <Label>Ocasião</Label>
                  <Input
                    value={mensagem.ocasiao}
                    onChange={(e) => patch({ ocasiao: e.target.value })}
                    placeholder="Culto de domingo, conferência…"
                  />
                </div>
                <div>
                  <Label>Tempo estimado (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={mensagem.tempoEstimado}
                    onChange={(e) => patch({ tempoEstimado: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Status e favorita */}
              <div className="flex flex-wrap items-center gap-2">
                {STATUS_OPCOES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => patch({ status: s.id })}
                    className={cn(
                      'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                      mensagem.status === s.id
                        ? 'bg-ink-900 text-white'
                        : 'bg-white border border-ink-200/80 text-ink-600 hover:border-ink-300',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  onClick={() => patch({ favorita: !mensagem.favorita })}
                  className={cn(
                    'ml-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                    mensagem.favorita
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-white border border-ink-200/80 text-ink-600 hover:border-ink-300',
                  )}
                >
                  <Star className={cn('h-3 w-3', mensagem.favorita && 'fill-current')} />
                  Favorita
                </button>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {mensagem.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11.5px] text-ink-700"
                    >
                      <TagIcon className="h-3 w-3" />
                      {t}
                      <button onClick={() => removerTag(t)} className="ml-0.5 rounded-full hover:bg-ink-200">
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
                      placeholder="adicionar"
                      className="w-20 bg-transparent text-[11.5px] outline-none placeholder:text-ink-400"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Esboço */}
            <section className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">Esboço</h2>
                <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
                  <Sparkles className="h-3 w-3" /> gerado pelo assistente fica aqui
                </span>
              </div>
              <RichEditor
                value={mensagem.esboco}
                onChange={(html) => patch({ esboco: html })}
                placeholder="Estrutura da mensagem. Você pode começar pelos pontos e ir refinando."
              />
            </section>

            {/* Conteúdo principal */}
            <section className="mb-6">
              <h2 className="mb-2 text-[15px] font-semibold tracking-tight text-ink-900">Mensagem completa</h2>
              <RichEditor
                value={mensagem.conteudo}
                onChange={(html) => patch({ conteudo: html })}
                placeholder="O sermão completo. Aplicações, ilustrações, conclusão. Tudo num só lugar."
              />
            </section>

            {/* Observações */}
            <section className="mb-6">
              <h2 className="mb-2 text-[15px] font-semibold tracking-tight text-ink-900">Observações pessoais</h2>
              <Textarea
                value={mensagem.observacoes}
                onChange={(e) => patch({ observacoes: e.target.value })}
                placeholder="Anotações que só você vê. Insights durante o estudo, dúvidas, próximas ações…"
                className="min-h-[120px]"
              />
            </section>

            {/* Ações finais */}
            <div className="flex items-center justify-between border-t border-ink-200/70 pt-6">
              <Button variant="danger" onClick={handleExcluir}>
                <Trash2 className="h-3.5 w-3.5" /> Excluir mensagem
              </Button>
              <Button variant="primary" onClick={handleIniciarPulpit}>
                <Play className="h-3.5 w-3.5" /> Iniciar Modo Púlpito
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Painel IA */}
      {iaAberta && (
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
  );
}