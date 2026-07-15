/**
 * Catalogo previdenciario da interface publica.
 * Conteudo revisado em 15/07/2026. Orienta a coleta documental, sem substituir
 * a analise do CNIS, dos documentos e do caso concreto pela equipe juridica.
 */

export const REVIEW_DATE = '15/07/2026';

export const REPRESENTATION_ROLES = Object.freeze([
  { id: 'tutor_nato', label: 'Tutor nato (pai ou mãe)', official: 'Tutor Nato' },
  { id: 'tutor_legal', label: 'Tutor legal', official: 'Tutor Legal' },
  { id: 'curador', label: 'Curador', official: 'Curador' },
  { id: 'guardiao', label: 'Responsável por termo de guarda', official: 'Responsável Termo de Guarda' },
  { id: 'administrador_provisorio', label: 'Administrador provisório', official: 'Administrador Provisório' },
  { id: 'procurador', label: 'Procurador', official: 'Procurador' }
]);

const SOURCES = Object.freeze({
  bpc: {
    label: 'Portaria Conjunta MDS/INSS nº 34/2025',
    url: 'https://www.gov.br/inss/pt-br/centrais-de-conteudo/legislacao/portarias-conjuntas/2025/ptcj34mds-inss.pdf/%40%40download/file'
  },
  atestmed: {
    label: 'Portaria Conjunta MPS/INSS nº 13/2026',
    url: 'https://in.gov.br/en/web/dou/-/portaria-conjunta-mps/inss-n-13-de-23-de-marco-de-2026-694778266'
  },
  pensao: {
    label: 'Pensão por morte - INSS',
    url: 'https://www.gov.br/inss/pt-br/direitos-e-deveres/pensoes/pensao-por-morte'
  },
  rural: {
    label: 'Documentos do trabalhador rural - INSS',
    url: 'https://www.gov.br/inss/pt-br/saiba-mais/seus-direitos-e-deveres/atualizacao-de-tempo-de-contribuicao/documentos-originais-para-comprovacao-de-tempo-de-contribuicao/documentos-trabalhador-rural'
  },
  representacao: {
    label: 'Representação legal - INSS',
    url: 'https://www.gov.br/inss/pt-br/saiba-mais/seus-direitos-e-deveres/procuracao/representacao-legal'
  },
  aposentadorias: {
    label: 'Regras de aposentadorias - INSS',
    url: 'https://www.gov.br/inss/pt-br/direitos-e-deveres/aposentadorias/regras-de-aposentadorias'
  },
  maternidade: {
    label: 'Salário-maternidade - INSS',
    url: 'https://www.gov.br/inss/pt-br/direitos-e-deveres/salario-maternidade'
  },
  reclusao: {
    label: 'Auxílio-reclusão - INSS',
    url: 'https://www.gov.br/inss/pt-br/direitos-e-deveres/auxilio-reclusao/auxilio-reclusao'
  },
  auxilioAcidente: {
    label: 'Auxílio-acidente - INSS',
    url: 'https://www.gov.br/inss/pt-br/direitos-e-deveres/beneficios-por-incapacidade/auxilio-acidente'
  }
});

const ID = 'Documento oficial com foto e CPF do requerente';
const REPRESENTATION = 'Documentos do representante e prova da representação, quando houver';
const CNIS = 'CNIS completo e atualizado';
const ADDRESS = 'Comprovante de residência atual';
const WORK = 'Todas as CTPS, inclusive carteiras físicas antigas, e documentos de vínculos não lançados no CNIS';
const RURAL_PROOF = 'Autodeclaração rural e provas contemporâneas: CAF/DAP, ITR, CAR, CCIR, bloco de produtor, contratos rurais, notas fiscais, PRONAF ou documentos equivalentes';
const ATESTMED_LIMIT = 'Na análise documental regida pela Portaria nº 13/2026, a soma das concessões fica limitada a 30 dias, salvo exceção formal; necessidade maior pode exigir prorrogação ou perícia.';

