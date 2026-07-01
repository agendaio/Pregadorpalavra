import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS: ReadonlyArray<{
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}> = [
  { to: '/',        label: 'Início',   icon: Home,      end: true },
  { to: '/esbocos', label: 'Esboços', icon: ScrollText },
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
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors active:scale-95"
            >
              {isActive && (
                <motion.span
                  layoutId="bottomnav-pill"
                  className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-ink-900/5 dark:bg-white/10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  'relative h-[22px] w-[22px] transition-colors duration-150',
                  isActive ? 'text-ink-900 dark:text-white' : 'text-ink-500 dark:text-ink-400',
                )}
                strokeWidth={isActive ? 2.4 : 1.8}
              />
              <span
                className={cn(
                  'relative transition-colors duration-150',
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
