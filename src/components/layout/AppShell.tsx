import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { GlobalSearch } from '@/components/library/GlobalSearch';
import { useUIStore } from '@/stores/ui';
import { useIsMobile } from '@/lib/responsive';
import { DesktopShell } from './DesktopShell';

/**
 * Layout raiz. Decide entre mobile (bottom nav) e desktop (sidebar).
 * Toda a UI vive dentro — nada de admin dashboard em mobile.
 */
export function AppShell() {
  const isMobile = useIsMobile();
  const setBusca = useUIStore((s) => s.setBusca);

  // Ctrl/Cmd+K abre busca
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBusca(true);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [setBusca]);

  return (
    <>
      <GlobalSearch value="" onChange={() => {}} />
      {isMobile ? (
        <>
          <div className="flex h-full flex-col">
            <Outlet />
            <BottomNav />
          </div>
        </>
      ) : (
        <DesktopShell>
          <Outlet />
        </DesktopShell>
      )}
    </>
  );
}