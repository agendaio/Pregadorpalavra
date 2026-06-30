import { motion } from 'framer-motion';
import {
  BookOpen,
  MessageSquare,
  FileText,
  Flame,
  Heart,
  HandHeart,
  Coins,
  Users,
  Target,
  Cross,
  Sunrise,
  Moon,
  User,
  Baby,
  Users2,
  Circle,
  BookMarked,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TemplatePregacao {
  id: string;
  rotulo: string;
  emoji: string;
  descricao: string;
  cor: string;
  corBg: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Estrutura padrão do esboço (HTML Tiptap) */
  esbocoModelo: string;
  /** Conteúdo inicial do tema */
  temaPadrao: string;
  /** Categoria padrão */
  categoria: string;
}

export const TEMPLATES: TemplatePregacao[] = [
  {
    id: 'expositivo',
    rotulo: 'Sermão Expositivo',
    emoji: '📖',
    descricao: 'Exposição detalhada passage a passage. Ideal para séries bíblicas.',
    cor: 'text-amber-700',
    corBg: 'bg-amber-50',
    icon: BookOpen,
    esbocoModelo: `<h2>Introdução</h2><p>Contexto e relevância da passagem para hoje.</p><h2>Ponto 1</h2><p>Primeira verdade central com exegese.</p><h2>Ponto 2</h2><p>Segunda verdade com aplicação prática.</p><h2>Ponto 3</h2><p>Terceira verdade e resposta pastoral.</p><h2>Conclusão</h2><p>Resumo e apelo à resposta.</p>`,
    temaPadrao: '',
    categoria: 'sermão',
  },
  {
    id: 'tematico',
    rotulo: 'Sermão Temático',
    emoji: '📝',
    descricao: 'Um tema central desenvolvido em pontos. Clássico e direto.',
    cor: 'text-blue-700',
    corBg: 'bg-blue-50',
    icon: MessageSquare,
    esbocoModelo: `<h2>Introdução</h2><p>Apresentação do tema e sua relevância.</p><h2>Desenvolvimento</h2><p>Ponto 1 — Primeira aspecto do tema.</p><p>Ponto 2 — Segundo aspecto com provas bíblicas.</p><p>Ponto 3 — Terceiro aspecto e aplicação.</p><h2>Conclusão</h2><p>Resumo e decisão.</p>`,
    temaPadrao: '',
    categoria: 'sermão',
  },
  {
    id: 'textual',
    rotulo: 'Sermão Textual',
    emoji: '📜',
    descricao: 'Baseado numa única passagem. Prédica expositiva concentrada.',
    cor: 'text-orange-700',
    corBg: 'bg-orange-50',
    icon: FileText,
    esbocoModelo: `<h2>Introdução</h2><p>Leitura do texto e contexto imediato.</p><h2>O Texto Explicado</h2><p>Análise versículo por versículo.</p><h2>O Texto Ilustrado</h2><p>Aplicações concretas da verdade.</p><h2>O Texto Aplicado</h2><p>Chamada à resposta pessoal.</p>`,
    temaPadrao: '',
    categoria: 'sermão',
  },
  {
    id: 'avivamento',
    rotulo: 'Avivamento',
    emoji: '🔥',
    descricao: 'Mensagem de desperta espiritual, consagração e fogo do Espírito.',
    cor: 'text-red-700',
    corBg: 'bg-red-50',
    icon: Flame,
    esbocoModelo: `<h2>Chamada ao Arrependimento</h2><p>O que impede o avivamento.</p><h2>O Coração Quebrantado</h2><p>Os que Deus usa são os rendidos.</p><h2>O Fogo que Desce</h2><p>Como等待 e buscar o avivamento.</p><h2>Compromisso</h2><p>Decisão de consagracão.</p>`,
    temaPadrao: 'Avivamento',
    categoria: 'sermão',
  },
  {
    id: 'familia',
    rotulo: 'Família',
    emoji: '❤️',
    descricao: 'Valores bíblicos para o lar, casamento e criação dos filhos.',
    cor: 'text-pink-700',
    corBg: 'bg-pink-50',
    icon: Heart,
    esbocoModelo: `<h2>Base Bíblica</h2><p>Deus instituiu a família.</p><h2>Liderança Amorosa</h2><p>O papel do marido e da esposa.</p><h2>Educação na Fé</h2><p>Como criar filhos para Deus.</p><h2>Proposta</h2><p>Compromisso com o lar.</p>`,
    temaPadrao: 'Família',
    categoria: 'sermão',
  },
  {
    id: 'fe',
    rotulo: 'Fé',
    emoji: '🙏',
    descricao: 'A fé bíblica: fundamento, exercício e consequências.',
    cor: 'text-violet-700',
    corBg: 'bg-violet-50',
    icon: HandHeart,
    esbocoModelo: `<h2>O Que É Fé</h2><p>Hebreus 11:1 — definição bíblica.</p><h2>Os Heróis da Fé</h2><p>Exemplos do Antigo e Novo Testamento.</p><h2>Faith em Ação</h2><p>Como exercitar a fé no dia a dia.</p><h2>Promessas de Deus</h2><p>Confiança nas promessas.</p>`,
    temaPadrao: 'Fé',
    categoria: 'sermão',
  },
  {
    id: 'louvor',
    rotulo: 'Louvor e Adoração',
    emoji: '🪗',
    descricao: 'A natureza do verdadeiro louvor espiritual e emocional.',
    cor: 'text-purple-700',
    corBg: 'bg-purple-50',
    icon: BookMarked,
    esbocoModelo: `<h2>Adoração em Espírito e em Verdade</h2><p>João 4:23-24 — o modelo divino.</p><h2>Os Salmos</h2><p>Louvor em todas as circunstâncias.</p><h2>Do Ritual ao Relacionamento</h2><p>Além das formas, o coração.</p><h2>Vida de Adoração</h2><p>Cada dia é oportunidade de adorar.</p>`,
    temaPadrao: 'Adoração',
    categoria: 'sermão',
  },
  {
    id: 'mordomia',
    rotulo: 'Mordomia',
    emoji: '💰',
    descricao: 'Stewardship dos recursos: tempo, dízimos, talentos e vida.',
    cor: 'text-emerald-700',
    corBg: 'bg-emerald-50',
    icon: Coins,
    esbocoModelo: `<h2>Tudo É de Deus</h2><p>Somos mordomos, não donos.</p><h2>O Dízimo e a Oferta</h2><p>Princípios financeiros bíblicos.</p><h2>Talentos e Vocação</h2><p>Usar o que Deus deu para o Reino.</p><h2>Compromisso</h2><p>Decisões práticas de mordomia.</p>`,
    temaPadrao: ' Mordomia',
    categoria: 'sermão',
  },
  {
    id: 'lideranca',
    rotulo: 'Liderança',
    emoji: '👑',
    descricao: 'Características do líder segundo as Escrituras.',
    cor: 'text-teal-700',
    corBg: 'bg-teal-50',
    icon: Users,
    esbocoModelo: `<h2>Liderança Servidora</h2><p>Marcos 10:42-45 — o modelo de Cristo.</p><h2>Integridade</h2><p>Caráter acima de competência.</p><h2>Visão e Disciplina</h2><p>Guiar com propósito e constância.</p><h2>Sucessão</h2><p>Formar novos líderes.</p>`,
    temaPadrao: 'Liderança',
    categoria: 'sermão',
  },
  {
    id: 'evangelismo',
    rotulo: 'Evangelismo',
    emoji: '🎯',
    descricao: 'Como evangelizar com ousadia e amor na cultura atual.',
    cor: 'text-cyan-700',
    corBg: 'bg-cyan-50',
    icon: Target,
    esbocoModelo: `<h2>A Urgência da Evangelização</h2><p>Não podemos calar.</p><h2>O Método de Deus</h2><p>A cruz como poder e sabedoria.</p><h2>Abordagens Práticas</h2><p>Como compartilhar a fé no dia a dia.</p><h2>Convite</h2><p>Decisão de aceitar Cristo.</p>`,
    temaPadrao: 'Evangelismo',
    categoria: 'sermão',
  },
  {
    id: 'santa_ceia',
    rotulo: 'Santa Ceia',
    emoji: '⛪',
    descricao: 'O significado profundo do sacrifício de Cristo.',
    cor: 'text-indigo-700',
    corBg: 'bg-indigo-50',
    icon: Cross,
    esbocoModelo: `<h2>O Significado dos Elementos</h2><p>Pão partido e cálice derramado.</p><h2>A Morte de Cristo</h2><p>Por nós, em nosso lugar.</p><h2>Memorial</h2><p>Por que celebramos todos os dias.</p><h2>Autoexame</h2><p>Chegando à mesa com reverência.</p>`,
    temaPadrao: 'Santa Ceia',
    categoria: 'sermão',
  },
  {
    id: 'culto_manhã',
    rotulo: 'Culto da Manhã',
    emoji: '🌅',
    descricao: 'Começar o dia com Deus. Devocional congregacional.',
    cor: 'text-yellow-700',
    corBg: 'bg-yellow-50',
    icon: Sunrise,
    esbocoModelo: `<h2>Invocação e Louvor</h2><p>Abertura em adoração.</p><h2>Palavra</h2><p>Passagem chosen para o momento.</p><h2>Aplicação</h2><p>Como viver esta verdade hoje.</p><h2>Intercessão</h2><p>Oração congregacional.</p>`,
    temaPadrao: 'Culto da Manhã',
    categoria: 'sermão',
  },
  {
    id: 'culto_noite',
    rotulo: 'Culto da Noite',
    emoji: '🌙',
    descricao: 'Encontro noturno. Mais introspectivo e evangelístico.',
    cor: 'text-slate-700',
    corBg: 'bg-slate-50',
    icon: Moon,
    esbocoModelo: `<h2>Acolhida e Oração</h2><p>Conexão com Deus no silêncio.</p><h2>Pregação</h2><p>Mensagem para o coração.</p><h2>Reflexão</h2><p>Momento de contemplação pessoal.</p><h2>Chamada</h2><p>Opportunidade de decisão.</p>`,
    temaPadrao: 'Culto da Noite',
    categoria: 'sermão',
  },
  {
    id: 'jovens',
    rotulo: 'Jovens',
    emoji: '👦',
    descricao: 'Vida cristã para a nova geração. Desafios e propósitos.',
    cor: 'text-fuchsia-700',
    corBg: 'bg-fuchsia-50',
    icon: User,
    esbocoModelo: `<h2>Você Foi Criado Para Mais</h2><p>Propósito e dignidade do jovem.</p><h2>Pressões da Idade</h2><p>Amizades, estudos, escolhas.</p><h2>A Arena do Mundo</h2><p>Como se posicionar com Cristo.</p><h2>Compromisso</h2><p>Decisões que mudam a história.</p>`,
    temaPadrao: 'Juventude',
    categoria: 'sermão',
  },
  {
    id: 'criancas',
    rotulo: 'Crianças',
    emoji: '👧',
    descricao: 'Linguagem simples. Lições eternas para os pequenos.',
    cor: 'text-rose-700',
    corBg: 'bg-rose-50',
    icon: Baby,
    esbocoModelo: `<h2>Historia Bíblica</h2><p>Narrativa simples e envolvente.</p><h2>Ensino Central</h2><p>Uma verdade clara por trás da história.</p><h2>Aplicação</h2><p>O que Deus quer que a criança faça hoje.</p><h2>Oração</h2><p>Momento de aplicar ao coração.</p>`,
    temaPadrao: 'Crianças',
    categoria: 'sermão',
  },
  {
    id: 'casais',
    rotulo: 'Casais',
    emoji: '👨‍👩‍👧',
    descricao: 'Para casais. Casamento, relacionamento e propósito a dois.',
    cor: 'text-amber-700',
    corBg: 'bg-amber-50',
    icon: Users2,
    esbocoModelo: `<h2>Deus Criou o Casamento</h2><p>Genesis 2:18-25 — o plano divino.</p><h2>Amor Que Serve</h2><p>Efésios 5 — a husband's call.</p><h2>Resolução de Conflitos</h2><p>Comunicação e perdão.</p><h2>Promessa</h2><p>Renovando o compromisso.</p>`,
    temaPadrao: 'Casamento',
    categoria: 'sermão',
  },
  {
    id: 'celula',
    rotulo: 'Célula / Grupo',
    emoji: '👥',
    descricao: 'Para grupos pequenos. Estudo interativo e participativo.',
    cor: 'text-green-700',
    corBg: 'bg-green-50',
    icon: Circle,
    esbocoModelo: `<h2>Abertura</h2><p>Quebra-gelo e socialização.</p><h2>Estudo Bíblico</h2><p>Leitura e perguntas-guia.</p><h2>Partilha</h2><p>Experiências e aplicações.</p><h2>Oração</h2><p>Intercessão e pedidos.</p>`,
    temaPadrao: 'Célula',
    categoria: 'estudo',
  },
  {
    id: 'escola_biblica',
    rotulo: 'Escola Bíblica',
    emoji: '🎓',
    descricao: 'Aula estruturada para conhecimento teológico sólido.',
    cor: 'text-sky-700',
    corBg: 'bg-sky-50',
    icon: BookMarked,
    esbocoModelo: `<h2>Fundamento Bíblico</h2><p>Texto e contexto da passagem.</p><h2>Teologia Sistemática</h2><p>O que este texto ensina sobre Deus, o homem, Cristo.</p><h2>Aplicação Pastoral</h2><p>Como viver esta verdade.</p><h2>Discussão</h2><p>Perguntas para aula.</p>`,
    temaPadrao: '',
    categoria: 'estudo',
  },
  {
    id: 'congresso',
    rotulo: 'Congresso / Conferência',
    emoji: '🕊',
    descricao: 'Para grandes eventos. Mensagem de impacto e profundidade.',
    cor: 'text-emerald-700',
    corBg: 'bg-emerald-50',
    icon: Zap,
    esbocoModelo: `<h2>Tema Central</h2><p>A verdade que marca.</p><h2>Argumentação</h2><p>Provas bíblicas e lógicas.</p><h2>Ilustrações</h2><p>Histórias que fixed a mensagem.</p><h2>Apelo</h2><p>Convite à decisão coletiva.</p>`,
    temaPadrao: '',
    categoria: 'sermão',
  },
  {
    id: 'serie',
    rotulo: 'Série de Mensagens',
    emoji: '🎙',
    descricao: 'Planeje uma série. Tema geral + episódios individuais.',
    cor: 'text-gray-700',
    corBg: 'bg-gray-50',
    icon: BookOpen,
    esbocoModelo: `<h2>Episódio 1</h2><p>Título e foco.</p><h2>Episódio 2</h2><p>Título e foco.</p><h2>Episódio 3</h2><p>Título e foco.</p><h2>Episódio 4</h2><p>Título e foco.</p><h2>Planejamento</h2><p>Progressão teológica da série.</p>`,
    temaPadrao: 'Série Bíblica',
    categoria: 'série',
  },
];

interface TemplateGalleryProps {
  onSelecionar: (template: TemplatePregacao) => void;
  onFechar: () => void;
}

export function TemplateGallery({ onSelecionar, onFechar }: TemplateGalleryProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 backdrop-blur-sm"
      onClick={onFechar}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120) onFechar();
        }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-t-3xl bg-paper shadow-ring"
        style={{ maxHeight: '88vh' }}
      >
        {/* Handle */}
        <div className="flex flex-shrink-0 items-center justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-ink-300" />
        </div>

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-5 pb-3">
          <div>
            <h2 className="text-[17px] font-semibold text-ink-900">Novo Sermão</h2>
            <p className="text-[12px] text-ink-500">Escolha um template para começar</p>
          </div>
          <button
            onClick={onFechar}
            className="rounded-full bg-ink-100 px-3 py-1 text-[12px] font-medium text-ink-600"
          >
            Cancelar
          </button>
        </div>

        {/* Grid de templates */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          <div className="grid grid-cols-2 gap-2.5">
            {TEMPLATES.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => onSelecionar(t)}
                  className="group flex flex-col items-start gap-2 rounded-2xl border border-ink-200/80 bg-white p-3.5 text-left transition-all hover:border-ink-300 hover:shadow-soft active:scale-[0.98]"
                >
                  <div className="flex w-full items-center gap-2">
                    <div
                      className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                        t.corBg,
                      )}
                    >
                      <Icon className={cn('h-5 w-5', t.cor)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-ink-900">
                        {t.rotulo}
                      </div>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-[11.5px] leading-relaxed text-ink-500">
                    {t.descricao}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
