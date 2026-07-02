/**
 * useOutlineFolders — hook para gerenciar pastas/séries de esboços.
 * As pastas são armazenadas no IndexedDB (Dexie) como "series".
 */

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/db/schema';
import type { Serie } from '@/types/mensagem';

const CORES_DISPONIVEIS = [
  '#7c3aed', '#0891b2', '#059669', '#dc2626',
  '#d97706', '#db2777', '#4f46e5', '#ea580c',
];

export interface PastaOutline {
  id: string;
  nome: string;
  cor: string;
  mensagemCount: number;
}

export function useOutlineFolders() {
  const [pastas, setPastas] = useState<PastaOutline[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarPastas = useCallback(async () => {
    setCarregando(true);
    try {
      const series = await db.series.orderBy('criadoEm').reverse().toArray();
      // Contar mensagens por série
      const pastasComCount: PastaOutline[] = await Promise.all(
        series.map(async (s) => {
          const count = await db.mensagens.where('serie').equals(s.id).count();
          return {
            id: s.id,
            nome: s.nome,
            cor: s.cor ?? CORES_DISPONIVEIS[Math.floor(Math.random() * CORES_DISPONIVEIS.length)],
            mensagemCount: count,
          };
        }),
      );
      setPastas(pastasComCount);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarPastas();
  }, [carregarPastas]);

  const criarPasta = useCallback(async (nome: string, cor?: string): Promise<string> => {
    const serie: Serie = {
      id: crypto.randomUUID(),
      nome: nome.trim(),
      cor: cor ?? CORES_DISPONIVEIS[Math.floor(Math.random() * CORES_DISPONIVEIS.length)],
      mensagemIds: [],
      criadoEm: Date.now(),
      atualizadoEm: Date.now(),
    };
    await db.series.add(serie);
    await void carregarPastas();
    return serie.id;
  }, [carregando]);

  const deletarPasta = useCallback(async (id: string) => {
    await db.series.delete(id);
    await void carregarPastas();
  }, []);

  return {
    pastas,
    carregando,
    criarPasta,
    deletarPasta,
    recarregar: carregarPastas,
  };
}
