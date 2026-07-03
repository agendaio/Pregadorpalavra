import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { GlobalSearch } from '@/components/library/GlobalSearch';
import { useUIStore } from '@/stores/ui';
import { useIsMobile } from '@/lib/responsive';
import { DesktopShell } from './DesktopShell';
import { cn } from '@/lib/utils';

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
  const [tecladoAberto, setTecladoAberto] = useState(false);

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

  // Some com a bottom-nav enquanto o teclado do celular está aberto — libera
  // o espaço pro card de digitar ficar sempre visível, colado acima do
  // teclado, em vez de disputar espaço com o menu.
  //
  // Usa o VisualViewport (mede o espaço realmente visível) em vez de
  // foco/blur do campo de texto: em telas de chat o campo costuma
  // permanecer focado entre mensagens (refoca sozinho após enviar), então
  // rastrear foco deixava `tecladoAberto` preso em `true` pra sempre e o
  // menu sumia de vez, sem clique nenhum funcionar mais.
  useEffect(() => {
    if (!isMobile || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => {
      const diff = window.innerHeight - vv.height;
      setTecladoAberto(diff > 120); // teclado normalmente reduz bem mais que isso
    };
    vv.addEventListener('resize', onResize);
    onResize();
    return () => vv.removeEventListener('resize', onResize);
  }, [isMobile]);

  return (
    <>
      <GlobalSearch value={buscaValue} onChange={setBuscaValue} />
      {isMobile ? (
        <div className="flex fixed inset-0 flex-col bg-paper dark:bg-paper-dark">
          <div
            className={cn(
              'flex-1 overflow-hidden',
              !tecladoAberto && 'pb-[calc(env(safe-area-inset-bottom)+72px)]',
            )}
          >
            <Outlet />
          </div>
          {!tecladoAberto && <BottomNav />}
        </div>
      ) : (
        <DesktopShell>
          <Outlet />
        </DesktopShell>
      )}
    </>
  );
}
