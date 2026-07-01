import { useState } from 'react';
import {
  BookOpen,
  Map,
  Users,
  Languages,
  ScrollText,
  Library,
  Search,
  Sparkles,
  Loader2,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { cn, formatarRelogio } from '@/lib/utils';
import { enviarComFallback, type ChatMessage } from '@/lib/ai';
import { EASE_OUT } from '@/lib/motion';

type TipoRecurso =
  | 'personagem'
  | 'mapa'
  | 'cronologia'
  | 'hebraico_grego'
  | 'comentario'
  | 'genealogia';

interface RecursoConfig {
  id: TipoRecurso;
  titulo: string;
  descricao: string;
  placeholder: string;
  systemAppend: string;
  icon: React.ComponentType<{ className?: string }>;
  cor: string;
}

const RECURSOS: RecursoConfig[] = [
  {
    id: 'personagem',
    titulo: 'Personagens bíblicos',
    descricao: 'Pesquise por nome, livro, período ou papel na narrativa.',
    placeholder: 'Ex: Davi, Maria, Paulo, Pedroâ€¦',
    systemAppend:
      'Quando o usuário pedir um personagem bíblico, forneça: nome, significado do nome, livro principal, período histórico, papel na narrativa, pontos fortes, fraquezas, lições de vida e versículos-chave. Seja conciso, organizado e use markdown.',
    icon: Users,
    cor: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  },
  {
    id: 'mapa',
    titulo: 'Mapas e cenários',
    descricao: 'Atlas dos lugares onde a história aconteceu.',
    placeholder: 'Ex: Belém, Jerusalém, Ã‰feso, Egitoâ€¦',
    systemAppend:
      'Quando o usuário pedir um local bíblico, forneça: nome antigo e moderno, localização, importância histórica, eventos bíblicos relevantes, contexto arqueológico e aplicação pastoral.',
    icon: Map,
    cor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  {
    id: 'cronologia',
    titulo: 'Cronologias',
    descricao: 'Linha do tempo de eventos do AT e NT, com paralelos.',
    placeholder: 'Ex: ÃŠxodo, cativeiro, vida de Cristoâ€¦',
    systemAppend:
      'Quando o usuário pedir uma cronologia, monte uma linha do tempo detalhada com datas aproximadas, eventos-chave, personagens e conexões entre AT e NT.',
    icon: ScrollText,
    cor: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  {
    id: 'hebraico_grego',
    titulo: 'Hebraico e Grego',
    descricao: 'Conceitos originais e ferramentas de estudo.',
    placeholder: 'Ex: agape, hesed, shalom, logosâ€¦',
    systemAppend:
      'Quando o usuário pedir uma palavra grega ou hebraica, forneça: transliteração, escrita original, significado, Strong, ocorrências bíblicas, contexto teológico.',
    icon: Languages,
    cor: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  },
  {
    id: 'comentario',
    titulo: 'Comentário de texto',
    descricao: 'Análise exegética e pastoral de uma passagem.',
    placeholder: 'Ex: João 3:16, Romanos 8:28â€¦',
    systemAppend:
      'Faça um comentário exegético e pastoral: contexto histórico, análise do texto original, divisão por versículos, teologia, aplicação contemporânea e ilustrações.',
    icon: BookOpen,
    cor: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  },
  {
    id: 'genealogia',
    titulo: 'Genealogias',
    descricao: 'Linhagens bíblicas, de Adão a Cristo.',
    placeholder: 'Ex: genealogia de Jesusâ€¦',
    systemAppend:
      'Apresente a genealogia em formato organizado: patriarcas principais, esposas e eventos relevantes, simbolismo teológico, profecias cumpridas.',
    icon: Library,
    cor: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  },
];

export function StudyPage() {
  const [recursoAtivo, setRecursoAtivo] = useState<TipoRecurso>('personagem');
  const [query, setQuery] = useState('');
  const [resposta, setResposta] = useState<string>('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [stats, setStats] = useState<{ duracaoMs: number; provider: string } | null>(null);

  const recurso = RECURSOS.find((r) => r.id === recursoAtivo)!;

  const consultar = async () => {
    if (!query.trim() || carregando) return;
    setCarregando(true);
    setResposta('');
    setErro(null);
    setStats(null);

    try {
      const messages: ChatMessage[] = [{ role: 'user', content: query.trim() }];
      const { response, providerUsado } = await enviarComFallback({
        messages,
        mensagemContexto: null,
        systemAppend: recurso.systemAppend,
        stream: true,
        onChunk: (chunk) => setResposta((prev) => prev + chunk),
        maxTokens: 2500,
        temperature: 0.6,
      });
      setResposta(response.content);
      setStats({ duracaoMs: response.duracaoMs, provider: providerUsado });
    } catch (e) {
      setErro((e as Error).message || 'Erro ao consultar');
    } finally {
      setCarregando(false);
    }
  };

  const copiar = () => {
    navigator.clipboard.writeText(resposta);
  };

  return (
    <div className="flex h-full flex-col bg-paper text-ink-900 dark:bg-paper-dark dark:text-ink-100">
      <MobileHeader title="Modo Estudo" subtitle="Recursos exegéticos com IA" />

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="mx-auto max-w-2xl space-y-5 px-4 py-4">

          <section>
            <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">
              Recursos disponíveis
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {RECURSOS.map((r) => {
                const Icon = r.icon;
                const ativo = recursoAtivo === r.id;
                return (
                  <motion.button
                    key={r.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setRecursoAtivo(r.id);
                      setResposta('');
                      setErro(null);
                    }}
                    className={cn(
                      'flex items-start gap-3 rounded-2xl border p-3 text-left transition-all',
                      ativo
                        ? 'border-ink-900 bg-ink-50 shadow-soft dark:border-white dark:bg-ink-800/60'
                        : 'border-ink-200/80 bg-white hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900/40 dark:hover:border-ink-700',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                        r.cor,
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-ink-900 dark:text-white">
                        {r.titulo}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink-500 dark:text-ink-400">
                        {r.descricao}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>

          <motion.section
            key={recursoAtivo}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="rounded-2xl border border-ink-200/80 bg-white p-4 shadow-soft dark:border-ink-800 dark:bg-ink-900/40"
          >
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ink-700 dark:text-ink-200" />
              <span className="text-[14px] font-semibold tracking-tight text-ink-900 dark:text-white">
                {recurso.titulo}
              </span>
            </div>
            <p className="mb-3 text-[12.5px] text-ink-500 dark:text-ink-400">{recurso.descricao}</p>

            <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white p-1 transition-colors focus-within:border-ink-400 dark:border-ink-800 dark:bg-ink-900/40">
              <Search className="ml-2 h-4 w-4 flex-shrink-0 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') consultar(); }}
                placeholder={recurso.placeholder}
                disabled={carregando}
                className="flex-1 bg-transparent px-2 py-2 text-[14.5px] outline-none placeholder:text-ink-400 disabled:opacity-50 dark:placeholder:text-ink-500"
              />
              <button
                onClick={consultar}
                disabled={!query.trim() || carregando}
                className={cn(
                  'flex h-10 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13.5px] font-semibold transition-all active:scale-95',
                  query.trim() && !carregando
                    ? 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100'
                    : 'bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500',
                )}
              >
                {carregando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Consultar
              </button>
            </div>
          </motion.section>

          <AnimatePresence mode="wait">
            {(resposta || carregando || erro) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                key={query + recursoAtivo}
                transition={{ duration: 0.24, ease: EASE_OUT }}
              >
                <div className="overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900/40">
                  {carregando && !resposta && (
                    <div className="flex items-center gap-2.5 p-4 text-[13.5px] text-ink-500 dark:text-ink-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Consultando fontes exegéticasâ€¦
                    </div>
                  )}

                  {erro && (
                    <div className="flex items-start gap-2 bg-red-50 p-4 text-[12.5px] text-red-900 dark:bg-red-500/10 dark:text-red-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                      <div>
                        <div className="font-semibold">Erro ao consultar</div>
                        <div className="mt-0.5 text-red-800 dark:text-red-300">{erro}</div>
                      </div>
                    </div>
                  )}

                  {resposta && (
                    <div className="p-4">
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                          <Sparkles className="h-3 w-3" />
                          {stats?.provider ?? 'IA'}
                        </span>
                        <button
                          onClick={copiar}
                          className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-700 transition-colors hover:bg-ink-200 active:scale-95 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
                        >
                          <Copy className="h-3 w-3" />
                          Copiar
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed text-ink-800 dark:text-ink-100">
                        {resposta}
                      </pre>
                      {stats && (
                        <div className="mt-3 border-t border-ink-100 pt-2 text-[10.5px] text-ink-500 dark:border-ink-800 dark:text-ink-400 tabular-nums">
                          {(stats.duracaoMs / 1000).toFixed(1)}s Â· {formatarRelogio(Date.now())}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="pb-4 text-center text-[10.5px] text-ink-400 dark:text-ink-500">
            Alimentado por IA Â· Configure a chave em Configurações
          </p>
        </div>
      </div>
    </div>
  );
}
