import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  Check,
  Plus,
  Wand2,
  X,
  Image as ImageIcon,
  Compass,
  BookOpen,
  Target,
  MessagesSquare,
  ClipboardList,
  ListChecks,
  ScrollText,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { useMensagensStore } from '@/stores/mensagens';
import { ACOES_IA, type AcaoIA, SYSTEM_APPENDS, construirMensagens, enviarComFallback, type ChatMessage } from '@/lib/ai';
import { cn } from '@/lib/utils';

const ICONES: Record<AcaoIA, React.ComponentType<{ className?: string }>> = {
  esboco: ScrollText,
  ilustracoes: ImageIcon,
  aplicacoes: Target,
  cruzamentos: Compass,
  perguntas: MessagesSquare,
  contextualizar: BookOpen,
  resumir: ListChecks,
};

interface RespostaIA {
  id: string;
  acao: AcaoIA;
  conteudo: string;
  criadoEm: number;
  provider: string;
  tokens: number;
  custo: number;
  fallback: boolean;
}

export function AIPanel() {
  const mensagem = useMensagensStore((s) => s.atual);
  const patch = useMensagensStore((s) => s.patch);

  const [gerando, setGerando] = useState<AcaoIA | null>(null);
  const [historico, setHistorico] = useState<RespostaIA[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [perguntaLivre, setPerguntaLivre] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  if (!mensagem) return null;

  const executar = async (acao: AcaoIA, extra?: string) => {
    if (!mensagem) return;
    setGerando(acao);
    setErro(null);

    try {
      const msgs: ChatMessage[] = [
        { role: 'user', content: extra ?? acao, timestamp: Date.now() },
      ];
      const montadas = construirMensagens(msgs, mensagem, SYSTEM_APPENDS[acao]);

      const { response, fallbackUsado, providerUsado } = await enviarComFallback({
        messages: montadas,
        mensagemContexto: mensagem,
        systemAppend: SYSTEM_APPENDS[acao],
        maxTokens: 2000,
        temperature: 0.7,
      });

      const item: RespostaIA = {
        id: crypto.randomUUID(),
        acao,
        conteudo: response.content,
        criadoEm: Date.now(),
        provider: providerUsado,
        tokens: response.tokensTotal,
        custo: response.custoUSD,
        fallback: fallbackUsado,
      };
      setHistorico((h) => [item, ...h]);
      setExpandido(item.id);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setGerando(null);
      setPerguntaLivre('');
    }
  };

  const inserirNoEsboco = (texto: string) => {
    const html = texto
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
    patch({ esboco: (mensagem.esboco ? mensagem.esboco + '<br/><br/>' : '') + html });
  };

  return (
    <div className="flex h-full flex-col bg-paper">
      <div className="flex-shrink-0 border-b border-ink-200/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-ink-900 to-ink-700 text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="truncate text-[13px] font-semibold tracking-tight text-ink-900">
              Assistente Ministerial
            </h2>
            <p className="text-[10.5px] text-ink-500">Contexto carregado</p>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-b border-ink-200/70 p-3">
        <div className="grid grid-cols-2 gap-1.5">
          {ACOES_IA.map((a) => {
            const Icon = ICONES[a.id];
            const ativo = gerando === a.id;
            return (
              <button
                key={a.id}
                onClick={() => executar(a.id)}
                disabled={gerando !== null}
                className={cn(
                  'group flex items-start gap-2 rounded-lg border border-ink-200/80 bg-white px-2.5 py-2 text-left transition-all',
                  'hover:border-ink-300 hover:shadow-soft disabled:opacity-50',
                  ativo && 'border-ink-300',
                )}
              >
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-ink-100 text-ink-700 group-hover:bg-ink-200">
                  {ativo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-ink-900">{a.rotulo}</div>
                  <div className="truncate text-[10px] text-ink-500">{a.descricao}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-ink-200/80 bg-white px-2.5 py-1 focus-within:border-ink-300">
          <Wand2 className="h-3.5 w-3.5 flex-shrink-0 text-ink-400" />
          <input
            value={perguntaLivre}
            onChange={(e) => setPerguntaLivre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && perguntaLivre.trim()) {
                executar('esboco', perguntaLivre);
              }
            }}
            placeholder="Pergunte algo sobre a mensagem…"
            className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-ink-400"
          />
        </div>

        {erro && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 p-2 text-[11px] text-red-900">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{erro}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {historico.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-500">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="text-[12px] text-ink-500">
              Escolha uma ação acima. O assistente considera toda a mensagem em edição.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {historico.map((h) => {
            const Icon = ICONES[h.acao];
            const isOpen = expandido === h.id;
            return (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mb-2 rounded-lg border border-ink-200/80 bg-white"
              >
                <button
                  onClick={() => setExpandido(isOpen ? null : h.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                >
                  <Icon className="h-3.5 w-3.5 text-ink-600" />
                  <span className="flex-1 text-[12.5px] font-medium text-ink-900">
                    {ACOES_IA.find((a: { id: string; rotulo: string }) => a.id === h.acao)?.rotulo}
                  </span>
                  {h.fallback && (
                    <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium uppercase text-amber-700">
                      fallback
                    </span>
                  )}
                  <span className="text-[10px] text-ink-400">
                    {new Date(h.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="border-t border-ink-200/80 px-3 py-2.5 text-[12px] leading-relaxed text-ink-700"
                    >
                      <pre className="whitespace-pre-wrap font-sans">{h.conteudo}</pre>

                      <div className="mt-2.5 flex items-center gap-2 border-t border-ink-100 pt-2 text-[10px] text-ink-500 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Cpu className="h-3 w-3" /> {h.provider}
                        </span>
                        <span>· {h.tokens} tokens</span>
                        <span>· ${h.custo.toFixed(5)}</span>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          onClick={() => inserirNoEsboco(h.conteudo)}
                          className="flex items-center gap-1 rounded-md bg-ink-900 px-2 py-1 text-[10.5px] font-medium text-white hover:bg-ink-800"
                        >
                          <Plus className="h-3 w-3" /> Inserir no esboço
                        </button>
                        <button className="flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium text-ink-600 hover:bg-ink-100">
                          <ClipboardList className="h-3 w-3" /> Copiar
                        </button>
                        <button
                          onClick={() => setHistorico((x) => x.filter((it) => it.id !== h.id))}
                          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium text-ink-500 hover:bg-ink-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex-shrink-0 border-t border-ink-200/70 bg-ink-50/40 px-3 py-2 text-[10px] text-ink-500">
        <div className="flex items-center gap-1.5">
          <Check className="h-3 w-3 text-emerald-600" />
          Diferencia fato · interpretação · aplicação
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Check className="h-3 w-3 text-emerald-600" />
          Sugere estudo pessoal · sem inventar dados
        </div>
      </div>
    </div>
  );
}