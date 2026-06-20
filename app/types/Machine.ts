import type { FormattedDimension } from './FormattedDimension'

/**
 * Domínio de máquinas do parque fabril.
 *
 * Neste momento o cadastro suporta apenas a **impressora OFFSET** (categoria
 * PRINTING, endpoint `/printing-machines`), modelada com o **modelo de Rampa de
 * Velocidade** descrito em `.docs/offset-machines-api.md`. Os demais tipos foram
 * removidos enquanto validamos o fluxo com o cliente.
 *
 * Convenções:
 * - Dimensões são persistidas sempre em milímetros (largura × comprimento).
 * - Valores decimais (custo-hora e percentuais) trafegam como string para
 *   preservar a precisão exigida pelo backend (BigDecimal).
 */

export type MachineCategory = 'PRINTING' | 'CUTTING' | 'DIE_CUTTING' | 'FINISHING'
export type MachineType =
  | 'OFFSET'
  | 'GUILLOTINE'
  | 'DIE_CUTTING'
  | 'SCREEN_PRINTING'
  | 'HOLE_PUNCHING'
  | 'LAMINATING'
  | 'FOLDING'
  | 'PERFORATING'
  | 'DIGITAL'

/** Tipo de tinta usado na matriz de velocidade/quebra. */
export type InkType = 'LINE' | 'CMYK' | 'PANTONE'

// ---------- Blocos comuns ----------

/** Faixa de formato de papel (largura × comprimento), em milímetros. */
export interface FormatRangeRequest {
  minWidthMm: number
  maxWidthMm: number
  minLengthMm: number
  maxLengthMm: number
}

/** Faixa de formato devolvida pela API, com dimensões já formatadas. */
export interface FormatRangeResponse {
  minWidth: FormattedDimension
  maxWidth: FormattedDimension
  minLength: FormattedDimension
  maxLength: FormattedDimension
}

/** Margens técnicas (mm): pinça e limite máximo de mancha. */
export interface GripMargins {
  gripMm: number
  /**
   * Limite máximo de mancha (mm): borda não imprimível entre a máquina e o papel.
   * Quanto maior, menor a área de impressão útil.
   */
  maxImageMarginMm: number
}

/** Alimentador — apenas a altura máxima da pilha (mm). Obrigatório p/ OFFSET. */
export interface PaperFeeder {
  maxStackHeightMm: number
}

// ---------- Bloco OFFSET (Rampa de Velocidade) ----------

export interface OffsetSetupTimes {
  /** Acerto de Chapa por Cor (min): aplicado por cor (× numberOfColors). */
  plateSetupMinutesPerColor: number
  /** Acerto das Cores (min): aplicado por cor (× numberOfColors). */
  colorMatchingMinutes: number
  numberingSetupMinutesPerUnit: number
  paperFeedSetupMinutes: number
  feedTimeSecondsPerLoad: number
  feedLoadIncrementMm: number
  washMinutesPerColor: number
}

/** Ajustes por tipo de impressão — um item por LINE, CMYK e PANTONE. */
export interface OffsetInkSetting {
  inkType: InkType
  initialWasteSheets: number
  fullCoverageExtraWastePercent: string
}

/**
 * Faixa de quantidade configurável (por tipo de tinta). O usuário define quantas
 * faixas quiser, com início/fim livres. `toQuantity` nulo = faixa aberta
 * ("acima de"), permitida apenas na última faixa de cada tinta. As faixas de uma
 * mesma tinta devem ser contíguas (próxima `fromQuantity` = anterior `toQuantity` + 1).
 */
export interface OffsetTier {
  inkType: InkType
  fromQuantity: number
  toQuantity: number | null
  sheetsPerHour: number
  wastePercent: string
}

export interface OffsetSpeedRamp {
  /** Envelope de velocidade da máquina (piso e teto físicos). */
  minSpeedSheetsPerHour: number
  maxSpeedSheetsPerHour: number
  /** Teto de velocidade quando há numeração — único da máquina (não varia por tinta). */
  numberingMaxSheetsPerHour: number
  idealWeightMinGsm: number
  idealWeightMaxGsm: number
  belowIdealSpeedReducerPercent: string
  aboveIdealSpeedReducerPercent: string
  fullCoverageSpeedReducerPercent: string
  numberingSpeedReducerPercent: string
  inkSettings: OffsetInkSetting[]
  tiers: OffsetTier[]
}

