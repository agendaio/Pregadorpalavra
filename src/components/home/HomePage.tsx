import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  Sparkles,
  BookOpen,
  ScrollText,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/db/schema';
import { useMensagensStore } from '@/stores/mensagens';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useUIStore } from '@/stores/ui';
import { htmlParaTexto, formatarRelativo, truncar } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { PulpitFab } from '@/components/layout/PulpitFab';
import { TemplateGallery, type TemplatePregacao } from '@/components/editor/TemplateGallery';
import { novaMensagem } from '@/types/mensagem';
import { SPRING_IOS, EASE_OUT } from '@/lib/motion';

export function HomePage() {
  const mensagens = useLiveQuery(() => db.mensagens.toArray(), []);
  const navigate = useNavigate();
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const [showGallery, setShowGallery] = useState(false);

  const stats = useMemo(() => {
    const xs = mensagens ?? [];
    return {
      total: xs.length,
      rascunhos: xs.filter((m) => m.status === 'rascunho').length,
      prontas: xs.filter((m) => m.status === 'pronta').length,
      pregadas: xs.filter((m) => m.status === 'pregada').length,
    };
  }, [mensagens]);

  const recentes = useMemo(() => {
    return [...(mensagens ?? [])]
      .sort((a, b) => b.atualizadoEm - a.atualizadoEm)
      .slice(0, 4);
  }, [mensagens]);

  const saudacao = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const handleSelecionarTemplate = async (template: TemplatePregacao) => {
    setShowGallery(false);
    const m = novaMensagem({
      titulo: template.rotulo,
      tema: template.temaPadrao,
      esboco: template.esbocoModelo,
      categoria: template.categoria,
    });
    await db.mensagens.add(m);
    mostrarToast(`"${template.rotulo}" criado`, 'sucesso');
    navigate(`/editar/${m.id}`);
  };

  return (
    <div className="flex h-full flex-col bg-paper text-ink-900 dark:bg-paper-dark dark:text-ink-100">
      <MobileHeader
        title={saudacao}
        subtitle="Pregador OS"
        back={false}
      />

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="mx-auto max-w-2xl px-5 pb-32 pt-2">

          {/* Hero card â€” CTA primária */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
            className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-900 to-ink-700 p-5 text-white shadow-soft dark:from-ink-900 dark:to-ink-800"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-semibold leading-tight tracking-tight">
                  Pronto para o próximo passo?
                </h2>
                <p className="mt-1 text-[13px] leading-snug text-white/65">
                  Comece uma nova mensagem ou peça ajuda ao assistente ministerial.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowGallery(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[13.5px] font-semibold text-ink-900 transition-all hover:bg-white/95 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Novo Sermão
              </button>
              <Link
                to="/assistente"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-[13.5px] font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" /> Assistente
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.32, ease: EASE_OUT }}
            className="mb-7 grid grid-cols-3 gap-2"
          >
            <StatPill icon={BookOpen} label="Total"     valor={stats.total}      cor="text-ink-900 dark:text-white" />
            <StatPill icon={ScrollText} label="Rascunhos" valor={stats.rascunhos} cor="text-amber-600" />
            <StatPill icon={Clock}      label="Prontas"   valor={stats.prontas}   cor="text-emerald-600" />
          </motion.div>

          {/* Atalhos rápidos */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.32, ease: EASE_OUT }}
            className="mb-7"
          >
            <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">
              Atalhos
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <AtalhoCard to="/biblioteca" icon={BookOpen}  label="Biblioteca" desc="Todas as mensagens" />
              <AtalhoCard to="/esbocos"    icon={ScrollText} label="Esboços"    desc="Estruturas prontas" />
              <AtalhoCard to="/assistente" icon={Sparkles}   label="Assistente" desc="IA ministerial" />
              <AtalhoCard to="/analista"   icon={TrendingUp} label="Analista"   desc="Avaliação estrutural" />
            </div>
          </motion.section>

          {/* Recentes */}
          <section>
            {recentes.length > 0 && (
              <div className="mb-2">
                <PulpitFab to={`/pulpit/${recentes[0].id}`} />
              </div>
            )}
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">
                Recentes
              </h2>
              <Link
                to="/biblioteca"
                className="text-[12px] font-medium text-ink-700 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
              >
                Ver todas â†’
              </Link>
            </div>
            {recentes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center dark:border-ink-800 dark:bg-ink-900/40">
                <BookOpen className="mx-auto mb-3 h-6 w-6 text-ink-400" />
                <p className="text-[13px] text-ink-500 dark:text-ink-400">
                  Nenhuma mensagem ainda. Toque em "Novo Sermão" pra começar.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentes.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.28, ease: EASE_OUT }}
                  >
                    <Link
                      to={`/editar/${m.id}`}
                      className="group flex items-start gap-3 rounded-2xl border border-ink-200/80 bg-white p-3.5 transition-all hover:border-ink-300 hover:shadow-soft active:scale-[0.99] dark:border-ink-800 dark:bg-ink-900/40"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[14.5px] font-semibold tracking-tight text-ink-900 dark:text-white">
                          {m.titulo || 'Sem título'}
                        </h3>
                        {m.tema && (
                          <p className="mt-0.5 truncate text-[12.5px] text-ink-600 dark:text-ink-300">
                            {m.tema}
                          </p>
                        )}
                        {htmlParaTexto(m.conteudo) && (
                          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink-500 dark:text-ink-400">
                            {truncar(htmlParaTexto(m.conteudo), 140)}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-500 dark:text-ink-500">
                          {m.textoBase && (
                            <span className="inline-flex items-center gap-1 truncate">
                              {m.textoBase}
                            </span>
                          )}
                          <span className="ml-auto">{formatarRelativo(m.atualizadoEm)}</span>
                        </div>
                      </div>
                      <ArrowRight className="mt-2 h-4 w-4 flex-shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 dark:text-ink-600" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {showGallery && (
          <TemplateGallery
            onSelecionar={handleSelecionarTemplate}
            onFechar={() => setShowGallery(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatPill({
  icon: Icon, label, valor, cor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valor: number;
  cor: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-200/80 bg-white p-3 text-center shadow-soft dark:border-ink-800 dark:bg-ink-900/40">
      <Icon className={cn('mx-auto h-4 w-4', cor)} />
      <div className="mt-1.5 text-[18px] font-semibold tabular-nums text-ink-900 dark:text-white">{valor}</div>
      <div className="text-[11px] text-ink-500 dark:text-ink-400">{label}</div>
    </div>
  );
}

function AtalhoCard({
  to, icon: Icon, label, desc,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-ink-200/80 bg-white p-3 transition-all hover:border-ink-300 hover:shadow-soft active:scale-[0.98] dark:border-ink-800 dark:bg-ink-900/40"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold tracking-tight text-ink-900 dark:text-white">{label}</div>
        <div className="truncate text-[11.5px] text-ink-500 dark:text-ink-400">{desc}</div>
      </div>
    </Link>
  );
}
