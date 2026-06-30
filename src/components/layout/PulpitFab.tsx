import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FabProps {
  /** Rota do Modo Púlpito. Se null, fica oculto. */
  to?: string | null;
  /** Label acessível */
  label?: string;
  className?: string;
}

/**
 * FAB do Modo Púlpito — sempre acima da bottom-nav, glow pulsante,
 * posição consistente em todos os layouts.
 */
export function PulpitFab({ to = '/pulpit', label = 'Abrir Modo Púlpito', className }: FabProps) {
  const navigate = useNavigate();

  if (!to) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => navigate(to)}
      aria-label={label}
      className={cn(
        'fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full',
        'bg-ink-900 text-white shadow-fab',
        'hover:bg-ink-800 active:bg-ink-700 transition-colors',
        'dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100',
        // acima da bottom-nav (72px) + safe-area
        'bottom-[calc(env(safe-area-inset-bottom)+88px)]',
        'md:bottom-6',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-ink-900/40 dark:bg-white/30 animate-pulse-soft blur-md"
      />
      <Play className="relative h-5 w-5 fill-current" />
    </motion.button>
  );
}
