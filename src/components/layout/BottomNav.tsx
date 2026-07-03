import { NavLink, useLocation } from 'react-router-dom';
import { Library, Sparkles, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS: ReadonlyArray<{
  to: string;
  label: string;
  icon: typeof Library;
  end?: boolean;
}> = [
  // Assistente é a tela principal (raiz). Início saiu do menu.
  { to: '/',           label: 'Assistente',  icon: Sparkles,       end: true },
  { to: '/biblioteca', label: 'Biblioteca',  icon: Library },
  { to: '/mais',       label: 'Mais',        icon: MoreHorizontal },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      className="ios-blur fixed bottom-0 left-0 right-0 z-40 border-t border-ink-200/60 pb-safe dark:border-ink-800"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-around px-1 pt-1.5 pb-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.end
              ? location.pathname === '/'
              : location.pathname === tab.to || location.pathname.startsWith(tab.to + '/');
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors active:scale-95',
                isActive
                  ? 'bg-ink-900/5 dark:bg-white/10'
                  : 'hover:bg-ink-50 dark:hover:bg-white/5',
              )}
            >
              <Icon
                className={cn(
                  'h-[22px] w-[22px] transition-colors duration-150',
                  isActive ? 'text-ink-900 dark:text-white' : 'text-ink-500 dark:text-ink-400',
                )}
                strokeWidth={isActive ? 2.4 : 1.8}
              />
              <span
                className={cn(
                  'transition-colors duration-150',
                  isActive ? 'text-ink-900 dark:text-white' : 'text-ink-500 dark:text-ink-400',
                )}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
