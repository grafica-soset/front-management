/**
 * DADOS E CÁLCULO DE DEMONSTRAÇÃO DO ORÇAMENTO (atividade 034) — PROTÓTIPO.
 *
 * ⚠️ Nada aqui fala com a API. Estes catálogos e esta conta existem para as telas ficarem
 * navegáveis e para discutirmos LAYOUT e USABILIDADE com números que reagem ao que o usuário
 * digita. O motor real substitui este arquivo quando o backend estiver pronto.
 *
 * A conta é deliberadamente simples e legível (encaixe na folha, folhas líquidas, quebra por
 * passada, hora-máquina). Ela NÃO reproduz um motor de verdade: não avalia conversões de formato,
 * não escolhe o papel mais barato dentro da família e não considera insumos das etapas.
 */
import type { PrintingSheetSetup, ProductCost, QuoteProduct, QuoteSheet, QuoteStep } from '@/types/QuoteDraft'

// ─── Catálogos de demonstração ───────────────────────────────────────────────

export interface DemoPaperType {
  id: number
  name: string
  weightGsm: number
  /** Preço por folha-mãe, em reais. */
  sheetPrice: number
  /** Papel fino demais transparece: a impressão dos 2 lados fica bloqueada no passo 3. */
  allowsBothSides: boolean
  /**
   * Absorção de tinta em g/m² para 100% de cobertura. É o TOTAL que o papel bebe, não por cor:
   * as cores dividem essa gramatura entre si. Papel poroso (jornal) bebe mais que revestido
   * (couché) — é o cadastro que a 032 (ajuste 0001) criou na família.
   */
  inkAbsorptionGsm: number
}

export const DEMO_PAPER_TYPES: DemoPaperType[] = [
  { id: 1, name: 'Off-set 56g/m²', weightGsm: 56, sheetPrice: 0.42, allowsBothSides: true, inkAbsorptionGsm: 1.2 },
  { id: 2, name: 'Off-set 75g/m²', weightGsm: 75, sheetPrice: 0.58, allowsBothSides: true, inkAbsorptionGsm: 1.1 },
  { id: 3, name: 'Jornal 49g/m²', weightGsm: 49, sheetPrice: 0.31, allowsBothSides: true, inkAbsorptionGsm: 1.8 },
  { id: 4, name: 'Couché 115g/m²', weightGsm: 115, sheetPrice: 0.94, allowsBothSides: true, inkAbsorptionGsm: 0.7 },
  { id: 5, name: 'Cartão 250g/m²', weightGsm: 250, sheetPrice: 1.85, allowsBothSides: true, inkAbsorptionGsm: 0.9 },
  { id: 6, name: 'Seda 20g/m²', weightGsm: 20, sheetPrice: 0.24, allowsBothSides: false, inkAbsorptionGsm: 2.1 },
]

export interface DemoInk {
  id: number
  name: string
  kind: 'CMYK' | 'PANTONE' | 'LINE'
  /** Preço do quilo da tinta. */
  pricePerKg: number
}

export const DEMO_INKS: DemoInk[] = [
  { id: 11, pricePerKg: 78.0, name: 'Ciano (processo)', kind: 'CMYK' },
  { id: 12, pricePerKg: 82.0, name: 'Magenta (processo)', kind: 'CMYK' },
  { id: 13, pricePerKg: 74.0, name: 'Amarelo (processo)', kind: 'CMYK' },
  { id: 14, pricePerKg: 62.0, name: 'Preto (processo)', kind: 'CMYK' },
  { id: 15, pricePerKg: 58.0, name: 'Preto Traço', kind: 'LINE' },
  { id: 16, pricePerKg: 145.0, name: 'Pantone 485C', kind: 'PANTONE' },
  { id: 17, pricePerKg: 152.0, name: 'Pantone Reflex Blue', kind: 'PANTONE' },
]

