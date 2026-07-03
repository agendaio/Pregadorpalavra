import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMensagensStore } from '@/stores/mensagens';

interface FabProps {
  /** Rota do Modo Púlpito. Se null, fica oculto. */
  to?: string | null;
  /** Label do botão */
  label?: string;
  className?: string;
}

/**
 * Botão do Modo Púlpito — pill com ícone + rótulo, compacto e discreto
 * no canto inferior, acima da bottom-nav.
 *
 * Antes de navegar, força o auto-save (que roda com debounce de 4s) a
 * salvar na hora — sem isso, uma edição feita nos últimos segundos podia
 * ainda não estar persistida quando a apresentação abrisse.
 */
export function PulpitFab({ to = '/pulpit', label = 'Apresentar', className }: FabProps) {
  const navigate = useNavigate();
  const [salvando, setSalvando] = useState(false);

  if (!to) return null;

  const handleClick = async () => {
    setSalvando(true);
    try {
      await useMensagensStore.getState().flushSalvar();
    } finally {
      navigate(to);
    }
  };

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.1 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => void handleClick()}
      disabled={salvando}
      aria-label={label}
      className={cn(
        'fixed right-4 z-30 flex items-center gap-2 rounded-full py-2.5 pl-3 pr-4',
        'bg-ink-900 text-white shadow-fab',
        'hover:bg-ink-800 active:bg-ink-700 transition-colors',
        'dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100',
        'disabled:opacity-70',
        // discreto, mais embaixo, mas sempre acima da bottom-nav (~64px) + safe-area
        'bottom-[calc(env(safe-area-inset-bottom)+80px)]',
        'md:bottom-5',
        className,
      )}
    >
      <span className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-white/20 animate-pulse-soft blur-[3px]"
        />
        {salvando ? (
          <Loader2 className="relative h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="relative h-3.5 w-3.5 fill-current" />
        )}
      </span>
      <span className="text-[12.5px] font-semibold leading-none whitespace-nowrap">
        {salvando ? 'Salvando…' : label}
      </span>
    </motion.button>
  );
}