export interface OffsetBlock {
  numberOfColors: number
  supportsNumbering: boolean
  maxNumberingUnits: number
  setupTimes: OffsetSetupTimes
  speedRamp: OffsetSpeedRamp
}

// ---------- Bloco GUILLOTINE (categoria CUTTING) ----------

/**
 * Tempos unitários da guilhotina (em segundos). A guilhotina corta o papel do formato
 * maior para o menor em múltiplos — a cada "descida" da lâmina há um corte e o operador
 * move o papel. O número de descidas vem da tabela de conversões do Formato (cutCount);
 * aqui só guardamos os tempos para o orçamento calcular o total.
 */
export interface GuillotineBlock {
  /** Tempo (s) de uma descida da lâmina — 1x a cada descida (corte). */
  bladeDescentTimeSeconds: number
  /** Tempo (s) de movimentação do papel — 1x a cada descida. */
  paperMovementTimeSeconds: number
  /** Tempo (s) de setup das medidas — 1x a cada medida distinta. */
  measureSetupTimeSeconds: number
  /** Tempo (s) para carregar uma leva de papel de altura feedLoadIncrementMm na mesa. */
  feedTimeSecondsPerLoad: number
  /** Altura (mm) de cada leva de alimentação (ex.: 40 mm = 4 cm). */
  feedLoadIncrementMm: number
}

// ---------- Bloco DIE_CUTTING (Corte e Vinco) ----------

/**
 * A máquina de corte e vinco é baseada na offset, mas NÃO imprime: sem cores, lavagem,
 * quebra ou rampa por tinta. A velocidade e o tempo de setup de faca vêm de uma MATRIZ DE
 * FORMATO (dois pontos: mínimo e máximo). Pode ser MANUAL ou AUTOMÁTICA — só a automática
 * tem alimentador (altura da pilha) e o bloco de alimentação (`feed`).
 */

/**
 * Ponto de calibração da matriz — request. As dimensões (largura × comprimento, em mm) são
 * digitadas diretamente (numéricas — não há mais vínculo com o cadastro de `/formats`).
 */
export interface DieCuttingFormatPointRequest {
  widthMm: number
  lengthMm: number
  sheetsPerHour: number
  /** Tempo de setup de faca (min) medido neste formato. */
  dieSetupMinutes: number
}

/** Bloco de alimentação de papel — apenas máquina automática. */
export interface DieCuttingFeed {
  paperFeedSetupMinutes: number
  feedTimeSecondsPerLoad: number
  feedLoadIncrementMm: number
}

/** Bloco corte e vinco — request (dimensões em mm, percentuais como string). */
export interface DieCuttingBlockRequest {
  automatic: boolean
  /** Setup de esquadros Frontal e Lateral (min). */
  squareSetupMinutes: number
  minFormat: DieCuttingFormatPointRequest
  maxFormat: DieCuttingFormatPointRequest
  /** Redutor (%) p/ formatos menores que o mínimo. */
  belowMinSpeedReducerPercent: string
  /** Redutor (%) p/ formatos maiores que o máximo. */
  aboveMaxSpeedReducerPercent: string
  /** Preenchido apenas quando `automatic` é true. */
  feed: DieCuttingFeed | null
}

/** Ponto de calibração devolvido pela API (dimensões numéricas já formatadas). */
export interface DieCuttingFormatPointResponse {
  width: FormattedDimension
  length: FormattedDimension
  sheetsPerHour: number
  dieSetupMinutes: number
}

/** Bloco corte e vinco devolvido pela API. */
export interface DieCuttingBlockResponse {
  automatic: boolean
  squareSetupMinutes: number
  minFormat: DieCuttingFormatPointResponse
  maxFormat: DieCuttingFormatPointResponse
  belowMinSpeedReducerPercent: number
  aboveMaxSpeedReducerPercent: number
  feed: DieCuttingFeed | null
}

// ---------- Request / Response ----------