/** @type {BenefitDefinitionInput[]} */
const BENEFIT_DEFINITIONS = [
  {
    id: 'bpc-pcd', group: 'BPC/LOAS', name: 'BPC/LOAS à pessoa com deficiência',
    summary: 'Para pessoa com impedimento de longo prazo e vulnerabilidade socioeconômica. Exige avaliação biopsicossocial.',
    fit: 'Pessoa com deficiência, sem benefício incompatível, cuja família não consegue sustentar adequadamente suas necessidades.',
    formal: [ID, REPRESENTATION, 'CadÚnico atualizado, com CPF informado de todos os integrantes, e CPF regular do requerente', 'Cadastro biométrico do requerente ou do representante, conforme o caso'],
    evidence: ['Laudos, relatórios, exames, receitas e prontuários que mostrem diagnóstico, evolução, tratamento, limitações e barreiras', 'Comprovantes de renda e composição familiar', 'Comprovantes de despesas contínuas e necessárias com saúde não fornecidas pelo SUS/SUAS, acompanhados da prova de negativa ou indisponibilidade'],
    conditional: ['Comprovantes dos 12 meses anteriores quando for pedido abatimento por gasto real superior ao valor padronizado', REPRESENTATION],
    recommended: ['Relatório médico recente e legível, comparado com documentos antigos para demonstrar continuidade ou agravamento', ADDRESS],
    alerts: ['Despesa comum de mercado não é abatimento automático. Alimentação especial exige necessidade comprovada e ausência de fornecimento público.', 'A documentação médica ajuda, mas não substitui as avaliações social e médico-pericial.'],
    sources: [SOURCES.bpc]
  },
  {
    id: 'bpc-idoso', group: 'BPC/LOAS', name: 'BPC/LOAS à pessoa idosa',
    summary: 'Para pessoa com 65 anos ou mais em vulnerabilidade socioeconômica.',
    fit: 'Idoso sem proteção previdenciária suficiente e com baixa capacidade de manutenção pelo grupo familiar.',
    formal: [ID, REPRESENTATION, 'CadÚnico atualizado, com CPF informado de todos os integrantes, e CPF regular do requerente', 'Cadastro biométrico do requerente ou do representante, conforme o caso'],
    evidence: ['Comprovantes de renda e composição familiar', 'Comprovantes de despesas contínuas e necessárias com saúde não fornecidas pelo SUS/SUAS'],
    conditional: ['Provas de despesas dos 12 meses anteriores quando se pretende usar o gasto real'],
    recommended: [ADDRESS, 'Extratos de benefícios e rendas de todos os integrantes do grupo familiar'],
    alerts: ['O BPC não paga 13º salário e não gera pensão por morte.', 'Recebimento de benefício incompatível precisa ser conferido antes do protocolo.'],
    sources: [SOURCES.bpc]
  },
  {
    id: 'bi-temporaria', group: 'Incapacidade', name: 'Benefício por incapacidade temporária - urbano',
    summary: 'Para segurado urbano temporariamente incapaz para sua atividade habitual.',
    fit: 'Pessoa com qualidade de segurado e incapacidade atual por mais de 15 dias.',
    formal: [ID, CNIS, 'Laudo, relatório ou atestado médico/odontológico legível, sem rasura, com identificação do paciente, data, diagnóstico ou CID, assinatura, nome e registro profissional'],
    evidence: ['Relatório atual descrevendo limitações funcionais, atividade exercida, início provável e tempo estimado de afastamento', 'Exames, receitas, prontuários e documentos antigos que mostrem evolução'],
    conditional: ['CTPS, GPS ou documentos para corrigir qualidade de segurado e carência quando o CNIS estiver incompleto'],
    recommended: ['Documento médico recente é estrategicamente mais forte; a regra atual não transforma “últimos 90 dias” em requisito formal automático.'],
    alerts: ['Documento ilegível, genérico ou sem elementos mínimos pode levar ao indeferimento documental.', 'Indicação por tempo indeterminado não é defeito formal automático, mas uma estimativa fundamentada reduz dúvida pericial.', ATESTMED_LIMIT],
    sources: [SOURCES.atestmed]
  },
  {
    id: 'bi-acidentaria', group: 'Incapacidade', name: 'Benefício por incapacidade temporária - acidentário',
    summary: 'Para incapacidade temporária relacionada ao trabalho ou a acidente/doença ocupacional.',
    fit: 'Segurado empregado ou equiparado com nexo laboral plausível e incapacidade atual.',
    formal: [ID, CNIS, 'Documentação médica com os elementos formais do Atestmed', 'CAT, quando existente ou necessária ao enquadramento acidentário'],
    evidence: ['PPP, prontuário ocupacional, ASO, exames, comunicação interna, descrição da função e documentos do acidente', 'Relatório médico explicando o nexo entre trabalho, lesão e incapacidade'],
    conditional: ['Boletim de ocorrência, ficha de emergência ou relatório do empregador, conforme o acidente'],
    recommended: ['Preservar documentos originais e a cronologia do fato, do atendimento e do afastamento.'],
    alerts: ['A natureza acidentária exige prova do nexo, não apenas do diagnóstico.', ATESTMED_LIMIT],
    sources: [SOURCES.atestmed]
  },
  {
    id: 'bi-rural', group: 'Incapacidade', name: 'Benefício por incapacidade temporária - rural',
    summary: 'Para segurado especial temporariamente incapaz para o trabalho rural.',
    fit: 'Trabalhador rural com incapacidade atual e prova da atividade no período relevante.',
    formal: [ID, 'Documentação médica com os elementos formais do Atestmed', 'Autodeclaração do segurado especial'],
    evidence: [RURAL_PROOF, 'Relatório médico que relacione as limitações às tarefas rurais efetivamente desempenhadas'],
    conditional: ['CNIS e documentos de vínculos urbanos intercalados, se existirem'],
    recommended: ['Separar provas por ano e identificar a quem pertence cada documento do grupo familiar.'],
    alerts: ['A prova rural e a incapacidade são requisitos distintos; um não substitui o outro.', ATESTMED_LIMIT],
    sources: [SOURCES.atestmed, SOURCES.rural]
  },
  {
    id: 'incapacidade-permanente', group: 'Incapacidade', name: 'Aposentadoria por incapacidade permanente',
    summary: 'Para incapacidade total, permanente e sem reabilitação profissional viável.',
    fit: 'Segurado com qualidade, incapacidade duradoura e inviabilidade concreta de reabilitação.',
    formal: [ID, CNIS, 'Documentação médica completa e atual'],
    evidence: ['Histórico de benefícios, tratamentos, cirurgias e tentativas de reabilitação', 'Relatórios sobre limitações, prognóstico, escolaridade, idade e atividade habitual'],
    conditional: ['Documentação de acidente ou doença ocupacional, quando houver'],
    recommended: [WORK],
    alerts: ['Diagnóstico grave isolado não garante aposentadoria; a análise é funcional e profissional.'],
    sources: [SOURCES.atestmed]
  },
  {
    id: 'pensao-urbana', group: 'Pensão', name: 'Pensão por morte urbana',
    summary: 'Para dependente de segurado urbano falecido.',
    fit: 'Cônjuge, companheiro, filho ou outro dependente legal quando o falecido mantinha qualidade de segurado, benefício ou direito adquirido.',
    formal: [ID, 'Certidão de óbito', 'Documentos do falecido', REPRESENTATION],
    evidence: [
      { text: 'Certidão de casamento e provas de convivência quando houver dúvida sobre separação de fato', when: { dependentType: 'spouse_married' } },
      { text: 'Ao menos duas provas materiais da união estável; uma delas contemporânea aos 24 meses anteriores ao óbito', when: { dependentType: 'stable_union' } },
      { text: 'Certidão de nascimento do filho', when: { dependentType: 'child_under21' } },
      { text: 'Prova médica e documental da invalidez ou deficiência e de sua relação temporal com os requisitos legais', when: { dependentType: 'child_disabled' } },
      { text: 'CNIS, CTPS, contracheques e recolhimentos que demonstrem qualidade de segurado ou direito adquirido', when: { deceasedWasBeneficiary: false } }
    ],
    conditional: ['Prova material anterior a 24 meses do óbito quando necessária para duração superior a quatro meses na união/casamento recente'],
    recommended: ['Carta de concessão ou extrato do benefício do falecido, se ele já recebia'],
    alerts: ['Não há carência mínima para a existência da pensão. As 18 contribuições e os dois anos de casamento/união interferem principalmente na duração da cota do cônjuge.', 'Filho maior de 21 anos precisa enquadramento específico por invalidez ou deficiência; parentesco sozinho não basta.'],
    sources: [SOURCES.pensao]
  },
  {
    id: 'pensao-rural', group: 'Pensão', name: 'Pensão por morte rural',
    summary: 'Para dependente de segurado especial ou beneficiário rural falecido.',
    fit: 'Dependente legal do falecido rural, com vínculo familiar e qualidade de segurado comprováveis.',
    formal: [ID, 'Certidão de óbito', 'Documentos do falecido', REPRESENTATION],
    evidence: [
      { text: 'Carta de concessão ou extrato do benefício rural do falecido', when: { deceasedWasBeneficiary: true } },
      { text: RURAL_PROOF, when: { deceasedWasBeneficiary: false } },
      { text: 'Certidão de casamento e prova de convivência, conforme o caso', when: { dependentType: 'spouse_married' } },
      { text: 'Provas materiais da união estável, inclusive uma dos 24 meses anteriores ao óbito', when: { dependentType: 'stable_union' } },
      { text: 'Certidão de nascimento do filho', when: { dependentType: 'child_under21' } },
      { text: 'Prova da invalidez ou deficiência e de seu momento de início', when: { dependentType: 'child_disabled' } }
    ],
    conditional: ['CNIS e documentos de atividades urbanas do falecido, se houver'],
    recommended: ['Organizar a prova rural em ordem cronológica e explicar documentos em nome de membros do grupo familiar.'],
    alerts: ['Se o falecido já recebia aposentadoria rural, não se exige refazer toda a prova da atividade para demonstrar qualidade de segurado.'],
    sources: [SOURCES.pensao, SOURCES.rural]
  },
  {
    id: 'aposentadoria-urbana', group: 'Aposentadoria', name: 'Aposentadoria programada/por idade urbana',
    summary: 'Aposentadoria urbana conforme idade, carência e regras vigentes ou de transição.',
    fit: 'Segurado com idade e histórico contributivo suficientes.',
    formal: [ID, CNIS], evidence: [WORK, 'Carnês, GPS, contratos, contracheques e processos trabalhistas que corrijam lacunas'],
    conditional: ['CTC e atos de averbação para tempo de outro regime', 'Documentos de atividade especial ou rural quando o período integrar o cálculo'],
    recommended: ['Simulação completa da melhor regra e da renda antes do protocolo.'], alerts: ['O simulador do Meu INSS não substitui a conferência documental do CNIS.'], sources: [SOURCES.aposentadorias]
  },
  {
    id: 'aposentadoria-rural', group: 'Aposentadoria', name: 'Aposentadoria por idade rural',
    summary: 'Para trabalhador rural que comprova idade e atividade rural no período exigido.',
    fit: 'Segurado especial ou trabalhador rural com prova contemporânea suficiente.',
    formal: [ID, 'Autodeclaração rural', CNIS], evidence: [RURAL_PROOF], conditional: ['CTPS e documentos de emprego rural, se a categoria for empregado rural'],
    recommended: ['Separar segurado especial de empregado rural antes de montar o pedido.'], alerts: ['Documento rural isolado não resolve sozinho todo o período; é necessária coerência cronológica.'], sources: [SOURCES.rural, SOURCES.aposentadorias]
  },
  {
    id: 'aposentadoria-hibrida', group: 'Aposentadoria', name: 'Aposentadoria por idade híbrida',
    summary: 'Combina períodos rurais e urbanos para completar carência e tempo necessários.',
    fit: 'Pessoa com histórico misto que não fecha a aposentadoria somente em uma categoria.',
    formal: [ID, CNIS, 'Autodeclaração rural'], evidence: [WORK, RURAL_PROOF], conditional: ['CTC, GPS e documentos de atividade autônoma, conforme o CNIS'],
    recommended: ['Planilha cronológica separando períodos urbanos, rurais e concomitantes.'], alerts: ['A data e a categoria de cada período alteram o aproveitamento jurídico.'], sources: [SOURCES.rural, SOURCES.aposentadorias]
  },
  {
    id: 'aposentadoria-especial', group: 'Aposentadoria', name: 'Aposentadoria especial',
    summary: 'Para exposição habitual e permanente a agentes nocivos pelo tempo exigido.',
    fit: 'Trabalhador com períodos especiais demonstráveis e requisitos da regra aplicável.',
    formal: [ID, CNIS, WORK], evidence: ['PPP de cada vínculo/período especial', 'LTCAT e laudos ambientais quando necessários para corrigir ou complementar o PPP'],
    conditional: ['Holerites de adicional, PPRA/PGR, PCMSO, laudos judiciais ou prova por similaridade quando a empresa não fornece documentação adequada'],
    recommended: ['Conferir assinatura, responsável técnico, agentes, intensidade/concentração, EPI e datas do PPP.'], alerts: ['Profissão, adicional de insalubridade ou nome do cargo isoladamente não garantem tempo especial.'], sources: [SOURCES.aposentadorias]
  },
  {
    id: 'aposentadoria-pcd', group: 'Aposentadoria', name: 'Aposentadoria da pessoa com deficiência',
    summary: 'Aposentadoria por idade ou tempo, conforme duração e grau da deficiência.',
    fit: 'Segurado que trabalhou como pessoa com deficiência e consegue demonstrar os períodos.',
    formal: [ID, CNIS, WORK], evidence: ['Laudos, prontuários, exames, documentos escolares, funcionais e sociais de diferentes épocas'],
    conditional: ['Documentos de adaptações, cotas PCD, reabilitação, acessibilidade ou benefícios anteriores'],
    recommended: ['Montar linha do tempo da deficiência vinculada aos períodos contributivos.'], alerts: ['Diagnóstico atual não prova automaticamente que a deficiência existia em todos os vínculos antigos.'], sources: [SOURCES.aposentadorias]
  },
  {
    id: 'aposentadoria-professor', group: 'Aposentadoria', name: 'Aposentadoria do professor',
    summary: 'Para tempo de efetivo magistério na educação básica, conforme a regra aplicável.',
    fit: 'Professor de educação infantil, ensino fundamental ou médio com tempo comprovável.',
    formal: [ID, CNIS, WORK], evidence: ['Declarações escolares com função, nível de ensino e períodos', 'Contratos, fichas funcionais e atos de nomeação'],
    conditional: ['CTC específica quando houve regime próprio'], recommended: ['Separar períodos de ensino superior e funções administrativas não equiparáveis.'], alerts: ['Nem toda atividade em escola conta como magistério para a redução.'], sources: [SOURCES.aposentadorias]
  },
  {
    id: 'salario-maternidade-urbano', group: 'Família', name: 'Salário-maternidade urbano',
    summary: 'Benefício por parto, adoção, guarda para adoção, natimorto ou aborto não criminoso.',
    fit: 'Segurado urbano que mantém filiação e cumpre os requisitos da categoria.',
    formal: [ID, 'Certidão de nascimento, termo de guarda/adoção ou documento médico correspondente', CNIS], evidence: [WORK, 'GPS e comprovantes de recolhimento, se contribuinte individual ou facultativo'],
    conditional: [REPRESENTATION], recommended: ['Conferir categoria e contribuições na data do fato gerador.'], alerts: ['A documentação varia conforme parto, adoção, guarda, natimorto ou aborto não criminoso.'], sources: [SOURCES.maternidade]
  },
  {
    id: 'salario-maternidade-rural', group: 'Família', name: 'Salário-maternidade rural',
    summary: 'Benefício de maternidade para segurado especial com atividade rural comprovada.',
    fit: 'Trabalhador rural que exerceu atividade no período legalmente relevante.',
    formal: [ID, 'Certidão de nascimento ou documento correspondente', 'Autodeclaração rural'], evidence: [RURAL_PROOF], conditional: [REPRESENTATION],
    recommended: ['Priorizar provas anteriores ao nascimento e organizar o período mês a mês.'], alerts: ['Provas produzidas somente depois do parto têm força reduzida para demonstrar o período anterior.'], sources: [SOURCES.maternidade, SOURCES.rural]
  },
  {
    id: 'auxilio-acidente', group: 'Incapacidade', name: 'Auxílio-acidente',
    summary: 'Indenização por sequela permanente que reduz a capacidade para o trabalho habitual.',
    fit: 'Segurado com lesão consolidada e redução funcional, ainda que continue trabalhando.',
    formal: [ID, CNIS, 'Documentação médica da lesão e da sequela'], evidence: ['Laudos, exames e relatórios comparando a capacidade antes e depois', 'Descrição detalhada da atividade habitual'],
    conditional: ['CAT, boletim, prontuário de emergência e documentos do acidente, quando houver'], recommended: ['Diferenciar incapacidade temporária de sequela consolidada.'], alerts: ['A existência de sequela sem redução laboral comprovável pode não bastar.'], sources: [SOURCES.auxilioAcidente]
  },
  {
    id: 'auxilio-reclusao-urbano', group: 'Dependentes', name: 'Auxílio-reclusão urbano',
    summary: 'Para dependentes de segurado urbano de baixa renda recolhido em regime fechado.',
    fit: 'Dependente legal quando o segurado cumpre qualidade, renda, carência e regime prisional aplicáveis.',
    formal: [ID, 'Certidão ou declaração de efetivo recolhimento à prisão', 'Documentos do segurado preso', 'Prova da dependência'], evidence: [CNIS, WORK],
    conditional: ['Provas de união estável ou invalidez/deficiência do dependente, conforme a classe'], recommended: ['Conferir remuneração e qualidade de segurado na data da prisão.'], alerts: ['O benefício é do dependente, não da pessoa presa. Regime e renda precisam ser confirmados.'], sources: [SOURCES.reclusao]
  },
  {
    id: 'auxilio-reclusao-rural', group: 'Dependentes', name: 'Auxílio-reclusão rural',
    summary: 'Para dependentes de segurado especial preso em regime fechado.',
    fit: 'Dependente legal com prova do cárcere e da atividade rural do instituidor.',
    formal: [ID, 'Certidão ou declaração de efetivo recolhimento à prisão', 'Prova da dependência', 'Autodeclaração rural'], evidence: [RURAL_PROOF],
    conditional: ['Provas de união estável ou invalidez/deficiência do dependente'], recommended: ['Organizar prova rural anterior à prisão.'], alerts: ['O encarceramento não dispensa a prova da qualidade de segurado especial.'], sources: [SOURCES.reclusao, SOURCES.rural]
  },
  {
    id: 'revisao-beneficio', group: 'Revisão', name: 'Revisão de benefício',
    summary: 'Para conferir cálculo, vínculos, salários, períodos ou enquadramentos de benefício já concedido.',
    fit: 'Beneficiário com indício objetivo de erro na concessão ou no pagamento.',
    formal: [ID, 'Carta de concessão, memória de cálculo e processo administrativo completo', CNIS], evidence: [WORK, 'Fichas financeiras, contracheques, PPP, CTC e documentos diretamente ligados ao erro alegado'],
    conditional: ['Extratos de pagamento, decisões judiciais ou administrativas anteriores'], recommended: ['Comparar cálculo concedido com simulação técnica antes de protocolar.'], alerts: ['Prazo decadencial e risco de redução precisam ser avaliados antes do pedido.'], sources: [SOURCES.aposentadorias]
  }
];

