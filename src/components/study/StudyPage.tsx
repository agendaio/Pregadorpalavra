import { BookOpen, Map, Users, Languages, ScrollText, Library } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MobileHeader } from '@/components/layout/MobileHeader';

const RECURSOS = [
  {
    titulo: 'Personagens bíblicos',
    descricao: 'Pesquise por nome, livro, período ou papel na narrativa.',
    icon: Users,
    status: 'em breve',
  },
  {
    titulo: 'Mapas e cenários',
    descricao: 'Atlas interativo dos lugares onde a história aconteceu.',
    icon: Map,
    status: 'em breve',
  },
  {
    titulo: 'Cronologias',
    descricao: 'Linha do tempo unificada de AT e NT, com eventos paralelos.',
    icon: ScrollText,
    status: 'em breve',
  },
  {
    titulo: 'Hebraico e Grego',
    descricao: 'Pesquisa por palavra original com Strong e dicionários.',
    icon: Languages,
    status: 'em breve',
  },
  {
    titulo: 'Comentários',
    descricao: 'Acervo curado de comentários clássicos e contemporâneos.',
    icon: BookOpen,
    status: 'em breve',
  },
  {
    titulo: 'Genealogias',
    descricao: 'Árvores genealógicas navegáveis de Adão a Cristo.',
    icon: Library,
    status: 'em breve',
  },
];

export function StudyPage() {
  return (
    <div className="flex h-full flex-col bg-paper">
      <MobileHeader title="Modo Estudo" subtitle="Recursos exegéticos para preparação" />

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="mb-5 rounded-2xl border border-ink-200/80 bg-white p-5 shadow-soft">
            <h2 className="text-[14px] font-semibold tracking-tight text-ink-900">
              Em construção — Onda 2
            </h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
              Os recursos de Estudo Profundo entram na próxima onda.
              O esqueleto já está pronto — cada recurso abrirá a partir desta tela.
              <br />
              <span className="text-ink-500">
                Enquanto isso, a IA no editor e no Assistente cobre a maior parte dessas consultas.
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {RECURSOS.map((r) => (
              <Card key={r.titulo} className="p-4">
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
                  <r.icon className="h-4 w-4" />
                </div>
                <h3 className="text-[13.5px] font-semibold tracking-tight text-ink-900">{r.titulo}</h3>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-600">{r.descricao}</p>
                <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-600">
                  {r.status}
                </span>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}