/** Corpo de POST /printing-machines e PUT /printing-machines/{id}. */
export interface MachineRequest {
  customerId: number
  machineType: MachineType
  name: string
  /** Enviado apenas no PUT. */
  active?: boolean
  formatRange: FormatRangeRequest
  gripMargins: GripMargins
  paperFeeder: PaperFeeder
  /** Custo-Hora Máquina (R$) como string decimal. */
  hourlyCost: string
  /** Tempo de movimento e transporte de insumos (min) — comum a todos os tipos. */
  supplyTransportTimeMinutes: number
  offset: OffsetBlock
}

/** Corpo de POST/PUT /cutting-machines. A guilhotina não usa margens/cores/quebras/rampa. */
export interface CuttingMachineRequest {
  customerId: number
  machineType: 'GUILLOTINE'
  name: string
  active?: boolean
  formatRange: FormatRangeRequest
  paperFeeder: PaperFeeder
  hourlyCost: string
  supplyTransportTimeMinutes: number
  guillotine: GuillotineBlock
}

/**
 * Corpo de POST/PUT /die-cutting-machines. Tem margem da pinça (gripMm), mas NÃO há
 * "limite máximo de mancha" (não imprime). O alimentador (paperFeeder) só existe na
 * máquina automática; na manual vai `null`.
 */
export interface DieCuttingMachineRequest {
  customerId: number
  machineType: 'DIE_CUTTING'
  name: string
  active?: boolean
  formatRange: FormatRangeRequest
  gripMm: number
  paperFeeder: PaperFeeder | null
  hourlyCost: string
  supplyTransportTimeMinutes: number
  dieCutting: DieCuttingBlockRequest
}

/** Máquina de corte e vinco devolvida por GET/{id}, POST e PUT. */
export interface DieCuttingMachine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  formatRange: FormatRangeResponse
  gripMm: number
  paperFeeder: PaperFeeder | null
  hourlyCost: number
  supplyTransportTimeMinutes: number
  dieCutting: DieCuttingBlockResponse | null
}

// ---------- Serigrafia (SCREEN_PRINTING) ----------
/**
 * A serigrafia imprime por TELAS (uma por cor): sem número de cores fixo nem rampa por tinta.
 * A velocidade vem de uma MATRIZ DE FORMATO (dois pontos: mínimo e máximo, com dimensões
 * numéricas). Os setups (tela, lavagem) e a quebra são por tela. Hoje só a máquina MANUAL é
 * suportada (sem alimentador).
 */

/** Ponto de calibração da matriz — request (dimensões em mm + velocidade). */
export interface ScreenPrintingFormatPointRequest {
  widthMm: number
  lengthMm: number
  sheetsPerHour: number
}

/** Bloco serigrafia — request (dimensões em mm, percentuais como string). */
export interface ScreenPrintingBlockRequest {
  /** Hoje sempre false (manual). */
  automatic: boolean
  /** Setup de esquadros Frontal e Lateral (min) — fixo. */
  squareSetupMinutes: number
  /** Tempo de setup de tela (min) — por tela. */
  screenSetupMinutes: number
  /** Lavagem por cor (min) — por tela. */
  washMinutesPerColor: number
  /** Quebra por cor (folhas) — por tela. */
  wasteSheetsPerColor: number
  minFormat: ScreenPrintingFormatPointRequest
  maxFormat: ScreenPrintingFormatPointRequest
  /** Redutor (%) p/ formatos menores que o mínimo. */
  belowMinSpeedReducerPercent: string
  /** Redutor (%) p/ formatos maiores que o máximo. */
  aboveMaxSpeedReducerPercent: string
}

/** Ponto de calibração devolvido pela API (dimensões numéricas já formatadas). */
export interface ScreenPrintingFormatPointResponse {
  width: FormattedDimension
  length: FormattedDimension
  sheetsPerHour: number
}

/** Bloco serigrafia devolvido pela API. */
export interface ScreenPrintingBlockResponse {
  automatic: boolean
  squareSetupMinutes: number
  screenSetupMinutes: number
  washMinutesPerColor: number
  wasteSheetsPerColor: number
  minFormat: ScreenPrintingFormatPointResponse
  maxFormat: ScreenPrintingFormatPointResponse
  belowMinSpeedReducerPercent: number
  aboveMaxSpeedReducerPercent: number
}

