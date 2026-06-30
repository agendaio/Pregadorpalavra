import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { db } from '@/db/schema';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { htmlParaTexto, formatarRelativo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import type { Mensagem } from '@/types/mensagem';

interface Analise {
  mensagem: Mensagem;
  pontuacao: number;
  checks: { ok: boolean; rotulo: string; detalhe?: string }[];
  alertas: string[];
}

function analisar(m: Mensagem): Analise {
  const checks: Analise['checks'] = [];
  const alertas: string[] = [];
  let pontos = 0;
  const total = 10;

  const texto = htmlParaTexto(m.conteudo);

  checks.push({ ok: !!m.textoBase, rotulo: 'Texto-base definido', detalhe: m.textoBase || 'Defina o texto-base.' });
  if (m.textoBase) pontos++;

  checks.push({ ok: !!m.tema, rotulo: 'Tema central claro', detalhe: m.tema || 'Escreva o tema.' });
  if (m.tema) pontos++;

  checks.push({ ok: !!m.objetivo, rotulo: 'Objetivo definido', detalhe: m.objetivo || 'O que o ouvinte deve compreender?' });
  if (m.objetivo) pontos++;

  checks.push({ ok: !!m.publico, rotulo: 'Público-alvo identificado', detalhe: m.publico || 'Para quem?' });
  if (m.publico) pontos++;

  checks.push({ ok: m.versiculos.length > 0, rotulo: 'Versículos centrais' });
  if (m.versiculos.length > 0) pontos++;

  checks.push({ ok: m.aplicacoes.length > 0, rotulo: 'Aplicações práticas' });
  if (m.aplicacoes.length > 0) pontos++;

  checks.push({ ok: m.ilustracoes.length > 0, rotulo: 'Ilustrações concretas' });
  if (m.ilustracoes.length > 0) pontos++;

  checks.push({ ok: !!m.conclusao, rotulo: 'Conclusão redigida' });
  if (m.conclusao) pontos++;

  checks.push({ ok: texto.length > 1500, rotulo: 'Desenvolvimento suficiente (>1500 caracteres)' });
  if (texto.length > 1500) pontos++;

  checks.push({ ok: texto.length < 12000, rotulo: 'Sem excesso de conteúdo (<12000)' });
  if (texto.length < 12000) pontos++;

  if (texto.length > 12000) alertas.push('Conteúdo longo: considere focar.');
  if (m.tempoEstimado > 0 && texto.length / 150 > m.tempoEstimado)
    alertas.push(`Ritmo indica ${Math.round(texto.length / 150)} min — maior que o tempo estimado.`);
  if (m.versiculos.length === 0) alertas.push('Nenhum versículo registrado.');
  if (m.aplicacoes.length === 0) alertas.push('Sem aplicações práticas registradas.');
  if (!m.oracao) alertas.push('Considere escrever uma oração final.');

  return { mensagem: m, pontuacao: Math.round((pontos / total) * 100), checks, alertas };
}

export function AnalystPage() {
  const mensagens = useLiveQuery(() => db.mensagens.toArray(), []);
  const analises = useMemo<Analise[]>(
    () => (mensagens ?? []).map(analisar).sort((a, b) => b.pontuacao - a.pontuacao),
    [mensagens],
  );

  return (
    <div className="flex flex-col bg-paper text-ink-900 dark:bg-paper-dark dark:text-ink-100">
      <MobileHeader title="Analista" subtitle={`${analises.length} mensagens avaliadas`} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-2.5 px-4 py-3">
          {analises.length === 0 && (
            <div className="rounded-2xl border border-ink-200/80 bg-white p-10 text-center dark:border-ink-800 dark:bg-ink-900/40">
              <Sparkles className="mx-auto mb-3 h-6 w-6 text-ink-400 dark:text-ink-500" />
              <h3 className="text-[14.5px] font-semibold tracking-tight text-ink-900 dark:text-white">
                Nenhuma mensagem para analisar
              </h3>
              <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">
                Crie mensagens para receber análise estrutural.
              </p>
            </div>
          )}

          {analises.map((a) => (
            <div
              key={a.mensagem.id}
              className="rounded-2xl border border-ink-200/80 bg-white p-4 shadow-soft dark:border-ink-800 dark:bg-ink-900/40"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <ScoreRing score={a.pontuacao} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/editar/${a.mensagem.id}`}
                      className="truncate text-[14.5px] font-semibold tracking-tight text-ink-900 hover:underline dark:text-white"
                    >
                      {a.mensagem.titulo || 'Sem título'}
                    </Link>
                    <span className="text-[10.5px] text-ink-500 dark:text-ink-400 tabular-nums">
                      {formatarRelativo(a.mensagem.atualizadoEm)}
                    </span>
                  </div>
                  {a.mensagem.tema && (
                    <p className="truncate text-[12.5px] text-ink-600 dark:text-ink-300">
                      {a.mensagem.tema}
                    </p>
                  )}

                  <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
                    {a.checks.map((c, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        {c.ok ? (
                          <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-500 dark:text-amber-400" />
                        )}
                        <span className={cn(
                          c.ok
                            ? 'text-ink-700 dark:text-ink-200'
                            : 'text-ink-500 dark:text-ink-400',
                        )}>
                          {c.rotulo}
                        </span>
                      </div>
                    ))}
                  </div>

                  {a.alertas.length > 0 && (
                    <div className="mt-2.5 space-y-1 rounded-lg bg-amber-50 p-2.5 dark:bg-amber-500/10">
                      {a.alertas.map((al, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11.5px] text-amber-900 dark:text-amber-200">
                          <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>{al}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const cor =
    score >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : score >= 60
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-ink-500 dark:text-ink-400';
  return (
    <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-[2.5px] border-ink-100 dark:border-ink-800">
      <span className={cn('text-[15px] font-semibold tabular-nums', cor)}>{score}</span>
      <span className="text-[8px] uppercase tracking-wide text-ink-400 dark:text-ink-500">/100</span>
    </div>
  );
}
