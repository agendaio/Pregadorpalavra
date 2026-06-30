import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui';

interface HeaderProps {
  title: string;
  subtitle?: string;
  /** Ação de voltar (default: history.back) */
  back?: boolean | (() => void);
  /** Rota específica para voltar (sobrepõe history.back) */
  to?: string;
  /** Menu/botão direito customizado */
  right?: ReactNode;
  /** Sticky com fundo translúcido */
  sticky?: boolean;
  /** Mostra borda inferior */
  bordered?: boolean;
  /** Mostra botão de busca (default: true em mobile) */
  search?: boolean;
  className?: string;
}

/**
 * Header mobile estilo app nativo.
 * - Sticky translúcido com backdrop-filter (iOS)
 * - Altura uniforme 56pt + safe-area top
 * - Botão voltar (44pt área de toque)
 */
export function MobileHeader({
  title,
  subtitle,
  back = true,
  to,
  right,
  sticky = true,
  bordered = true,
  search = true,
  className,
}: HeaderProps) {
  const navigate = useNavigate();
  const setBusca = useUIStore((s) => s.setBusca);

  const handleBack = () => {
    if (typeof back === 'function') back();
    else if (to) navigate(to);
    else if (back) navigate(-1);
  };

  return (
    <header
      className={cn(
        'flex items-center gap-2 px-4 pt-safe',
        sticky && 'sticky top-0 z-30 ios-blur',
        bordered && 'border-b border-ink-200/70 dark:border-ink-800',
        'h-14 min-h-[56px]',
        className,
      )}
    >
      {back && (
        <button
          onClick={handleBack}
          aria-label="Voltar"
          className="-ml-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 active:bg-ink-200 dark:text-ink-200 dark:hover:bg-ink-800/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-ink-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="-mt-0.5 truncate text-[12px] text-ink-500 dark:text-ink-400">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-0.5">
        {search && (
          <button
            onClick={() => setBusca(true)}
            aria-label="Buscar"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700 active:bg-ink-200 dark:text-ink-400 dark:hover:bg-ink-800/60"
          >
            <Search className="h-5 w-5" />
          </button>
        )}
        {right}
      </div>
    </header>
  );
}

/** Botão de menu "Mais" comum em cabeçalhos */
export function HeaderMoreButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Mais opções"
      className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 active:bg-ink-200 dark:text-ink-200 dark:hover:bg-ink-800/60"
    >
      <MoreHorizontal className="h-5 w-5" />
    </button>
  );
}
