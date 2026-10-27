import type { MeasurementUnit } from './MeasurementUnit'

/** Configurações persistidas em customer_settings. */
export interface CustomerSettings {
  customerId: number
  measurementUnit: MeasurementUnit
  /** URL da logo (atividade 038) — cabeçalho da proposta impressa. */
  logoUrl?: string | null
  /** Texto do cabeçalho da proposta (linhas, **negrito**, *itálico*). Nulo = montado do cadastro. */
  proposalHeader?: string | null
  /** Taxa de manutenção da faca de corte e vinco, em R$ (atividade 046) — cobrada quando a faca é do cliente. */
  dieMaintenanceFee?: number
}

/** Payload de PUT /customers/{customerId}/settings. */
export interface UpdateCustomerSettingsRequest {
  measurementUnit: MeasurementUnit
  /** Taxa de manutenção da faca de corte e vinco, em R$. Ausente = mantém a atual. */
  dieMaintenanceFee?: number
}

/**
 * Payload de PUT /customers/{customerId}/proposal-header. Logo nula remove; texto nulo volta ao
 * cabeçalho montado do cadastro.
 */
export interface UpdateProposalHeaderRequest {
  logoUrl: string | null
  headerText: string | null
}
