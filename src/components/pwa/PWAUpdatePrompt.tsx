import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Detecta atualização do service worker e mostra prompt
 * pro usuário atualizar sem perder o que tá fazendo.
 */
export function PWAUpdatePrompt() {
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);
  const [offlinePronto, setOfflinePronto] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);
  const [mostrando, setMostrando] = useState(false);

  useEffect(() => {
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        setPrecisaAtualizar(true);
        setMostrando(true);
      },
      onOfflineReady() {
        setOfflinePronto(true);
        // mostra brevemente e some
        setTimeout(() => setOfflinePronto(false), 4000);
      },
    });
    setUpdateSW(() => update);
  }, []);

  const handleAtualizar = async () => {
    if (updateSW) {
      await updateSW(true);
      setMostrando(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {mostrando && precisaAtualizar && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+88px)] left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 shadow-ring">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ink-900 text-white">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink-900">Atualização disponível</div>
                <div className="truncate text-[11.5px] text-ink-500">Toque em atualizar pra carregar a versão mais recente.</div>
              </div>
              <Button variant="primary" onClick={handleAtualizar} className="h-8 px-3 text-[12px]">
                Atualizar
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setMostrando(false)} aria-label="Depois" className="-mr-1">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {offlinePronto && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+88px)] left-1/2 z-40 -translate-x-1/2 md:bottom-6"
          >
            <div className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11.5px] font-medium text-white shadow-ring">
              Pronto pra uso offline
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}