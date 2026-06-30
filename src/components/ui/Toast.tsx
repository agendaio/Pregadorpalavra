import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { useUIStore } from '@/stores/ui';

export function Toast() {
  const toast = useUIStore((s) => s.toast);
  return (
    <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] left-1/2 z-50 -translate-x-1/2 md:bottom-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={cn(
              'pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-ink-200/80 bg-white/95 px-4 py-2.5 text-[13.5px] shadow-ring backdrop-blur-md',
              'dark:bg-ink-900/95 dark:border-ink-800',
            )}
          >
            {toast.tipo === 'sucesso' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            {toast.tipo === 'erro' && <AlertCircle className="h-4 w-4 text-accent" />}
            {toast.tipo === 'info' && <Info className="h-4 w-4 text-ink-500" />}
            <span className="text-ink-800 dark:text-ink-100">{toast.mensagem}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Hook utilitário para mostrar toast e fechar automaticamente */
export function useAutoToast(mensagem: string, duracao = 2000) {
  const mostrar = useUIStore((s) => s.mostrarToast);
  useEffect(() => {
    mostrar(mensagem);
    const t = setTimeout(() => {}, duracao);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagem]);
}

export function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
