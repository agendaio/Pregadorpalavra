import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Search, Library, X, Check, ChevronRight, Folder,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { cn } from '@/lib/utils';

interface Props {
  aberto: boolean;
  conteudo: string;
  onClose: () => void;
  /** Chamado quando o usuário escolhe uma mensagem existente para anexar */
  onSalvarEm?: (mensagemId: string) => void;
  /** Chamado quando o usuário cria uma nova mensagem */
  onCriarNova?: (titulo: string, serie?: string) => void;
  /** Modo: 'esboco' (default) anexa ao esboço; 'conteudo' anexa ao conteúdo */
  modo?: 'esboco' | 'conteudo' | 'observacao';
}

export function SalvarComoSheet({
  aberto, conteudo, onClose, onSalvarEm, onCriarNova, modo = 'esboco',
}: Props) {
  const [aba, setAba] = useState<'existente' | 'nova'>('nova');
  const [titulo, setTitulo] = useState('');
  const [serie, setSerie] = useState('');
  const [busca, setBusca] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const mensagens = useLiveQuery(
    () => db.mensagens.orderBy('atualizadoEm').reverse().limit(20).toArray(),
    [],
  ) ?? [];

  const filtradas = busca
    ? mensagens.filter((m) => m.titulo.toLowerCase().includes(busca.toLowerCase())
      || (m.textoBase ?? '').toLowerCase().includes(busca.toLowerCase())
      || (m.tema ?? '').toLowerCase().includes(busca.toLowerCase()))
    : mensagens;

  useEffect(() => {
    if (aberto) {
      setAba('nova');
      setTitulo('');
      setSerie('');
      setBusca('');
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [aberto]);

  const criarNova = () => {
    if (!titulo.trim()) return;
    onCriarNova?.(titulo.trim(), serie.trim() || undefined);
  };

  return (
    <AnimatePresence>
      {aberto && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-ink-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-200/70 px-5 py-4 dark:border-ink-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <Library className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold tracking-tight text-ink-900 dark:text-white">
                    Salvar na biblioteca
                  </h2>
                  <p className="text-[11.5px] text-ink-500 dark:text-ink-400">
                    Escolha uma mensagem existente ou crie nova
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-ink-200/70 bg-ink-50/40 px-4 py-2 dark:border-ink-800 dark:bg-ink-900/40">
              <button
                onClick={() => setAba('nova')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-medium transition-all',
                  aba === 'nova'
                    ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-800 dark:text-white'
                    : 'text-ink-600 hover:text-ink-900 dark:text-ink-400',
                )}
              >
                <Plus className="h-3.5 w-3.5" /> Nova mensagem
              </button>
              <button
                onClick={() => setAba('existente')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-medium transition-all',
                  aba === 'existente'
                    ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-800 dark:text-white'
                    : 'text-ink-600 hover:text-ink-900 dark:text-ink-400',
                )}
              >
                <Folder className="h-3.5 w-3.5" /> Em existente
              </button>
            </div>

            <div className="max-h-[calc(88vh-160px)] overflow-y-auto px-5 py-4">
              {aba === 'nova' && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
                      Título da mensagem *
                    </label>
                    <input
                      ref={inputRef}
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex: A graça que nos alcança"
                      className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[14px] text-ink-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
                      Série <span className="text-ink-400 normal-case font-normal">(opcional)</span>
                    </label>
                    <input
                      value={serie}
                      onChange={(e) => setSerie(e.target.value)}
                      placeholder="Ex: Carta aos Romanos"
                      className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[14px] text-ink-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 dark:border-ink-700 dark:bg-ink-900/40 dark:text-white"
                    />
                  </div>
                  <div className="rounded-xl bg-violet-50 p-3 text-[11.5px] leading-relaxed text-violet-900 dark:bg-violet-500/10 dark:text-violet-200">
                    <strong>Como vai funcionar:</strong> a IA vai criar uma mensagem na biblioteca
                    com o título acima, marcar o modo <em>{modo === 'esboco' ? 'esboço' : 'conteúdo'}</em>
                    e abrir o editor com o conteúdo já inserido. Você pode editar antes de salvar.
                  </div>
                </div>
              )}

              {aba === 'existente' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 dark:border-ink-700 dark:bg-ink-900/40">
                    <Search className="h-4 w-4 text-ink-400" />
                    <input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar mensagem…"
                      className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    {filtradas.length === 0 && (
                      <p className="py-8 text-center text-[12.5px] text-ink-500">
                        Nenhuma mensagem encontrada
                      </p>
                    )}
                    {filtradas.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onSalvarEm?.(m.id)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-ink-200/80 bg-white p-3 text-left transition-all hover:border-violet-400 hover:bg-violet-50/50 active:scale-[0.98] dark:border-ink-800 dark:bg-ink-900/40 dark:hover:border-violet-500 dark:hover:bg-violet-500/10"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-semibold text-ink-900 dark:text-white">
                            {m.titulo || 'Sem título'}
                          </div>
                          <div className="truncate text-[11px] text-ink-500 dark:text-ink-400">
                            {m.textoBase || m.tema || '—'}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-ink-200/70 bg-ink-50/40 px-5 py-3 dark:border-ink-800 dark:bg-ink-900/40">
              {aba === 'nova' && (
                <button
                  onClick={criarNova}
                  disabled={!titulo.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-[13.5px] font-semibold text-white transition-all hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Criar e abrir no editor
                </button>
              )}
              {aba === 'existente' && (
                <p className="text-center text-[11.5px] text-ink-500 dark:text-ink-400">
                  Toque em uma mensagem para anexar o conteúdo
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}