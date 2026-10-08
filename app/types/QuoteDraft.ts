/**
 * Rascunho de ORÇAMENTO (atividade 034).
 *
 * Um orçamento tem N produtos. Cada produto tem uma ESTRUTURA que decide quantas folhas ele usa:
 *
 *   LÂMINA — impressão de folha única (folder, cartaz). O produto tem N lâminas independentes.
 *   BLOCO  — jogos × vias. Um bloco de 50 jogos com 2 vias tem 100 folhas; na encomenda de 10
 *            blocos são 1.000 folhas, 500 de cada via.
 *
 * Capas entram como folhas à parte: são configuradas como uma via/lâmina qualquer (papel, lados,
 * cores), mas contam pela quantidade de capas, não pelos jogos.
 *
 * Estes tipos descrevem o RASCUNHO que o usuário monta na tela. A store o traduz no contrato do
 * motor (`types/Quote.ts`), que é quem calcula o preço.
 */
import type { PricingTerms, ProductTaxes } from '@/types/ProductTaxes'
import type { DuplexMode } from '@/types/Quote'

/** O que a folha é dentro do produto. */
export type SheetKind = 'BLADE' | 'VIA' | 'COVER'

/** Estrutura do produto: folha única ou bloco com jogos e vias. */
export type ProductStructure = 'BLADE' | 'BLOCK'

/**
 * Onde vai a capa (atividade 040): só na frente, só no verso, ou nas duas posições — que são duas
 * capas, cada uma com o seu papel. A capa da frente é sempre a folha COVER 1 e a do verso a 2.
 */
export type CoverSides = 'FRONT' | 'BACK' | 'BOTH'

/** Posição de UMA capa, como o motor a recebe. */
export type CoverPosition = 'FRONT' | 'BACK'

/** Um conjunto de capas, como o MODELO DE PRODUTO o guarda: nenhuma, frente, verso ou as duas. */
export type CoverSelection = 'NONE' | CoverSides

/**
 * Uma folha do produto (lâmina, via ou capa). Guarda só o que é do PAPEL — cores, tintas e
 * impressora são de cada etapa de impressão, porque o mesmo papel pode passar pela máquina mais
 * de uma vez, com configurações diferentes.
 */
export interface QuoteSheet {
  /** Identidade estável no rascunho — as folhas são recriadas quando jogos/vias mudam. */
  uid: string
  kind: SheetKind
  /** Posição dentro do tipo: via 1, via 2, capa 1... */
  index: number
  /** Família de papéis (`/paper-types`) — o sistema escolhe o tamanho dentro dela. */
  paperTypeId: number | null
  /**
   * Formato de impressão escolhido pelo usuário — o número do formato na folha inteira. Nulo deixa o
   * motor escolher pelo custo, que é o caminho normal.
   */
  printFormatNumber: number | null
  /**
   * Papel escolhido pelo usuário (atividade 044) — vai junto com o formato, porque o número do
   * formato é da folha inteira: o F9 do 66x96 não é o F9 do 64x88. Nulo = o motor escolhe.
   */
  paperId?: number | null
}

/**
 * O que uma etapa de impressão faz com UMA folha: quantas cores em cada face e quais tintas.
 *
 * As tintas são por face: a frente pode ser CMYK e o verso um Pantone só. A quantidade de tintas
 * escolhidas tem que bater com a quantidade de cores informada naquela face.
 */
export interface PrintingSheetSetup {
  frontColors: number
  backColors: number
  frontInkIds: number[]
  backInkIds: number[]
  /**
   * Taxa de cobertura de cada face, em % (1 a 100). É característica do TRABALHO, não da etapa: a
   * mesma "Impressão 4x0" atende um chapado e um miolo de texto — por isso é perguntada aqui, e
   * por face, já que a frente chapada com verso em texto é o caso comum.
   *
   * É ela que dimensiona o consumo de tinta, junto com a absorção do papel. OBRIGATÓRIA: nasce
   * vazia (null) e segura o cálculo até ser informada — um palpite silencioso aqui erraria a tinta
   * do trabalho inteiro.
   */
  frontCoverage: number | null
  backCoverage: number | null
  /**
   * "Tira/retira ou frente e verso?" (atividade 041) — só é pergunta quando frente e verso são iguais
   * em cores (ver `allowsWorkAndTurn`). Ausente/nulo = tira/retira, o padrão da gráfica. Frente e
   * verso volta a cobrar as chapas e o acerto dos dois lados.
   */
  duplexMode?: DuplexMode | null
}

