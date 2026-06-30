import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, Download, Upload, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { db } from '@/db/schema';
import { useUIStore } from '@/stores/ui';
import { semearExemplos } from '@/db/seed';

export function SettingsPage() {
  const tema = useUIStore((s) => s.tema);
  const setTema = useUIStore((s) => s.setTema);
  const alternarTema = useUIStore((s) => s.alternarTema);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const total = useLiveQuery(() => db.mensagens.count(), []);

  const exportar = async () => {
    const mensagens = await db.mensagens.toArray();
    const historico = await db.historico.toArray();
    const blob = new Blob(
      [JSON.stringify({ mensagens, historico, exportadoEm: Date.now() }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pregador-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarToast('Backup exportado', 'sucesso');
  };

  const importar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const texto = await file.text();
      try {
        const dados = JSON.parse(texto);
        if (Array.isArray(dados.mensagens)) {
          for (const m of dados.mensagens) await db.mensagens.put(m);
        }
        if (Array.isArray(dados.historico)) {
          for (const h of dados.historico) await db.historico.put(h);
        }
        mostrarToast(`Importado: ${dados.mensagens?.length ?? 0} mensagens`, 'sucesso');
      } catch {
        mostrarToast('Arquivo inválido', 'erro');
      }
    };
    input.click();
  };

  const limparTudo = async () => {
    if (!confirm('Apagar TODAS as mensagens e histórico? Esta ação é irreversível.')) return;
    await db.mensagens.clear();
    await db.historico.clear();
    mostrarToast('Biblioteca limpa', 'sucesso');
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-ink-200/70 bg-paper px-8 py-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Configurações</h1>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Preferências, backup e manutenção da sua biblioteca.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-6 px-8 py-8">
        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            Aparência
          </h2>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-medium text-ink-900">Tema</div>
                <p className="text-[12.5px] text-ink-500">
                  Claro reduz cansaço em ambientes iluminados. Escuro para o modo púlpito à noite.
                </p>
              </div>
              <Button variant="outline" onClick={alternarTema}>
                {tema === 'light' ? 'Modo escuro' : 'Modo claro'}
              </Button>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            Dados
          </h2>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between rounded-lg bg-ink-50 p-3">
              <div className="text-[13px]">
                <span className="font-medium text-ink-900">{total ?? 0}</span>{' '}
                <span className="text-ink-500">mensagens armazenadas localmente</span>
              </div>
              <div className="text-[11px] text-ink-400">IndexedDB · offline-first</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={exportar}>
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
              <Button variant="outline" onClick={importar}>
                <Upload className="h-3.5 w-3.5" /> Importar
              </Button>
              <Button variant="outline" onClick={semearExemplos}>
                <Download className="h-3.5 w-3.5" /> Semear exemplos
              </Button>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            Zona de risco
          </h2>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-medium text-ink-900">Apagar tudo</div>
                <p className="text-[12.5px] text-ink-500">
                  Remove todas as mensagens e versões históricas. Sem restauração.
                </p>
              </div>
              <Button variant="danger" onClick={limparTudo}>
                <Trash2 className="h-3.5 w-3.5" /> Apagar biblioteca
              </Button>
            </div>
          </Card>
        </section>

        <section className="text-center text-[11px] text-ink-400">
          Pregador OS · v0.1 · MVP Onda 1 · React 19 · Vite · Dexie · Tiptap
        </section>
      </div>
    </div>
  );
}