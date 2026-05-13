import type { MeasurementUnit } from './MeasurementUnit'

/** Configurações persistidas em customer_settings. */
export interface CustomerSettings {
  customerId: number
  measurementUnit: MeasurementUnit
}

/** Payload de PUT /customers/{customerId}/settings. */
export interface UpdateCustomerSettingsRequest {
  measurementUnit: MeasurementUnit
}