export interface DemoMachine {
  id: number
  name: string
  type: 'OFFSET' | 'DIGITAL'
  /** Castelos: quantas cores a máquina imprime por passada. */
  towers: number
  /** Folha de impressão que a máquina roda, em mm. */
  sheetWidthMm: number
  sheetHeightMm: number
  /** Nome comercial da folha, para exibir "Folha selecionada". */
  sheetLabel: string
  hourlyCost: number
  /** Folhas de acerto perdidas por passada. */
  wastePerPass: number
  /** Folhas por hora. */
  sheetsPerHour: number
  /** Custo de uma matriz (chapa). A digital não usa. */
  plateCost: number
  /** Tintas que a máquina aceita — trocar de máquina pode invalidar a seleção. */
  inkIds: number[]
}

export const DEMO_MACHINES: DemoMachine[] = [
  {
    id: 101,
    name: 'Sakurai 58 Monocolor',
    type: 'OFFSET',
    towers: 1,
    sheetWidthMm: 470,
    sheetHeightMm: 660,
    sheetLabel: '47x66 (Off-set 56g)',
    hourlyCost: 97.41,
    wastePerPass: 50,
    sheetsPerHour: 5000,
    plateCost: 18.9,
    inkIds: [11, 12, 13, 14, 15, 16, 17],
  },
  {
    id: 102,
    name: 'Heidelberg GTO 52',
    type: 'OFFSET',
    towers: 2,
    sheetWidthMm: 350,
    sheetHeightMm: 520,
    sheetLabel: '35x52 (Off-set 56g)',
    hourlyCost: 120.0,
    wastePerPass: 60,
    sheetsPerHour: 7000,
    plateCost: 15.4,
    inkIds: [11, 12, 13, 14, 15],
  },
  {
    id: 103,
    name: 'Komori Lithrone 26',
    type: 'OFFSET',
    towers: 4,
    sheetWidthMm: 480,
    sheetHeightMm: 660,
    sheetLabel: '48x66 (Off-set 56g)',
    hourlyCost: 189.0,
    wastePerPass: 80,
    sheetsPerHour: 10000,
    plateCost: 22.5,
    inkIds: [11, 12, 13, 14, 16, 17],
  },
  {
    id: 104,
    name: 'Xerox Versant 180 (Digital)',
    type: 'DIGITAL',
    towers: 4,
    sheetWidthMm: 330,
    sheetHeightMm: 480,
    sheetLabel: '33x48 (Off-set 56g)',
    hourlyCost: 150.0,
    wastePerPass: 5,
    sheetsPerHour: 3600,
    plateCost: 0,
    inkIds: [11, 12, 13, 14],
  },
]

/** O que a etapa pergunta no passo 3. */
export type DemoParamKind = 'NONE' | 'HOURS' | 'PRINTING' | 'STAPLES' | 'HOLES' | 'FOLDS' | 'NUMBERING'

export interface DemoActivity {
  id: number
  name: string
  type: 'MANUAL' | 'PRINTING' | 'CUTTING' | 'FINISHING' | 'PACKAGING'
  paramKind: DemoParamKind
  /** Custo por hora-homem (MANUAL) ou hora-máquina (demais). */
  hourlyCost: number
  /** Minutos fixos por mil peças — aproximação de demonstração para as etapas automáticas. */
  minutesPerThousand: number
  /** Por que a etapa não pergunta nada (exibido no passo 3). */
  autoNote?: string
}