const TRIAGE_QUESTIONS = Object.freeze({
  'bpc-pcd': ['Existe impedimento de longo prazo?', 'A família está inscrita e atualizada no CadÚnico?', 'A renda e as despesas indicam vulnerabilidade?'],
  'bpc-idoso': ['A pessoa já completou 65 anos?', 'A família está inscrita e atualizada no CadÚnico?', 'Existe benefício previdenciário incompatível?'],
  'bi-temporaria': ['A pessoa está temporariamente incapaz para sua atividade habitual?', 'Mantinha qualidade de segurado na data do afastamento?', 'Há documento médico atual e legível?'],
  'bi-acidentaria': ['A incapacidade decorre do trabalho ou do trajeto?', 'Há CAT ou outra prova do nexo?', 'A pessoa está afastada da atividade habitual?'],
  'bi-rural': ['A incapacidade impede a atividade rural atual?', 'Há prova contemporânea da condição rural?', 'A qualidade de segurado especial estava mantida?'],
  'incapacidade-permanente': ['A incapacidade é total e duradoura?', 'A reabilitação para outra atividade parece inviável?', 'A qualidade de segurado estava mantida?'],
  'pensao-urbana': ['Houve falecimento de segurado urbano?', 'Qual é a classe e o tipo de dependente?', 'A dependência e a qualidade de segurado podem ser comprovadas?'],
  'pensao-rural': ['Houve falecimento de trabalhador rural?', 'O falecido já recebia benefício rural?', 'Há vínculo familiar e, se necessário, prova rural?'],
  'aposentadoria-urbana': ['A idade mínima foi atingida?', 'O CNIS contém tempo e carência suficientes?', 'Existem vínculos ou remunerações faltantes?'],
  'aposentadoria-rural': ['A idade rural foi atingida?', 'A categoria é segurado especial ou empregado rural?', 'Existe prova rural cobrindo o período necessário?'],
  'aposentadoria-hibrida': ['Há períodos rurais e urbanos?', 'A idade da regra híbrida foi atingida?', 'Os períodos somados completam a carência?'],
  'aposentadoria-especial': ['Houve exposição habitual e permanente a agente nocivo?', 'Existe PPP para cada período alegado?', 'O tempo e a regra aplicável já foram simulados?'],
  'aposentadoria-pcd': ['A pessoa trabalhou na condição de pessoa com deficiência?', 'É possível datar o início e a evolução da deficiência?', 'O tempo foi separado por grau e período?'],
  'aposentadoria-professor': ['O trabalho foi em educação básica?', 'As funções eram de efetivo magistério?', 'O tempo reduzido exigido foi completado?'],
  'salario-maternidade-urbano': ['Houve parto, adoção, guarda, natimorto ou aborto não criminoso?', 'A categoria e a filiação estavam válidas?', 'Há documento do fato gerador?'],
  'salario-maternidade-rural': ['Houve o fato gerador de maternidade?', 'A atividade rural no período relevante pode ser comprovada?', 'Existe autodeclaração rural coerente?'],
  'auxilio-acidente': ['A lesão já está consolidada?', 'Restou sequela permanente?', 'A sequela reduziu a capacidade para a atividade habitual?'],
  'auxilio-reclusao-urbano': ['O segurado está em regime fechado?', 'O dependente pertence a uma classe protegida?', 'Qualidade, renda e carência podem ser confirmadas?'],
  'auxilio-reclusao-rural': ['O segurado especial está em regime fechado?', 'Há dependente protegido?', 'A atividade rural anterior à prisão pode ser comprovada?'],
  'revisao-beneficio': ['Já existe benefício concedido?', 'Há indício objetivo de erro de cálculo ou cadastro?', 'O prazo decadencial e o risco de redução foram avaliados?']
});