/**
 * Corpo de POST/PUT /screen-printing-machines. Tem os esquadros frontal e lateral (gripMm), mas
 * NÃO há "limite máximo de mancha" nem alimentador (a máquina é manual).
 */
export interface ScreenPrintingMachineRequest {
  customerId: number
  machineType: 'SCREEN_PRINTING'
  name: string
  active?: boolean
  formatRange: FormatRangeRequest
  gripMm: number
  hourlyCost: string
  supplyTransportTimeMinutes: number
  screenPrinting: ScreenPrintingBlockRequest
}

/** Máquina de serigrafia devolvida por GET/{id}, POST e PUT. */
export interface ScreenPrintingMachine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  formatRange: FormatRangeResponse
  gripMm: number
  hourlyCost: number
  supplyTransportTimeMinutes: number
  screenPrinting: ScreenPrintingBlockResponse | null
}

// ---------- Furadeira (HOLE_PUNCHING) ----------
/**
 * A furadeira se parece com a guilhotina: guarda os tempos unitários usados pelo orçamento. O
 * setup do esquadro é aplicado 1x a cada furo; a descida da broca e o movimento de papel, 1x a
 * cada descida. Possui alimentador (altura máxima da pilha). Sem margens/cores/quebra/rampa.
 */
export interface HolePunchingBlock {
  /** Setup do esquadro (min) — 1x a cada furo. */
  squareSetupMinutes: number
  /** Tempo (s) de uma descida da broca — 1x a cada descida. */
  drillDescentTimeSeconds: number
  /** Tempo (s) de movimentação do papel na broca — 1x a cada descida. */
  paperMovementTimeSeconds: number
  /** Tempo (s) para carregar a pilha de papel (uma alimentação). */
  feedTimeSecondsPerLoad: number
}

/** Corpo de POST/PUT /hole-punching-machines. Sem margem da pinça; alimentador opcional. */
export interface HolePunchingMachineRequest {
  customerId: number
  machineType: 'HOLE_PUNCHING'
  name: string
  active?: boolean
  formatRange: FormatRangeRequest
  paperFeeder: PaperFeeder | null
  hourlyCost: string
  supplyTransportTimeMinutes: number
  holePunching: HolePunchingBlock
}

/** Máquina de furadeira devolvida por GET/{id}, POST e PUT. */
export interface HolePunchingMachine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  formatRange: FormatRangeResponse
  paperFeeder: PaperFeeder | null
  hourlyCost: number
  supplyTransportTimeMinutes: number
  holePunching: HolePunchingBlock | null
}

// ---------- Plastificadora / Laminadora (LAMINATING) ----------
/**
 * A plastificadora funciona com um rolo: 1 folha por vez, com velocidade em metros por minuto.
 * Guarda o tempo de setup e a velocidade; o tempo de rodagem (que depende do comprimento das
 * folhas) é calculado no orçamento. É manual: sem alimentador, margem da pinça, cores ou quebra.
 */
export interface LaminatingBlock {
  /** Tempo de setup da máquina (min) — 1x. */
  setupMinutes: number
  /** Velocidade de laminação em metros por minuto (> 0) — string decimal. */
  speedMetersPerMinute: string
}

/** Faixa de largura aceita (a plastificadora é contínua — não há comprimento). */
export interface LaminatingWidthRangeRequest {
  minWidthMm: number
  maxWidthMm: number
}

/** Corpo de POST/PUT /laminating-machines. Máquina contínua (só largura), sem pinça nem alimentador. */
export interface LaminatingMachineRequest {
  customerId: number
  machineType: 'LAMINATING'
  name: string
  active?: boolean
  widthRange: LaminatingWidthRangeRequest
  hourlyCost: string
  supplyTransportTimeMinutes: number
  laminating: LaminatingBlock
}

/** Bloco plastificadora devolvido pela API (velocidade como número). */
export interface LaminatingBlockResponse {
  setupMinutes: number
  speedMetersPerMinute: number
}

