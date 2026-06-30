import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  X,
  Type,
  ChevronUp,
  ChevronDown,
  Eraser,
  Maximize2,
} from 'lucide-react';
import { db } from '@/db/schema';
import { usePulpitStore } from '@/stores/pulpit';
import { useUIStore } from '@/stores/ui';
import { Button } from '@/components/ui/Button';
import { cn, formatarRelogio, formatarDuracao } from '@/lib/utils';

export function PulpitPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mensagem = useLiveQuery(() => (id ? db.mensagens.get(id) : undefined), [id]);

  const ativa = usePulpitStore((s) => s.ativa);
  const entrar = usePulpitStore((s) => s.entrar);
  const sair = usePulpitStore((s) => s.sair);
  const linhasMarcadas = usePulpitStore((s) => s.linhasMarcadas);
  const toggleLinha = usePulpitStore((s) => s.toggleLinha);
  const marcarRange = usePulpitStore((s) => s.marcarRange);
  const desmarcarTudo = usePulpitStore((s) => s.desmarcarTudo);
  const tamanhoFonte = usePulpitStore((s) => s.tamanhoFonte);
  const setTamanhoFonte = usePulpitStore((s) => s.setTamanhoFonte);

  const iniciadaEm = usePulpitStore((s) => s.iniciadaEm);
  const pausada = usePulpitStore((s) => s.pausada);
  const tempoPausadoMs = usePulpitStore((s) => s.tempoPausadoMs);
  const iniciar = usePulpitStore((s) => s.iniciar);
  const pausar = usePulpitStore((s) => s.pausar);
  const resetar = usePulpitStore((s) => s.resetar);
  const tick = usePulpitStore((s) => s.tick);
  const tickAgora = usePulpitStore((s) => s.tickAgora);

  const [agora, setAgora] = useState(Date.now());
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  // Relógio parede (1s)
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Tick do cronômetro (200ms)
  useEffect(() => {
    if (!iniciadaEm || pausada) return;
    const t = setInterval(tickAgora, 200);
    return () => clearInterval(t);
  }, [iniciadaEm, pausada, tickAgora]);

  useEffect(() => {
    entrar();
    return () => sair();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fullscreen opcional
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  // Atalhos de teclado no púlpito
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      // ignora atalhos quando o foco está em input (caso surja algum)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!iniciadaEm) iniciar();
        else if (pausada) iniciar(); // resume
        else pausar();
      }
      if (e.key === 'Escape') navigate(`/editar/${id}`);
      if (e.key === '+' || e.key === '=') setTamanhoFonte(tamanhoFonte + 2);
      if (e.key === '-') setTamanhoFonte(tamanhoFonte - 2);
      if (e.key === '0') setTamanhoFonte(32);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iniciadaEm, pausada, tamanhoFonte]);

  // Extrai linhas do esboço/conteúdo
  const linhas = useMemo(() => {
    if (!mensagem) return [];
    const fonte = mensagem.esboco || mensagem.conteudo;
    if (!fonte) return ['Sem conteúdo. Adicione o sermão no editor antes de abrir o Modo Púlpito.'];

    // Converte HTML em blocos
    const tmp = document.createElement('div');
    tmp.innerHTML = fonte;
    const blocos: string[] = [];
    tmp.childNodes.forEach((node) => {
      const t = (node.textContent ?? '').trim();
      if (t) blocos.push(t);
    });
    if (blocos.length === 0) return [(tmp.textContent ?? '').trim() || 'Sem conteúdo.'];
    return blocos;
  }, [mensagem]);

  if (!mensagem) {
    return (
      <div className="flex h-full items-center justify-center text-ink-500">
        Carregando mensagem…
      </div>
    );
  }

  // Duração decorrida
  let duracaoMs = 0;
  if (iniciadaEm) {
    duracaoMs = pausada ? tempoPausadoMs : Date.now() - iniciadaEm;
  }

  // Progresso em relação ao estimado
  const progresso = iniciadaEm && mensagem.tempoEstimado > 0
    ? Math.min(100, (duracaoMs / 1000 / 60 / mensagem.tempoEstimado) * 100)
    : 0;

  const onPointerDown = (i: number) => (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    toggleLinha(i);
  };

  const onPointerEnter = (i: number) => (e: React.PointerEvent) => {
    if (e.buttons === 1 && !linhasMarcadas.has(i)) {
      marcarRange(Math.min(...Array.from(linhasMarcadas).filter((x) => x < i).concat(i)), i);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 z-40 flex flex-col bg-ink-950 text-white transition-opacity',
        ativa ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* Topo minimalista */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/editar/${id}`)}
            className="text-white hover:bg-white/10"
            aria-label="Sair do púlpito"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold tracking-tight">
              {mensagem.titulo || 'Sem título'}
            </div>
            <div className="truncate text-[11px] text-white/50">
              {mensagem.textoBase} {mensagem.livroBiblico ? `· ${mensagem.livroBiblico}` : ''}
            </div>
          </div>
        </div>

        {/* Relógio + cronômetro central */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="font-mono text-[28px] leading-none tracking-tight tabular-nums">
              {formatarDuracao(duracaoMs)}
            </div>
            <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-white/40">
              {pausada ? 'pausado' : iniciadaEm ? 'ministrando' : 'pronto'}
            </div>
          </div>
          <div className="h-9 w-px bg-white/10" />
          <div className="text-right">
            <div className="font-mono text-[18px] leading-none tabular-nums text-white/70">
              {formatarRelogio(agora)}
            </div>
            <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-white/40">
              agora
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-1.5">
          {!iniciadaEm ? (
            <Button
              variant="primary"
              onClick={() => {
                iniciar();
                mostrarToast('Ministração iniciada', 'sucesso');
              }}
              className="bg-white text-ink-950 hover:bg-white/90"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Iniciar
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={pausada ? () => { iniciar(); } : pausar}
                className="text-white hover:bg-white/10"
              >
                {pausada ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
                {pausada ? 'Retomar' : 'Pausar'}
              </Button>
              <Button
                variant="ghost"
                onClick={resetar}
                className="text-white hover:bg-white/10"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Zerar
              </Button>
            </>
          )}

          <Button variant="ghost" size="icon" onClick={desmarcarTudo} className="text-white hover:bg-white/10" title="Limpar marcações">
            <Eraser className="h-3.5 w-3.5" />
          </Button>

          <div className="ml-1 flex items-center rounded-md border border-white/10">
            <button
              onClick={() => setTamanhoFonte(tamanhoFonte - 2)}
              className="px-1.5 py-1 text-white/70 hover:bg-white/10 rounded-l-md"
              title="Diminuir fonte (-)"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
            <Type className="h-3 w-3 text-white/50 mx-0.5" />
            <button
              onClick={() => setTamanhoFonte(tamanhoFonte + 2)}
              className="px-1.5 py-1 text-white/70 hover:bg-white/10 rounded-r-md"
              title="Aumentar fonte (+)"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
          </div>

          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/10" title="Tela cheia">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => navigate(`/editar/${id}`)} className="text-white hover:bg-white/10" title="Sair (Esc)">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-1 flex-shrink-0 bg-white/5">
        <motion.div
          className="h-full bg-white/40"
          initial={{ width: 0 }}
          animate={{ width: `${progresso}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Corpo do sermão */}
      <div className="flex-1 overflow-y-auto px-12 py-12">
        <div className="mx-auto max-w-3xl">
          <ol className="space-y-3.5 list-none">
            <AnimatePresence>
              {linhas.map((linha, i) => {
                const marcada = linhasMarcadas.has(i);
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    onPointerDown={onPointerDown(i)}
                    onPointerEnter={onPointerEnter(i)}
                    className={cn(
                      'pulpit-line select-none',
                      marcada && 'marked',
                    )}
                    style={{ fontSize: `${tamanhoFonte}px`, lineHeight: 1.6 }}
                  >
                    <span className="mr-3 inline-block w-7 text-right text-white/30 tabular-nums" style={{ fontSize: '0.65em' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {linha}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>

          <div className="mt-16 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-white/30">
            <span>{linhasMarcadas.size} de {linhas.length} linhas marcadas</span>
            <span>Toque para marcar · arraste para marcar várias</span>
          </div>
        </div>
      </div>
    </div>
  );
}