/** @type {ReadonlyArray<BenefitDefinition>} */
export const BENEFITS = Object.freeze(BENEFIT_DEFINITIONS.map((definition) => {
  const { formal, evidence, conditional, recommended, ...base } = definition;
  return Object.freeze({
    ...base,
    triageQuestions: Object.freeze(TRIAGE_QUESTIONS[definition.id] || []),
    minimumFormal: Object.freeze(formal),
    materialEvidence: Object.freeze(evidence),
    conditionalDocuments: Object.freeze(conditional),
    recommendations: Object.freeze(recommended),
    alerts: Object.freeze(definition.alerts),
    sources: Object.freeze(definition.sources),
    reviewedAt: REVIEW_DATE,
    validUntil: null
  });
}));

export function getBenefit(id) {
  return BENEFITS.find((benefit) => benefit.id === id) || BENEFITS[0];
}

export function getRepresentationRole(id) {
  return REPRESENTATION_ROLES.find((role) => role.id === id) || null;
}

export function resolveDocumentSet(state) {
  const documents = ['procuracao', 'anexo'];
  if (state.representationMode === 'represented' || state.representationMode === 'assisted') {
    documents.push('responsabilidade');
  }
  if (state.representationRole === 'administrador_provisorio') {
    documents.push('compromisso');
  }
  return documents;
}

