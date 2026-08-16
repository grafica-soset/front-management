/**
 * Rascunho de ORÇAMENTO (atividade 034) — protótipo navegável.
 *
 * Um orçamento tem N produtos. Cada produto tem uma ESTRUTURA que decide quantas folhas ele usa:
 *
 *   LÂMINA — impressão de folha única (folder, cartaz). O produto tem N lâminas independentes.
 *   BLOCO  — jogos × vias. Um bloco de 50 jogos com 2 vias tem 100 folhas; na tiragem de 10
 *            blocos são 1.000 folhas, 500 de cada via.
 *
 * Capas entram como folhas à parte: são configuradas como uma via/lâmina qualquer (papel, lados,
 * cores), mas contam pela quantidade de capas, não pelos jogos.
 *
 * Estes tipos descrevem o RASCUNHO que o usuário monta na tela. O cálculo é de demonstração
 * (`utils/quoteDemoData.ts`) até o motor do backend existir.
 */

/** O que a folha é dentro do produto. */
export type SheetKind = 'BLADE' | 'VIA' | 'COVER'

/** Estrutura do produto: folha única ou bloco com jogos e vias. */
export type ProductStructure = 'BLADE' | 'BLOCK'

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
}

/**
 * Configuração completa de UMA etapa de impressão. Cada etapa de impressão do produto tem a sua:
 * duas impressões no mesmo produto são dois acertos, duas escolhas de máquina e dois custos, que
 * se somam.
 */
export interface PrintingSetup {
  /** Configuração de cada folha, indexada pelo `uid` dela. */
  bySheet: Record<string, PrintingSheetSetup>
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
  /** Atividade manual: quantas horas de trabalho. */
  laborHours?: number
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
  name: string
  /** Formato final da peça, em milímetros (representação canônica do sistema). */
  widthMm: number | null
  heightMm: number | null
  /** Tiragem: peças finais (lâminas) ou blocos a produzir. */
  quantity: number | null

  structure: ProductStructure
  /** Quantas lâminas o produto tem (estrutura LÂMINA). */
  blades: number
  /** Jogos por bloco (estrutura BLOCO). */
  sets: number
  /** Vias por jogo, 1 a 9 (estrutura BLOCO). */
  vias: number

  hasCovers: boolean
  coverCount: number

  sheets: QuoteSheet[]
  steps: QuoteStep[]
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
  /** Folhas de impressão da tiragem inteira, somando todas as vias/lâminas e capas. */
  totalSheets: number
  totalMinutes: number
  machinesUsed: string[]
}
