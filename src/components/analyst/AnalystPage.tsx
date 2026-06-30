import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Sparkles, BookOpen, Target, Clock } from 'lucide-react';
import { db } from '@/db/schema';
import { Card } from '@/components/ui/Card';
import { htmlParaTexto, formatarRelativo, formatarDuracao } from '@/lib/utils';
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
  const temTextoBase = !!m.textoBase;
  const temTema = !!m.tema;
  const temObjetivo = !!m.objetivo;
  const temPublico = !!m.publico;
  const temConclusao = !!m.conclusao;

  checks.push({
    ok: temTextoBase,
    rotulo: 'Texto-base definido',
    detalhe: temTextoBase ? m.textoBase : 'Defina o texto-base da mensagem.',
  });
  if (temTextoBase) pontos++;

  checks.push({
    ok: temTema,
    rotulo: 'Tema central claro',
    detalhe: temTema ? m.tema : 'Escreva o tema em uma frase.',
  });
  if (temTema) pontos++;

  checks.push({
    ok: temObjetivo,
    rotulo: 'Objetivo definido',
    detalhe: temObjetivo ? m.objetivo : 'O que o ouvinte deve compreender?',
  });
  if (temObjetivo) pontos++;

  checks.push({
    ok: temPublico,
    rotulo: 'Público-alvo identificado',
    detalhe: temPublico ? m.publico : 'Para quem você está pregando?',
  });
  if (temPublico) pontos++;

  checks.push({ ok: m.versiculos.length > 0, rotulo: 'Versículos centrais registrados' });
  if (m.versiculos.length > 0) pontos++;

  checks.push({ ok: m.aplicacoes.length > 0, rotulo: 'Aplicações práticas definidas' });
  if (m.aplicacoes.length > 0) pontos++;

  checks.push({ ok: m.ilustracoes.length > 0, rotulo: 'Ilustrações concretas' });
  if (m.ilustracoes.length > 0) pontos++;

  checks.push({ ok: temConclusao, rotulo: 'Conclusão redigida' });
  if (temConclusao) pontos++;

  checks.push({ ok: texto.length > 1500, rotulo: 'Desenvolvimento suficiente (>1500 caracteres)' });
  if (texto.length > 1500) pontos++;

  checks.push({ ok: texto.length < 12000, rotulo: 'Sem excesso de conteúdo (<12000 caracteres)' });
  if (texto.length < 12000) pontos++;

  // alertas contextuais
  if (texto.length > 12000) alertas.push('Conteúdo longo: considere focar para caber no tempo.');
  if (m.tempoEstimado > 0 && texto.length / 150 > m.tempoEstimado)
    alertas.push(`Ritmo de leitura indica ${Math.round(texto.length / 150)} min — maior que o tempo estimado.`);
  if (m.versiculos.length === 0) alertas.push('Nenhum versículo registrado. A base bíblica é essencial.');
  if (m.aplicacoes.length === 0) alertas.push('Sem aplicações práticas registradas. A mensagem precisa aterrizar na vida.');
  if (!m.oracao) alertas.push('Considere escrever uma oração final. Encerra a ministração com intencionalidade.');

  return {
    mensagem: m,
    pontuacao: Math.round((pontos / total) * 100),
    checks,
    alertas,
  };
}

export function AnalystPage() {
  const mensagens = useLiveQuery(() => db.mensagens.toArray(), []);
  const analises = useMemo<Analise[]>(
    () => (mensagens ?? []).map(analisar).sort((a, b) => b.pontuacao - a.pontuacao),
    [mensagens],
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-ink-200/70 bg-paper px-8 py-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Analista de Sermões</h1>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Avaliação estrutural de cada mensagem. Sem substituir seu discernimento — apenas iluminar.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-8 py-8 space-y-3">
        {analises.length === 0 && (
          <Card className="p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-6 w-6 text-ink-400" />
            <h3 className="text-[14px] font-semibold text-ink-900">Nenhuma mensagem para analisar</h3>
            <p className="mt-1 text-[12.5px] text-ink-500">Crie mensagens para receber uma análise estrutural.</p>
          </Card>
        )}

        {analises.map((a) => (
          <Card key={a.mensagem.id} className="p-5">
            <div className="flex items-start gap-5">
              {/* Pontuação */}
              <div className="flex-shrink-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-ink-100">
                  <ScoreRing score={a.pontuacao} />
                </div>
                <div className="mt-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-ink-500">
                  Estrutura
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/editar/${a.mensagem.id}`}
                    className="truncate text-[15px] font-semibold tracking-tight text-ink-900 hover:underline"
                  >
                    {a.mensagem.titulo || 'Sem título'}
                  </Link>
                  <span className="text-[11.5px] text-ink-500">{formatarRelativo(a.mensagem.atualizadoEm)}</span>
                </div>
                {a.mensagem.tema && (
                  <p className="truncate text-[12.5px] text-ink-600">{a.mensagem.tema}</p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1 text-[12px]">
                  {a.checks.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      {c.ok ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                      )}
                      <div>
                        <span className={c.ok ? 'text-ink-700' : 'text-ink-500'}>{c.rotulo}</span>
                        {c.detalhe && !c.ok && <div className="text-[11px] text-ink-400">{c.detalhe}</div>}
                      </div>
                    </div>
                  ))}
                </div>

                {a.alertas.length > 0 && (
                  <div className="mt-3 space-y-1 rounded-lg bg-amber-50 p-3">
                    {a.alertas.map((al, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-amber-900">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                        <span>{al}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const cor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-ink-500';
  return (
    <div className="flex flex-col items-center">
      <span className={`text-[20px] font-semibold tabular-nums ${cor}`}>{score}</span>
      <span className="text-[9px] uppercase tracking-wide text-ink-400">/100</span>
    </div>
  );
}