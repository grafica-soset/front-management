import type { Person } from './Person'
import type { CustomerSettings } from './CustomerSettings'

/** Resposta de GET /customers/{customerId}/properties. */
export interface CustomerProperties {
  id: number
  person: Person
  active: boolean
  settings: CustomerSettings
}
