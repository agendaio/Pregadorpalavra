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
import { Card } from '@/components/ui/Card';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { cn, formatarRelogio } from '@/lib/utils';
import { enviarComFallback, type ChatMessage } from '@/lib/ai';

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
    placeholder: 'Ex: Davi, Maria, Paulo, Pedro…',
    systemAppend:
      'Quando o usuário pedir um personagem bíblico, forneça: nome, significado do nome, livro principal, período histórico, papel na narrativa, pontos fortes, fraquezas, lições de vida e versículos-chave sobre o personagem. Seja conciso, organizado e use markdown com seções.',
    icon: Users,
    cor: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'mapa',
    titulo: 'Mapas e cenários',
    descricao: 'Atlas interativo dos lugares onde a história aconteceu.',
    placeholder: 'Ex: Belém, Jerusalém, Éfeso, Egito…',
    systemAppend:
      'Quando o usuário pedir um local bíblico, forneça: nome antigo e moderno, localização geográfica, importância histórica, eventos bíblicos relevantes, contexto arqueológico e aplicação pastoral. Use listas e seja organizado.',
    icon: Map,
    cor: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'cronologia',
    titulo: 'Cronologias',
    descricao: 'Linha do tempo de eventos do AT e NT, com paralelos.',
    placeholder: 'Ex: Êxodo, cativeiro, vida de Cristo…',
    systemAppend:
      'Quando o usuário pedir uma cronologia, monte uma linha do tempo detalhada com datas aproximadas, eventos-chave, personagens envolvidos e conexões entre AT e NT. Use listas ordenadas.',
    icon: ScrollText,
    cor: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'hebraico_grego',
    titulo: 'Hebraico e Grego',
    descricao: 'Conceitos originais e ferramentas de estudo.',
    placeholder: 'Ex: agape, hesed, shalom, logos…',
    systemAppend:
      'Quando o usuário pedir uma palavra grega ou hebraica, forneça: transliteração, escrita original, significado, Strong reference, ocorrências bíblicas, contexto teológico e como aplicar no estudo. Use markdown.',
    icon: Languages,
    cor: 'bg-violet-50 text-violet-700',
  },
  {
    id: 'comentario',
    titulo: 'Comentário de texto',
    descricao: 'Análise exegética e pastoral de uma passagem.',
    placeholder: 'Ex: João 3:16, Romanos 8:28, Salmos 23…',
    systemAppend:
      'Faça um comentário exegético e pastoral: contexto histórico, análise do texto original, divisão por versículos, teologia, aplicação contemporânea e ilustrações. Seja profundo mas acessível.',
    icon: BookOpen,
    cor: 'bg-rose-50 text-rose-700',
  },
  {
    id: 'genealogia',
    titulo: 'Genealogias',
    descricao: 'Linhagens bíblicas, de Adão a Cristo.',
    placeholder: 'Ex: genealogia de Jesus, descendentes de Abraão…',
    systemAppend:
      'Apresente a genealogia pedida em formato organizado: patriarcas principais, esposas e eventos relevantes, simbolismo teológico, profecias cumpridas e lições. Use listas.',
    icon: Library,
    cor: 'bg-teal-50 text-teal-700',
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
      const messages: ChatMessage[] = [
        { role: 'user', content: query.trim() },
      ];
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
    <div className="flex h-full flex-col bg-paper">
      <MobileHeader title="Modo Estudo" subtitle="Recursos exegéticos com IA" />

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
          {/* Grid de recursos */}
          <div>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Recursos disponíveis
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {RECURSOS.map((r) => {
                const Icon = r.icon;
                const ativo = recursoAtivo === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRecursoAtivo(r.id);
                      setResposta('');
                      setErro(null);
                    }}
                    className={cn(
                      'flex items-start gap-2.5 rounded-2xl border p-3 text-left transition-all',
                      ativo
                        ? 'border-ink-900 bg-ink-50 shadow-soft'
                        : 'border-ink-200/80 bg-white hover:border-ink-300',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                        r.cor,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold text-ink-900">
                        {r.titulo}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-ink-500">
                        {r.descricao}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input de consulta */}
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ink-700" />
              <span className="text-[13px] font-semibold text-ink-900">{recurso.titulo}</span>
            </div>
            <p className="mb-3 text-[11.5px] text-ink-500">{recurso.descricao}</p>

            <div className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white p-1.5 focus-within:border-ink-300">
              <Search className="ml-2 h-4 w-4 flex-shrink-0 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') consultar();
                }}
                placeholder={recurso.placeholder}
                disabled={carregando}
                className="flex-1 bg-transparent px-2 py-1.5 text-[14px] outline-none placeholder:text-ink-400 disabled:opacity-50"
              />
              <button
                onClick={consultar}
                disabled={!query.trim() || carregando}
                className={cn(
                  'flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition-colors',
                  query.trim() && !carregando
                    ? 'bg-ink-900 text-white hover:bg-ink-800'
                    : 'bg-ink-100 text-ink-400',
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
          </Card>

          {/* Resposta */}
          <AnimatePresence mode="wait">
            {(resposta || carregando || erro) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                key={query + recursoAtivo}
              >
                <Card className="overflow-hidden p-0">
                  {carregando && !resposta && (
                    <div className="flex items-center gap-2.5 p-4 text-[13px] text-ink-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Consultando fontes exegéticas…
                    </div>
                  )}

                  {erro && (
                    <div className="flex items-start gap-2 bg-red-50 p-4 text-[12.5px] text-red-900">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                      <div>
                        <div className="font-semibold">Erro ao consultar</div>
                        <div className="mt-0.5 text-red-800">{erro}</div>
                      </div>
                    </div>
                  )}

                  {resposta && (
                    <div className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700">
                          <Sparkles className="h-3 w-3" />
                          {stats?.provider ?? 'IA'}
                        </span>
                        <button
                          onClick={copiar}
                          className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-1 text-[10.5px] font-medium text-ink-700 hover:bg-ink-200"
                        >
                          <Copy className="h-3 w-3" />
                          Copiar
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-ink-800">
                        {resposta}
                      </pre>
                      {stats && (
                        <div className="mt-3 border-t border-ink-100 pt-2 text-[10.5px] text-ink-500">
                          {(stats.duracaoMs / 1000).toFixed(1)}s · {formatarRelogio(Date.now())}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pb-4 text-center text-[10.5px] text-ink-400">
            Alimentado por IA · Configure a chave em Configurações
          </div>
        </div>
      </div>
    </div>
  );
}