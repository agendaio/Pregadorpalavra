import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { useUIStore } from '@/stores/ui';

export function Toast() {
  const toast = useUIStore((s) => s.toast);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-ink-200/80 bg-white px-4 py-2.5 text-sm shadow-ring"
          >
            {toast.tipo === 'sucesso' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            {toast.tipo === 'erro' && <AlertCircle className="h-4 w-4 text-accent" />}
            {toast.tipo === 'info' && <Info className="h-4 w-4 text-ink-500" />}
            <span className="text-ink-800">{toast.mensagem}</span>
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