export const DEMO_ACTIVITIES: DemoActivity[] = [
  { id: 1, name: 'Arte', type: 'MANUAL', paramKind: 'HOURS', hourlyCost: 90, minutesPerThousand: 0 },
  {
    id: 2,
    name: 'Primeiro Corte',
    type: 'CUTTING',
    paramKind: 'NONE',
    hourlyCost: 65,
    minutesPerThousand: 6,
    autoNote: 'O número de cortes sai do encaixe na folha — calculado pelo sistema.',
  },
  { id: 3, name: 'Impressão CMYK', type: 'PRINTING', paramKind: 'PRINTING', hourlyCost: 0, minutesPerThousand: 0 },
  { id: 4, name: 'Impressão 1x0 (Traço)', type: 'PRINTING', paramKind: 'PRINTING', hourlyCost: 0, minutesPerThousand: 0 },
  {
    id: 5,
    name: 'Intercalação de Vias',
    type: 'FINISHING',
    paramKind: 'NONE',
    hourlyCost: 48,
    minutesPerThousand: 22,
    autoNote: 'O tempo vem da tarefa de acabamento cadastrada e do número de vias.',
  },
  {
    id: 6,
    name: 'Blocagem',
    type: 'FINISHING',
    paramKind: 'NONE',
    hourlyCost: 48,
    minutesPerThousand: 18,
    autoNote: 'O tempo vem da tarefa de Colagem de Blocos/Talões.',
  },
  {
    id: 7,
    name: 'Refile',
    type: 'CUTTING',
    paramKind: 'NONE',
    hourlyCost: 65,
    minutesPerThousand: 5,
    autoNote: 'As descidas de guilhotina saem da grade de encaixe — calculado pelo sistema.',
  },
  {
    id: 8,
    name: 'Empacotar 2 Kg',
    type: 'PACKAGING',
    paramKind: 'NONE',
    hourlyCost: 42,
    minutesPerThousand: 12,
    autoNote: 'O papel do pacote e o tempo vêm do cadastro da atividade.',
  },
  { id: 9, name: 'Grampear', type: 'FINISHING', paramKind: 'STAPLES', hourlyCost: 55, minutesPerThousand: 14 },
  { id: 10, name: 'Furação', type: 'FINISHING', paramKind: 'HOLES', hourlyCost: 55, minutesPerThousand: 11 },
  { id: 11, name: 'Dobra', type: 'FINISHING', paramKind: 'FOLDS', hourlyCost: 60, minutesPerThousand: 9 },
  { id: 12, name: 'Numeração', type: 'FINISHING', paramKind: 'NUMBERING', hourlyCost: 70, minutesPerThousand: 16 },
  { id: 13, name: 'Acabamento Manual', type: 'MANUAL', paramKind: 'HOURS', hourlyCost: 45, minutesPerThousand: 0 },
]

export const ACTIVITY_TYPE_LABEL: Record<DemoActivity['type'], string> = {
  MANUAL: 'Manual',
  PRINTING: 'Impressão',
  CUTTING: 'Corte',
  FINISHING: 'Acabamento',
  PACKAGING: 'Empacotamento',
}

export function findActivity(id: number): DemoActivity | undefined {
  return DEMO_ACTIVITIES.find((a) => a.id === id)
}

export function findMachine(id: number | null): DemoMachine | undefined {
  return id == null ? undefined : DEMO_MACHINES.find((m) => m.id === id)
}

export function findPaperType(id: number | null): DemoPaperType | undefined {
  return id == null ? undefined : DEMO_PAPER_TYPES.find((p) => p.id === id)
}

// ─── Estrutura do produto ────────────────────────────────────────────────────

/** Rótulo da folha: "Via 1", "Lâmina 2", "Capa 1". */
export function sheetLabel(sheet: QuoteSheet): string {
  const prefix = sheet.kind === 'VIA' ? 'Via' : sheet.kind === 'BLADE' ? 'Lâmina' : 'Capa'
  return `${prefix} ${sheet.index}`
}

/** Cores no formato que a gráfica usa: 4x0, 1x1. */
export function colorsLabel(setup: PrintingSheetSetup): string {
  return `${setup.frontColors}x${setup.backColors}`
}

/** Cobertura das faces impressas, no formato "50%/20%" (só a frente quando o verso não roda). */
export function coverageLabel(setup: PrintingSheetSetup): string {
  const parts: string[] = []
  if (setup.frontColors > 0) parts.push(setup.frontCoverage == null ? '—' : `${setup.frontCoverage}%`)
  if (setup.backColors > 0) parts.push(setup.backCoverage == null ? '—' : `${setup.backCoverage}%`)
  return parts.length ? `cobertura ${parts.join('/')}` : ''
}

