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
  User,
  LogOut,
  LogIn,
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
    ...(user ? [{
      titulo: 'Conta',
      itens: [
        { icon: User, label: user.nome || user.email || 'Usuário', description: user.email || '' },
        { icon: LogOut, label: 'Sair da conta', onClick: () => { void logout(); }, variant: 'danger' as const },
      ],
    }] : [{
      titulo: 'Conta',
      itens: [],
    }]),
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

          {/* Card de login — aparece no final quando deslogado */}
          {!user && (
            <LoginPromoCard />
          )}

          <div className="pb-4 text-center text-[11px] text-ink-400 dark:text-ink-500">
            Pregador OS · Sistema Operacional para Pregadores
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Card promocional de login ─────────────────────────────────────────────

function LoginPromoCard() {
  return (
    <Link
      to="/login"
      className="group relative block overflow-hidden rounded-2xl"
    >
      {/* Gradiente azul → verde */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-500" />
      {/* Brilho decorativo */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-white/5 to-transparent" />
      {/* Borda sutil */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />

      <div className="relative flex items-center gap-4 px-5 py-5">
        {/* Ícone */}
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
          <LogIn className="h-7 w-7 text-white" />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <h3 className="mb-1 text-[17px] font-bold leading-tight text-white">
            Fazer login / Cadastrar
          </h3>
          <p className="text-[13px] leading-relaxed text-white/80">
            Salve seus esboços na nuvem e acesse de qualquer lugar
          </p>
        </div>

        {/* Seta */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110 group-active:scale-95">
          <ChevronRight className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Indicadores de benefícios */}
      <div className="relative flex flex-wrap gap-2 px-5 pb-4">
        {['☁️ Nuvem', '🔄 Sincronizado', '📱 Multi-dispositivo'].map((badge) => (
          <span
            key={badge}
            className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm"
          >
            {badge}
          </span>
        ))}
      </div>
    </Link>
  );
}
