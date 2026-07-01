import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Library,
  Compass,
  Sparkles,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Settings as SettingsIcon,
  Plus,
  Home,
  ScrollText,
  MoreHorizontal,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui';
import { useMensagensStore } from '@/stores/mensagens';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/v.config';

const NAV = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library },
  { to: '/esbocos', label: 'Esboços', icon: ScrollText },
  { to: '/assistente', label: 'Assistente', icon: Sparkles },
  { to: '/estudo', label: 'Estudo', icon: Compass },
  { to: '/analista', label: 'Analista', icon: Sparkles },
  { to: '/mais', label: 'Mais', icon: MoreHorizontal },
];

export function DesktopShell({ children }: { children: ReactNode }) {
  const sidebarAberta = useUIStore((s) => s.sidebarAberta);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const tema = useUIStore((s) => s.tema);
  const alternarTema = useUIStore((s) => s.alternarTema);
  const setBusca = useUIStore((s) => s.setBusca);
  const nova = useMensagensStore((s) => s.nova);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const handleNova = async () => {
    const m = await nova();
    mostrarToast(`Mensagem criada`, 'sucesso');
    window.history.pushState({}, '', `/editar/${m.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="flex h-full w-full bg-paper">
      {/* Sidebar desktop — colapsável */}
      <aside
        className={cn(
          'flex flex-shrink-0 flex-col border-r border-ink-200/70 bg-paper transition-[width] duration-200 ease-out',
          sidebarAberta ? 'w-[240px]' : 'w-[64px]',
        )}
      >
        <div className="flex h-14 items-center justify-between px-3 border-b border-ink-200/70">
          {sidebarAberta && (
            <div className="flex items-center gap-2.5 pl-1 animate-fade-in">
              <LogoPregador />
              <div className="leading-tight">
                <div className="text-[13px] font-semibold tracking-tight text-ink-900">Pregador OS</div>
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-ink-500">v{APP_VERSION}</div>
              </div>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Alternar sidebar">
            {sidebarAberta ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
        </div>

        {/* Botão nova mensagem */}
        <div className="px-3 py-3">
          <button
            onClick={handleNova}
            className={cn(
              'group flex w-full items-center gap-2 rounded-lg bg-ink-900 px-3 py-2 text-sm font-medium text-white',
              'transition-colors hover:bg-ink-800 active:scale-[0.98]',
              !sidebarAberta && 'justify-center px-0',
            )}
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            {sidebarAberta && <span>Nova mensagem</span>}
          </button>
        </div>

        {/* Busca */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setBusca(true)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg border border-ink-200/80 bg-white px-2.5 py-1.5 text-[13px] text-ink-500',
              'transition-colors hover:border-ink-300 hover:bg-ink-50/60',
              !sidebarAberta && 'justify-center px-0',
            )}
          >
            <Search className="h-3.5 w-3.5" />
            {sidebarAberta && (
              <>
                <span className="flex-1 text-left">Buscar…</span>
                <kbd className="font-mono text-[10px] text-ink-400">Ctrl K</kbd>
              </>
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-0.5">
            {NAV.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
                      isActive
                        ? 'bg-ink-100 text-ink-900 font-medium'
                        : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                      !sidebarAberta && 'justify-center',
                    )
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {sidebarAberta && <span>{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-ink-200/70 p-3 space-y-1">
          <button
            onClick={alternarTema}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-ink-600 hover:bg-ink-50',
              !sidebarAberta && 'justify-center',
            )}
          >
            {tema === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {sidebarAberta && <span>{tema === 'light' ? 'Modo escuro' : 'Modo claro'}</span>}
          </button>
          <NavLink
            to="/configuracoes"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                isActive ? 'bg-ink-100 text-ink-900 font-medium' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                !sidebarAberta && 'justify-center',
              )
            }
          >
            <SettingsIcon className="h-4 w-4" />
            {sidebarAberta && <span>Configurações</span>}
          </NavLink>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}

function LogoPregador() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ink-900 to-ink-700 text-white shadow-sm">
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="M4 19V5l8 14V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 8v8M20 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}