/**
 * Faces impressas sem cobertura informada. A cobertura é obrigatória: sem ela não há como
 * dimensionar a tinta, e o orçamento sairia barato demais sem ninguém perceber.
 */
export function coverageIssues(setup: PrintingSheetSetup): string[] {
  const issues: string[] = []
  if (setup.frontColors > 0 && !setup.frontCoverage) issues.push('frente')
  if (setup.backColors > 0 && !setup.backCoverage) issues.push('verso')
  return issues
}

/** Configuração de uma folha numa etapa que ainda não a configurou. */
export function defaultSheetSetup(): PrintingSheetSetup {
  // Começa com a frente em 1 cor; quem não imprime esta folha nesta etapa zera as duas faces.
  // A cobertura nasce VAZIA: é obrigatória, e um default silencioso erraria a tinta do trabalho.
  return { frontColors: 1, backColors: 0, frontInkIds: [], backInkIds: [], frontCoverage: null, backCoverage: null }
}

/** O que a etapa faz com esta folha (zeros quando a etapa ainda não a configurou). */
export function setupFor(step: QuoteStep, sheet: QuoteSheet): PrintingSheetSetup {
  return (
    step.printing?.bySheet[sheet.uid] ??
    { frontColors: 0, backColors: 0, frontInkIds: [], backInkIds: [], frontCoverage: 0, backCoverage: 0 }
  )
}

/**
 * Quantas folhas desta via/lâmina/capa a tiragem consome.
 *
 * É aqui que jogos × vias aparece: cada via entra UMA VEZ POR JOGO, então um bloco de 50 jogos
 * consome 50 folhas de cada via — e a tiragem multiplica isso. Capa e lâmina entram uma vez por
 * unidade produzida.
 */
export function sheetsForSheet(product: QuoteProduct, sheet: QuoteSheet): number {
  const runs = product.quantity ?? 0
  if (sheet.kind === 'COVER') return runs
  if (product.structure === 'BLADE') return runs
  return runs * (product.sets || 0)
}

/**
 * A folha é impressa NESTA ETAPA? Cores zero nas duas faces significa que ela não passa pela
 * máquina desta vez — a via de papel colorido, a capa de trás em branco, ou uma via que não
 * recebe a segunda impressão.
 */
export function isSheetPrinted(sheet: QuoteSheet, setup: PrintingSheetSetup): boolean {
  return setup.frontColors + setup.backColors > 0
}

/** Faces efetivamente impressas, derivadas das cores (0 cores = face não roda). */
export function printedSides(setup: PrintingSheetSetup): number {
  return (setup.frontColors > 0 ? 1 : 0) + (setup.backColors > 0 ? 1 : 0)
}

/**
 * Pendências de tinta da folha nesta etapa: a quantidade de tintas escolhidas tem que bater com a
 * quantidade de cores de cada face. 4 cores na frente = 4 tintas na frente.
 */
export function inkIssues(setup: PrintingSheetSetup): string[] {
  const issues: string[] = []
  if (setup.frontColors !== setup.frontInkIds.length) {
    issues.push(`frente: ${setup.frontInkIds.length} de ${setup.frontColors} tinta(s)`)
  }
  if (setup.backColors !== setup.backInkIds.length) {
    issues.push(`verso: ${setup.backInkIds.length} de ${setup.backColors} tinta(s)`)
  }
  return issues
}

/** Folhas por unidade produzida (por bloco ou por peça). */
export function sheetsPerUnit(product: QuoteProduct): number {
  const covers = product.hasCovers ? product.coverCount || 0 : 0
  if (product.structure === 'BLADE') return (product.blades || 0) + covers
  return (product.sets || 0) * (product.vias || 0) + covers
}

