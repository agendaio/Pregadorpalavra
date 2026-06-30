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
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { db } from '@/db/schema';
import { usePulpitStore } from '@/stores/pulpit';
import { useProgressoStore } from '@/stores/progressoPulpit';
import { useUIStore } from '@/stores/ui';
import { parsearEsboco } from '@/lib/esbocoParser';
import { Button } from '@/components/ui/Button';
import { cn, formatarRelogio, formatarDuracao } from '@/lib/utils';

// ─── Linha de conteúdo ──────────────────────────────────────────────────────

function BlocoLinha({
  texto,
  index,
  marcada,
  onToggle,
  fonte,
}: {
  texto: string;
  index: number;
  marcada: boolean;
  onToggle: () => void;
  fonte: number;
}) {
  const eSubtitulo = texto.startsWith('▌');
  const eSubSub = texto.startsWith('  ◦');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      onClick={eSubtitulo ? undefined : onToggle}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition-all duration-150 select-none',
        marcada
          ? 'bg-amber-500/20 text-amber-100'
          : eSubtitulo
          ? 'bg-white/5 text-cyan-200 cursor-default'
          : eSubSub
          ? 'pl-10 text-white/55'
          : 'text-white/90 hover:bg-white/5',
      )}
      style={{ fontSize: `${fonte}px`, lineHeight: 1.5 }}
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold tabular-nums',
          marcada ? 'bg-amber-500/40 text-amber-200' : 'bg-white/10 text-white/30',
        )}
      >
        {marcada ? <CheckCircle2 className="h-3 w-3" /> : String(index + 1).padStart(2, '0')}
      </span>
      <span className="flex-1 leading-snug">{texto}</span>
    </motion.div>
  );
}

// ─── Card de capítulo ───────────────────────────────────────────────────────

