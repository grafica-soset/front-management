/**
 * Rótulos do cadastro de atividades (atividades 028/029).
 */
import type { ActivityType, ConsumptionBasis } from '@/types/Activity'
import type { SupplyUnitOfMeasure } from '@/types/Supply'

export const ACTIVITY_TYPES: ActivityType[] = ['MANUAL', 'AUTOMATED', 'FINISHING']

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  MANUAL: 'Manual',
  AUTOMATED: 'Automatizada',
  FINISHING: 'Acabamento',
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