/** Peças do formato final que cabem na folha da máquina, testando as duas orientações. */
export function piecesPerSheet(product: QuoteProduct, machine: DemoMachine): number {
  const w = product.widthMm ?? 0
  const h = product.heightMm ?? 0
  if (w <= 0 || h <= 0) return 0
  const straight = Math.floor(machine.sheetWidthMm / w) * Math.floor(machine.sheetHeightMm / h)
  const rotated = Math.floor(machine.sheetWidthMm / h) * Math.floor(machine.sheetHeightMm / w)
  return Math.max(straight, rotated)
}

/** Passadas necessárias: uma monocolor imprime 4 cores em 4 passadas. Face sem cor não roda. */
function passesFor(setup: PrintingSheetSetup, machine: DemoMachine): number {
  const front = Math.ceil(setup.frontColors / machine.towers)
  const back = Math.ceil(setup.backColors / machine.towers)
  return front + back
}

/** Etapas de impressão do produto, na ordem em que o usuário as ativou. */
export function printingSteps(product: QuoteProduct): QuoteStep[] {
  return product.steps.filter((step) => step.printing)
}

/** Impressora que a ETAPA atribui a uma folha, respeitando "por folha" e "capas à parte". */
export function machineForSheet(step: QuoteStep, sheet: QuoteSheet): number | null {
  const printing = step.printing
  if (!printing) return null
  if (sheet.kind === 'COVER' && printing.separateCovers) return printing.coverMachineId
  if (printing.perSheet) return printing.machineIdBySheet[sheet.uid] ?? null
  return printing.machineId
}

/**
 * Consumo de tinta de UMA face, em gramas, para a tiragem inteira daquela folha.
 *
 *   gramas = cobertura × absorção do papel (g/m²) × área da PEÇA FINAL (m²) × peças impressas
 *
 * Duas regras que vieram da gráfica e que é fácil errar:
 *
 * 1. A cobertura é sobre a ÁREA DA PEÇA FINAL, não sobre a folha que passa na máquina. "10% de
 *    cobertura" quer dizer 10% do 10×15 que o cliente recebe.
 * 2. As cores DIVIDEM a gramatura, não a multiplicam. Numa 4 cores, cada tinta leva 25% do que o
 *    papel absorve — o total depositado é o mesmo de uma cor só. O que muda com a quantidade de
 *    cores é o PREÇO, porque cada tinta custa o seu quilo.
 */
export function inkGramsForFace(
  product: QuoteProduct,
  sheet: QuoteSheet,
  machine: DemoMachine,
  colors: number,
  coveragePercent: number | null,
  sheetsRun: number,
): number {
  if (colors <= 0 || !coveragePercent || coveragePercent <= 0 || sheetsRun <= 0) return 0
  const absorption = findPaperType(sheet.paperTypeId)?.inkAbsorptionGsm ?? 0
  const pieceAreaM2 = ((product.widthMm ?? 0) * (product.heightMm ?? 0)) / 1_000_000
  // Peças impressas: cada folha que passa na máquina carrega a grade inteira de peças.
  const pieces = sheetsRun * piecesPerSheet(product, machine)
  return (coveragePercent / 100) * absorption * pieceAreaM2 * pieces
}

/**
 * Custo da tinta de uma face: a gramatura se divide igualmente entre as cores, e cada cor é
 * cobrada pelo preço do quilo da SUA tinta — 4 cores de processo custam menos que 4 pantones.
 */
export function inkCostForFace(grams: number, colors: number, inkIds: number[]): number {
  if (grams <= 0 || colors <= 0 || inkIds.length === 0) return 0
  const kgPerColor = grams / colors / 1000
  return inkIds.reduce((sum, id) => sum + kgPerColor * (DEMO_INKS.find((ink) => ink.id === id)?.pricePerKg ?? 0), 0)
}

/** Tintas que a impressora escolhida aceita — trocar de máquina pode derrubar a seleção. */
export function inksForMachine(machineId: number | null): DemoInk[] {
  const machine = findMachine(machineId)
  if (!machine) return DEMO_INKS
  return DEMO_INKS.filter((ink) => machine.inkIds.includes(ink.id))
}

