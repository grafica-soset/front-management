import type { MeasurementUnit } from './MeasurementUnit'

/** Configurações persistidas em customer_settings. */
export interface CustomerSettings {
  customerId: number
  measurementUnit: MeasurementUnit
  /** URL da logo (atividade 038) — cabeçalho da proposta impressa. */
  logoUrl?: string | null
}

/** Payload de PUT /customers/{customerId}/settings. */
export interface UpdateCustomerSettingsRequest {
  measurementUnit: MeasurementUnit
}

/** Payload de PUT /customers/{customerId}/logo. Nulo remove a logo. */
export interface UpdateCustomerLogoRequest {
  logoUrl: string | null
}
