import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
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
        'flex items-center gap-2 px-4 pt-[env(safe-area-inset-top)]',
        sticky && 'sticky top-0 z-30 bg-white/85 backdrop-blur-md',
        bordered && 'border-b border-ink-200/80',
        'h-14',
        className,
      )}
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      {back && (
        <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Voltar" className="-ml-2 flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[16px] font-semibold tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="truncate text-[11.5px] text-ink-500 -mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        {search && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setBusca(true)}
            aria-label="Buscar"
            className="flex-shrink-0"
          >
            <Search className="h-5 w-5" />
          </Button>
        )}
        {right}
      </div>
    </header>
  );
}

/** Botão de menu "Mais" comum em cabeçalhos */
export function HeaderMoreButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label="Mais opções" className="-mr-2">
      <MoreHorizontal className="h-5 w-5" />
    </Button>
  );
}