import type { MeasurementUnit } from './MeasurementUnit'

/**
 * Dimensão devolvida pela API com a unidade já aplicada (camada OUT).
 *
 * - `value`: valor convertido para a unidade configurada da empresa.
 * - `unit`: unidade em que `value` está expresso.
 * - `millimeters`: representação canônica (sempre em milímetros), usada como
 *   fonte de verdade para conversões locais e re-envio em formulários.
 */
export interface FormattedDimension {
  value: number
  unit: MeasurementUnit
  millimeters: number
}
