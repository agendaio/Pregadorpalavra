import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { ScrollText, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/db/schema';
import { useUIStore } from '@/stores/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { TemplateGallery, type TemplatePregacao } from '@/components/editor/TemplateGallery';
import { htmlParaTexto, truncar } from '@/lib/utils';
import { novaMensagem } from '@/types/mensagem';
import { EASE_OUT } from '@/lib/motion';

export function OutlinesPage() {
  const mensagens = useLiveQuery(() => db.mensagens.toArray(), []);
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [showGallery, setShowGallery] = useState(false);

  const lista = useMemo(() => {
    let xs = (mensagens ?? []).filter((m) => m.esboco && htmlParaTexto(m.esboco).length > 30);
    if (busca.trim()) {
      const t = busca.toLowerCase();
      xs = xs.filter(
        (m) =>
          m.titulo.toLowerCase().includes(t) ||
          m.tema.toLowerCase().includes(t) ||
          htmlParaTexto(m.esboco).toLowerCase().includes(t),
      );
    }
    return xs.sort((a, b) => b.atualizadoEm - a.atualizadoEm);
  }, [mensagens, busca]);

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
    <div className="flex flex-col bg-paper text-ink-900 dark:bg-paper-dark dark:text-ink-100">
      <MobileHeader
        title="Esboços"
        subtitle={`${lista.length} mensagens com esboço`}
        right={
          <button
            onClick={() => setShowGallery(true)}
            aria-label="Novo sermão"
            className="mr-1 flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 active:bg-ink-200 dark:text-ink-200 dark:hover:bg-ink-800/60"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <div className="ios-blur sticky top-14 z-20 border-b border-ink-200/70 bg-paper/80 px-4 py-3 dark:border-ink-800 dark:bg-paper-dark/80">
        <div className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 h-10 transition-colors focus-within:border-ink-400 dark:border-ink-800 dark:bg-ink-900/40">
          <Search className="h-4 w-4 flex-shrink-0 text-ink-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar esboços…"
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {mensagens === undefined && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-ink-200/80 bg-white p-3.5 dark:border-ink-800 dark:bg-ink-900/40"
                >
                  <div className="flex gap-3">
                    <div className="h-9 w-9 rounded-lg bg-ink-100 dark:bg-ink-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/5 rounded bg-ink-100 dark:bg-ink-800" />
                      <div className="h-3 w-2/5 rounded bg-ink-100 dark:bg-ink-800" />
                      <div className="h-3 w-4/5 rounded bg-ink-100 dark:bg-ink-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {mensagens !== undefined && lista.length === 0 && (
            <EmptyState onNova={() => setShowGallery(true)} />
          )}

          {mensagens !== undefined && lista.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {lista.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.18), duration: 0.28, ease: EASE_OUT }}
                  >
                    <Link
                      to={`/editar/${m.id}`}
                      className="group flex items-start gap-3 rounded-2xl border border-ink-200/80 bg-white p-3.5 transition-all hover:border-ink-300 hover:shadow-soft active:scale-[0.99] dark:border-ink-800 dark:bg-ink-900/40"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                        <ScrollText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[14.5px] font-semibold tracking-tight text-ink-900 dark:text-white">
                          {m.titulo || 'Sem título'}
                        </h3>
                        {m.textoBase && (
                          <p className="mt-0.5 truncate text-[12px] text-ink-600 dark:text-ink-300">
                            {m.textoBase}
                          </p>
                        )}
                        <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-ink-500 dark:text-ink-400">
                          {truncar(htmlParaTexto(m.esboco), 240)}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
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

function EmptyState({ onNova }: { onNova: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
      >
        <ScrollText className="h-6 w-6" />
      </motion.div>
      <h3 className="text-[15px] font-semibold tracking-tight text-ink-900 dark:text-white">
        Nenhum esboço ainda
      </h3>
      <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
        Crie uma mensagem e use o Assistente para gerar esboços estruturados.
      </p>
      <button
        onClick={onNova}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-5 text-[14px] font-semibold text-white shadow-soft transition-all hover:bg-ink-800 active:scale-[0.97] dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100"
      >
        <Plus className="h-4 w-4" /> Novo sermão
      </button>
    </div>
  );
}
