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
      // Verifica atualização a cada 60s — pega o deploy novo rápido,
      // sem esperar o usuário fechar e reabrir o app.
      onRegisteredSW(_url, registration) {
        if (!registration) return;
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60_000);
      },
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

  // Força a atualização automaticamente após um respiro curto — não trava
  // esperando o usuário notar o aviso e clicar. Só dá um tempo pra não
  // interromper no meio de uma digitação. Independe de `mostrando`: mesmo
  // se o usuário fechar o aviso (botão X = "depois, mas ainda vai atualizar
  // sozinho"), a atualização forçada acontece do mesmo jeito.
  useEffect(() => {
    if (!precisaAtualizar) return;
    const t = setTimeout(() => { void handleAtualizar(); }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precisaAtualizar]);

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
                <div className="text-[13px] font-semibold text-ink-900">Nova versão disponível</div>
                <div className="truncate text-[11.5px] text-ink-500">Atualizando automaticamente em instantes…</div>
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