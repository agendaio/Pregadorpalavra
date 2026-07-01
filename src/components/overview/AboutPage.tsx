import { Link } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  Mic,
  Brain,
  Wifi,
  Smartphone,
  Shield,
  Github,
  Heart,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { APP_VERSION } from '@/v.config';

export function AboutPage() {
  return (
    <div className="flex h-full flex-col bg-paper">
      <MobileHeader title="Sobre" subtitle="Pregador OS" back to="/mais" />

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">

          {/* Hero */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700 text-white shadow-soft">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight text-ink-900">Pregador OS</h1>
            <p className="mt-1 text-[13px] text-ink-500">Sistema Operacional para Pregadores</p>
            <p className="mt-0.5 text-[12px] text-ink-400">Versão {APP_VERSION}</p>
          </div>

          {/* Descrição */}
          <div className="rounded-2xl border border-ink-200/80 bg-white p-4 shadow-soft">
            <p className="text-[13px] leading-relaxed text-ink-700">
              O <strong className="text-ink-900">Pregador OS</strong> é uma plataforma mobile-first,
              offline-first e orientada por IA, projetada para acompanhar o pregador durante todo
              o ciclo ministerial — do estudo inicial à apresentação no púlpito.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-700">
              Desenvolvido para funcionar como um <strong className="text-ink-900">aplicativo nativo</strong>{' '}
              no seu celular, sem admin dashboards, sem carregamentos lentos, sem complicated flux.
              Apenas o que você precisa, sempre à mão.
            </p>
          </div>

          {/* Funcionalidades */}
          <section>
            <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Funcionalidades
            </h2>
            <div className="space-y-2">
              <Feature
                icon={BookOpen}
                title="Biblioteca Offline"
                desc="Todas as suas mensagens, sermões e estudos armazenados localmente no navegador. Funciona sem internet."
              />
              <Feature
                icon={Mic}
                title="Modo Púlpito"
                desc="Tela limpa, letra grande, cronômetro e marcador inteligente. Para você focar na ministração."
              />
              <Feature
                icon={Brain}
                title="Assistente Ministerial IA"
                desc="Mentor digital especializado em teologia, hermenêutica e homilética. Contexto automático da sua mensagem."
              />
              <Feature
                icon={Wifi}
                title="PWA Nativo"
                desc="Instale como app no celular. Atualizações silenciosas, ícones nativos, splash screen personalizada."
              />
              <Feature
                icon={Smartphone}
                title="Mobile First"
                desc="Desenvolvido pra usar com uma mão. BottomNav fixa, toque otimizado, tipografia de leitura prolongada."
              />
              <Feature
                icon={Shield}
                title="Dados Privados"
                desc="Tudo fica no seu navegador. Nuvem opcional via backup manual. Você controla seus dados."
              />
            </div>
          </section>

          {/* Stack técnica */}
          <section>
            <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Stack Técnica
            </h2>
            <div className="rounded-2xl border border-ink-200/80 bg-white p-4 shadow-soft">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                {[
                  ['Frontend', 'React 19 + TypeScript'],
                  ['Bundler', 'Vite 6'],
                  ['Estilização', 'Tailwind CSS 3.4'],
                  ['Estado', 'Zustand 5'],
                  ['Offline', 'IndexedDB + Dexie 4'],
                  ['IA', 'OpenAI API (GPT-4o)'],
                  ['PWA', 'vite-plugin-pwa + Workbox'],
                  ['Animações', 'Framer Motion 11'],
                  ['Deploy', 'Vercel'],
                  ['Fontend', 'React Router 7'],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-400">{k}</span>
                    <span className="text-[12px] font-medium text-ink-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Créditos */}
          <section>
            <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Créditos
            </h2>
            <div className="rounded-2xl border border-ink-200/80 bg-white p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-[13px] font-medium text-ink-900">Desenvolvido com dedicação</p>
                    <p className="text-[11.5px] text-ink-500">Para pregadores que levam a Palavra a sério</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-ink-100 pt-3">
                <a
                  href="https://github.com/agendaio/Pregadorpalavra"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-[13px] text-ink-700 hover:text-ink-900"
                >
                  <Github className="h-4 w-4" />
                  github.com/agendaio/Pregadorpalavra
                  <ExternalLink className="h-3 w-3 text-ink-400" />
                </a>
              </div>
            </div>
          </section>

          {/* Agradecimento */}
          <div className="rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700 p-5 text-center text-white">
            <p className="text-[13px] font-medium leading-relaxed text-white/90">
              "Pregai a Palavra, esteja ou não em tempo, aproveitando o momento oportuno e o inoprtuno."
            </p>
            <p className="mt-2 text-[11px] text-white/60">— 2 Timóteo 4:2</p>
          </div>

          <div className="pb-4 text-center text-[10.5px] text-ink-400">
            Pregador OS · v{APP_VERSION} · Mobile-first PWA
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-ink-200/80 bg-white p-3.5 shadow-soft">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-ink-900">{title}</div>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-600">{desc}</p>
      </div>
    </div>
  );
}