// ─── Conta de demonstração ───────────────────────────────────────────────────

export interface MachineOption {
  machine: DemoMachine
  /** Custo da impressão de todas as folhas atribuídas a esta máquina. */
  total: number
  /** Folhas de acerto perdidas. */
  waste: number
  /** Minutos de máquina. */
  minutes: number
  /** Peças por folha no formato final. */
  piecesPerSheet: number
  /** Folhas compradas (líquidas + quebra). */
  sheets: number
  /** Cabe o formato final nesta máquina? */
  fits: boolean
}

/**
 * Compara as impressoras para um conjunto de folhas DENTRO DE UMA ETAPA de impressão. É o que
 * alimenta os cards de escolha de impressora: total, quebra, tempo e folha selecionada, ordenados
 * do mais barato.
 *
 * Folhas que esta etapa não imprime ficam de fora: elas não passam por esta máquina (o papel
 * delas continua sendo comprado, mas isso é conta do produto, não da escolha de máquina).
 */
export function machineOptions(product: QuoteProduct, step: QuoteStep, sheets: QuoteSheet[]): MachineOption[] {
  const printed = sheets.filter((sheet) => isSheetPrinted(sheet, setupFor(step, sheet)))
  if (printed.length === 0) return []

  return DEMO_MACHINES.map((machine) => {
    const fit = piecesPerSheet(product, machine)
    let total = 0
    let waste = 0
    let minutes = 0
    let bought = 0

    for (const sheet of printed) {
      const setup = setupFor(step, sheet)
      const needed = sheetsForSheet(product, sheet)
      if (fit <= 0 || needed <= 0) continue
      const passes = passesFor(setup, machine)
      const net = Math.ceil(needed / fit)
      const sheetWaste = machine.wastePerPass * passes
      const run = net + sheetWaste
      const paper = findPaperType(sheet.paperTypeId)

      waste += sheetWaste
      bought += run
      minutes += ((run * passes) / machine.sheetsPerHour) * 60
      total += ((run * passes) / machine.sheetsPerHour) * machine.hourlyCost
      total += run * (paper?.sheetPrice ?? 0)
      total += machine.plateCost * (setup.frontColors + setup.backColors)
    }

    return { machine, total, waste, minutes, piecesPerSheet: fit, sheets: bought, fits: fit > 0 }
  })
    .filter((option) => option.fits)
    .sort((a, b) => a.total - b.total)
}

/**
 * Máquina usada só como referência de ENCAIXE para folha que não vai ser impressa: ela continua
 * sendo cortada de uma folha-mãe, então ainda é preciso saber quantas peças saem de cada folha.
 */
function referenceMachine(product: QuoteProduct): DemoMachine | undefined {
  for (const step of printingSteps(product)) {
    const chosen = findMachine(step.printing?.machineId ?? null)
    if (chosen && piecesPerSheet(product, chosen) > 0) return chosen
  }
  return DEMO_MACHINES.filter((m) => piecesPerSheet(product, m) > 0).sort(
    (a, b) => piecesPerSheet(product, b) - piecesPerSheet(product, a),
  )[0]
}

/**
 * Custo do produto. Cada etapa de impressão é uma passada pela máquina, com o seu acerto, as suas
 * chapas e o seu tempo — e todas se somam.
 *
 * O PAPEL segue outra lógica, porque a folha é a mesma nas duas passadas: as folhas líquidas são
 * contadas UMA VEZ e cada impressão acrescenta só a sua QUEBRA. Duas impressões na mesma via não
 * dobram o papel do trabalho, mas custam dois acertos.
 */
