/**
 * FolderPicker — Modal profissional para selecionar ou criar
 * uma pasta de esboço quando o usuário adiciona texto da IA.
 *
 * Fluxo:
 * 1. Lista pastas existentes com preview de conteúdo
 * 2. Permite criar nova pasta inline
 * 3. Ao selecionar, define a pasta no outline store
 * 4. Auto-gera slide do texto selecionado
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Folder, FolderOpen, Check, Search, Trash2,
  Loader2, ChevronRight, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOutlineFolders, type PastaOutline } from './useOutlineFolders';
import { useCopilotOutlineStore } from '@/stores/copilotOutline';
import type { SeleçãoAção } from '@/types/copilotOutline';

const CORES_DISPONIVEIS = [
  { cor: '#7c3aed', label: 'Roxo' },
  { cor: '#0891b2', label: 'Azul' },
  { cor: '#059669', label: 'Verde' },
  { cor: '#dc2626', label: 'Vermelho' },
  { cor: '#d97706', label: 'Laranja' },
  { cor: '#db2777', label: 'Rosa' },
  { cor: '#4f46e5', label: 'Índigo' },
  { cor: '#ea580c', label: 'Âmbar' },
];

interface FolderPickerProps {
  /** Texto selecionado pelo usuário */
  textoSelecionado: string;
  /** Texto/razão da ação que disparou o picker */
  açãoLabel: string;
  açãoIcon: string;
  /** Callback quando o usuário confirma (pasta selecionada/criada) */
  onConfirm: (pastaId: string, pastaNome: string) => void;
  onClose: () => void;
}

