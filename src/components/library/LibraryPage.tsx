import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import {
  Pin,
  BookOpen,
  Tag as TagIcon,
  Calendar,
  Plus,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/db/schema';
import { useMensagensStore } from '@/stores/mensagens';
import { useUIStore } from '@/stores/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Pill } from '@/components/ui/Card';
import { TemplateGallery, type TemplatePregacao } from '@/components/editor/TemplateGallery';
import { cn, formatarRelativo, htmlParaTexto, truncar } from '@/lib/utils';
import { novaMensagem } from '@/types/mensagem';
import type { Mensagem } from '@/types/mensagem';
import { EASE_OUT } from '@/lib/motion';

type Filtro = 'todas' | 'fixadas' | 'rascunhos' | 'prontas' | 'pregadas';

export function LibraryPage() {
  const mensagens = useLiveQuery(() => db.mensagens.toArray(), []);
  const fixadas = useMensagensStore((s) => s.fixadas);
  const toggleFixa = useMensagensStore((s) => s.toggleFixa);
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const navigate = useNavigate();

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [showGallery, setShowGallery] = useState(false);

  const lista: Mensagem[] = useMemo(() => {
    if (!mensagens) return [];
    let xs = mensagens;
    if (filtro === 'fixadas')   xs = xs.filter((m) => fixadas.has(m.id) || m.favorita);
    if (filtro === 'rascunhos') xs = xs.filter((m) => m.status === 'rascunho');
    if (filtro === 'prontas')   xs = xs.filter((m) => m.status === 'pronta');
    if (filtro === 'pregadas')  xs = xs.filter((m) => m.status === 'pregada');
    if (busca.trim()) {
      const t = busca.toLowerCase();
      xs = xs.filter(
        (m) =>
          m.titulo.toLowerCase().includes(t) ||
          m.tema.toLowerCase().includes(t) ||
          m.livroBiblico.toLowerCase().includes(t) ||
          m.textoBase.toLowerCase().includes(t) ||
          htmlParaTexto(m.conteudo).toLowerCase().includes(t),
      );
    }
    return xs.sort((a, b) => b.atualizadoEm - a.atualizadoEm);
  }, [mensagens, filtro, busca, fixadas]);

  const contadores = useMemo(() => {
    const xs = mensagens ?? [];
    return {
      todas:     xs.length,
      fixadas:   xs.filter((m) => fixadas.has(m.id) || m.favorita).length,
      rascunhos: xs.filter((m) => m.status === 'rascunho').length,
      prontas:   xs.filter((m) => m.status === 'pronta').length,
      pregadas:  xs.filter((m) => m.status === 'pregada').length,
    };
  }, [mensagens, fixadas]);

  const handleNova = () => setShowGallery(true);

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

  const filtros: { id: Filtro; rotulo: string }[] = [
    { id: 'todas',     rotulo: 'Todas' },
    { id: 'fixadas',   rotulo: 'Fixadas' },
    { id: 'rascunhos', rotulo: 'Rascunhos' },
    { id: 'prontas',   rotulo: 'Prontas' },
    { id: 'pregadas',  rotulo: 'Pregadas' },
  ];

  return (
    <div className="flex h-full flex-col bg-paper text-ink-900 dark:bg-paper-dark dark:text-ink-100">
      <MobileHeader
        title="Biblioteca"
        subtitle={`${contadores.todas} mensagens`}
        right={
          <button
            onClick={handleNova}
            aria-label="Nova mensagem"
            className="mr-1 flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 active:bg-ink-200 dark:text-ink-200 dark:hover:bg-ink-800/60"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <div className="ios-blur sticky top-14 z-20 border-b border-ink-200/70 bg-paper/80 dark:border-ink-800">
        <div className="overflow-x-auto px-4 pt-2 pb-2">
          <div className="flex items-center gap-1.5">
            {filtros.map((f) => (
              <Pill
                key={f.id}
                active={filtro === f.id}
                count={contadores[f.id]}
                onClick={() => setFiltro(f.id)}
              >
                {f.rotulo}
              </Pill>
            ))}
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 h-10 transition-colors focus-within:border-ink-400 dark:border-ink-800 dark:bg-ink-900/40">
            <Search className="h-4 w-4 flex-shrink-0 text-ink-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar mensagem, tema, versÃ­culoâ€¦"
              className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {mensagens === undefined && (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {mensagens !== undefined && lista.length === 0 && (
            <EmptyState onNova={handleNova} />
          )}

          {mensagens !== undefined && lista.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {lista.map((m, i) => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, delay: Math.min(i * 0.018, 0.18), ease: EASE_OUT }}
                  >
                    <Link
                      to={`/editar/${m.id}`}
                      className="group flex items-start gap-3 rounded-2xl border border-ink-200/80 bg-white p-3.5 transition-all hover:border-ink-300 hover:shadow-soft active:scale-[0.99] dark:border-ink-800 dark:bg-ink-900/40"
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFixa(m.id);
                        }}
                        className={cn(
                          'mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors active:scale-90',
                          fixadas.has(m.id) ? 'text-amber-500' : 'text-ink-300 hover:text-ink-500 dark:text-ink-600 dark:hover:text-ink-400',
                        )}
                        aria-label="Fixar"
                      >
                        <Pin className={cn('h-4 w-4', fixadas.has(m.id) && 'fill-current')} />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-[14.5px] font-semibold tracking-tight text-ink-900 dark:text-white">
                            {m.titulo || 'Sem tÃ­tulo'}
                          </h3>
                          <StatusBadge status={m.status} />
                        </div>

                        {m.tema && (
                          <p className="mt-0.5 truncate text-[12.5px] text-ink-600 dark:text-ink-300">
                            {m.tema}
                          </p>
                        )}

                        {htmlParaTexto(m.conteudo) && (
                          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink-500 dark:text-ink-400">
                            {truncar(htmlParaTexto(m.conteudo), 180)}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500 dark:text-ink-500">
                          {m.textoBase && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <BookOpen className="h-3 w-3" /> {m.textoBase}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {formatarRelativo(m.atualizadoEm)}
                          </span>
                          {m.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-1.5 py-0.5 dark:bg-ink-800 dark:text-ink-300"
                            >
                              <TagIcon className="h-2.5 w-2.5" /> {t}
                            </span>
                          ))}
                        </div>
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

function StatusBadge({ status }: { status: Mensagem['status'] }) {
  const cfg = {
    rascunho:  { label: 'Rascunho',  cls: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300' },
    pronta:    { label: 'Pronta',    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    pregada:   { label: 'Pregada',   cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
    arquivada: { label: 'Arquivada', cls: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400' },
  }[status];
  return (
    <span className={cn('flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', cfg.cls)}>
      {cfg.label}
    </span>
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
        <BookOpen className="h-6 w-6" />
      </motion.div>
      <h3 className="text-[15px] font-semibold tracking-tight text-ink-900 dark:text-white">
        Sua biblioteca estÃ¡ vazia
      </h3>
      <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
        Comece criando sua primeira mensagem. Tudo funciona offline.
      </p>
      <button
        onClick={onNova}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-5 text-[14px] font-semibold text-white shadow-soft transition-all hover:bg-ink-800 active:scale-[0.97] dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100"
      >
        <Plus className="h-4 w-4" /> Criar primeira mensagem
      </button>
    </div>
  );
}
