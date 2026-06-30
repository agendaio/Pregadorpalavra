import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { GlobalSearch } from '@/components/library/GlobalSearch';
import { useUIStore } from '@/stores/ui';
import { useIsMobile } from '@/lib/responsive';
import { DesktopShell } from './DesktopShell';

/**
 * AppShell decide entre mobile (BottomNav) e desktop (sidebar).
 *
 * Em mobile a primeira renderização usa `useIsMobile()` que detecta via
 * `matchMedia('(max-width: 767px)')` — abaixo de 768px é tratado como
 * dispositivo touch-first. Em tablet (≥768px) cai pro DesktopShell.
 */
export function AppShell() {
  const isMobile = useIsMobile();
  const setBusca = useUIStore((s) => s.setBusca);
  const [buscaValue, setBuscaValue] = useState('');

  // Cmd/Ctrl+K abre busca
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
      <GlobalSearch value={buscaValue} onChange={setBuscaValue} />
      {isMobile ? (
        <div className="flex h-full min-h-screen-dvh flex-col bg-paper dark:bg-paper-dark">
          <div className="flex-1 pb-[calc(env(safe-area-inset-bottom)+72px)]">
            <Outlet />
          </div>
          <BottomNav />
        </div>
      ) : (
        <DesktopShell>
          <Outlet />
        </DesktopShell>
      )}
    </>
  );
}
