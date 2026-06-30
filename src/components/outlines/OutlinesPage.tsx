import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { ScrollText, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/db/schema';
import { useMensagensStore } from '@/stores/mensagens';
import { useUIStore } from '@/stores/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Button } from '@/components/ui/Button';
import { htmlParaTexto, truncar } from '@/lib/utils';

export function OutlinesPage() {
  const mensagens = useLiveQuery(() => db.mensagens.toArray(), []);
  const nova = useMensagensStore((s) => s.nova);
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const navigate = useNavigate();

  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    let xs = (mensagens ?? []).filter((m) => m.esboco && htmlParaTexto(m.esboco).length > 30);
    if (busca.trim()) {
      const t = busca.toLowerCase();
      xs = xs.filter(
        (m) =>
          m.titulo.toLowerCase().includes(t) ||
          m.tema.toLowerCase().includes(t) ||
          htmlParaTexto(m.esboco).toLowerCase().includes(t),
      );
    }
    return xs.sort((a, b) => b.atualizadoEm - a.atualizadoEm);
  }, [mensagens, busca]);

  const handleNova = async () => {
    const m = await nova();
    mostrarToast('Nova mensagem criada', 'sucesso');
    navigate(`/editar/${m.id}`);
  };

  return (
    <div className="flex h-full flex-col bg-paper">
      <MobileHeader
        title="Esboços"
        subtitle={`${lista.length} mensagens com esboço`}
        right={
          <Button variant="ghost" size="icon" onClick={handleNova} aria-label="Nova mensagem">
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      {/* Busca */}
      <div className="flex-shrink-0 border-b border-ink-200/70 bg-paper px-4 py-2.5">
        <div className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-3 py-2 focus-within:border-ink-300">
          <Search className="h-4 w-4 flex-shrink-0 text-ink-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar esboços…"
            className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ink-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {lista.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-600">
                <ScrollText className="h-6 w-6" />
              </div>
              <h3 className="text-[15px] font-semibold text-ink-900">Nenhum esboço ainda</h3>
              <p className="mt-1 max-w-xs text-[12.5px] text-ink-500">
                Crie uma mensagem e use o Assistente para gerar esboços estruturados.
              </p>
              <Button variant="primary" onClick={handleNova} className="mt-4 h-10">
                <Plus className="h-4 w-4" /> Nova mensagem
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {lista.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.2) }}
                  >
                    <Link
                      to={`/editar/${m.id}`}
                      className="block rounded-2xl border border-ink-200/80 bg-white p-3.5 transition-all hover:border-ink-300 hover:shadow-soft active:scale-[0.99]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
                          <ScrollText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-[14px] font-semibold text-ink-900">
                            {m.titulo || 'Sem título'}
                          </h3>
                          {m.textoBase && (
                            <p className="mt-0.5 truncate text-[11.5px] text-ink-600">{m.textoBase}</p>
                          )}
                          <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-ink-500">
                            {truncar(htmlParaTexto(m.esboco), 240)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// helper para evitar conflito de import
import { cn } from '@/lib/utils';