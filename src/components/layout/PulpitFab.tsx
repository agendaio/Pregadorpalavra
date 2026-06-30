import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FabProps {
  /** Rota do Modo Púlpito. Se null, fica oculto. */
  to?: string | null;
  /** Label acessível */
  label?: string;
  /** Posição customizada (default: bottom-right acima da bottom-nav) */
  className?: string;
}

/**
 * Botão flutuante de alta visibilidade para o Modo Púlpito.
 * Posição fixa, não some durante rolagem, sempre visível.
 */
export function PulpitFab({ to = '/pulpit', label = 'Abrir Modo Púlpito', className }: FabProps) {
  const navigate = useNavigate();

  if (!to) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.1 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => navigate(to)}
      aria-label={label}
      className={cn(
        'fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full',
        'bg-ink-900 text-white shadow-[0_8px_32px_rgba(13,13,12,0.28)]',
        'hover:bg-ink-800 active:bg-ink-700 transition-colors',
        // posicionamento responsivo: acima da bottom nav em mobile, canto em desktop
        'bottom-[calc(env(safe-area-inset-bottom)+80px)]',
        'md:bottom-6',
        className,
      )}
    >
      <span className="absolute inset-0 rounded-full bg-ink-900 animate-pulse-soft opacity-30" aria-hidden />
      <Play className="relative h-5 w-5 fill-current" />
    </motion.button>
  );
}