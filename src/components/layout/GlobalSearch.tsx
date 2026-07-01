import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, BookOpen, Tag as TagIcon, Hash, Calendar, Sparkles } from 'lucide-react';
import { db } from '@/db/schema';
import { useUIStore } from '@/stores/ui';
import { buscar, type ResultadoBusca } from '@/lib/search';
import { cn, formatarRelativo, htmlParaTexto } from '@/lib/utils';
import type { Mensagem } from '@/types/mensagem';

export function GlobalSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const aberta = useUIStore((s) => s.buscaAberta);
  const setBusca = useUIStore((s) => s.setBusca);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const mensagens = useLiveQuery(() => db.mensagens.toArray(), []);
  const todas: Mensagem[] = useMemo(() => mensagens ?? [], [mensagens]);

  const [selecionado, setSelecionado] = useState(0);

  const resultados = useMemo(() => {
    if (!value.trim()) return [];
    return buscar(todas, value).slice(0, 8);
  }, [value, todas]);

  useEffect(() => {
    if (aberta) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      onChange('');
      setSelecionado(0);
    }
  }, [aberta, onChange]);

  useEffect(() => setSelecionado(0), [value]);

  const irPara = (m: Mensagem) => {
    setBusca(false);
    navigate(`/editar/${m.id}`);
  };

  // atalhos ↑ ↓ Enter Esc
  useEffect(() => {
    if (!aberta) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelecionado((s) => Math.min(resultados.length - 1, s + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelecionado((s) => Math.max(0, s - 1));
      } else if (e.key === 'Enter' && resultados[selecionado]) {
        e.preventDefault();
        irPara(resultados[selecionado].mensagem);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setBusca(false);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [aberta, resultados, selecionado, navigate, setBusca]);

  return (
    <AnimatePresence>
      {aberta && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/30 backdrop-blur-sm p-4 pt-[10vh]"
          onClick={() => setBusca(false)}
        >
          <motion.div
            initial={{ y: -8, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -4, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[640px] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-ring"
          >
            {/* Input */}
            <div className="flex items-center gap-3 border-b border-ink-200/80 px-4">
              <Search className="h-4 w-4 text-ink-500" />
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Buscar mensagem, tema, versículo, ilustracao…"
                className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-400"
              />
              <kbd className="font-mono text-[10px] text-ink-400">ESC</kbd>
            </div>

            {/* Resultados */}
            <div className="max-h-[60vh] overflow-y-auto">
              {!value.trim() && (
                <div className="px-4 py-10 text-center text-sm text-ink-500">
                  <Search className="mx-auto mb-3 h-5 w-5 text-ink-400" />
                  Comece a digitar para buscar.
                  <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-ink-400">
                    <Sparkles className="h-3 w-3" />
                    Busca instantânea em {todas.length} mensagens
                  </div>
                </div>
              )}

              {value.trim() && resultados.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-ink-500">
                  Nada encontrado para "{value}".
                </div>
              )}

              {resultados.map((r, i) => (
                <button
                  key={r.mensagem.id}
                  onClick={() => irPara(r.mensagem)}
                  onMouseEnter={() => setSelecionado(i)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                    i === selecionado ? 'bg-ink-50' : 'hover:bg-ink-50/60',
                    i > 0 && 'border-t border-ink-100',
                  )}
                >
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-[14px] font-medium text-ink-900">
                        {r.mensagem.titulo || 'Sem título'}
                      </div>
                      <span className="text-[11px] text-ink-400">· {formatarRelativo(r.mensagem.atualizadoEm)}</span>
                    </div>
                    {r.mensagem.tema && (
                      <div className="truncate text-[12.5px] text-ink-600">{r.mensagem.tema}</div>
                    )}
                    {r.trecho && (
                      <div className="mt-1 truncate text-[12px] text-ink-500">
                        {r.trecho}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-500">
                      {r.mensagem.livroBiblico && (
                        <span className="inline-flex items-center gap-1">
                          <Hash className="h-3 w-3" /> {r.mensagem.livroBiblico}
                        </span>
                      )}
                      {r.mensagem.versiculos[0] && (
                        <span className="inline-flex items-center gap-1">
                          {r.mensagem.versiculos[0].livro} {r.mensagem.versiculos[0].capitulo}:
                          {r.mensagem.versiculos[0].versiculos}
                        </span>
                      )}
                      {r.mensagem.tags[0] && (
                        <span className="inline-flex items-center gap-1">
                          <TagIcon className="h-3 w-3" /> {r.mensagem.tags[0]}
                        </span>
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 text-ink-400">
                        <Calendar className="h-3 w-3" /> score {r.score.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-ink-200/80 bg-ink-50/40 px-4 py-2 text-[11px] text-ink-500">
              <div className="flex items-center gap-3">
                <span><kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> navegar</span>
                <span><kbd className="font-mono">↵</kbd> abrir</span>
              </div>
              <span>{resultados.length} resultados</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper para uso em outras telas (não usar JSX para não quebrar imports cíclicos)
export function resumoMensagem(m: Mensagem): string {
  return htmlParaTexto(m.conteudo) || m.tema || m.titulo || '';
}
