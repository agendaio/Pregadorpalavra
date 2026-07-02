import { Link } from 'react-router-dom';
import {
  Sparkles,
  Settings as SettingsIcon,
  Library,
  Moon,
  Sun,
  Info,
  ChevronRight,
  Github,
  LogIn,
  LogOut,
  User,
  Shield,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/authUser';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/v.config';

interface Item {
  to?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  onClick?: () => void;
  variant?: 'default' | 'danger';
}

export function MorePage() {
  const tema = useUIStore((s) => s.tema);
  const alternarTema = useUIStore((s) => s.alternarTema);
  const { user, logout } = useAuthStore();

  const grupos: { titulo: string; itens: Item[] }[] = [
    {
      titulo: 'Acesso rápido',
      itens: [
        { to: '/biblioteca', icon: Library, label: 'Biblioteca completa', description: 'Todas as mensagens com filtros' },
      ],
    },
    {
      titulo: 'Aparência',
      itens: [
        {
          icon: tema === 'light' ? Moon : Sun,
          label: tema === 'light' ? 'Modo escuro' : 'Modo claro',
          onClick: alternarTema,
        },
      ],
    },
    {
      titulo: 'Sistema',
      itens: [
        { to: '/configuracoes', icon: SettingsIcon, label: 'Configurações', description: 'API da IA, backup, limpeza' },
        {
          icon: Github,
          label: 'Código-fonte',
          description: `v${APP_VERSION} Â· Mobile-first + PWA`,
          onClick: () => window.open('https://github.com/solabrasil/solabrasil', '_blank'),
        },
        { to: '/sobre', icon: Info, label: 'Sobre', description: 'O sistema operacional para pregadores' },
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col bg-paper text-ink-900 dark:bg-paper-dark dark:text-ink-100">
      <MobileHeader title="Mais" subtitle={`Pregador OS Â· v${APP_VERSION}`} back={false} />

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-5">

          {/* Card de Auth - Destacado no topo */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600 p-4 shadow-xl shadow-blue-900/20">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-white">
                    {user.nome || user.email?.split('@')[0]}
                  </div>
                  <div className="truncate text-[13px] text-white/80">
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur transition-all hover:bg-white/30 active:scale-95"
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-[16px] font-bold text-white">
                      Acesse sua conta
                    </div>
                    <div className="text-[13px] text-white/80">
                      Salve suas mensagens na nuvem
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link
                    to="/login"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-3 text-[14px] font-semibold text-blue-700 shadow-lg transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.98]"
                  >
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </Link>
                  <Link
                    to="/login?signup=true"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-white/50 bg-emerald-500 py-3 text-[14px] font-semibold text-white shadow-lg transition-all hover:border-white/70 hover:bg-emerald-400 active:scale-[0.98]"
                  >
                    Cadastrar
                  </Link>
                </div>
              </div>
            )}
          </div>

          {grupos.filter(g => g.itens.length > 0).map((g) => (
            <section key={g.titulo}>
              <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">
                {g.titulo}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900/40">
                {g.itens.map((item, i) => {
                  const Icon = item.icon;
                  const content = (
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div
                        className={cn(
                          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl',
                          item.variant === 'danger'
                            ? 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                            : 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14.5px] font-medium tracking-tight text-ink-900 dark:text-white">
                          {item.label}
                        </div>
                        {item.description && (
                          <div className="truncate text-[12px] text-ink-500 dark:text-ink-400">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-300 dark:text-ink-600" />
                    </div>
                  );

                  if (item.to) {
                    return (
                      <Link
                        key={i}
                        to={item.to}
                        className={cn(
                          'block transition-colors active:bg-ink-50 dark:active:bg-ink-800/40',
                          i > 0 && 'border-t border-ink-100 dark:border-ink-800',
                        )}
                      >
                        {content}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={i}
                      onClick={item.onClick}
                      className={cn(
                        'block w-full text-left transition-colors active:bg-ink-50 dark:active:bg-ink-800/40',
                        i > 0 && 'border-t border-ink-100 dark:border-ink-800',
                      )}
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="pb-4 text-center text-[11px] text-ink-400 dark:text-ink-500">
            Pregador OS · Sistema Operacional para Pregadores
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── fim ───────────────────────────────────────────────────────────────────

