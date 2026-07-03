import { motion, AnimatePresence } from 'framer-motion';
import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Snap points: 'auto' = content height, 'full' = 90vh */
  height?: 'auto' | 'lg' | 'full';
}

/**
 * Bottom-sheet nativo iOS.
 * - Drag-to-dismiss
 * - Backdrop com blur
 * - Safe-area bottom respeitada
 */
export function BottomSheet({ open, onClose, title, subtitle, children, height = 'auto' }: BottomSheetProps) {
  // Lock body scroll enquanto aberto. Sempre restaura pro vazio (não "o
  // valor anterior") — capturar/restaurar um valor arriscava deixar
  // overflow:hidden preso no body se outro lock (ex: /pulpit) se sobrepusesse.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const maxHeightClass =
    height === 'full' ? 'h-[92dvh]'
    : height === 'lg' ? 'h-[70dvh]'
    : 'max-h-[88dvh]';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative flex w-full flex-col overflow-hidden rounded-t-3xl bg-paper shadow-ring',
              'dark:bg-paper-dark',
              maxHeightClass,
            )}
          >
            {/* Handle */}
            <div className="flex flex-shrink-0 items-center justify-center pb-1 pt-3">
              <div className="h-[5px] w-9 rounded-full bg-ink-300/80 dark:bg-ink-600" />
            </div>

            {/* Header — X sempre visível, mesmo sem título */}
            <div className="flex flex-shrink-0 items-start justify-between px-5 pb-3 pt-1">
              <div className="min-w-0 flex-1">
                {title && (
                  <h2 className="text-[17px] font-semibold tracking-tight text-ink-900 dark:text-white">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="mt-0.5 text-[13px] text-ink-500 dark:text-ink-400">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-700 transition-colors hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+24px)]">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
