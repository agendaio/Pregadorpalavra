import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Star,
  Clock,
  Calendar,
  BookOpen,
  Hash,
  Tag as TagIcon,
  Pin,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/db/schema';
import { useMensagensStore } from '@/stores/mensagens';
import { useUIStore } from '@/stores/ui';
import { Button } from '@/components/ui/Button';
import { cn, formatarRelativo, htmlParaTexto, truncar } from '@/lib/utils';
import type { Mensagem } from '@/types/mensagem';

type Filtro = 'todas' | 'fixadas' | 'rascunhos' | 'prontas' | 'pregadas';
type Agrupamento = 'atualizado' | 'criado' | 'tema' | 'livro' | 'serie' | 'status';

export function LibraryPage() {
  const mensagens = useLiveQuery(() => db.mensagens.toArray(), []);
  const fixadas = useMensagensStore((s) => s.fixadas);
  const toggleFixa = useMensagensStore((s) => s.toggleFixa);
  const nova = useMensagensStore((s) => s.nova);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const navigate = useNavigate();

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('atualizado');

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
    return xs;
  }, [mensagens, filtro, busca, fixadas]);

  const grupos = useMemo(() => {
    const map = new Map<string, Mensagem[]>();
    for (const m of lista) {
      let chave = '';
      switch (agrupamento) {
        case 'atualizado':
          chave = formatarRelativo(m.atualizadoEm);
          break;
        case 'criado':
          chave = new Date(m.criadoEm).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          break;
        case 'tema':
          chave = m.tema || 'Sem tema';
          break;
        case 'livro':
          chave = m.livroBiblico || 'Sem livro';
          break;
        case 'serie':
          chave = m.serie || 'Sem série';
          break;
        case 'status':
          chave = m.status;
          break;
      }
      if (!map.has(chave)) map.set(chave, []);
      map.get(chave)!.push(m);
    }
    return Array.from(map.entries());
  }, [lista, agrupamento]);

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
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-ink-200/70 bg-paper px-8 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Biblioteca</h1>
              <p className="mt-0.5 text-[13px] text-ink-500">
                {contadores.todas} mensagens · organizadas pelo pregador
              </p>
            </div>
            <Button variant="primary" onClick={handleNova} className="h-9">
              <Plus className="h-4 w-4" /> Nova mensagem
            </Button>
          </div>

          {/* Filtros */}
          <div className="mt-5 flex flex-wrap items-center gap-1.5">
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
                  'rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors',
                  filtro === f.id
                    ? 'bg-ink-900 text-white'
                    : 'bg-white text-ink-700 border border-ink-200/80 hover:border-ink-300',
                )}
              >
                {f.rotulo}
                <span className="ml-1.5 text-[10.5px] opacity-70">{contadores[f.id]}</span>
              </button>
            ))}

            <div className="mx-2 h-5 w-px bg-ink-200" />

            <select
              value={agrupamento}
              onChange={(e) => setAgrupamento(e.target.value as Agrupamento)}
              className="rounded-full border border-ink-200/80 bg-white px-3 py-1 text-[12.5px] text-ink-700 focus:outline-none"
            >
              <option value="atualizado">Atualizado</option>
              <option value="criado">Criado</option>
              <option value="tema">Tema</option>
              <option value="livro">Livro bíblico</option>
              <option value="serie">Série</option>
              <option value="status">Status</option>
            </select>

            <div className="ml-auto flex items-center gap-2 rounded-full border border-ink-200/80 bg-white px-3 py-1">
              <Search className="h-3.5 w-3.5 text-ink-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar…"
                className="w-40 bg-transparent text-[13px] outline-none placeholder:text-ink-400"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-6">
          {grupos.length === 0 && (
            <EmptyState onNova={handleNova} />
          )}

          {grupos.map(([chave, msgs]) => (
            <section key={chave} className="mb-7">
              <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                {chave}
              </h2>
              <ul className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {msgs.map((m) => (
                    <motion.li
                      key={m.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Link
                        to={`/editar/${m.id}`}
                        className="group flex items-start gap-3 rounded-xl border border-transparent bg-white px-4 py-3 transition-all hover:border-ink-200/80 hover:shadow-soft"
                      >
                        {/* Pin / favorito */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleFixa(m.id);
                          }}
                          className={cn(
                            'mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
                            fixadas.has(m.id)
                              ? 'text-amber-500'
                              : 'text-ink-300 hover:text-amber-500',
                          )}
                          aria-label="Fixar"
                        >
                          <Pin className={cn('h-3.5 w-3.5', fixadas.has(m.id) && 'fill-current')} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-[15px] font-medium text-ink-900">
                              {m.titulo || 'Sem título'}
                            </h3>
                            <StatusBadge status={m.status} />
                          </div>

                          {m.tema && (
                            <p className="mt-0.5 truncate text-[13px] text-ink-600">
                              {m.tema}
                            </p>
                          )}

                          {htmlParaTexto(m.conteudo) && (
                            <p className="mt-1.5 line-clamp-2 text-[12.5px] text-ink-500">
                              {truncar(htmlParaTexto(m.conteudo), 200)}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-500">
                            {m.textoBase && (
                              <span className="inline-flex items-center gap-1">
                                <BookOpen className="h-3 w-3" /> {m.textoBase}
                              </span>
                            )}
                            {m.livroBiblico && (
                              <span className="inline-flex items-center gap-1">
                                <Hash className="h-3 w-3" /> {m.livroBiblico}
                              </span>
                            )}
                            {m.serie && (
                              <span className="inline-flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> {m.serie}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {m.tempoEstimado} min
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formatarRelativo(m.atualizadoEm)}
                            </span>
                            {m.tags.slice(0, 3).map((t) => (
                              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px]">
                                <TagIcon className="h-2.5 w-2.5" /> {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-ink-300 transition-colors group-hover:text-ink-500" />
                      </Link>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
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
    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function EmptyState({ onNova }: { onNova: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-100 to-ink-50 text-ink-700 shadow-soft">
        <BookOpen className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-ink-900">Sua biblioteca está vazia</h3>
      <p className="mt-1 max-w-sm text-[13.5px] text-ink-500">
        Comece criando sua primeira mensagem. Tudo aqui é offline-first, então funciona sem internet.
      </p>
      <Button variant="primary" onClick={onNova} className="mt-5 h-10">
        <Plus className="h-4 w-4" /> Criar primeira mensagem
      </Button>
    </div>
  );
}