export function FolderPicker({
  textoSelecionado,
  açãoLabel,
  açãoIcon,
  onConfirm,
  onClose,
}: FolderPickerProps) {
  const { pastas, carregando, criarPasta, deletarPasta } = useOutlineFolders();
  const store = useCopilotOutlineStore();

  const [modoCriar, setModoCriar] = useState(false);
  const [novaPastaNome, setNovaPastaNome] = useState('');
  const [corSelecionada, setCorSelecionada] = useState(CORES_DISPONIVEIS[0].cor);
  const [criando, setCriando] = useState(false);
  const [busca, setBusca] = useState('');
  const [pastaSelecionada, setPastaSelecionada] = useState<string | null>(
    store.pastaId ?? null,
  );
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco automático no input ao abrir modo criar
  useEffect(() => {
    if (modoCriar) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [modoCriar]);

  // Fechar no Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const pastasFiltradas = pastas.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  const handleCriar = async () => {
    if (!novaPastaNome.trim() || criando) return;
    setCriando(true);
    try {
      const id = await criarPasta(novaPastaNome.trim(), corSelecionada);
      setPastaSelecionada(id);
      setNovaPastaNome('');
      setModoCriar(false);
    } finally {
      setCriando(false);
    }
  };

  const handleConfirmar = () => {
    const pasta = pastas.find((p) => p.id === pastaSelecionada);
    if (!pastaSelecionada || !pasta) return;

    // Define pasta no store
    store.setPasta(pasta.id, pasta.nome, pasta.cor);

    // Adiciona o item selecionado ao outline (conforme ação)
    if (açãoLabel.includes('Ponto')) {
      store.addPonto(textoSelecionado.trim());
    } else if (açãoLabel.includes('Subponto')) {
      const pontos = store.pontos;
      if (pontos.length > 0) {
        store.addSubponto(pontos[pontos.length - 1].id, textoSelecionado.trim());
      } else {
        store.addPonto(textoSelecionado.trim());
      }
    } else if (açãoLabel.includes('Introdução')) {
      store.patchIntroducao(
        (store.introducao ? store.introducao + '\n\n' : '') + textoSelecionado.trim(),
      );
    } else if (açãoLabel.includes('Conclusão')) {
      store.patchConclusao(
        (store.conclusao ? store.conclusao + '\n\n' : '') + textoSelecionado.trim(),
      );
    } else if (açãoLabel.includes('Aplicação')) {
      const pontos = store.pontos;
      if (pontos.length > 0) {
        store.addAplicacao(pontos[pontos.length - 1].id, textoSelecionado.trim());
      } else {
        store.addPonto(textoSelecionado.trim());
      }
    } else if (açãoLabel.includes('Esboço')) {
      // Padrão: adiciona como ponto
      store.addPonto(textoSelecionado.trim());
    }

    onConfirm(pastaSelecionada, pasta.nome);
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={backdropRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === backdropRef.current) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-2xl dark:border-ink-800 dark:bg-ink-900"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-lg dark:bg-violet-900/50">
                {açãoIcon}
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-ink-900 dark:text-white">
                  {açãoLabel}
                </h2>
                <p className="text-[11px] text-ink-400 dark:text-ink-500">
                  Selecione ou crie uma pasta
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-ink-400 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Preview do texto ── */}
          <div className="mx-5 mt-4 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-2.5 dark:border-violet-900/40 dark:bg-violet-950/30">
            <p className="line-clamp-2 text-[12px] text-violet-700 dark:text-violet-300">
              <Sparkles className="mr-1.5 inline h-3 w-3" />
              "{textoSelecionado.slice(0, 120)}
              {textoSelecionado.length > 120 ? '…' : ''}"
            </p>
          </div>

          {/* ── Buscar pasta ── */}
          {!modoCriar && (
            <div className="mx-5 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar pasta…"
                  className="w-full rounded-xl border border-ink-200 bg-ink-50 py-2.5 pl-10 pr-4 text-[13px] text-ink-900 outline-none transition-colors focus:border-violet-400 focus:bg-white dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:placeholder:text-ink-500"
                />
              </div>
            </div>
          )}

          {/* ── Lista de pastas ── */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {carregando ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
              </div>
            ) : pastasFiltradas.length === 0 && !modoCriar ? (
              <div className="py-6 text-center">
                <Folder className="mx-auto mb-2 h-8 w-8 text-ink-200 dark:text-ink-700" />
                <p className="text-[13px] text-ink-400">Nenhuma pasta ainda.</p>
                <p className="mt-1 text-[11px] text-ink-300">
                  Crie uma abaixo para organizar seus esboços.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pastasFiltradas.map((pasta) => (
                  <button
                    key={pasta.id}
                    onClick={() => setPastaSelecionada(pasta.id)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all',
                      pastaSelecionada === pasta.id
                        ? 'border-2 border-violet-400 bg-violet-50 dark:bg-violet-950/40'
                        : 'border border-transparent hover:border-ink-200 hover:bg-ink-50 dark:hover:border-ink-700 dark:hover:bg-ink-800/50',
                    )}
                  >
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base"
                      style={{ backgroundColor: pasta.cor + '20', color: pasta.cor }}
                    >
                      {pastaSelecionada === pasta.id ? (
                        <FolderOpen className="h-5 w-5" />
                      ) : (
                        <Folder className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-ink-900 dark:text-white">
                        {pasta.nome}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-ink-400">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: pasta.cor }}
                        />
                        {pasta.mensagemCount} esboço{pasta.mensagemCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {pastaSelecionada === pasta.id && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* ── Criar nova pasta ── */}
            {modoCriar ? (
              <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
                <div className="mb-3">
                  <label className="mb-1.5 block text-[11px] font-medium text-ink-600 dark:text-ink-400">
                    Nome da pasta
                  </label>
                  <input
                    ref={inputRef}
                    value={novaPastaNome}
                    onChange={(e) => setNovaPastaNome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleCriar();
                      if (e.key === 'Escape') setModoCriar(false);
                    }}
                    placeholder="Ex: Pregações de Julho, Estudos Romanos…"
                    className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-[13px] text-ink-900 outline-none transition-colors focus:border-violet-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-2 block text-[11px] font-medium text-ink-600 dark:text-ink-400">
                    Cor
                  </label>
                  <div className="flex gap-2">
                    {CORES_DISPONIVEIS.map(({ cor }) => (
                      <button
                        key={cor}
                        onClick={() => setCorSelecionada(cor)}
                        className={cn(
                          'h-8 w-8 rounded-xl transition-all',
                          corSelecionada === cor
                            ? 'ring-2 ring-offset-2 ring-violet-500 dark:ring-offset-ink-900'
                            : 'opacity-60 hover:opacity-100',
                        )}
                        style={{ backgroundColor: cor }}
                        title={cor}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModoCriar(false)}
                    className="flex-1 rounded-xl border border-ink-200 py-2.5 text-[12.5px] font-medium text-ink-600 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => void handleCriar()}
                    disabled={!novaPastaNome.trim() || criando}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                  >
                    {criando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {criando ? 'Criando…' : 'Criar pasta'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setModoCriar(true)}
                className="mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-ink-300 px-4 py-3 text-[13px] text-ink-500 transition-colors hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-600 dark:border-ink-700 dark:text-ink-400 dark:hover:border-violet-700 dark:hover:bg-violet-950/20"
              >
                <Plus className="h-4 w-4" />
                Nova pasta de esboços
              </button>
            )}
          </div>

          {/* ── Footer: ações ── */}
          <div className="border-t border-ink-100 px-5 py-4 dark:border-ink-800">
            <div className="flex items-center justify-between">
              {pastaSelecionada ? (
                <span className="text-[11.5px] text-ink-400">
                  Pasta selecionada
                </span>
              ) : (
                <span className="text-[11.5px] text-ink-400">
                  Selecione uma pasta ou crie uma nova
                </span>
              )}
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-ink-200 px-4 py-2 text-[12.5px] font-medium text-ink-600 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void handleConfirmar()}
                  disabled={!pastaSelecionada}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Adicionar à pasta
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
