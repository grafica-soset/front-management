/**
 * Rótulos do cadastro de atividades (028/029; tipos reestruturados na 032 — ajustes 0004 e 0006).
 */
import type {
  ActivityFinishingSubtype,
  ActivitySupplySource,
  ActivityType,
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
  PRINTING: 'A tinta de cada face e a taxa de cobertura são informadas no orçamento — aqui entram o tipo de tinta e as impressoras que fazem a atividade.',
  CUTTING: 'Executada por guilhotina — marque todas que fazem o corte e o orçamento escolhe a de melhor preço. Não consome insumo.',
  FINISHING: 'Feita à mão, por um acabamento cadastrado ou por uma máquina. Pode consumir um ou mais insumos.',
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

/** De onde vem o item consumido: um grupo de insumos ou um item do estoque. */
export const ACTIVITY_SUPPLY_SOURCES: ActivitySupplySource[] = ['SUPPLY_GROUP', 'SUPPLY']

export const ACTIVITY_SUPPLY_SOURCE_LABELS: Record<ActivitySupplySource, string> = {
  SUPPLY_GROUP: 'Grupo de insumos',
  SUPPLY: 'Item do estoque',
}

export const ACTIVITY_SUPPLY_SOURCE_HINTS: Record<ActivitySupplySource, string> = {
  SUPPLY_GROUP: 'A atividade consome a família toda (ex.: "Grampos") e o orçamento escolhe o insumo do grupo.',
  SUPPLY: 'A atividade consome este insumo específico (ex.: "Cola Branca 1kg"), sem escolha no orçamento.',
}

/**
 * Rótulo curto e estático da unidade de medida de um grupo/insumo — é ela que diz COMO o item é
 * consumido (unitário, linear, por área...), já que a atividade não repete mais essa informação.
 * Unidades espaciais ficam genéricas aqui (a unidade da empresa é resolvida em telas específicas
 * de insumo).
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
