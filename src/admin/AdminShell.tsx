import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Package,
  Flag,
  ScrollText,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  Activity,
  KeyRound,
  Menu,
  X,
  ShieldCheck,
  Brain,
} from 'lucide-react';
import { useAuthAdminStore } from '@/stores/authAdmin';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Usuários', icon: Users },
  { to: '/admin/plans', label: 'Planos', icon: Package },
  { to: '/admin/features', label: 'Features', icon: Flag },
  { to: '/admin/api-keys', label: 'API Keys', icon: KeyRound },
  { to: '/admin/agente', label: 'Agente IA', icon: Brain },
  { to: '/admin/usage', label: 'Uso da IA', icon: Activity },
  { to: '/admin/subscriptions', label: 'Assinaturas', icon: CreditCard },
  { to: '/admin/notifications', label: 'Notificações', icon: Bell },
  { to: '/admin/logs', label: 'Auditoria', icon: ScrollText },
  { to: '/admin/settings', label: 'Configurações', icon: Settings },
];

export function AdminShell() {
  const navigate = useNavigate();
  const { admin, user, logout, inicializar } = useAuthAdminStore();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    void inicializar().finally(() => setCarregando(false));
  }, [inicializar]);

  useEffect(() => {
    if (!carregando && !admin) {
      navigate('/admin/login', { replace: true });
    }
  }, [carregando, admin, navigate]);

  // Real-time stats badge
  const [onlineCount] = useState(0);

  if (carregando || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-[14px] text-white/60">
          <Sparkles className="h-4 w-4 animate-pulse text-emerald-400" />
          Carregando painel…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarAberta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarAberta(false)}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/5 bg-slate-900 transition-transform md:relative md:translate-x-0',
          sidebarAberta ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-white/5 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold">Pregador OS</div>
            <div className="truncate text-[11px] text-white/40">Painel Admin</div>
          </div>
          <button
            onClick={() => setSidebarAberta(false)}
            className="ml-auto rounded-lg p-1 text-white/60 hover:bg-white/5 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarAberta(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 text-white shadow-inner shadow-emerald-500/10'
                        : 'text-white/60 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-emerald-400')} />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User card */}
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 text-[13px] font-semibold">
              {admin.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium">{admin.nome}</div>
              <div className="truncate text-[10.5px] text-white/40">
                {admin.role === 'super_admin' && '👑 Super Admin'}
                {admin.role === 'admin' && '🛡 Admin'}
                {admin.role === 'financeiro' && '💰 Financeiro'}
                {admin.role === 'suporte' && '🎧 Suporte'}
                {admin.role === 'moderador' && '🧹 Moderador'}
              </div>
            </div>
            <button
              onClick={() => {
                void logout().then(() => navigate('/admin/login'));
              }}
              aria-label="Sair"
              className="rounded-lg p-1.5 text-white/60 hover:bg-red-500/20 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile only) */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/5 bg-slate-900/80 px-4 backdrop-blur-md md:hidden">
          <button
            onClick={() => setSidebarAberta(true)}
            aria-label="Menu"
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/5"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 truncate text-[13px] font-semibold">Pregador OS · Admin</div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {onlineCount}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}