/** Faixa de largura devolvida pela API (a máquina é contínua — não há comprimento). */
export interface LaminatingWidthRangeResponse {
  minWidth: FormattedDimension
  maxWidth: FormattedDimension
}

/** Máquina de plastificadora devolvida por GET/{id}, POST e PUT. */
export interface LaminatingMachine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  widthRange: LaminatingWidthRangeResponse
  hourlyCost: number
  supplyTransportTimeMinutes: number
  laminating: LaminatingBlockResponse | null
}

// ---------- Dobradeira (FOLDING) ----------
/**
 * A dobradeira dobra o papel por BOLSAS (paralelas e cruzadas). A velocidade parte da máxima e é
 * reduzida por bolsa usada, gramatura e formato fora do ideal, limitada à mínima. Tem alimentador,
 * espessura máxima de papel, quebra de acerto e movimentação de saída por maço.
 */

/** Ponto do formato ideal — request (dimensões em mm). */
export interface FoldingFormatPointRequest {
  widthMm: number
  lengthMm: number
}

/** Bloco dobradeira — request (dimensões em mm; percentuais como string). */
export interface FoldingBlockRequest {
  parallelPockets: number
  crossPockets: number
  /** Setup de bolsa (min) — por bolsa usada. */
  pocketSetupMinutes: number
  /** Redutor (%) de velocidade por bolsa usada. */
  perPocketSpeedReducerPercent: string
  paperFeedSetupMinutes: number
  feedTimeSecondsPerLoad: number
  feedLoadIncrementMm: number
  minSpeedSheetsPerHour: number
  maxSpeedSheetsPerHour: number
  /** Espessura máxima do papel que passa pelas bolsas (microns). */
  maxPaperThicknessMicrons: number
  idealWeightMinGsm: number
  idealWeightMaxGsm: number
  belowIdealWeightReducerPercent: string
  aboveIdealWeightReducerPercent: string
  minFormat: FoldingFormatPointRequest
  maxFormat: FoldingFormatPointRequest
  belowMinFormatReducerPercent: string
  aboveMaxFormatReducerPercent: string
  /** Quebra de acerto fixa (folhas). */
  setupWasteSheets: number
  /** Movimentação de saída (min) por maço. */
  outputMovementMinutesPerBundle: number
  outputBundleSheets: number
}

/** Ponto do formato ideal devolvido pela API (dimensões formatadas). */
export interface FoldingFormatPointResponse {
  width: FormattedDimension
  length: FormattedDimension
}

/** Bloco dobradeira devolvido pela API (percentuais como número). */
export interface FoldingBlockResponse {
  parallelPockets: number
  crossPockets: number
  pocketSetupMinutes: number
  perPocketSpeedReducerPercent: number
  paperFeedSetupMinutes: number
  feedTimeSecondsPerLoad: number
  feedLoadIncrementMm: number
  minSpeedSheetsPerHour: number
  maxSpeedSheetsPerHour: number
  maxPaperThicknessMicrons: number
  idealWeightMinGsm: number
  idealWeightMaxGsm: number
  belowIdealWeightReducerPercent: number
  aboveIdealWeightReducerPercent: number
  minFormat: FoldingFormatPointResponse
  maxFormat: FoldingFormatPointResponse
  belowMinFormatReducerPercent: number
  aboveMaxFormatReducerPercent: number
  setupWasteSheets: number
  outputMovementMinutesPerBundle: number
  outputBundleSheets: number
}

/** Corpo de POST/PUT /folding-machines. Sem margem da pinça; alimentador obrigatório. */
export interface FoldingMachineRequest {
  customerId: number
  machineType: 'FOLDING'
  name: string
  active?: boolean
  formatRange: FormatRangeRequest
  paperFeeder: PaperFeeder | null
  hourlyCost: string
  supplyTransportTimeMinutes: number
  folding: FoldingBlockRequest
}

/** Máquina de dobradeira devolvida por GET/{id}, POST e PUT. */
export interface FoldingMachine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  formatRange: FormatRangeResponse
  paperFeeder: PaperFeeder | null
  hourlyCost: number
  supplyTransportTimeMinutes: number
  folding: FoldingBlockResponse | null
}

