import type { MeasurementUnit } from './MeasurementUnit'

/** Configurações persistidas em customer_settings. */
export interface CustomerSettings {
  customerId: number
  measurementUnit: MeasurementUnit
  /** URL da logo (atividade 038) — cabeçalho da proposta impressa. */
  logoUrl?: string | null
  /** Taxa de manutenção da faca de corte e vinco, em R$ (atividade 046) — cobrada quando a faca é do cliente. */
  dieMaintenanceFee?: number
}

/** Payload de PUT /customers/{customerId}/settings. */
export interface UpdateCustomerSettingsRequest {
  measurementUnit: MeasurementUnit
  /** Taxa de manutenção da faca de corte e vinco, em R$. Ausente = mantém a atual. */
  dieMaintenanceFee?: number
}

/** Payload de PUT /customers/{customerId}/logo. Nulo remove a logo. */
export interface UpdateCustomerLogoRequest {
  logoUrl: string | null
}
