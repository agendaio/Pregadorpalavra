import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  startUpdateManager,
  subscribeUpdates,
  applyUpdate,
  type UpdateState,
} from '@/lib/updateManager';

/**
 * Aviso discreto de nova versão. Toda a lógica de detecção/aplicação vive no
 * updateManager — aqui só refletimos o estado e oferecemos um botão opcional.
 *
 * Comportamento: quando uma versão nova é detectada, mostramos um aviso sutil
 * e, após um respiro curto (pra não interromper uma digitação), aplicamos
 * automaticamente. O usuário nunca é obrigado a interagir; login, sessão,
 * tema e dados locais são preservados no reload.
 */
const RESPIRO_ANTES_DE_APLICAR = 4000;

export function PWAUpdatePrompt() {
  const [estado, setEstado] = useState<UpdateState>({ updateAvailable: false, applying: false });

  useEffect(() => {
    startUpdateManager();
    return subscribeUpdates(setEstado);
  }, []);

  // Auto-aplica após um respiro curto. Independe de o usuário ter visto o aviso.
  useEffect(() => {
    if (!estado.updateAvailable || estado.applying) return;
    const t = setTimeout(() => { void applyUpdate(); }, RESPIRO_ANTES_DE_APLICAR);
    return () => clearTimeout(t);
  }, [estado.updateAvailable, estado.applying]);

  return (
    <AnimatePresence>
      {estado.updateAvailable && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+88px)] left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 shadow-ring dark:border-ink-800 dark:bg-ink-900">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ink-900 text-white dark:bg-white dark:text-ink-950">
              <RefreshCw className={`h-4 w-4 ${estado.applying ? 'animate-spin' : ''}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink-900 dark:text-white">
                Nova versão disponível
              </div>
              <div className="truncate text-[11.5px] text-ink-500 dark:text-ink-400">
                {estado.applying ? 'Atualizando…' : 'Atualizando automaticamente em instantes…'}
              </div>
            </div>
            {!estado.applying && (
              <Button
                variant="primary"
                onClick={() => void applyUpdate()}
                className="h-8 px-3 text-[12px]"
              >
                Atualizar
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
