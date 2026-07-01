import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  Sparkles,
  BookOpen,
  ScrollText,
  Clock,
  ArrowRight,
  TrendingUp,
  Compass,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/db/schema';
import { useMensagensStore } from '@/stores/mensagens';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useUIStore } from '@/stores/ui';
import { htmlParaTexto, formatarRelativo, truncar } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { PulpitFab } from '@/components/layout/PulpitFab';
import { TemplateGallery, type TemplatePregacao } from '@/components/editor/TemplateGallery';
import { novaMensagem } from '@/types/mensagem';
import { EASE_OUT } from '@/lib/motion';

export function HomePage() {
  const mensagens = useLiveQuery(() => db.mensagens.toArray(), []);
  const navigate = useNavigate();
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const [showGallery, setShowGallery] = useState(false);

  const stats = useMemo(() => {
    const xs = mensagens ?? [];
    return {
      total: xs.length,
      rascunhos: xs.filter((m) => m.status === 'rascunho').length,
      prontas: xs.filter((m) => m.status === 'pronta').length,
    };
  }, [mensagens]);

  const recentes = useMemo(() => {
    return [...(mensagens ?? [])]
      .sort((a, b) => b.atualizadoEm - a.atualizadoEm)
      .slice(0, 6);
  }, [mensagens]);

  const handleSelecionarTemplate = async (template: TemplatePregacao) => {
    setShowGallery(false);
    const m = novaMensagem({
      titulo: template.rotulo,
      tema: template.temaPadrao,
      esboco: template.esbocoModelo,
      categoria: template.categoria,
    });
    await db.mensagens.add(m);
    mostrarToast(`"${template.rotulo}" criado`, 'sucesso');
    navigate(`/editar/${m.id}`);
  };

  return (
    <div className="flex h-full flex-col bg-paper text-ink-900 dark:bg-paper-dark dark:text-ink-100">
      <MobileHeader title="Pregador OS" subtitle={`${stats.total} mensagens`} back={false} />

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="mx-auto max-w-2xl px-5 pb-32 pt-3">

          {/* Saudação + ações rápidas */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="mb-6 flex items-center gap-3"
          >
            <button
              onClick={() => setShowGallery(true)}
              className="flex flex-1 items-center gap-3 rounded-2xl border border-ink-200/80 bg-white px-4 py-3.5 text-left transition-all hover:border-ink-300 hover:shadow-sm active:scale-[0.99] dark:border-ink-800 dark:bg-ink-900/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-ink-900 dark:text-white">Novo Sermão</div>
                <div className="text-[12px] text-ink-500">Escolha um template</div>
              </div>
            </button>

            <Link
              to="/assistente"
              className="flex flex-1 items-center gap-3 rounded-2xl border border-ink-200/80 bg-white px-4 py-3.5 transition-all hover:border-ink-300 hover:shadow-sm active:scale-[0.99] dark:border-ink-800 dark:bg-ink-900/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-ink-900 dark:text-white">Assistente</div>
                <div className="text-[12px] text-ink-500">Ajuda da IA ministerial</div>
              </div>
            </Link>
          </motion.div>

          {/* Stats simples */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.3, ease: EASE_OUT }}
            className="mb-6 flex items-center gap-3 text-[12.5px] text-ink-500"
          >
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {stats.total} total
            </span>
            <span className="text-ink-300">·</span>
            <span className="text-amber-600">{stats.rascunhos} rascunhos</span>
            <span className="text-ink-300">·</span>
            <span className="text-emerald-600">{stats.prontas} prontas</span>
          </motion.div>

          {/* Atalhos minimalistas */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3, ease: EASE_OUT }}
            className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            <Link to="/biblioteca" className="flex items-center gap-2 rounded-xl border border-ink-200/60 bg-white/80 px-3 py-2.5 text-[13px] text-ink-700 transition-all hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900/20 dark:text-ink-300">
              <BookOpen className="h-4 w-4 text-ink-400" />
              Biblioteca
            </Link>
            <Link to="/esbocos" className="flex items-center gap-2 rounded-xl border border-ink-200/60 bg-white/80 px-3 py-2.5 text-[13px] text-ink-700 transition-all hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900/20 dark:text-ink-300">
              <ScrollText className="h-4 w-4 text-ink-400" />
              Esboços
            </Link>
            <Link to="/assistente" className="flex items-center gap-2 rounded-xl border border-ink-200/60 bg-white/80 px-3 py-2.5 text-[13px] text-ink-700 transition-all hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900/20 dark:text-ink-300">
              <Sparkles className="h-4 w-4 text-ink-400" />
              Assistente
            </Link>
            <Link to="/analista" className="flex items-center gap-2 rounded-xl border border-ink-200/60 bg-white/80 px-3 py-2.5 text-[13px] text-ink-700 transition-all hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900/20 dark:text-ink-300">
              <TrendingUp className="h-4 w-4 text-ink-400" />
              Analista
            </Link>
          </motion.div>

          {/* Recentes */}
          <section>
            {recentes.length > 0 && (
              <div className="mb-3">
                <PulpitFab to={`/pulpit/${recentes[0].id}`} />
              </div>
            )}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                Recentes
              </h2>
              <Link
                to="/biblioteca"
                className="text-[12px] font-medium text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
              >
                Ver todas →
              </Link>
            </div>

            {recentes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-12 text-center dark:border-ink-800 dark:bg-ink-900/20">
                <BookOpen className="mx-auto mb-3 h-6 w-6 text-ink-400" />
                <p className="text-[13px] text-ink-500 dark:text-ink-400">
                  Nenhuma mensagem ainda.
                </p>
                <button
                  onClick={() => setShowGallery(true)}
                  className="mt-3 text-[13px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Criar primeira mensagem →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentes.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.28, ease: EASE_OUT }}
                  >
                    <Link
                      to={`/editar/${m.id}`}
                      className="group flex items-start gap-3 rounded-2xl border border-ink-200/60 bg-white px-4 py-3.5 transition-all hover:border-ink-300 hover:shadow-sm active:scale-[0.99] dark:border-ink-800 dark:bg-ink-900/20"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[14px] font-semibold tracking-tight text-ink-900 dark:text-white">
                          {m.titulo || 'Sem título'}
                        </h3>
                        {m.tema && (
                          <p className="truncate text-[12px] text-ink-500 dark:text-ink-400">
                            {m.tema}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-400">
                          {m.textoBase && <span>{m.textoBase}</span>}
                          <span className="ml-auto">{formatarRelativo(m.atualizadoEm)}</span>
                        </div>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 dark:text-ink-600" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {showGallery && (
          <TemplateGallery
            onSelecionar={handleSelecionarTemplate}
            onFechar={() => setShowGallery(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