/**
 * Configuração completa de UMA etapa de impressão. Cada etapa de impressão do produto tem a sua:
 * duas impressões no mesmo produto são dois acertos, duas escolhas de máquina e dois custos, que
 * se somam.
 */
export interface PrintingSetup {
  /** Configuração de cada folha, indexada pelo `uid` dela. */
  bySheet: Record<string, PrintingSheetSetup>
  /** Chapa escolhida pelo usuário quando a impressora aceita mais de um tipo. */
  plateSupplyId?: number | null
  /** Impressora do produto inteiro (quando não está por folha). */
  machineId: number | null
  /** "Selecionar impressora diferente por via/lâmina". */
  perSheet: boolean
  /** Impressora de cada folha, quando `perSheet`. Chave = `uid` da folha. */
  machineIdBySheet: Record<string, number | null>
  /** "Selecionar impressora diferente para as capas". */
  separateCovers: boolean
  /** Impressora das capas, quando `separateCovers`. */
  coverMachineId: number | null
}

/** Parâmetros que uma etapa pede quando é ativada no orçamento. */
export interface StepParameters {
  /** Atividade manual: quantos MINUTOS de trabalho (a tela pergunta assim). */
  laborMinutes?: number
  /** Dobradeira. */
  parallelFolds?: number
  crossFolds?: number
  /** Grampeadeira. */
  staples?: number
  /** Furadeira. */
  holes?: number
  /** Numeração. */
  numberingUnits?: number
  /** Insumo concreto escolhido dentro de um grupo consumido pela atividade. */
  supplyId?: number | null

  // ---- Talão (atividade 035) ----
  /** PICOTE: quantos picotes a folha leva — cada um ocupa uma ferramenta da picotadeira. */
  perforationCount?: number
  /**
   * PICOTE: em quantas vias/lâminas ele é feito. Nulo = em todas.
   *
   * No talão é comum picotar só a primeira via, a que o cliente destaca. Como cada via pode ter
   * papel diferente, a picotadeira roda em velocidades diferentes — por isso a conta é por via.
   */
  perforatedSheetCount?: number | null
  /** GRAMPO: quantos grampos o talão leva. Decide descidas, movimentos laterais e arame. */
  stapleCount?: number

  // ---- Corte e vinco (atividade 046) ----
  /** Quantidade de BOCAS (FACAS) da forma: o consumo da faca e o multiplicador da canaleta. */
  dieCount?: number
  /**
   * Canaleta POR FACA, em MILÍMETROS (canônico; a tela digita na unidade da empresa). Nula = o
   * perímetro da peça, que é o padrão — o orçamentista ajusta para mais ou para menos.
   */
  channelLengthMm?: number | null
  /** Máquina escolhida para a etapa automatizada. Nula = a mais barata que dá conta. */
  machineId?: number | null
}

/** Uma etapa ativada no produto. A mesma atividade pode entrar mais de uma vez. */
export interface QuoteStep {
  /** Identidade da LINHA (a mesma atividade pode repetir). */
  uid: string
  activityId: number
  parameters: StepParameters
  /** Só em etapas de impressão: a configuração daquela passada pela máquina. */
  printing?: PrintingSetup
}

/** O produto sendo montado no assistente. */
export interface QuoteProduct {
  uid: string
  /**
   * MODELO + TIPO (atividade 037) — "Blocos > Anotações". Opcionais no orçamento; obrigatórios só
   * para "Salvar como modelo", porque são a chave do catálogo.
   */
  productModelId: number | null
  /** Nome do Modelo, para o combobox exibir sem consultar a lista. */
  productModelName: string
  typeName: string
  /** Modelo de produto do catálogo de onde o produto partiu, se partiu de um. */
  productTemplateId: number | null
  name: string
  /** Formato final da peça, em milímetros (representação canônica do sistema). */
  widthMm: number | null
  heightMm: number | null
  /**
   * QUANTIDADE encomendada: peças finais (lâminas) ou blocos a produzir.
   *
   * Não confundir com TIRAGEM, que no jargão gráfico é o total de FOLHAS IMPRESSAS — 10 blocos de
   * 50 jogos com 2 vias dão 125 folhas por via, 250 de tiragem.
   */
  quantity: number | null

