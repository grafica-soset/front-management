/**
 * Unidade de medida configurada por empresa.
 *
 * Valor canônico no banco é sempre MILLIMETER; a unidade aqui controla apenas
 * a apresentação (saída) — conferir DimensionFormatter no backend.
 */
export type MeasurementUnit = 'MILLIMETER' | 'CENTIMETER' | 'METER'

export const MEASUREMENT_UNITS: MeasurementUnit[] = ['MILLIMETER', 'CENTIMETER', 'METER']

/** Rótulo curto exibido em formulários e UI (ex.: "mm", "cm", "m"). */
export const MEASUREMENT_UNIT_SHORT: Record<MeasurementUnit, string> = {
  MILLIMETER: 'mm',
  CENTIMETER: 'cm',
  METER: 'm',
}

/** Rótulo extenso para selects e títulos. */
export const MEASUREMENT_UNIT_LABEL: Record<MeasurementUnit, string> = {
  MILLIMETER: 'Milímetros (mm)',
  CENTIMETER: 'Centímetros (cm)',
  METER: 'Metros (m)',
}
