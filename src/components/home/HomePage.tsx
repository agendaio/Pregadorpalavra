/**
 * HomePage — Experiência ChatGPT-like para o Pregador OS.
 *
 * Desktop: chat à esquerda (65%) + CopilotOutlinePanel à direita (35%)
 * Mobile: chat full-width + CopilotOutlinePanel como bottom sheet
 *
 * A experiência é toda em torno de UM chat inteligente — o Copiloto de Pregação.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRightOpen } from 'lucide-react';
import { ChatContainer } from '@/components/copilot/ChatContainer';
import { CopilotOutlinePanel } from '@/components/copilot/CopilotOutlinePanel';
import { FolderPicker } from '@/components/copilot/FolderPicker';
import { autoGenerateSlides } from '@/lib/autoGenerateSlides';
import { useIsMobile } from '@/lib/responsive';
import { cn } from '@/lib/utils';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useCopilotOutlineStore } from '@/stores/copilotOutline';

export function HomePage() {
  const isMobile = useIsMobile();
  const [panelAberta, setPanelAberta] = useState(false);
  /** FolderPicker "mudar pasta" — disparado pelo CopilotOutlinePanel */
  const [mudarPastaOpen, setMudarPastaOpen] = useState(false);
  const outline = useCopilotOutlineStore();
  const temEsboço = outline.titulo || outline.tema || outline.pontos.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-paper dark:bg-paper-dark">
      <MobileHeader
        title="Pregador OS"
        subtitle="Assistente Ministerial"
        back={false}
        right={
          <button
            onClick={() => setPanelAberta(p => !p)}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
              panelAberta || temEsboço
                ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                : 'text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800',
            )}
          >
            <PanelRightOpen className="h-5 w-5" />
          </button>
        }
      />

      {/* Desktop: split chat + panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat — preenche toda a largura quando painel fechado (mobile) ou em desktop quando painel fechado */}
        <motion.div
          animate={{ width: isMobile ? '100%' : temEsboço && !panelAberta ? '100%' : '100%' }}
          className="flex flex-1 flex-col overflow-hidden"
          transition={{ duration: 0.2 }}
        >
          <ChatContainer onTogglePanel={() => setPanelAberta(p => !p)} />
        </motion.div>

        {/* Panel lateral — desktop */}
        {!isMobile && temEsboço && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex-shrink-0 overflow-hidden"
          >
            <CopilotOutlinePanel onChangeFolder={() => setMudarPastaOpen(true)} />
          </motion.div>
        )}

        {/* Panel lateral — desktop, quando não tem esboço (botão toggle) */}
        {!isMobile && !temEsboço && (
          <div className="flex-shrink-0 overflow-hidden">
            <EmptyOutlineHint onOpen={() => setPanelAberta(true)} />
          </div>
        )}
      </div>

      {/* Mobile: bottom sheet do outline */}
      {isMobile && temEsboço && (
        <CopilotOutlinePanel
          asBottomSheet
          onClose={() => setPanelAberta(false)}
          onChangeFolder={() => setMudarPastaOpen(true)}
        />
      )}

      {/* FolderPicker: "mudar pasta" a partir do painel */}
      <AnimatePresence>
        {mudarPastaOpen && (
          <FolderPicker
            textoSelecionado={outline.titulo || outline.textoBase || 'Esboço atual'}
            açãoLabel="Mudar Pasta"
            açãoIcon="📁"
            onConfirm={async () => {
              setMudarPastaOpen(false);
              try {
                await autoGenerateSlides(useCopilotOutlineStore.getState());
              } catch { /* ignore */ }
            }}
            onClose={() => setMudarPastaOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Hint quando ainda não tem esboço ─────────────────────────────────────

function EmptyOutlineHint({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex w-[380px] flex-col items-center justify-center border-l border-ink-200/70 bg-ink-50/50 px-6 text-center dark:border-ink-800 dark:bg-ink-900/10">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20">
        <span className="text-3xl">📋</span>
      </div>
      <p className="mb-1 text-[13px] font-medium text-ink-600 dark:text-ink-400">
        Copiloto de Pregação
      </p>
      <p className="mb-4 text-[12px] text-ink-400 dark:text-ink-500">
        Converse com o assistente e o esboço será montado automaticamente.
      </p>
      <button
        onClick={onOpen}
        className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-[12px] font-medium text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300"
      >
        <PanelRightOpen className="h-3.5 w-3.5" />
        Ver painel
      </button>
    </div>
  );
}
