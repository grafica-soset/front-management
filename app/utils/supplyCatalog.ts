/**
 * Catálogo de rótulos e opções do módulo de Insumos (atividade 027).
 */
import type { SupplyType, SupplyUnitOfMeasure } from '@/types/Supply'
import type { MeasurementUnit } from '@/types/MeasurementUnit'

/** Tipos de insumo cadastráveis via /supplies (Papéis têm módulo próprio). */
export const SUPPLY_TYPES: SupplyType[] = ['INK', 'PLATE', 'OTHER']

export const SUPPLY_TYPE_LABELS: Record<SupplyType, string> = {
  INK: 'Tintas',
  PLATE: 'Chapas',
  OTHER: 'Outros',
}

/** Rótulo no singular (usado em formulários). */
export const SUPPLY_TYPE_SINGULAR: Record<SupplyType, string> = {
  INK: 'Tinta',
  PLATE: 'Chapa',
  OTHER: 'Outro insumo',
}

export const SUPPLY_UNITS: SupplyUnitOfMeasure[] = [
  'UNIT',
  'KILOGRAM',
  'GRAM',
  'LITER',
  'MILLILITER',
  'LINEAR',
  'AREA',
  'VOLUME',
  'SHEET',
]

/** Rótulos fixos (unidades não-espaciais). */
const FIXED_UNIT_LABELS: Partial<Record<SupplyUnitOfMeasure, string>> = {
  UNIT: 'Unitário',
  KILOGRAM: 'Peso (kg)',
  GRAM: 'Grama (g)',
  LITER: 'Litro (L)',
  MILLILITER: 'Mililitro (mL)',
  SHEET: 'Folha',
}

/** Nome da unidade espacial conforme a unidade de medida da empresa. */
const SPATIAL_UNIT_NOUN: Record<MeasurementUnit, { linear: string; area: string; volume: string }> = {
  MILLIMETER: { linear: 'Milímetro linear', area: 'Milímetro quadrado', volume: 'Milímetro cúbico' },
  CENTIMETER: { linear: 'Centímetro linear', area: 'Centímetro quadrado', volume: 'Centímetro cúbico' },
  METER: { linear: 'Metro linear', area: 'Metro quadrado', volume: 'Metro cúbico' },
}

/**
 * Rótulo de uma unidade de medida de insumo. As unidades espaciais (LINEAR/AREA/VOLUME) são
 * dinâmicas: seguem a unidade de medida configurada pela empresa (atividade 027).
 */
export function supplyUnitLabel(unit: SupplyUnitOfMeasure, measurementUnit: MeasurementUnit): string {
  const fixed = FIXED_UNIT_LABELS[unit]
  if (fixed) return fixed
  const spatial = SPATIAL_UNIT_NOUN[measurementUnit]
  if (unit === 'LINEAR') return spatial.linear
  if (unit === 'AREA') return spatial.area
  return spatial.volume
}

/**
 * Abas da listagem "por tipo" (atividade 027). Papéis vêm do módulo de Papéis já existente;
 * os demais vêm de `/supplies?type=…`.
 */
export interface SupplyTab {
  key: 'PAPER' | SupplyType
  label: string
  /** Rota do módulo de Papéis (aba Papéis) — as outras usam o filtro por type. */
  paperLink?: string
}

export const SUPPLY_TABS: SupplyTab[] = [
  { key: 'PAPER', label: 'Papéis', paperLink: '/papeis' },
  { key: 'INK', label: 'Tintas' },
  { key: 'PLATE', label: 'Chapas' },
  { key: 'OTHER', label: 'Outros' },
]