function matchesWhen(when, context) {
  if (!when) return true;
  return Object.entries(when).every(([key, expected]) => context[key] === expected);
}

function normalizeItem(item, category, context) {
  if (typeof item === 'string') return { category, text: item };
  if (!matchesWhen(item.when, context)) return null;
  return { category, text: item.text };
}

export function buildChecklist(benefitId, context = {}) {
  const benefit = getBenefit(benefitId);
  return [
    ...benefit.minimumFormal.map((item) => normalizeItem(item, 'Mínimo formal', context)),
    ...benefit.materialEvidence.map((item) => normalizeItem(item, 'Prova do direito', context)),
    ...benefit.conditionalDocuments.map((item) => normalizeItem(item, 'Quando aplicável', context)),
    ...benefit.recommendations.map((item) => normalizeItem(item, 'Recomendado', context))
  ].filter(Boolean);
}

export function triageBenefits(answers) {
  const result = [];
  const add = (id, reason) => {
    if (!result.some((item) => item.id === id)) result.push({ id, status: 'possivel', reason });
  };
  const rural = Boolean(answers.rural);
  if (answers.death) add(rural ? 'pensao-rural' : 'pensao-urbana', 'Há falecimento e possível dependente.');
  if (answers.prison) add(rural ? 'auxilio-reclusao-rural' : 'auxilio-reclusao-urbano', 'Há segurado preso e possível dependente.');
  if (answers.maternity) add(rural ? 'salario-maternidade-rural' : 'salario-maternidade-urbano', 'Há evento de maternidade ou adoção.');
  if (answers.temporaryIncapacity) add(rural ? 'bi-rural' : 'bi-temporaria', 'Há incapacidade atual para a atividade habitual.');
  if (answers.workAccident) add('bi-acidentaria', 'A incapacidade pode ter relação com o trabalho.');
  if (answers.permanentIncapacity) add('incapacidade-permanente', 'A incapacidade pode ser duradoura e sem reabilitação viável.');
  if (answers.sequela) add('auxilio-acidente', 'Há possível sequela consolidada com redução funcional.');
  if (answers.lowIncomeDisability) add('bpc-pcd', 'Há deficiência e vulnerabilidade socioeconômica.');
  if (answers.age65LowIncome) add('bpc-idoso', 'Há idade mínima e vulnerabilidade socioeconômica.');
  if (answers.retirement) {
    add(rural ? 'aposentadoria-rural' : 'aposentadoria-urbana', 'Há idade ou tempo que precisa ser simulado.');
    if (answers.mixedWork) add('aposentadoria-hibrida', 'O histórico combina períodos rurais e urbanos.');
  }
  if (answers.priorBenefit) add('revisao-beneficio', 'Já existe benefício com possível erro de cálculo ou cadastro.');
  return result.length ? result : [{ id: '', status: 'precisa_conferir', reason: 'As respostas não permitem indicar uma rota. Encaminhe CNIS e documentos para análise.' }];
}

/**
 * @typedef {Object} BenefitDefinition
 * @property {string} id
 * @property {string} group
 * @property {string} name
 * @property {string} summary
 * @property {string} fit
 * @property {string[]} triageQuestions
 * @property {Array<string|{text:string,when:Object}>} minimumFormal
 * @property {Array<string|{text:string,when:Object}>} materialEvidence
 * @property {Array<string|{text:string,when:Object}>} conditionalDocuments
 * @property {Array<string|{text:string,when:Object}>} recommendations
 * @property {string[]} alerts
 * @property {{label:string,url:string}[]} sources
 * @property {string} reviewedAt
 * @property {string|null} validUntil
 */

/**
 * @typedef {Object} BenefitDefinitionInput
 * @property {string} id
 * @property {string} group
 * @property {string} name
 * @property {string} summary
 * @property {string} fit
 * @property {Array<string|{text:string,when:Object}>} formal
 * @property {Array<string|{text:string,when:Object}>} evidence
 * @property {Array<string|{text:string,when:Object}>} conditional
 * @property {Array<string|{text:string,when:Object}>} recommended
 * @property {string[]} alerts
 * @property {{label:string,url:string}[]} sources
 */