export function estimateProductCost(product: QuoteProduct): ProductCost {
  const runs = product.quantity ?? 0
  const steps = printingSteps(product)
  const reference = referenceMachine(product)

  let paperCost = 0
  let plateCost = 0
  let printCost = 0
  let printMinutes = 0
  let totalSheets = 0
  let inkCost = 0
  let inkGrams = 0
  const machines = new Set<string>()

  // 1) Papel líquido: uma vez por folha do produto, impressa ou não.
  for (const sheet of product.sheets) {
    const needed = sheetsForSheet(product, sheet)
    const fit = reference ? piecesPerSheet(product, reference) : 0
    if (needed <= 0 || fit <= 0) continue
    const net = Math.ceil(needed / fit)
    totalSheets += net
    paperCost += net * (findPaperType(sheet.paperTypeId)?.sheetPrice ?? 0)
  }

  // 2) Cada impressão: quebra (papel), chapas, máquina e tempo.
  for (const step of steps) {
    for (const sheet of product.sheets) {
      const setup = setupFor(step, sheet)
      if (!isSheetPrinted(sheet, setup)) continue
      const machine = findMachine(machineForSheet(step, sheet))
      if (!machine) continue
      const fit = piecesPerSheet(product, machine)
      const needed = sheetsForSheet(product, sheet)
      if (fit <= 0 || needed <= 0) continue

      const passes = passesFor(setup, machine)
      const net = Math.ceil(needed / fit)
      const waste = machine.wastePerPass * passes
      const run = net + waste
      const hours = (run * passes) / machine.sheetsPerHour

      totalSheets += waste
      paperCost += waste * (findPaperType(sheet.paperTypeId)?.sheetPrice ?? 0)
      plateCost += machine.plateCost * (setup.frontColors + setup.backColors)
      printCost += hours * machine.hourlyCost
      printMinutes += hours * 60
      machines.add(machine.name)

      // Tinta: cada face gasta conforme a sua cobertura e as tintas escolhidas nela. A quebra
      // também é impressa, então entra no volume.
      const frontGrams = inkGramsForFace(product, sheet, machine, setup.frontColors, setup.frontCoverage, run)
      const backGrams = inkGramsForFace(product, sheet, machine, setup.backColors, setup.backCoverage, run)
      inkGrams += frontGrams + backGrams
      inkCost += inkCostForFace(frontGrams, setup.frontColors, setup.frontInkIds)
      inkCost += inkCostForFace(backGrams, setup.backColors, setup.backInkIds)
    }
  }

  // 3) Demais etapas: manual cobra as horas informadas; as outras, tempo por mil peças.
  let stepsCost = 0
  let stepsMinutes = 0
  for (const step of product.steps) {
    const activity = findActivity(step.activityId)
    if (!activity || activity.type === 'PRINTING') continue
    if (activity.paramKind === 'HOURS') {
      const hours = step.parameters.laborHours ?? 0
      stepsCost += hours * activity.hourlyCost
      stepsMinutes += hours * 60
      continue
    }
    const minutes = (runs / 1000) * activity.minutesPerThousand
    stepsCost += (minutes / 60) * activity.hourlyCost
    stepsMinutes += minutes
  }

  const impressoes = steps.length > 1 ? `${steps.length} impressões` : `${Math.round(printMinutes)} min de máquina`
  const lines = [
    { label: 'Papel', value: paperCost, detail: `${totalSheets.toLocaleString('pt-BR')} folhas compradas` },
    { label: 'Chapas', value: plateCost, detail: 'uma matriz por cor, por lado, por impressão' },
    { label: 'Impressão', value: printCost, detail: impressoes },
    { label: 'Tinta', value: inkCost, detail: `${(inkGrams / 1000).toFixed(2)} kg pela cobertura informada` },
    { label: 'Etapas', value: stepsCost, detail: `${product.steps.length} etapa(s) ativada(s)` },
  ]
  const total = lines.reduce((sum, line) => sum + line.value, 0)

  return {
    lines,
    total,
    unitCost: runs > 0 ? total / runs : 0,
    totalSheets,
    totalMinutes: printMinutes + stepsMinutes,
    machinesUsed: Array.from(machines),
  }
}

/** Formatação monetária em reais — usada em toda a tela de orçamento. */
export function brl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
