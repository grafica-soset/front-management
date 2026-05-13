/**
 * Resposta de GET /customers — contrato KeyValue (id + label exibível).
 *
 * Usado para popular o seletor de empresa (tenant) no frontend.
 */
export interface CustomerKeyValue {
  id: number
  value: string
}