function CapituloCard({
  capitulo,
  estaAberto,
  estaFeito,
  linhasMarcadas,
  toggleCapitulo,
  toggleLinha,
  fonte,
  eProximo,
}: {
  capitulo: { id: number; titulo: string; blocos: Array<{ id: number; texto: string }> };
  estaAberto: boolean;
  estaFeito: boolean;
  linhasMarcadas: Set<number>;
  toggleCapitulo: () => void;
  toggleLinha: (id: number) => void;
  fonte: number;
  eProximo: boolean;
}) {
  const total = capitulo.blocos.length;
  const marcados = capitulo.blocos.filter((b) => linhasMarcadas.has(b.id)).length;
  const progresso = total > 0 ? (marcados / total) * 100 : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300',
        estaFeito
          ? 'border-red-400/30 bg-red-500/5'
          : estaAberto
          ? 'border-white/20 bg-white/[0.04]'
          : 'border-white/10 bg-white/[0.02]',
      )}
    >
      {/* Header clicável */}
      <button
        onClick={toggleCapitulo}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors',
          estaFeito
            ? 'bg-red-500/10 hover:bg-red-500/15'
            : estaAberto
            ? 'bg-white/5 hover:bg-white/8'
            : 'hover:bg-white/5',
        )}
      >
        {/* Badge lateral */}
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold',
            estaFeito
              ? 'bg-red-500/20 text-red-300'
              : eProximo
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-white/10 text-white/60',
          )}
        >
          {estaFeito ? <CheckCircle2 className="h-4 w-4" /> : String(capitulo.id + 1).padStart(2, '0')}
        </div>

        {/* Título + barra de progresso */}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'truncate text-[13px] font-semibold leading-tight',
              estaFeito ? 'text-red-300 line-through' : estaAberto ? 'text-white' : 'text-white/80',
            )}
          >
            {capitulo.titulo}
          </div>
          {total > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={cn('h-full rounded-full', estaFeito ? 'bg-red-400' : 'bg-emerald-500')}
                  animate={{ width: `${estaFeito ? 100 : progresso}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-[10px] text-white/40">
                {estaFeito ? '✓ Aplicado' : `${marcados}/${total}`}
              </span>
            </div>
          )}
        </div>

        {/* Seta */}
        <motion.div animate={{ rotate: estaAberto ? 90 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0 text-white/40">
          <ChevronRight className="h-4 w-4" />
        </motion.div>
      </button>

      {/* Blocos expandidos */}
      <AnimatePresence>
        {estaAberto && !estaFeito && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-1 px-3 pb-3 pt-1">
              {capitulo.blocos.map((bloco, i) => (
                <BlocoLinha
                  key={bloco.id}
                  texto={bloco.texto}
                  index={i}
                  marcada={linhasMarcadas.has(bloco.id)}
                  onToggle={() => toggleLinha(bloco.id)}
                  fonte={fonte}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export function PulpitPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mensagem = useLiveQuery(() => (id ? db.mensagens.get(id) : undefined), [id]);

  const ativa = usePulpitStore((s) => s.ativa);
  const entrar = usePulpitStore((s) => s.entrar);
  const sair = usePulpitStore((s) => s.sair);
  const toggleLinhaStore = usePulpitStore((s) => s.toggleLinha);
  const linhasMarcadas = usePulpitStore((s) => s.linhasMarcadas);
  const desmarcarTudo = usePulpitStore((s) => s.desmarcarTudo);
  const tamanhoFonte = usePulpitStore((s) => s.tamanhoFonte);
  const setTamanhoFonte = usePulpitStore((s) => s.setTamanhoFonte);
  const iniciadaEm = usePulpitStore((s) => s.iniciadaEm);
  const pausada = usePulpitStore((s) => s.pausada);
  const tempoPausadoMs = usePulpitStore((s) => s.tempoPausadoMs);
  const iniciar = usePulpitStore((s) => s.iniciar);
  const pausar = usePulpitStore((s) => s.pausar);
  const resetar = usePulpitStore((s) => s.resetar);
  const tickAgora = usePulpitStore((s) => s.tickAgora);

  const capitulos = useProgressoStore((s) => s.capitulos);
  const capitulosAbertos = useProgressoStore((s) => s.capitulosAbertos);
  const capitulosFeitos = useProgressoStore((s) => s.capitulosFeitos);
  const inicializarProgresso = useProgressoStore((s) => s.inicializar);
  const toggleCapituloStore = useProgressoStore((s) => s.toggleCapitulo);
  const resetarProgresso = useProgressoStore((s) => s.resetar);

  const [agora, setAgora] = useState(Date.now());
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  // Parsear esboço → capítulos (só quando id muda)
  useEffect(() => {
    if (!mensagem) return;
    const fonte = mensagem.esboco || mensagem.conteudo;
    if (!fonte) return;
    inicializarProgresso(parsearEsboco(fonte));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagem?.id]);

  // Relógio parede
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Tick cronômetro
  useEffect(() => {
    if (!iniciadaEm || pausada) return;
    const t = setInterval(tickAgora, 200);
    return () => clearInterval(t);
  }, [iniciadaEm, pausada, tickAgora]);

  useEffect(() => { entrar(); return () => sair(); }, []);

  // Fullscreen
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  // Atalhos
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!iniciadaEm) iniciar();
        else if (pausada) iniciar();
        else pausar();
      }
      if (e.key === 'Escape') navigate(`/editar/${id}`);
      if (e.key === '+' || e.key === '=') setTamanhoFonte(tamanhoFonte + 2);
      if (e.key === '-') setTamanhoFonte(tamanhoFonte - 2);
      if (e.key === '0') setTamanhoFonte(32);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        const idx = capitulos.findIndex((c) => !capitulosFeitos.has(c.id));
        if (idx >= 0 && !capitulosAbertos.has(idx)) toggleCapituloStore(idx);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iniciadaEm, pausada, tamanhoFonte, capitulos, capitulosFeitos, capitulosAbertos]);

  if (!mensagem) {
    return <div className="flex h-full items-center justify-center text-ink-500">Carregando mensagem…</div>;
  }

  let duracaoMs = 0;
  if (iniciadaEm) duracaoMs = pausada ? tempoPausadoMs : Date.now() - iniciadaEm;

  const progresso = iniciadaEm && mensagem.tempoEstimado > 0
    ? Math.min(100, (duracaoMs / 1000 / 60 / mensagem.tempoEstimado) * 100)
    : 0;

  const totalFeitos = capitulosFeitos.size;
  const totalCaps = capitulos.length;
  const todosFeitos = totalFeitos === totalCaps && totalCaps > 0;
  const primeiroNaoFeito = capitulos.findIndex((c) => !capitulosFeitos.has(c.id));

  // Converter Set<number> global → Set<number> dos blocos
  const blocosMarcados = useMemo(() => {
    const ids = new Set<number>();
    if (!mensagem) return ids;
    const fonte = mensagem.esboco || mensagem.conteudo;
    if (!fonte) return ids;
    const caps = parsearEsboco(fonte);
    caps.forEach((cap) => cap.blocos.forEach((b) => { if (linhasMarcadas.has(b.id)) ids.add(b.id); }));
    return ids;
  }, [linhasMarcadas, mensagem]);

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={cn('fixed inset-0 z-40 flex flex-col text-white transition-opacity', ativa ? 'opacity-100' : 'opacity-0')}
      style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #111827 50%, #0f172a 100%)' }}
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/editar/${id}`)} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold">{mensagem.titulo || 'Sem título'}</div>
            <div className="truncate text-[11px] text-white/50">
              {mensagem.textoBase}
              {mensagem.livroBiblico ? ` · ${mensagem.livroBiblico}` : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="font-mono text-[28px] leading-none tabular-nums">{formatarDuracao(duracaoMs)}</div>
            <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-white/40">
              {pausada ? 'pausado' : iniciadaEm ? 'ministrando' : 'pronto'}
            </div>
          </div>
          <div className="h-9 w-px bg-white/10" />
          <div className="text-right">
            <div className="font-mono text-[18px] leading-none tabular-nums text-white/70">{formatarRelogio(agora)}</div>
            <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-white/40">agora</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!iniciadaEm ? (
            <Button variant="primary" onClick={() => { iniciar(); mostrarToast('Ministração iniciada', 'sucesso'); }} className="bg-white text-ink-950 hover:bg-white/90">
              <Play className="h-3.5 w-3.5 fill-current" /> Iniciar
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={pausada ? () => { iniciar(); } : pausar} className="text-white hover:bg-white/10">
                {pausada ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
                {pausada ? 'Retomar' : 'Pausar'}
              </Button>
              <Button variant="ghost" onClick={resetar} className="text-white hover:bg-white/10">
                <RotateCcw className="h-3.5 w-3.5" /> Zerar
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={desmarcarTudo} className="text-white hover:bg-white/10">
            <Eraser className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center rounded-md border border-white/10">
            <button onClick={() => setTamanhoFonte(tamanhoFonte - 2)} className="px-1.5 py-1 text-white/70 hover:bg-white/10 rounded-l-md">
              <ChevronDown className="h-3 w-3" />
            </button>
            <Type className="h-3 w-3 text-white/50 mx-0.5" />
            <button onClick={() => setTamanhoFonte(tamanhoFonte + 2)} className="px-1.5 py-1 text-white/70 hover:bg-white/10 rounded-r-md">
              <ChevronUp className="h-3 w-3" />
            </button>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/10">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/editar/${id}`)} className="text-white hover:bg-white/10">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Barra de progresso do tempo */}
      <div className="h-1 flex-shrink-0 bg-white/5">
        <motion.div className="h-full bg-white/40" animate={{ width: `${progresso}%` }} transition={{ duration: 0.4 }} />
      </div>

      {/* Barra de navegação dos capítulos */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.01] px-6 py-2 overflow-x-auto">
        {capitulos.map((cap) => (
          <button
            key={cap.id}
            onClick={() => toggleCapituloStore(cap.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all whitespace-nowrap',
              capitulosFeitos.has(cap.id)
                ? 'bg-red-500/20 text-red-300'
                : capitulosAbertos.has(cap.id)
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-white/10 text-white/50 hover:bg-white/15',
            )}
          >
            {capitulosFeitos.has(cap.id) ? <CheckCircle2 className="h-2.5 w-2.5" /> : String(cap.id + 1).padStart(2, '0')}
          </button>
        ))}
        <div className="ml-2 text-[10px] text-white/40 whitespace-nowrap">
          {totalFeitos}/{totalCaps} capítulos
        </div>
        {todosFeitos && (
          <Button size="sm" onClick={() => { resetar(); resetarProgresso(); }} className="ml-auto bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px]">
            <RotateCcw className="h-3 w-3 mr-1" /> Recomeçar
          </Button>
        )}
      </div>

      {/* Corpo: capítulos */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-2xl space-y-3">
          <AnimatePresence>
            {capitulos.map((cap) => (
              <CapituloCard
                key={cap.id}
                capitulo={cap}
                estaAberto={capitulosAbertos.has(cap.id)}
                estaFeito={capitulosFeitos.has(cap.id)}
                linhasMarcadas={blocosMarcados}
                toggleCapitulo={() => toggleCapituloStore(cap.id)}
                toggleLinha={(id) => toggleLinhaStore(id)}
                fonte={tamanhoFonte}
                eProximo={cap.id === primeiroNaoFeito}
              />
            ))}
          </AnimatePresence>
        </div>

        <div className="mx-auto mt-8 flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-white/30 max-w-2xl">
          <span>{totalFeitos}/{totalCaps} capítulos · {linhasMarcadas.size} linhas marcadas</span>
          <span>Clique na linha para marcar · setas ←→ navegam capítulos</span>
        </div>
      </div>
    </div>
  );
}