// ---------- Picotadeira / Serrilhadeira (PERFORATING) ----------
/**
 * A picotadeira faz PICOTES (serrilhas) no papel. Cada máquina tem uma quantidade de FERRAMENTAS
 * de picote (toolCount) — cada picote usa uma ferramenta; no orçamento só se pode pedir até essa
 * quantidade. A velocidade parte da máxima e é reduzida por gramatura e formato fora do ideal,
 * limitada à mínima. Tem alimentador e retirada na mesa de saída por altura da pilha. Sem pinça.
 */

/** Ponto do formato ideal — request (dimensões em mm). */
export interface PerforatingFormatPointRequest {
  widthMm: number
  lengthMm: number
}

/** Bloco picotadeira — request (dimensões em mm; percentuais como string). */
export interface PerforatingBlockRequest {
  /** Quantidade de ferramentas de picote (capacidade) — cada picote usa 1 ferramenta. */
  toolCount: number
  /** Setup de cada ferramenta (min) — por ferramenta/picote usado. */
  toolSetupMinutes: number
  feedTimeSecondsPerLoad: number
  feedLoadIncrementMm: number
  minSpeedSheetsPerHour: number
  maxSpeedSheetsPerHour: number
  minWeightGsm: number
  maxWeightGsm: number
  idealWeightMinGsm: number
  idealWeightMaxGsm: number
  belowIdealWeightReducerPercent: string
  aboveIdealWeightReducerPercent: string
  minFormat: PerforatingFormatPointRequest
  maxFormat: PerforatingFormatPointRequest
  belowMinFormatReducerPercent: string
  aboveMaxFormatReducerPercent: string
  /** Retirada na mesa de saída (min) por cada 10 cm de altura da pilha. */
  outputRemovalMinutesPer10Cm: number
}

/** Ponto do formato ideal devolvido pela API (dimensões formatadas). */
export interface PerforatingFormatPointResponse {
  width: FormattedDimension
  length: FormattedDimension
}

/** Bloco picotadeira devolvido pela API (percentuais como número). */
export interface PerforatingBlockResponse {
  toolCount: number
  toolSetupMinutes: number
  feedTimeSecondsPerLoad: number
  feedLoadIncrementMm: number
  minSpeedSheetsPerHour: number
  maxSpeedSheetsPerHour: number
  minWeightGsm: number
  maxWeightGsm: number
  idealWeightMinGsm: number
  idealWeightMaxGsm: number
  belowIdealWeightReducerPercent: number
  aboveIdealWeightReducerPercent: number
  minFormat: PerforatingFormatPointResponse
  maxFormat: PerforatingFormatPointResponse
  belowMinFormatReducerPercent: number
  aboveMaxFormatReducerPercent: number
  outputRemovalMinutesPer10Cm: number
}

/** Corpo de POST/PUT /perforating-machines. Sem margem da pinça; alimentador obrigatório. */
export interface PerforatingMachineRequest {
  customerId: number
  machineType: 'PERFORATING'
  name: string
  active?: boolean
  formatRange: FormatRangeRequest
  paperFeeder: PaperFeeder | null
  hourlyCost: string
  supplyTransportTimeMinutes: number
  perforating: PerforatingBlockRequest
}

/** Máquina de picotadeira devolvida por GET/{id}, POST e PUT. */
export interface PerforatingMachine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  formatRange: FormatRangeResponse
  paperFeeder: PaperFeeder | null
  hourlyCost: number
  supplyTransportTimeMinutes: number
  perforating: PerforatingBlockResponse | null
}

// ---------- Impressora Digital (DIGITAL) ----------
/**
 * A digital tem velocidade da matriz de formato (rampa) limitada por um envelope mín/máx. No
 * orçamento informam-se o tipo de impressão (traço/imagem) e a cobertura (%): cada tipo tem, a
 * 100%, um consumo de toner (g/m²) e um redutor de velocidade (%). Tem borda neutra (gripMm),
 * alimentador, limites de gramatura/espessura e quebra fixa.
 */

/** Modo de cor da máquina. */
export type DigitalColorMode = 'MONOCOLOR' | 'COLOR'

