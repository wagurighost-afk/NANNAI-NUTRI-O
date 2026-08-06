import type { Questionnaire } from '../types';

/**
 * Questionário oficial Auditoria Nutrisano
 * Versão do modelo: 14/02/2023 06:49
 * 119 perguntas · Nota máxima 5540
 * Pontuação e ordem fiéis ao checklist oficial.
 */
export const NUTRISANO_QUESTIONNAIRE_ID = 'q-nutrisano-v1';
export const NUTRISANO_MAX_SCORE = 5540;
export const NUTRISANO_QUESTION_COUNT = 119;

type RawQuestion = {
  order: number;
  text: string;
  maxScore: number;
  partialScore?: number;
  critical?: boolean;
};

type RawSection = {
  order: number;
  name: string;
  maxPoints: number;
  questions: RawQuestion[];
};

const RAW_SECTIONS: RawSection[] = [
  {
    "order": 1,
    "name": "1. INSTALAÇÕES",
    "maxPoints": 220,
    "questions": [
      {
        "order": 1,
        "text": "Pisos adequados e bom estado de conservação?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 2,
        "text": "Ralos adequados e em bom estado de conservação?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 3,
        "text": "Paredes adequadas e em bom estado de conservação?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 4,
        "text": "Tetos, forros e luminárias adequados e em bom estado de conservação?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 5,
        "text": "Portas e janelas adequadas e em bom estado de conservação?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 6,
        "text": "Instalações hidráulicas (torneiras, pias, encanamentos) adequadas e em bom estado de conservação?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 7,
        "text": "Instalações elétricas adequadas e em bom estado de conservação?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 8,
        "text": "Presença de lavatórios exclusivos para a higienização das mãos nas áreas de manipulação, em posições estratégicas e em quantidade adequada?",
        "maxScore": 20,
        "partialScore": 10,
        "critical": true
      },
      {
        "order": 9,
        "text": "Fluxo de processo linear, evitando-se cruzamento de processos?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 10,
        "text": "Ventilação / exaustão adequada?",
        "maxScore": 40,
        "partialScore": 20
      }
    ]
  },
  {
    "order": 2,
    "name": "2. MÓVEIS | EQUIPAMENTOS | UTENSÍLIOS",
    "maxPoints": 100,
    "questions": [
      {
        "order": 1,
        "text": "Câmaras e equipamentos de refrigeração/congelamento adequados e em bom estado de conservação?",
        "maxScore": 40,
        "partialScore": 20,
        "critical": true
      },
      {
        "order": 2,
        "text": "Equipamentos que NÃO entram em contato com alimentos adequados e em bom estado de conservação?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 3,
        "text": "Equipamentos que entram em contato com alimentos e utensílios adequados e em bom estado de conservação?",
        "maxScore": 40,
        "partialScore": 20
      }
    ]
  },
  {
    "order": 3,
    "name": "3. MANEJO DE RESÍDUOS",
    "maxPoints": 160,
    "questions": [
      {
        "order": 1,
        "text": "Lixo/resíduos externos estão acondicionados em áreas isoladas ou fechadas, em locais adequados e em bom estado de conservação e limpeza?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 2,
        "text": "Lixo/resíduos internos estão acondicionados em recipientes com tampa sem acionamento manual, em bom estado de conservação, providos de sacos plásticos e limpos?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 3,
        "text": "Lixo/resíduos internos são removidos na frequência adequada das áreas de manipulação e armazenamento de alimentos?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 4,
        "text": "Existência de contrato atualizado com a empresa coletora de resíduos (se aplicável)?",
        "maxScore": 40
      }
    ]
  },
  {
    "order": 4,
    "name": "4. ABASTECIMENTO DE ÁGUA",
    "maxPoints": 240,
    "questions": [
      {
        "order": 1,
        "text": "Higienização dos reservatórios de água comprovado através de certificado atualizado (semestral)?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 2,
        "text": "Há registros de troca dos filtros de água?",
        "maxScore": 60,
        "partialScore": 30
      },
      {
        "order": 3,
        "text": "Abastecimento de água público: controle da potabilidade da água comprovado através de laudo atualizado de análises laboratoriais?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 4,
        "text": "Abastecimento de água por fontes alternativas: controle da potabilidade da água comprovado através de laudo atualizado de análises laboratoriais?",
        "maxScore": 60,
        "critical": true
      }
    ]
  },
  {
    "order": 5,
    "name": "5. ESGOTAMENTO SANITÁRIO",
    "maxPoints": 120,
    "questions": [
      {
        "order": 1,
        "text": "Caixa de gordura em bom estado de conservação e limpeza",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 2,
        "text": "Resíduos de óleo da produção não são descartados na rede de esgoto. Comprovantes disponíveis de coleta de resíduos de óleo e gordura comestíveis?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 3,
        "text": "Registro atualizado de limpeza da caixa de gordura",
        "maxScore": 40,
        "partialScore": 20
      }
    ]
  },
  {
    "order": 6,
    "name": "6. PROCESSOS DE HIGIENIZAÇÃO - PRODUTOS | MATERIAIS DE LIMPEZA",
    "maxPoints": 80,
    "questions": [
      {
        "order": 1,
        "text": "Produtos químicos adequados, regularizados na Agência Nacional de Vigilância Sanitária - ANVISA, utilizados apenas para as finalidades indicadas pelos fabricantes, identificados e dentro do prazo de validade?",
        "maxScore": 40,
        "partialScore": 20,
        "critical": true
      },
      {
        "order": 2,
        "text": "Fichas técnicas e fichas de segurança dos produtos utilizados para higienização disponíveis?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 3,
        "text": "Utensílios, materiais de limpeza e panos adequados, em bom estado de conservação, limpeza e corretamente armazenados?",
        "maxScore": 20,
        "partialScore": 10
      }
    ]
  },
  {
    "order": 7,
    "name": "7. PROCESSOS DE HIGIENIZAÇÃO - HIGIENE AMBIENTAL | DE MÓVEIS | EQUIPAMENTOS | UTENSÍLIOS",
    "maxPoints": 300,
    "questions": [
      {
        "order": 1,
        "text": "Instalações limpas?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 2,
        "text": "Câmaras e equipamentos de refrigeração/congelamento limpos?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 3,
        "text": "Móveis (armários, prateleiras, pallets, parte inferior de bancadas, etc) e equipamentos SEM contato direto com alimentos limpos?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 4,
        "text": "Superfícies, equipamentos COM contato direto com alimentos e utensílios limpos?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      },
      {
        "order": 5,
        "text": "Armazenamento adequado de equipamentos e utensílios higienizados?",
        "maxScore": 60,
        "partialScore": 30
      },
      {
        "order": 6,
        "text": "Processo adequado de higienização (lavagem, enxágue, desinfecção / tempo adequado para ação dos produtos, enxágue após a desinfecção em superfícies que entram em contato com alimentos)?",
        "maxScore": 40,
        "partialScore": 20,
        "critical": true
      },
      {
        "order": 7,
        "text": "Armazenamento de alimentos em contato direto com o piso?",
        "maxScore": 20,
        "partialScore": 10
      }
    ]
  },
  {
    "order": 8,
    "name": "8. RECEBIMENTO",
    "maxPoints": 160,
    "questions": [
      {
        "order": 1,
        "text": "Conformidade com os critérios de verificação dos produtos (características organolépticas, integridade de embalagem e rotulagem, data de validade, SIF) e de transporte (caminhão e entregador)?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      },
      {
        "order": 2,
        "text": "Alimentos recebidos não são colocados no chão e são armazenados no máximo em até 30 minutos?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 3,
        "text": "Conformidade com os critérios temperatura para recebimento dos produtos?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 4,
        "text": "Produtos não conformes são devolvidos ou segregados e identificados?",
        "maxScore": 20
      }
    ]
  },
  {
    "order": 9,
    "name": "9. ARMAZENAMENTO - ARMAZENAMENTO GERAL (PRODUTOS SECOS, CONGELADOS E REFRIGERADOS)",
    "maxPoints": 700,
    "questions": [
      {
        "order": 1,
        "text": "Existência e conformidade do procedimento para armazenamento temporário de alimentos dos hóspedes do hotel?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 2,
        "text": "Embalagem dos produtos íntegras e com rótulos visíveis (produtos fechados)?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 3,
        "text": "Controle de rotatividade (PEPS/PVPS)?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 4,
        "text": "Produtos adequadamente protegidos?",
        "maxScore": 60,
        "partialScore": 30
      },
      {
        "order": 5,
        "text": "Identificação adequada dos alimentos (produtos abertos, produtos transferidos da embalagem original, produtos fabricados pelo estabelecimento e produtos em descongelamento e/ou outros processos)?",
        "maxScore": 60,
        "partialScore": 30
      },
      {
        "order": 6,
        "text": "Etiquetas dos produtos preenchidas corretamente",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 7,
        "text": "Produtos na data de validade; ausência de produtos vencidos (validade primária); produtos adequados para o consumo?",
        "maxScore": 200,
        "critical": true
      },
      {
        "order": 8,
        "text": "7.1.8 Produtos na data de validade; ausência de produtos vencidos (validade secundária)?",
        "maxScore": 200,
        "critical": true
      },
      {
        "order": 9,
        "text": "Produtos impróprios para o consumo e/ou que serão descartados estão separados e identificados adequadamente?",
        "maxScore": 40
      }
    ]
  },
  {
    "order": 10,
    "name": "10. ARMAZENAMENTO - PRODUTOS SECOS",
    "maxPoints": 140,
    "questions": [
      {
        "order": 1,
        "text": "Organização: separação por categorias, distanciamento",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 2,
        "text": "Embalagens descartáveis protegidas?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 3,
        "text": "Alimentos separados dos produtos químicos e das embalagens descartáveis",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      }
    ]
  },
  {
    "order": 11,
    "name": "11. ARMAZENAMENTO - PRODUTOS CONGELADOS E REFRIGERADOS",
    "maxPoints": 160,
    "questions": [
      {
        "order": 1,
        "text": "Organização: separação por categorias, distanciamento",
        "maxScore": 40
      },
      {
        "order": 2,
        "text": "Temperatura adequada dos equipamentos de refrigeração?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      },
      {
        "order": 3,
        "text": "Temperaturas adequadas dos equipamentos de congelamento?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      }
    ]
  },
  {
    "order": 12,
    "name": "12. PROCESSOS - PRÉ PREPARO | PREPARO",
    "maxPoints": 700,
    "questions": [
      {
        "order": 1,
        "text": "Conformidade com processos para evitar a contaminação cruzada?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 2,
        "text": "Não há risco de contaminação física e química?",
        "maxScore": 40,
        "partialScore": 20,
        "critical": true
      },
      {
        "order": 3,
        "text": "Hábitos Higiênicos adequados (evitando-se coçar, espirrar, tossir, assoar o nariz, degustação de forma adequada)?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 4,
        "text": "Lavagem das embalagens antes de abertura?",
        "maxScore": 20
      },
      {
        "order": 5,
        "text": "Produtos protegidos durante o preparo?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 6,
        "text": "Condições adequadas de descongelamento; alimentos descongelados não são recongelados?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 7,
        "text": "Higienização adequada das frutas, legumes e verduras (FLV)?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 8,
        "text": "Ausência de alimentos perecíveis a temperatura ambiente por mais de 30 min, ou em ambiente climatizado por mais de 2 horas?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 9,
        "text": "Condições adequadas de cocção e reaquecimento?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 10,
        "text": "Condições adequadas de resfriamento?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 11,
        "text": "Condições adequadas de métodos de preparo de outras preparações (dessalgue, secagem…)",
        "maxScore": 60
      },
      {
        "order": 12,
        "text": "Óleo de fritura com características adequadas?",
        "maxScore": 40
      },
      {
        "order": 13,
        "text": "Alimentos em espera são mantidos em temperaturas adequadas, não permanecendo em temperatura ambiente?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 14,
        "text": "Temperatura adequada dos equipamentos de manutenção de temperatura (banho-maria, estufas, pass trough)?",
        "maxScore": 20,
        "partialScore": 10
      }
    ]
  },
  {
    "order": 13,
    "name": "13. PROCESSOS - DISTRIBUIÇÃO",
    "maxPoints": 160,
    "questions": [
      {
        "order": 1,
        "text": "Temperatura adequada dos equipamentos de distribuição?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 2,
        "text": "Distribuição adequada dos alimentos quentes (T x t)?",
        "maxScore": 40,
        "critical": true
      },
      {
        "order": 3,
        "text": "Distribuição adequada dos alimentos frios (T x t)?",
        "maxScore": 40,
        "critical": true
      },
      {
        "order": 4,
        "text": "Descarte adequado de sobras?",
        "maxScore": 60,
        "partialScore": 30
      }
    ]
  },
  {
    "order": 14,
    "name": "14. AMOSTRAS",
    "maxPoints": 140,
    "questions": [
      {
        "order": 1,
        "text": "Método adequado de coleta de amostras",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 2,
        "text": "Guarda das amostras pelo tempo adequado e na temperatura adequada?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      },
      {
        "order": 3,
        "text": "Amostras armazenadas não apresentam vazamento?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 4,
        "text": "Identificação das amostras?",
        "maxScore": 20,
        "partialScore": 10
      }
    ]
  },
  {
    "order": 15,
    "name": "15. HIGIENE PESSOAL",
    "maxPoints": 340,
    "questions": [
      {
        "order": 1,
        "text": "Lavatório de higienização de mãos não obstruído?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 2,
        "text": "Lavatório de higienização de mãos contendo sabonete líquido, neutro, sem fragrância e sanitizante ou sabonete líquido bactericida, papel toalha não reciclado para secagem das mãos e cartaz orientativo com a descrição do procedimento de higienização de mãos?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      },
      {
        "order": 3,
        "text": "Higienização de mãos é realizada conforme método e frequência adequados?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 4,
        "text": "Utilização e troca de luvas descartáveis realizada de maneira adequada?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 5,
        "text": "Uniformes adequados, limpos e em bom estado de conservação?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 6,
        "text": "Utilização adequada de EPIs, EPI's em bom estado de conservação, limpeza e em número suficiente?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 7,
        "text": "Proteção adequada para cabelos (nas áreas de preparo) e funcionários com barba feita?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 8,
        "text": "Ausência de qualquer tipo de adorno, maquiagem, esmalte e perfumes?",
        "maxScore": 40,
        "partialScore": 20,
        "critical": true
      },
      {
        "order": 9,
        "text": "Funcionários com unhas curtas, ausência de feridas, cortes e infecções?",
        "maxScore": 40,
        "partialScore": 20,
        "critical": true
      }
    ]
  },
  {
    "order": 16,
    "name": "16. DEPENDÊNCIAS DOS FUNCIONÁRIOS",
    "maxPoints": 100,
    "questions": [
      {
        "order": 1,
        "text": "Adequação e estado de conservação dos vestiários e sanitários de funcionários?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 2,
        "text": "Limpeza e organização dos vestiários e sanitários de funcionários?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 3,
        "text": "Presença de material de higiene pessoal nos vestiários/sanitários como: sabonete líquido, neutro, sem fragrância e sanitizante ou sabonete líquido bactericida, papel toalha não reciclado para secagem das mãos, lixeira sem contato manual e cartaz orientativo com a descrição do procedimento de higienização de mãos?",
        "maxScore": 40,
        "partialScore": 20
      }
    ]
  },
  {
    "order": 17,
    "name": "17. MANUTENÇÃO",
    "maxPoints": 140,
    "questions": [
      {
        "order": 1,
        "text": "Programa de manutenção preventiva e corretiva estabelecido e implementado?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 2,
        "text": "Comprovantes de limpeza, manutenção e troca de filtros dos componentes dos equipamentos de climatização?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 3,
        "text": "Registros de calibração dos equipamentos?",
        "maxScore": 60,
        "partialScore": 30
      }
    ]
  },
  {
    "order": 18,
    "name": "18. CONTROLE DE PRAGAS",
    "maxPoints": 480,
    "questions": [
      {
        "order": 1,
        "text": "Comprovante de Execução do Serviço emitido pela empresa responsável pelo controle de pragas atualizado?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 2,
        "text": "Documentos disponíveis e atualizados da empresa responsável pelo controle de pragas?",
        "maxScore": 60,
        "partialScore": 30
      },
      {
        "order": 3,
        "text": "Ausência de íscas inadequadas e/ou desprotegidas no estabelecimento?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 4,
        "text": "Ausência de infestação de ratos?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 5,
        "text": "Ausência de infestação de baratas vivas?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 6,
        "text": "Ausência de infestação de baratas mortas?",
        "maxScore": 40,
        "critical": true
      },
      {
        "order": 7,
        "text": "Ausência de infestação de moscas e demais insetos voadores?",
        "maxScore": 60,
        "critical": true
      },
      {
        "order": 8,
        "text": "Ausência de infestação de drosófilas?",
        "maxScore": 20,
        "critical": true
      },
      {
        "order": 9,
        "text": "Conformidade com as regras que limitam infestações (barreiras físicas)?",
        "maxScore": 60,
        "partialScore": 30
      }
    ]
  },
  {
    "order": 19,
    "name": "19. REGISTROS",
    "maxPoints": 620,
    "questions": [
      {
        "order": 1,
        "text": "Registros de controle para rastreabilidade/temperatura no recebimento de alimentos perecíveis?",
        "maxScore": 60,
        "partialScore": 30
      },
      {
        "order": 2,
        "text": "Registros de controle para rastreabilidade no recebimento de alimentos secos?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 3,
        "text": "Registros de controle de temperatura dos equipamentos de refrigeração e congelamento?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      },
      {
        "order": 4,
        "text": "Registros de controle de temperatura dos equipamentos de manutenção de temperatura e alimentos em espera?",
        "maxScore": 60,
        "partialScore": 30
      },
      {
        "order": 5,
        "text": "Registros de controle de temperatura dos equipamentos na distribuição?",
        "maxScore": 20,
        "partialScore": 10
      },
      {
        "order": 6,
        "text": "Registros de controle de temperatura dos alimentos na distribuição?",
        "maxScore": 60,
        "partialScore": 30
      },
      {
        "order": 7,
        "text": "Registros de controle da concentração do sanitizante utilizado na higienização de FLV?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      },
      {
        "order": 8,
        "text": "Registros de controle do óleo?",
        "maxScore": 60,
        "partialScore": 30
      },
      {
        "order": 9,
        "text": "Registros de controle dos processos de higienização das instalações, móveis, equipamentos e utensílios?",
        "maxScore": 40,
        "partialScore": 20
      },
      {
        "order": 10,
        "text": "Registros de treinamento dos funcionários em BPF?",
        "maxScore": 60,
        "partialScore": 30
      },
      {
        "order": 11,
        "text": "Registros de controle do frigobar?",
        "maxScore": 60,
        "partialScore": 30
      },
      {
        "order": 12,
        "text": "Relatórios de auditoria interna disponíveis e atualizados?",
        "maxScore": 60,
        "partialScore": 30
      }
    ]
  },
  {
    "order": 20,
    "name": "20. DOCUMENTOS",
    "maxPoints": 360,
    "questions": [
      {
        "order": 1,
        "text": "Alvará sanitário atualizado e disponível?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      },
      {
        "order": 2,
        "text": "Manual de Boas Práticas de Fabricação e POPs atualizado, formalizado e implementado?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      },
      {
        "order": 3,
        "text": "Controle do estado de saúde dos funcionários: ASOs disponíveis e atualizados?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      },
      {
        "order": 4,
        "text": "PGR e PCMSO disponível e atualizado?",
        "maxScore": 60,
        "partialScore": 30
      },
      {
        "order": 5,
        "text": "Estabelecimento apresenta nutricionista ou empresa de consultoria especializada e apta para o desenvolvimento das atividades de implementação e acompanhamento dos processos de BPFs?",
        "maxScore": 60
      },
      {
        "order": 6,
        "text": "O Plano anual de amostragem esta sendo realizado e acompanhado?",
        "maxScore": 60,
        "partialScore": 30
      }
    ]
  },
  {
    "order": 21,
    "name": "21. GERENCIAMENTO EM CASO DE CRISE (SURTO DE DTA)",
    "maxPoints": 120,
    "questions": [
      {
        "order": 1,
        "text": "POP's de gerenciamento de crise em caso de surto de DTA atualizado e disponível?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      },
      {
        "order": 2,
        "text": "Formulário de inquérito para investigação de surto coletivo disponível?",
        "maxScore": 60,
        "partialScore": 30,
        "critical": true
      }
    ]
  }
];

function buildQuestionnaire(): Questionnaire {
  const questionnaireId = NUTRISANO_QUESTIONNAIRE_ID;
  return {
    id: questionnaireId,
    name: 'Questionário Auditoria Nutrisano',
    description:
      'Checklist oficial de auditoria Nutrisano — BPF e segurança alimentar. Versão 14/02/2023. Nota máxima 5540.',
    version: '14/02/2023',
    active: true,
    updatedAt: '2023-02-14T06:49:00Z',
    sections: RAW_SECTIONS.map((sec) => {
      const sectionId = `sec-${sec.order}`;
      return {
        id: sectionId,
        questionnaireId,
        name: sec.name,
        description: `Nota máxima da seção: ${sec.maxPoints} pontos`,
        order: sec.order,
        questions: sec.questions.map((q) => ({
          id: `q-${sec.order}-${q.order}`,
          sectionId,
          order: q.order,
          text: q.text,
          weight: 1,
          maxScore: q.maxScore,
          partialScore: q.partialScore,
          allowsPartial: q.partialScore != null,
          requiresPhoto: Boolean(q.critical),
          critical: Boolean(q.critical),
          active: true,
        })),
      };
    }),
  };
}

export const nutrisanoQuestionnaire: Questionnaire = buildQuestionnaire();