  structure: ProductStructure
  /** Quantas lâminas o produto tem (estrutura LÂMINA). */
  blades: number
  /** Jogos por bloco (estrutura BLOCO). */
  sets: number
  /** Vias por jogo, 1 a 9 (estrutura BLOCO). */
  vias: number

  /**
   * "Vias/lâminas iguais?" — todas com o MESMO desenho.
   *
   * Nasce SEM RESPOSTA (null) e é perguntada assim que o produto tem mais de uma via/lâmina: é ela
   * que decide se o trabalho paga uma chapa ou várias, e nenhum dos dois lados pode ser assumido no
   * silêncio — um cobra a mais, o outro a menos.
   */
  identicalArtwork: boolean | null
  /**
   * Quando a resposta é NÃO: quantos desenhos DIFERENTES existem entre as vias/lâminas. Dois de
   * quatro vias significam dois jogos de chapa — as outras duas reaproveitam.
   */
  distinctArtworks: number | null

  hasCovers: boolean
  /** Frente e verso, só frente ou só verso (atividade 040). Substituiu a "quantidade de capas". */
  coverSides: CoverSides
  /**
   * "A capa tem impressão?" — por capa. Nasce SEM RESPOSTA (null), como "as vias são iguais?": a
   * capa impressa paga chapa, acerto e tinta, e nenhum dos lados pode ser assumido no silêncio. A
   * capa que não é impressa sai das etapas de impressão — só consome papel.
   */
  coverPrinted: Record<CoverPosition, boolean | null>
  /**
   * "A capa tem o mesmo desenho da via/lâmina?" — sim = sai da chapa da 1ª via, sem chapa nem
   * montagem novas. Não = impressão nova: chapa, montagem e acerto. Só pesa se a capa for impressa.
   */
  coverRepeatsArtwork: boolean
  /** "Capa da frente e do verso com o mesmo desenho?" — só com as duas capas. */
  identicalCovers: boolean

  /**
   * "TEM NUMERAÇÃO?" — atividade 036.
   *
   * Nasce SEM RESPOSTA (null), como "as vias são iguais?": numerar decide quais impressoras podem
   * fazer o trabalho — só algumas offsets numeram — e assumir qualquer um dos lados no silêncio
   * erraria a escolha da máquina.
   */
  hasNumbering: boolean | null
  /**
   * Quantos numeradores CADA APLICAÇÃO leva — não quantos vão na máquina.
   *
   * A montagem é este número × as aplicações que o formato de impressão rende (1 numerador em 9
   * aplicações são 9 numeradores montados, e 9 acertos), e é a montagem que o "Máx. de numeradores"
   * da offset limita. Como o formato é escolhido pelo motor, a tela não tem como travar no teto:
   * informa o limite e explica a conta.
   */
  numberingUnits: number
  /** Numeração inicial — não muda o preço, é o que a produção monta no numerador. */
  numberingStart: number
  /** Quantidade de dígitos do numerador (6 ⇒ 000001). */
  numberingDigits: number

  sheets: QuoteSheet[]
  steps: QuoteStep[]

  /** Impostos (atividade 037) — viajam para a nota fiscal quando o orçamento for aprovado. */
  taxes: ProductTaxes
  /** Comissões do vendedor e markup — com os impostos, formam o divisor do preço. */
  pricing: PricingTerms

  // ---- Orçamento salvo (atividade 044) ----
  /** Id do produto já gravado: com ele e a mesma configuração, o servidor mantém o custo gravado. */
  savedId?: number | null
  /** Custo gravado — o que vale enquanto ninguém pede recálculo (orçamento anterior à 044 não tem o cálculo inteiro). */
  savedTotalCost?: number | null
  /** O usuário pediu o recálculo, ou editou o produto no assistente: o servidor calcula de novo ao salvar. */
  recalculate?: boolean
  /** Unitário assumido pelo orçamentista (3 casas). Nulo = vale o calculado. */
  unitPriceOverride?: number | null
  /** Escolhido pelo cliente na aprovação. */
  approved?: boolean
}

/** Linha do detalhamento de custo exibido no trilho e no resumo. */
export interface CostLine {
  label: string
  value: number
  /** Explicação curta de como a linha foi montada. */
  detail?: string
}

/** Resultado do cálculo de um produto. */
export interface ProductCost {
  lines: CostLine[]
  total: number
  unitCost: number
  /** Folhas do produto na encomenda inteira, somando todas as vias/lâminas e capas. */
  totalSheets: number
  totalMinutes: number
  machinesUsed: string[]
}
