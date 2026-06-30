import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import {
  Pin,
  BookOpen,
  Hash,
  Tag as TagIcon,
  Clock,
  Calendar,
  Sparkles,
  Plus,
  Search,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/db/schema';
import { useMensagensStore } from '@/stores/mensagens';
import { useUIStore } from '@/stores/ui';
import { Button } from '@/components/ui/Button';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { cn, formatarRelativo, htmlParaTexto, truncar } from '@/lib/utils';
import type { Mensagem } from '@/types/mensagem';

type Filtro = 'todas' | 'fixadas' | 'rascunhos' | 'prontas' | 'pregadas';

export function LibraryPage() {
  const mensagens = useLiveQuery(() => db.mensagens.toArray(), []);
  const fixadas = useMensagensStore((s) => s.fixadas);
  const toggleFixa = useMensagensStore((s) => s.toggleFixa);
  const nova = useMensagensStore((s) => s.nova);
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const navigate = useNavigate();

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const lista: Mensagem[] = useMemo(() => {
    let xs = mensagens ?? [];
    if (filtro === 'fixadas') xs = xs.filter((m) => fixadas.has(m.id) || m.favorita);
    if (filtro === 'rascunhos') xs = xs.filter((m) => m.status === 'rascunho');
    if (filtro === 'prontas') xs = xs.filter((m) => m.status === 'pronta');
    if (filtro === 'pregadas') xs = xs.filter((m) => m.status === 'pregada');
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
      todas: xs.length,
      fixadas: xs.filter((m) => fixadas.has(m.id) || m.favorita).length,
      rascunhos: xs.filter((m) => m.status === 'rascunho').length,
      prontas: xs.filter((m) => m.status === 'pronta').length,
      pregadas: xs.filter((m) => m.status === 'pregada').length,
    };
  }, [mensagens, fixadas]);

  const handleNova = async () => {
    const m = await nova();
    mostrarToast('Nova mensagem criada', 'sucesso');
    navigate(`/editar/${m.id}`);
  };

  return (
    <div className="flex h-full flex-col bg-paper">
      <MobileHeader
        title="Biblioteca"
        subtitle={`${contadores.todas} mensagens`}
        right={
          <Button variant="ghost" size="icon" onClick={handleNova} aria-label="Nova mensagem">
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      {/* Filtros pill */}
      <div className="flex-shrink-0 border-b border-ink-200/70 bg-paper">
        <div className="overflow-x-auto px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'todas', rotulo: 'Todas' },
                { id: 'fixadas', rotulo: 'Fixadas' },
                { id: 'rascunhos', rotulo: 'Rascunhos' },
                { id: 'prontas', rotulo: 'Prontas' },
                { id: 'pregadas', rotulo: 'Pregadas' },
              ] as { id: Filtro; rotulo: string }[]
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={cn(
                  'flex-shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                  filtro === f.id
                    ? 'bg-ink-900 text-white'
                    : 'bg-white text-ink-700 border border-ink-200/80',
                )}
              >
                {f.rotulo}
                <span className="ml-1.5 text-[10px] opacity-70">{contadores[f.id]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Busca */}
        <div className="px-4 pb-2.5">
          <div className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-3 py-2 focus-within:border-ink-300">
            <Search className="h-4 w-4 flex-shrink-0 text-ink-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar mensagem, tema, versículo…"
              className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ink-400"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {lista.length === 0 && <EmptyState onNova={handleNova} />}

          {lista.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {lista.map((m, i) => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2) }}
                  >
                    <Link
                      to={`/editar/${m.id}`}
                      className="block rounded-2xl border border-ink-200/80 bg-white p-3.5 transition-all hover:border-ink-300 hover:shadow-soft active:scale-[0.99]"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleFixa(m.id);
                          }}
                          className={cn(
                            'mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
                            fixadas.has(m.id) ? 'text-amber-500' : 'text-ink-300',
                          )}
                          aria-label="Fixar"
                        >
                          <Pin className={cn('h-3.5 w-3.5', fixadas.has(m.id) && 'fill-current')} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-[14px] font-semibold text-ink-900">
                              {m.titulo || 'Sem título'}
                            </h3>
                            <StatusBadge status={m.status} />
                          </div>

                          {m.tema && (
                            <p className="mt-0.5 truncate text-[12.5px] text-ink-600">
                              {m.tema}
                            </p>
                          )}

                          {htmlParaTexto(m.conteudo) && (
                            <p className="mt-1 line-clamp-2 text-[11.5px] text-ink-500">
                              {truncar(htmlParaTexto(m.conteudo), 180)}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-ink-500">
                            {m.textoBase && (
                              <span className="inline-flex items-center gap-1">
                                <BookOpen className="h-3 w-3" /> {m.textoBase}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {m.tempoEstimado} min
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formatarRelativo(m.atualizadoEm)}
                            </span>
                            {m.tags.slice(0, 2).map((t) => (
                              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-1.5 py-0.5">
                                <TagIcon className="h-2.5 w-2.5" /> {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-ink-300" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Mensagem['status'] }) {
  const cfg = {
    rascunho: { label: 'Rascunho', cls: 'bg-ink-100 text-ink-600' },
    pronta: { label: 'Pronta', cls: 'bg-emerald-50 text-emerald-700' },
    pregada: { label: 'Pregada', cls: 'bg-amber-50 text-amber-700' },
    arquivada: { label: 'Arquivada', cls: 'bg-ink-100 text-ink-500' },
  }[status];
  return (
    <span className={cn('flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function EmptyState({ onNova }: { onNova: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-600">
        <BookOpen className="h-6 w-6" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink-900">Sua biblioteca está vazia</h3>
      <p className="mt-1 max-w-xs text-[12.5px] text-ink-500">
        Comece criando sua primeira mensagem. Tudo funciona offline.
      </p>
      <Button variant="primary" onClick={onNova} className="mt-4 h-10">
        <Plus className="h-4 w-4" /> Criar primeira mensagem
      </Button>
    </div>
  );
}