/**
 * SelectionMenu — Menu flutuante que aparece ao selecionar texto
 * em uma mensagem da IA. Permite adicionar ao esboço, copiar, editar, etc.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { SeleçãoAção } from '@/types/copilotOutline';

interface SelectionMenuProps {
  selectedText: string;
  position: { x: number; y: number };
  /** Chamado quando usuário clica em qualquer ação do menu.
   * Para ações de esboço, o ChatContainer abre o FolderPicker.
   * Para ações utilitárias (copiar, etc.), pode ser tratada inline aqui. */
  onAction: (ação: SeleçãoAção, text: string) => void;
  onClose: () => void;
}

export function SelectionMenu({ selectedText, position, onAction, onClose }: SelectionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeGroup, setActiveGroup] = useState<'outline' | 'content' | 'utility'>('outline');

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Fecha ao apertar Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Ajusta posição para não sair da tela
  const [adjustedPos, setAdjustedPos] = useState(position);
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = position.x;
      let y = position.y + 8;
      if (x + rect.width > vw - 8) x = vw - rect.width - 8;
      if (x < 8) x = 8;
      if (y + rect.height > vh - 8) y = position.y - rect.height - 8;
      setAdjustedPos({ x, y });
    }
  }, [position]);

  const handleAction = (action: SeleçãoAção) => {
    if (!selectedText.trim()) return;

    // Ações que abrem o FolderPicker (delegam ao parent)
    const açõesDeEsboço: SeleçãoAção[] = [
      'adicionar_esboco', 'adicionar_introducao', 'adicionar_ponto',
      'adicionar_subponto', 'adicionar_aplicacao', 'adicionar_ilustracao',
      'adicionar_conclusao', 'adicionar_referencia',
    ];

    if (açõesDeEsboço.includes(action)) {
      // Delegar para o parent (ChatContainer → FolderPicker)
      onAction(action, selectedText.trim());
      return; // NÃO modifica o store aqui — o FolderPicker faz isso no onConfirm
    }

    // Ações utilitárias — tratadas inline
    switch (action) {
      case 'copiar':
        navigator.clipboard.writeText(selectedText.trim());
        break;
      case 'editar':
        navigator.clipboard.writeText(selectedText.trim());
        break;
      case 'reescrever':
      case 'expandir':
      case 'compartilhar':
      case 'favoritar':
        // Por enquanto só notificam o parent
        break;
    }
    onAction(action, selectedText.trim());
  };

  const groups = {
    outline: [
      { id: 'adicionar_esboco', label: 'Adicionar ao Esboço', icon: '📋' },
      { id: 'adicionar_introducao', label: 'Introdução', icon: '📖' },
      { id: 'adicionar_ponto', label: 'Ponto', icon: '1️⃣' },
      { id: 'adicionar_subponto', label: 'Subponto', icon: '2️⃣' },
      { id: 'adicionar_aplicacao', label: 'Aplicação', icon: '✅' },
      { id: 'adicionar_ilustracao', label: 'Ilustração', icon: '💡' },
      { id: 'adicionar_conclusao', label: 'Conclusão', icon: '🏁' },
    ] as const,
    content: [
      { id: 'editar', label: 'Editar', icon: '✏️' },
      { id: 'reescrever', label: 'Reescrever', icon: '🔄' },
      { id: 'expandir', label: 'Expandir', icon: '📖' },
    ] as const,
    utility: [
      { id: 'copiar', label: 'Copiar', icon: '📋' },
      { id: 'compartilhar', label: 'Compartilhar', icon: '🔗' },
      { id: 'favoritar', label: 'Favoritar', icon: '⭐' },
    ] as const,
  };

  const currentGroup = groups[activeGroup];

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.12 }}
        className="fixed z-50"
        style={{ left: adjustedPos.x, top: adjustedPos.y }}
      >
        <div className="flex flex-col rounded-2xl border border-ink-200/80 bg-white shadow-xl dark:border-ink-700 dark:bg-ink-900 overflow-hidden min-w-[200px]">
          {/* Tabs de grupo */}
          <div className="flex border-b border-ink-100 dark:border-ink-800">
            {(['outline', 'content', 'utility'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={cn(
                  'flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors',
                  activeGroup === g
                    ? 'bg-ink-50 text-ink-900 dark:bg-ink-800 dark:text-white border-b-2 border-ink-900 dark:border-white'
                    : 'text-ink-400 hover:text-ink-700 dark:text-ink-500 dark:hover:text-ink-300',
                )}
              >
                {g === 'outline' ? '📋 Esboço' : g === 'content' ? '✏️ Conteúdo' : '🔧 Util'}
              </button>
            ))}
          </div>

          {/* Items */}
          <div className="p-1.5">
            {currentGroup.map((item) => (
              <button
                key={item.id}
                onClick={() => void handleAction(item.id as SeleçãoAção)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] text-ink-700 transition-colors hover:bg-ink-50 active:scale-[0.98] dark:text-ink-200 dark:hover:bg-ink-800"
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Preview do texto selecionado */}
          <div className="border-t border-ink-100 px-3 py-1.5 dark:border-ink-800">
            <p className="truncate text-[10px] text-ink-400 dark:text-ink-500">
              "{selectedText.slice(0, 60)}{selectedText.length > 60 ? '…' : ''}"
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
