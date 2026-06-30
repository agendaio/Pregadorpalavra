import type { Mensagem } from '@/types/mensagem';
import { novaMensagem } from '@/types/mensagem';
import { db } from '@/db/schema';

const agora = Date.now();
const dia = 24 * 60 * 60 * 1000;

export const EXEMPLOS: Omit<Mensagem, 'id' | 'criadoEm' | 'atualizadoEm'>[] = [
  {
    titulo: 'A graça que nos alcança',
    categoria: 'sermão',
    tema: 'A graça incondicional de Deus',
    textoBase: 'Efésios 2:8-9',
    objetivo: 'Mostrar que a salvação é dom de Deus, não conquista humana — e que isso transforma a forma como vivemos.',
    publico: 'Igreja local — adultos',
    ocasiao: 'Culto dominical',
    serie: 'Cartas que Transformam',
    livroBiblico: 'Efésios',
    personagens: ['Paulo', 'Efésios (cristãos da Ásia Menor)'],
    versiculos: [
      { livro: 'Efésios', capitulo: '2', versiculos: '8-9', texto: 'Porque pela graça sois salvos, mediante a fé; e isto não vem de vós; é dom de Deus.', versao: 'ARA' },
      { livro: 'Romanos', capitulo: '3', versiculos: '24', texto: 'Sendo justificados gratuitamente pela sua graça.', versao: 'ARA' },
      { livro: 'Tito', capitulo: '2', versiculos: '11', texto: 'Porque a graça de Deus se manifestou…', versao: 'ARA' },
    ],
    referenciasCruzadas: ['Romanos 3:24', 'Tito 2:11', 'João 1:16'],
    comentarios: 'Texto central da soteriologia paulina. Cuidado para não reduzir à graça genérica — Paulo fala de uma graça que INTERVÉM.',
    contextoHistorico: 'Carta escrita por Paulo prisioneiro em Roma, por volta de 60-62 d.C., à igreja em Éfeso — cidade portuária multicultural com forte presença de cultos pagãos (Artemis).',
    aplicacoes: [
      'Reconhecer que nada do que somos é mérito nosso',
      'Viver a partir da gratuidade, não do desempenho',
      'Estender a mesma graça a quem nos decepciona',
    ],
    ilustracoes: [
      'O bilhete premiado que alguém joga fora sem saber o valor',
      'O médico que opera de graça quem não pode pagar',
      'A criança adotada que descobre o nome verdadeiro',
    ],
    testemunhos: ['Conversa com a D. Maria sobre a descoberta da graça aos 52 anos'],
    frasesMarcantes: ['A graça não é o perdão do que eu fiz. É o dom do que eu nunca poderia ser.'],
    perguntas: [
      'O que muda quando você para de tentar merecer o amor de Deus?',
      'Para quem você precisa estender graça hoje?',
    ],
    desafios: ['Identificar uma área onde você ainda vive por merecimento.'],
    dinamica: 'Cada pessoa escreve em um papel algo que sente precisar "merecer" e deposita aos pés da cruz simbólica no altar.',
    oracao: 'Senhor, obrigado porque a tua graça me alcançou antes de qualquer esforço meu. Que eu viva a partir dessa certeza. Amém.',
    conclusao: 'A graça não é o final do caminho — é o início de uma vida que já não precisa provar nada. Descanse. E viva.',
    tempoEstimado: 35,
    observacoes: 'Não falar mais de 35 min. Cuidar para que a ilustração da criança adotada não seja longa demais.',
    esboco:
      '<h2>1. O contexto revela o problema</h2><p>Paulo escreve a cristãos que ainda pensam por mérito.</p><h2>2. A verdade da graça se desdobra</h2><p>Salvos pela graça, mediante a fé — dom, não conquista.</p><h2>3. A graça exige resposta</h2><p>Quem recebe graça vive de modo diferente.</p>',
    conteudo:
      '<p>Paulo abre a carta com uma das declarações mais densas de toda a escritura: <strong>"Porque pela graça sois salvos, mediante a fé; e isto não vem de vós; é dom de Deus."</strong></p>' +
      '<p>Três palavras sustentam tudo: <em>graça</em>, <em>fé</em>, <em>dom</em>. As três nos colocam na posição certa diante de Deus — não de quem conquista, mas de quem recebe.</p>' +
      '<p>Quando Paulo escreveu, os efésios vinham de um mundo onde deuses só ajudavam mediante sacrifícios, ofertas e rituais. A graça escandaliza esse mundo: não há preço, não há moeda, não há ritual que a compre.</p>' +
      '<h2>Por que isso muda tudo?</h2>' +
      '<p>Porque se somos salvos pela graça, então não somos salvos pelo que fazemos. E se não somos salvos pelo que fazemos, então a nossa identidade não pode depender do nosso desempenho.</p>' +
      '<p>E aqui está a boa notícia que a maioria dos cristãos ainda não ouviu: você não precisa ser bom o suficiente. Você não precisa fazer o suficiente. Você não precisa saber o suficiente. <strong>A graça já fez.</strong></p>' +
      '<h2>A graça exige resposta</h2>' +
      '<p>Mas Paulo não pára na graça. Ele segue: somos <em>criados</em> em Cristo Jesus para boas obras. A graça vem primeiro. As obras vêm como fruto — não como condição.</p>' +
      '<p>É como uma árvore boa: ela dá fruto porque é boa, não para se tornar boa. Assim é a vida em graça: ela produz porque recebeu, não para merecer.</p>',
    arquivos: [],
    igreja: 'Igreja Local',
    dataPregacao: agora - 7 * dia,
    tags: ['graça', 'soteriologia', 'efésios'],
    favorita: true,
    status: 'pregada',
    versao: 1,
  },
  {
    titulo: 'O Deus que descansa',
    categoria: 'sermão',
    tema: 'O shalom de Deus e o descanso verdadeiro',
    textoBase: 'Gênesis 2:1-3',
    objetivo: 'Mostrar que Deus é um Deus que descansa — e que o descanso é parte do design original da criação.',
    publico: 'Jovens e adolescentes',
    ocasiao: 'Encontro de jovens',
    serie: null,
    livroBiblico: 'Gênesis',
    personagens: ['Deus'],
    versiculos: [
      { livro: 'Gênesis', capitulo: '2', versiculos: '1-3', texto: 'Assim foram concluídos os céus e a terra e todo o seu exército.', versao: 'ARA' },
      { livro: 'Hebreus', capitulo: '4', versiculos: '9-10', texto: 'Portanto, resta um repouso sabático para o povo de Deus.', versao: 'ARA' },
      { livro: 'Salmos', capitulo: '23', versiculos: '2', texto: 'Ele me faz repousar em pastos verdejantes.', versao: 'ARA' },
    ],
    referenciasCruzadas: ['Hebreus 4:9-10', 'Salmos 23:2', 'Mateus 11:28'],
    comentarios: 'Descanso não é preguiça — é fé. O fato de Deus descansar mostra que a obra estava completa.',
    contextoHistorico: 'Gênesis 2 abre o relato da criação com um detalhe revolucionário: o Deus que criou o universo em 6 dias DESCANSA no sétimo. Isso é teologia, não cronologia.',
    aplicacoes: [
      'Separar um tempo semanal intencional de descanso',
      'Resistir à cultura do "sempre ocupado" como sinal de valor',
      'Entender que parar é também um ato de adoração',
    ],
    ilustracoes: [
      'O artista que assina a obra e dá um passo para trás — a contemplação completa a criação',
      'O piloto que pousa o avião depois de horas de voo',
    ],
    testemunhos: [],
    frasesMarcantes: ['Descansar é confiar que a obra está completa.'],
    perguntas: [
      'Quando foi a última vez que você descansou de verdade?',
      'Que mentira você acredita quando está sempre ocupado?',
    ],
    desafios: ['Bloquear um período de 6h no próximo fim de semana intencionalmente para descanso.'],
    dinamica: 'Momento de silêncio de 2 minutos no início da pregação.',
    oracao: 'Pai, ensina-nos a confiar em ti a ponto de parar. Amém.',
    conclusao: 'Você não é o que produz. Você é amado. E é a partir desse amor que você pode descansar.',
    tempoEstimado: 25,
    observacoes: 'Mensagem curta para manter atenção do público jovem.',
    esboco:
      '<h2>1. O detalhe que ninguém nota</h2><p>Deus descansa. E isso muda tudo.</p><h2>2. Descanso não é preguiça</h2><p>É teologia — a obra estava completa.</p><h2>3. Descansar é confiar</h2><p>É dizer: o mundo continua nas mãos de Deus.</p>',
    conteudo:
      '<p>Todo mundo lê Gênesis 1. Pouquíssimos param em Gênesis 2.</p>' +
      '<p>E no entanto é em Gênesis 2 que mora uma das maiores revelações da Bíblia: <strong>o Deus que criou tudo descansou.</strong></p>' +
      '<p>Não descansou porque estava cansado. Descansou porque a obra estava completa. E quando o ser humano foi criado, foi criado para entrar nesse ritmo — não para viver no caos.</p>' +
      '<p>O sétimo dia não foi castigo. Foi presente. Foi Deus dizendo: "Eu fiz o suficiente. Agora, receba."</p>',
    arquivos: [],
    igreja: 'Igreja Local',
    dataPregacao: agora - 14 * dia,
    tags: ['descanso', 'criação', 'shalom'],
    favorita: false,
    status: 'pregada',
    versao: 1,
  },
  {
    titulo: 'A fé que sustenta em tempos de incerteza',
    categoria: 'estudo',
    tema: 'Fé e confiança em meio à crise',
    textoBase: 'Habacuque 2:2-4',
    objetivo: 'Ajudar a congregação a desenvolver uma fé que não depende das circunstâncias.',
    publico: 'Igreja local — adultos',
    ocasiao: 'Culto de quarta',
    serie: null,
    livroBiblico: 'Habacuque',
    personagens: ['Habacuque'],
    versiculos: [
      { livro: 'Habacuque', capitulo: '2', versiculos: '2-4', texto: 'O justo viverá pela sua fé.', versao: 'ARA' },
    ],
    referenciasCruzadas: ['Romanos 1:17', 'Hebreus 10:38'],
    comentarios: 'Habacuque é o profeta da pergunta difícil — ele questiona Deus e Deus responde.',
    contextoHistorico: 'Habacuque profetizou no período pré-exílico (provavelmente antes de 586 a.C.), num momento em que Judá enfrentava invasão babilônica.',
    aplicacoes: ['Aprender a esperar com expectativa ativa'],
    ilustracoes: ['O farol que não apaga durante a tempestade'],
    testemunhos: [],
    frasesMarcantes: [],
    perguntas: ['Onde sua fé tem sido mais testada ultimamente?'],
    desafios: [],
    dinamica: '',
    oracao: '',
    conclusao: '',
    tempoEstimado: 30,
    observacoes: 'Esboço inicial — ainda em desenvolvimento.',
    esboco: '<p>Três pontos a desenvolver:</p><ul><li>O profeta questiona</li><li>Deus responde com perspectiva</li><li>O justo vive pela fé</li></ul>',
    conteudo: '<p>Estudo em desenvolvimento. Texto-base definido: Habacuque 2:2-4.</p>',
    arquivos: [],
    igreja: 'Igreja Local',
    dataPregacao: null,
    tags: ['fé', 'habacuque', 'crise'],
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