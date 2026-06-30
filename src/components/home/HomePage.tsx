import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  Sparkles,
  BookOpen,
  ScrollText,
  Clock,
  TrendingUp,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '@/db/schema';
import { useMensagensStore } from '@/stores/mensagens';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useUIStore } from '@/stores/ui';
import { htmlParaTexto, formatarRelativo, truncar } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function HomePage() {
  const mensagens = useLiveQuery(() => db.mensagens.toArray(), []);
  const nova = useMensagensStore((s) => s.nova);
  const navigate = useNavigate();
  const mostrarToast = useUIStore((s) => s.mostrarToast);

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

  const handleNova = async () => {
    const m = await nova();
    mostrarToast('Nova mensagem criada', 'sucesso');
    navigate(`/editar/${m.id}`);
  };

  return (
    <div className="flex h-full flex-col bg-paper">
      <MobileHeader
        title={saudacao}
        subtitle="Pregador OS"
        back={false}
      />

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-2xl px-5 py-4">
          {/* Hero card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700 p-5 text-white shadow-soft"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold leading-tight">Pronta para o próximo passo?</h2>
                <p className="mt-1 text-[12.5px] leading-snug text-white/70">
                  Comece uma nova mensagem ou peça ajuda ao Assistente Ministerial.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={handleNova}
                className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-[13px] font-semibold text-ink-900 transition-colors hover:bg-white/90 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Nova mensagem
              </button>
              <Link
                to="/assistente"
                className="flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-[13px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" /> Assistente
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-3 gap-2">
            <StatPill icon={BookOpen} label="Total" valor={stats.total} cor="text-ink-900" />
            <StatPill icon={ScrollText} label="Rascunhos" valor={stats.rascunhos} cor="text-amber-600" />
            <StatPill icon={Clock} label="Prontas" valor={stats.prontas} cor="text-emerald-600" />
          </div>

          {/* Atalhos rápidos */}
          <section className="mb-6">
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Atalhos
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <AtalhoCard to="/biblioteca" icon={BookOpen} label="Biblioteca" desc="Todas as mensagens" />
              <AtalhoCard to="/esbocos" icon={ScrollText} label="Esboços" desc="Estruturas prontas" />
              <AtalhoCard to="/assistente" icon={Sparkles} label="Assistente" desc="IA ministerial" />
              <AtalhoCard to="/analista" icon={TrendingUp} label="Analista" desc="Avaliação estrutural" />
            </div>
          </section>

          {/* Recentes */}
          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                Recentes
              </h2>
              <Link to="/biblioteca" className="text-[11.5px] font-medium text-ink-700 hover:text-ink-900">
                Ver todas →
              </Link>
            </div>
            {recentes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center">
                <BookOpen className="mx-auto mb-2 h-6 w-6 text-ink-400" />
                <p className="text-[12.5px] text-ink-500">Nenhuma mensagem ainda. Toque em "Nova mensagem" pra começar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentes.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={`/editar/${m.id}`}
                      className="block rounded-2xl border border-ink-200/80 bg-white p-3.5 transition-all hover:border-ink-300 hover:shadow-soft active:scale-[0.99]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-[14px] font-semibold text-ink-900">
                              {m.titulo || 'Sem título'}
                            </h3>
                          </div>
                          {m.tema && (
                            <p className="mt-0.5 truncate text-[12px] text-ink-600">{m.tema}</p>
                          )}
                          {htmlParaTexto(m.conteudo) && (
                            <p className="mt-1 line-clamp-2 text-[11.5px] text-ink-500">
                              {truncar(htmlParaTexto(m.conteudo), 140)}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center gap-3 text-[10.5px] text-ink-500">
                            {m.textoBase && (
                              <span className="inline-flex items-center gap-1">
                                {m.textoBase}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formatarRelativo(m.atualizadoEm)}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-ink-300" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  valor,
  cor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valor: number;
  cor: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-200/80 bg-white p-3 text-center">
      <Icon className={cn('mx-auto h-4 w-4', cor)} />
      <div className="mt-1 text-[18px] font-semibold tabular-nums text-ink-900">{valor}</div>
      <div className="text-[10.5px] text-ink-500">{label}</div>
    </div>
  );
}

function AtalhoCard({
  to,
  icon: Icon,
  label,
  desc,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-ink-200/80 bg-white p-3 transition-all hover:border-ink-300 hover:shadow-soft active:scale-[0.98]"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold text-ink-900">{label}</div>
        <div className="truncate text-[11px] text-ink-500">{desc}</div>
      </div>
    </Link>
  );
}