import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
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
const RESPIRO_ANTES_DE_APLICAR = 1200;

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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+76px)] left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/90">
            <RefreshCw className={`h-3 w-3 text-ink-600 dark:text-ink-300 ${estado.applying ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-medium text-ink-600 dark:text-ink-300">
              {estado.applying ? 'Atualizando…' : 'Atualizando…'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
