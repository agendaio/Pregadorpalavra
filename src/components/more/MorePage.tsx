import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  Settings as SettingsIcon,
  Library,
  Moon,
  Sun,
  Download,
  Trash2,
  Tag,
  History,
  Info,
  ChevronRight,
  Github,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '../../../v.config';

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
  const navigate = useNavigate();

  const grupos: { titulo: string; itens: Item[] }[] = [
    {
      titulo: 'Acesso rápido',
      itens: [
        { to: '/estudo', icon: Compass, label: 'Modo Estudo', description: 'Personagens, mapas, cronologias, léxico' },
        { to: '/analista', icon: Sparkles, label: 'Analista de Sermões', description: 'Avaliação estrutural de cada mensagem' },
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
      titulo: 'Dados',
      itens: [
        { to: '/configuracoes', icon: Download, label: 'Exportar backup', description: 'Backup JSON das suas mensagens' },
        { to: '/configuracoes', icon: History, label: 'Histórico de versões', description: 'Veja versões anteriores de cada mensagem' },
        { to: '/configuracoes', icon: Tag, label: 'Gerenciar tags', description: 'Organize com tags e categorias' },
      ],
    },
    {
      titulo: 'Sistema',
      itens: [
        { to: '/configuracoes', icon: SettingsIcon, label: 'Configurações', description: 'API da IA, backup, limpeza' },
        {
          icon: Github,
          label: 'Pregador OS',
          description: `v${APP_VERSION} · Mobile-first + PWA`,
          onClick: () => window.open('https://github.com/agendaio/Pregadorpalavra', '_blank'),
        },
        { to: '/sobre', icon: Info, label: 'Sobre', description: 'O sistema operacional para pregadores' },
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col bg-paper">
      <MobileHeader title="Mais" subtitle={`Pregador OS · v${APP_VERSION}`} back={false} />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto max-w-2xl px-4 py-5 space-y-6">
          {grupos.map((g) => (
            <section key={g.titulo}>
              <h2 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                {g.titulo}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-soft">
                {g.itens.map((item, i) => {
                  const Icon = item.icon;
                  const content = (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                          item.variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-ink-100 text-ink-700',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium text-ink-900">{item.label}</div>
                        {item.description && (
                          <div className="truncate text-[11.5px] text-ink-500">{item.description}</div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-300" />
                    </div>
                  );

                  if (item.to) {
                    return (
                      <Link
                        key={i}
                        to={item.to}
                        className={cn(
                          'block transition-colors hover:bg-ink-50/60 active:bg-ink-100',
                          i > 0 && 'border-t border-ink-100',
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
                        'block w-full text-left transition-colors hover:bg-ink-50/60 active:bg-ink-100',
                        i > 0 && 'border-t border-ink-100',
                      )}
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="pb-4 text-center text-[11px] text-ink-400">
            Pregador OS · Sistema Operacional para Pregadores
          </div>
        </div>
      </div>
    </div>
  );
}