/** Ponto da matriz — request (dimensões em mm + velocidade). */
export interface DigitalFormatPointRequest {
  widthMm: number
  lengthMm: number
  sheetsPerHour: number
}

/** Cobertura por tipo de impressão — request (valores a 100%, como string). */
export interface DigitalCoverageRequest {
  tonerGramsPerSquareMeterAt100: string
  speedReducerPercentAt100: string
}

/** Bloco digital — request (dimensões em mm; percentuais/consumo como string). */
export interface DigitalBlockRequest {
  colorMode: DigitalColorMode
  setupMinutes: number
  paperFeedSetupMinutes: number
  feedTimeSecondsPerLoad: number
  feedLoadIncrementMm: number
  minSpeedSheetsPerHour: number
  maxSpeedSheetsPerHour: number
  minFormat: DigitalFormatPointRequest
  maxFormat: DigitalFormatPointRequest
  belowMinFormatReducerPercent: string
  aboveMaxFormatReducerPercent: string
  minWeightGsm: number
  maxWeightGsm: number
  maxThicknessMicrons: number
  wasteSheets: number
  lineCoverage: DigitalCoverageRequest
  imageCoverage: DigitalCoverageRequest
}

/** Ponto da matriz devolvido pela API. */
export interface DigitalFormatPointResponse {
  width: FormattedDimension
  length: FormattedDimension
  sheetsPerHour: number
}

/** Cobertura por tipo devolvida pela API (valores a 100%, como número). */
export interface DigitalCoverageResponse {
  tonerGramsPerSquareMeterAt100: number
  speedReducerPercentAt100: number
}

/** Bloco digital devolvido pela API. */
export interface DigitalBlockResponse {
  colorMode: DigitalColorMode
  setupMinutes: number
  paperFeedSetupMinutes: number
  feedTimeSecondsPerLoad: number
  feedLoadIncrementMm: number
  minSpeedSheetsPerHour: number
  maxSpeedSheetsPerHour: number
  minFormat: DigitalFormatPointResponse
  maxFormat: DigitalFormatPointResponse
  belowMinFormatReducerPercent: number
  aboveMaxFormatReducerPercent: number
  minWeightGsm: number
  maxWeightGsm: number
  maxThicknessMicrons: number
  wasteSheets: number
  lineCoverage: DigitalCoverageResponse
  imageCoverage: DigitalCoverageResponse
}

/** Corpo de POST/PUT /digital-machines. Tem borda neutra (gripMm); alimentador obrigatório. */
export interface DigitalMachineRequest {
  customerId: number
  machineType: 'DIGITAL'
  name: string
  active?: boolean
  formatRange: FormatRangeRequest
  gripMm: number
  paperFeeder: PaperFeeder | null
  hourlyCost: string
  supplyTransportTimeMinutes: number
  digital: DigitalBlockRequest
}

/** Máquina de impressora digital devolvida por GET/{id}, POST e PUT. */
export interface DigitalMachine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  formatRange: FormatRangeResponse
  gripMm: number
  paperFeeder: PaperFeeder | null
  hourlyCost: number
  supplyTransportTimeMinutes: number
  digital: DigitalBlockResponse | null
}

/** Máquina completa devolvida por GET/{id}, POST e PUT. */
export interface Machine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  formatRange: FormatRangeResponse
  gripMargins: GripMargins
  paperFeeder: PaperFeeder | null
  hourlyCost: number
  supplyTransportTimeMinutes: number
  offset: OffsetBlock | null
}

/** Máquina de corte (guilhotina) devolvida por GET/{id}, POST e PUT. */
export interface CuttingMachine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  formatRange: FormatRangeResponse
  paperFeeder: PaperFeeder | null
  hourlyCost: number
  supplyTransportTimeMinutes: number
  guillotine: GuillotineBlock | null
}

/** Item da grid paginada (GET /printing-machines/page). */
export interface MachinePageItem {
  id: number
  name: string
  machineType: MachineType
  active: boolean
  hourlyCost: number
}

export interface MachinePage {
  items: MachinePageItem[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

/** Item do seletor enxuto (GET /printing-machines). */
export interface MachineKeyValue {
  id: number
  value: string
  machineType: MachineType
  active: boolean
}
