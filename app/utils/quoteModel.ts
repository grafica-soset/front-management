/**
 * MODELO DO ORÇAMENTO NO CLIENTE (atividade 034).
 *
 * Só o que é ESTRUTURA: rótulos, quantas folhas cada via/lâmina/capa consome, e as regras de
 * "esta folha entra nesta impressão?". Nada de preço — quem calcula é o motor, em
 * `POST /quotes/calculate`.
 */
import type { PrintingSheetSetup, QuoteProduct, QuoteSheet, QuoteStep } from '@/types/QuoteDraft'
import type { ProductCostingResponse } from '@/types/Quote'
import type { MachineKeyValue } from '@/types/Machine'
import type { SupplyKeyValue } from '@/types/Supply'

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
 * Quantas folhas desta via/lâmina/capa a encomenda consome.
 *
 * É aqui que jogos × vias aparece: cada via entra UMA VEZ POR JOGO, então um bloco de 50 jogos
 * consome 50 folhas de cada via — e a quantidade multiplica isso. Capa e lâmina entram uma vez por
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

/**
 * Um formato sempre aparece com o SEU NÚMERO: "32x22 (F9)".
 *
 * O número é o que manda no cálculo — é dele que saem as aplicações por folha e as descidas de faca
 * —, e é por ele que a gráfica se refere ao formato. O tamanho sozinho não diz em quantas partes a
 * folha inteira foi dividida.
 */
export function formatLabel(name: string, formatNumber: number): string {
  return `${name} (F${formatNumber})`
}

/**
 * TIRAGEM: o total de folhas IMPRESSAS do produto, somando todas as vias/lâminas e capas.
 *
 * É o termo do métier gráfico, e não se confunde com a QUANTIDADE encomendada nem com as folhas do
 * produto: 10 blocos de 50 jogos com 2 vias são 1.000 folhas do produto, mas o formato de impressão
 * comporta 4 aplicações — 125 folhas por via, 250 de tiragem.
 *
 * Conta as folhas líquidas, sem a quebra de acerto: a quebra é papel que a máquina come, não
 * trabalho entregue.
 */
export function printRun(cost: ProductCostingResponse | null | undefined): number {
  if (!cost) return 0
  return cost.sheets.reduce((total, sheet) => total + sheet.chosen.printSheetsNet, 0)
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
 * AS CHAPAS QUE A IMPRESSÃO PODE USAR (atividade 034): as chapas da impressora escolhida.
 *
 * Não é "toda chapa do tipo que a máquina aceita" — é a lista que a própria impressora declara no
 * cadastro dela. A chapa é comprada para a máquina, e a de outra não entra nesta; oferecer o estoque
 * inteiro era oferecer matriz que aquela impressora não usa.
 *
 * A digital não usa matriz: devolve vazio, e a tela não pergunta nada.
 */
export function platesForMachine(
  machine: MachineKeyValue | undefined,
  plates: SupplyKeyValue[]
): SupplyKeyValue[] {
  if (!machine || machine.machineType === 'DIGITAL') return []
  const daMaquina = machine.plateSupplyIds ?? []
  return plates.filter((plate) => daMaquina.includes(plate.id))
}

/** Formatação monetária em reais — usada em toda a tela de orçamento. */
export function brl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** "Chapa CTP 66x96 — R$ 40,00": o nome não decide nada na escolha da chapa; o preço decide. */
export function plateLabel(plate: SupplyKeyValue): string {
  return plate.unitCost == null ? plate.value : `${plate.value} — ${brl(plate.unitCost)}`
}
