import type { Mensagem } from '@/types/mensagem';
import { novaMensagem } from '@/types/mensagem';
import { db } from '@/db/schema';

const agora = Date.now();
const dia = 24 * 60 * 60 * 1000;

export const EXEMPLOS: Omit<Mensagem, 'id' | 'criadoEm' | 'atualizadoEm'>[] = [
  {
    titulo: 'A graÃ§a que nos alcanÃ§a',
    categoria: 'sermÃ£o',
    tema: 'A graÃ§a incondicional de Deus',
    textoBase: 'EfÃ©sios 2:8-9',
    objetivo: 'Mostrar que a salvaÃ§Ã£o Ã© dom de Deus, nÃ£o conquista humana â€” e que isso transforma a forma como vivemos.',
    publico: 'Igreja local â€” adultos',
    ocasiao: 'Culto dominical',
    serie: 'Cartas que Transformam',
    livroBiblico: 'EfÃ©sios',
    personagens: ['Paulo', 'EfÃ©sios (cristÃ£os da Ãsia Menor)'],
    versiculos: [
      { livro: 'EfÃ©sios', capitulo: '2', versiculos: '8-9', texto: 'Porque pela graÃ§a sois salvos, mediante a fÃ©; e isto nÃ£o vem de vÃ³s; Ã© dom de Deus.', versao: 'ARA' },
      { livro: 'Romanos', capitulo: '3', versiculos: '24', texto: 'Sendo justificados gratuitamente pela sua graÃ§a.', versao: 'ARA' },
      { livro: 'Tito', capitulo: '2', versiculos: '11', texto: 'Porque a graÃ§a de Deus se manifestouâ€¦', versao: 'ARA' },
    ],
    referenciasCruzadas: ['Romanos 3:24', 'Tito 2:11', 'JoÃ£o 1:16'],
    comentarios: 'Texto central da soteriologia paulina. Cuidado para nÃ£o reduzir Ã  graÃ§a genÃ©rica â€” Paulo fala de uma graÃ§a que INTERVÃ‰M.',
    contextoHistorico: 'Carta escrita por Paulo prisioneiro em Roma, por volta de 60-62 d.C., Ã  igreja em Ã‰feso â€” cidade portuÃ¡ria multicultural com forte presenÃ§a de cultos pagÃ£os (Artemis).',
    aplicacoes: [
      'Reconhecer que nada do que somos Ã© mÃ©rito nosso',
      'Viver a partir da gratuidade, nÃ£o do desempenho',
      'Estender a mesma graÃ§a a quem nos decepciona',
    ],
    ilustracoes: [
      'O bilhete premiado que alguÃ©m joga fora sem saber o valor',
      'O mÃ©dico que opera de graÃ§a quem nÃ£o pode pagar',
      'A crianÃ§a adotada que descobre o nome verdadeiro',
    ],
    testemunhos: ['Conversa com a D. Maria sobre a descoberta da graÃ§a aos 52 anos'],
    frasesMarcantes: ['A graÃ§a nÃ£o Ã© o perdÃ£o do que eu fiz. Ã‰ o dom do que eu nunca poderia ser.'],
    perguntas: [
      'O que muda quando vocÃª para de tentar merecer o amor de Deus?',
      'Para quem vocÃª precisa estender graÃ§a hoje?',
    ],
    desafios: ['Identificar uma Ã¡rea onde vocÃª ainda vive por merecimento.'],
    dinamica: 'Cada pessoa escreve em um papel algo que sente precisar "merecer" e deposita aos pÃ©s da cruz simbÃ³lica no altar.',
    oracao: 'Senhor, obrigado porque a tua graÃ§a me alcanÃ§ou antes de qualquer esforÃ§o meu. Que eu viva a partir dessa certeza. AmÃ©m.',
    conclusao: 'A graÃ§a nÃ£o Ã© o final do caminho â€” Ã© o inÃ­cio de uma vida que jÃ¡ nÃ£o precisa provar nada. Descanse. E viva.',
    tempoEstimado: 35,
    observacoes: 'NÃ£o falar mais de 35 min. Cuidar para que a ilustraÃ§Ã£o da crianÃ§a adotada nÃ£o seja longa demais.',
    esboco:
      '<h2>1. O contexto revela o problema</h2><p>Paulo escreve a cristÃ£os que ainda pensam por mÃ©rito.</p><h2>2. A verdade da graÃ§a se desdobra</h2><p>Salvos pela graÃ§a, mediante a fÃ© â€” dom, nÃ£o conquista.</p><h2>3. A graÃ§a exige resposta</h2><p>Quem recebe graÃ§a vive de modo diferente.</p>',
    conteudo:
      '<p>Paulo abre a carta com uma das declaraÃ§Ãµes mais densas de toda a escritura: <strong>"Porque pela graÃ§a sois salvos, mediante a fÃ©; e isto nÃ£o vem de vÃ³s; Ã© dom de Deus."</strong></p>' +
      '<p>TrÃªs palavras sustentam tudo: <em>graÃ§a</em>, <em>fÃ©</em>, <em>dom</em>. As trÃªs nos colocam na posiÃ§Ã£o certa diante de Deus â€” nÃ£o de quem conquista, mas de quem recebe.</p>' +
      '<p>Quando Paulo escreveu, os efÃ©sios vinham de um mundo onde deuses sÃ³ ajudavam mediante sacrifÃ­cios, ofertas e rituais. A graÃ§a escandaliza esse mundo: nÃ£o hÃ¡ preÃ§o, nÃ£o hÃ¡ moeda, nÃ£o hÃ¡ ritual que a compre.</p>' +
      '<h2>Por que isso muda tudo?</h2>' +
      '<p>Porque se somos salvos pela graÃ§a, entÃ£o nÃ£o somos salvos pelo que fazemos. E se nÃ£o somos salvos pelo que fazemos, entÃ£o a nossa identidade nÃ£o pode depender do nosso desempenho.</p>' +
      '<p>E aqui estÃ¡ a boa notÃ­cia que a maioria dos cristÃ£os ainda nÃ£o ouviu: vocÃª nÃ£o precisa ser bom o suficiente. VocÃª nÃ£o precisa fazer o suficiente. VocÃª nÃ£o precisa saber o suficiente. <strong>A graÃ§a jÃ¡ fez.</strong></p>' +
      '<h2>A graÃ§a exige resposta</h2>' +
      '<p>Mas Paulo nÃ£o pÃ¡ra na graÃ§a. Ele segue: somos <em>criados</em> em Cristo Jesus para boas obras. A graÃ§a vem primeiro. As obras vÃªm como fruto â€” nÃ£o como condiÃ§Ã£o.</p>' +
      '<p>Ã‰ como uma Ã¡rvore boa: ela dÃ¡ fruto porque Ã© boa, nÃ£o para se tornar boa. Assim Ã© a vida em graÃ§a: ela produz porque recebeu, nÃ£o para merecer.</p>',
    arquivos: [],
    igreja: 'Igreja Local',
    dataPregacao: agora - 7 * dia,
    tags: ['graÃ§a', 'soteriologia', 'efÃ©sios'],
    favorita: true,
    status: 'pregada',
    versao: 1,
  },
  {
    titulo: 'O Deus que descansa',
    categoria: 'sermÃ£o',
    tema: 'O shalom de Deus e o descanso verdadeiro',
    textoBase: 'GÃªnesis 2:1-3',
    objetivo: 'Mostrar que Deus Ã© um Deus que descansa â€” e que o descanso Ã© parte do design original da criaÃ§Ã£o.',
    publico: 'Jovens e adolescentes',
    ocasiao: 'Encontro de jovens',
    serie: null,
    livroBiblico: 'GÃªnesis',
    personagens: ['Deus'],
    versiculos: [
      { livro: 'GÃªnesis', capitulo: '2', versiculos: '1-3', texto: 'Assim foram concluÃ­dos os cÃ©us e a terra e todo o seu exÃ©rcito.', versao: 'ARA' },
      { livro: 'Hebreus', capitulo: '4', versiculos: '9-10', texto: 'Portanto, resta um repouso sabÃ¡tico para o povo de Deus.', versao: 'ARA' },
      { livro: 'Salmos', capitulo: '23', versiculos: '2', texto: 'Ele me faz repousar em pastos verdejantes.', versao: 'ARA' },
    ],
    referenciasCruzadas: ['Hebreus 4:9-10', 'Salmos 23:2', 'Mateus 11:28'],
    comentarios: 'Descanso nÃ£o Ã© preguiÃ§a â€” Ã© fÃ©. O fato de Deus descansar mostra que a obra estava completa.',
    contextoHistorico: 'GÃªnesis 2 abre o relato da criaÃ§Ã£o com um detalhe revolucionÃ¡rio: o Deus que criou o universo em 6 dias DESCANSA no sÃ©timo. Isso Ã© teologia, nÃ£o cronologia.',
    aplicacoes: [
      'Separar um tempo semanal intencional de descanso',
      'Resistir Ã  cultura do "sempre ocupado" como sinal de valor',
      'Entender que parar Ã© tambÃ©m um ato de adoraÃ§Ã£o',
    ],
    ilustracoes: [
      'O artista que assina a obra e dÃ¡ um passo para trÃ¡s â€” a contemplaÃ§Ã£o completa a criaÃ§Ã£o',
      'O piloto que pousa o aviÃ£o depois de horas de voo',
    ],
    testemunhos: [],
    frasesMarcantes: ['Descansar Ã© confiar que a obra estÃ¡ completa.'],
    perguntas: [
      'Quando foi a Ãºltima vez que vocÃª descansou de verdade?',
      'Que mentira vocÃª acredita quando estÃ¡ sempre ocupado?',
    ],
    desafios: ['Bloquear um perÃ­odo de 6h no prÃ³ximo fim de semana intencionalmente para descanso.'],
    dinamica: 'Momento de silÃªncio de 2 minutos no inÃ­cio da pregaÃ§Ã£o.',
    oracao: 'Pai, ensina-nos a confiar em ti a ponto de parar. AmÃ©m.',
    conclusao: 'VocÃª nÃ£o Ã© o que produz. VocÃª Ã© amado. E Ã© a partir desse amor que vocÃª pode descansar.',
    tempoEstimado: 25,
    observacoes: 'Mensagem curta para manter atenÃ§Ã£o do pÃºblico jovem.',
    esboco:
      '<h2>1. O detalhe que ninguÃ©m nota</h2><p>Deus descansa. E isso muda tudo.</p><h2>2. Descanso nÃ£o Ã© preguiÃ§a</h2><p>Ã‰ teologia â€” a obra estava completa.</p><h2>3. Descansar Ã© confiar</h2><p>Ã‰ dizer: o mundo continua nas mÃ£os de Deus.</p>',
    conteudo:
      '<p>Todo mundo lÃª GÃªnesis 1. PouquÃ­ssimos param em GÃªnesis 2.</p>' +
      '<p>E no entanto Ã© em GÃªnesis 2 que mora uma das maiores revelaÃ§Ãµes da BÃ­blia: <strong>o Deus que criou tudo descansou.</strong></p>' +
      '<p>NÃ£o descansou porque estava cansado. Descansou porque a obra estava completa. E quando o ser humano foi criado, foi criado para entrar nesse ritmo â€” nÃ£o para viver no caos.</p>' +
      '<p>O sÃ©timo dia nÃ£o foi castigo. Foi presente. Foi Deus dizendo: "Eu fiz o suficiente. Agora, receba."</p>',
    arquivos: [],
    igreja: 'Igreja Local',
    dataPregacao: agora - 14 * dia,
    tags: ['descanso', 'criaÃ§Ã£o', 'shalom'],
    favorita: false,
    status: 'pregada',
    versao: 1,
  },
  {
    titulo: 'A fÃ© que sustenta em tempos de incerteza',
    categoria: 'estudo',
    tema: 'FÃ© e confianÃ§a em meio Ã  crise',
    textoBase: 'Habacuque 2:2-4',
    objetivo: 'Ajudar a congregaÃ§Ã£o a desenvolver uma fÃ© que nÃ£o depende das circunstÃ¢ncias.',
    publico: 'Igreja local â€” adultos',
    ocasiao: 'Culto de quarta',
    serie: null,
    livroBiblico: 'Habacuque',
    personagens: ['Habacuque'],
    versiculos: [
      { livro: 'Habacuque', capitulo: '2', versiculos: '2-4', texto: 'O justo viverÃ¡ pela sua fÃ©.', versao: 'ARA' },
    ],
    referenciasCruzadas: ['Romanos 1:17', 'Hebreus 10:38'],
    comentarios: 'Habacuque Ã© o profeta da pergunta difÃ­cil â€” ele questiona Deus e Deus responde.',
    contextoHistorico: 'Habacuque profetizou no perÃ­odo prÃ©-exÃ­lico (provavelmente antes de 586 a.C.), num momento em que JudÃ¡ enfrentava invasÃ£o babilÃ´nica.',
    aplicacoes: ['Aprender a esperar com expectativa ativa'],
    ilustracoes: ['O farol que nÃ£o apaga durante a tempestade'],
    testemunhos: [],
    frasesMarcantes: [],
    perguntas: ['Onde sua fÃ© tem sido mais testada ultimamente?'],
    desafios: [],
    dinamica: '',
    oracao: '',
    conclusao: '',
    tempoEstimado: 30,
    observacoes: 'EsboÃ§o inicial â€” ainda em desenvolvimento.',
    esboco: '<p>TrÃªs pontos a desenvolver:</p><ul><li>O profeta questiona</li><li>Deus responde com perspectiva</li><li>O justo vive pela fÃ©</li></ul>',
    conteudo: '<p>Estudo em desenvolvimento. Texto-base definido: Habacuque 2:2-4.</p>',
    arquivos: [],
    igreja: 'Igreja Local',
    dataPregacao: null,
    tags: ['fÃ©', 'habacuque', 'crise'],
    favorita: false,
    status: 'rascunho',
    versao: 1,
  },
];

export async function semearExemplos(): Promise<void> {
  const existentes = await db.mensagens.count();
  if (existentes > 0) return;

  for (const ex of EXEMPLOS) {
    const m = novaMensagem(ex);
    await db.mensagens.put(m);
  }
}