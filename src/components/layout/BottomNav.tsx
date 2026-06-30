import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Library, ScrollText, Sparkles, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library },
  { to: '/esbocos', label: 'Esboços', icon: ScrollText },
  { to: '/assistente', label: 'Assistente', icon: Sparkles },
  { to: '/mais', label: 'Mais', icon: MoreHorizontal },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-200/80 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-around px-1 pt-1.5 pb-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10.5px] font-medium transition-colors',
                  isActive ? 'text-ink-900' : 'text-ink-500 hover:text-ink-700',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="bottomnav-pill"
                      className="absolute inset-x-2 inset-y-0.5 rounded-xl bg-ink-100"
                      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                    />
                  )}
                  <Icon className="relative h-[19px] w-[19px]" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className="relative">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}