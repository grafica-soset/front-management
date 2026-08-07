/**
 * Rótulos do cadastro de atividades (028/029; tipos reestruturados na 032 — ajuste 0004).
 */
import type {
  ActivityFinishingSubtype,
  ActivityType,
  ConsumptionBasis,
  PrintingInkKind,
} from '@/types/Activity'
import type { SupplyUnitOfMeasure } from '@/types/Supply'

export const ACTIVITY_TYPES: ActivityType[] = ['MANUAL', 'PRINTING', 'CUTTING', 'FINISHING', 'PACKAGING']

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  MANUAL: 'Manual',
  PRINTING: 'Impressão',
  CUTTING: 'Corte',
  FINISHING: 'Acabamento',
  PACKAGING: 'Empacotamento',
}

/** Uma frase por tipo, mostrada abaixo do seletor para orientar quem cadastra. */
export const ACTIVITY_TYPE_HINTS: Record<ActivityType, string> = {
  MANUAL: 'Só nome e custo por hora. O orçamento pergunta quantas horas serão usadas.',
  PRINTING: 'A tinta de cada face é informada no orçamento — aqui entram o tipo de tinta e as impressoras que fazem a atividade.',
  CUTTING: 'Executada por guilhotina — marque todas que fazem o corte e o orçamento escolhe a de melhor preço. Não consome insumo.',
  FINISHING: 'Feita à mão, por um acabamento cadastrado ou por uma máquina. Pode consumir um insumo.',
  PACKAGING: 'Usa a família de papéis do pacote (a mesma do cadastro de papéis) e a tarefa de acabamento Empacotar.',
}

/** Subtipo do acabamento — o antigo "tipo" da atividade. */
export const ACTIVITY_FINISHING_SUBTYPES: ActivityFinishingSubtype[] = ['MANUAL', 'FINISHING_TASK', 'AUTOMATED']

export const ACTIVITY_FINISHING_SUBTYPE_LABELS: Record<ActivityFinishingSubtype, string> = {
  MANUAL: 'Manual',
  FINISHING_TASK: 'Atividade de acabamento',
  AUTOMATED: 'Automatizada',
}

export const ACTIVITY_FINISHING_SUBTYPE_HINTS: Record<ActivityFinishingSubtype, string> = {
  MANUAL: 'Feita à mão: o custo é o valor da hora-homem.',
  FINISHING_TASK: 'Executada por um acabamento cadastrado, de onde vem o custo. Empacotar não entra aqui — é o tipo Empacotamento.',
  AUTOMATED: 'Executada por uma máquina (grampeadeira, furadeira, picotadeira...), de onde vem o custo.',
}

/** Tipo de tinta da atividade de impressão. */
export const PRINTING_INK_KINDS: PrintingInkKind[] = ['CMYK', 'PANTONE', 'SCREEN_PRINTING']

export const PRINTING_INK_KIND_LABELS: Record<PrintingInkKind, string> = {
  CMYK: 'CMYK (seleção de cores)',
  PANTONE: 'Pantone (cor especial)',
  SCREEN_PRINTING: 'Serigrafia',
}

/** Base geométrica do consumo de insumo. */
export const CONSUMPTION_BASES: ConsumptionBasis[] = ['UNIT', 'AREA_M2', 'LINEAR_M']

export const CONSUMPTION_BASIS_LABELS: Record<ConsumptionBasis, string> = {
  UNIT: 'Por unidade',
  AREA_M2: 'Por metro quadrado',
  LINEAR_M: 'Por metro linear',
}

/**
 * Rótulo curto e estático da unidade de medida de um grupo de insumo (para exibir ao lado da
 * quantidade de consumo). Unidades espaciais ficam genéricas aqui (a unidade da empresa é resolvida
 * em telas específicas de insumo).
 */
export const SUPPLY_UNIT_SHORT_LABELS: Record<SupplyUnitOfMeasure, string> = {
  UNIT: 'un',
  KILOGRAM: 'kg',
  GRAM: 'g',
  LITER: 'L',
  MILLILITER: 'mL',
  LINEAR: 'linear',
  AREA: 'área',
  VOLUME: 'volume',
  SHEET: 'folha',
}
