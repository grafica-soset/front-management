/**
 * Composable de empresas (tenants) — encapsula GET /customers,
 * GET /customers/{id}/properties e PUT /customers/{id}/settings.
 *
 * Cuida da sincronização com a store de auth (lista de empresas, empresa ativa
 * e unidade de medida ativa).
 */
import type { CustomerKeyValue } from '@/types/CustomerKeyValue'
import type { CustomerProperties } from '@/types/CustomerProperties'
import type { CustomerSettings, UpdateCustomerSettingsRequest } from '@/types/CustomerSettings'
import { useAuthStore } from '@/stores/auth'

export function useCustomers() {
  const api = useApi()
  const auth = useAuthStore()

  /**
   * GET /customers — lista todas as empresas que o usuário pode acessar.
   * Atualiza a store; se houver apenas uma, ela vira a ativa automaticamente.
   */
  async function listCustomers(): Promise<CustomerKeyValue[]> {
    const companies = await api<CustomerKeyValue[]>('/customers')
    auth.setCompanies(companies)
    return companies
  }

  /** GET /customers/{id}/properties — devolve dados e settings da empresa. */
  async function getCustomerProperties(customerId: number): Promise<CustomerProperties> {
    return await api<CustomerProperties>(`/customers/${customerId}/properties`)
  }

  /**
   * PUT /customers/{id}/settings — persiste a unidade de medida da empresa.
   *
   * Quando a empresa alterada é a ativa, sincroniza activeMeasurementUnit
   * para que o useUnitConverter passe a usar a nova unidade imediatamente.
   */
  async function updateCustomerSettings(
    customerId: number,
    payload: UpdateCustomerSettingsRequest,
  ): Promise<CustomerSettings> {
    const settings = await api<CustomerSettings>(`/customers/${customerId}/settings`, {
      method: 'PUT',
      body: payload,
    })
    if (auth.activeCompanyId === customerId) {
      auth.setActiveMeasurementUnit(settings.measurementUnit)
    }
    return settings
  }

  /**
   * Carrega as configurações da empresa ativa e popula activeMeasurementUnit
   * na store. Chamar após login e em troca de empresa.
   */
  async function syncActiveCompanySettings(): Promise<CustomerProperties | null> {
    if (!auth.activeCompanyId) return null
    const properties = await getCustomerProperties(auth.activeCompanyId)
    auth.setActiveMeasurementUnit(properties.settings.measurementUnit)
    return properties
  }

  return {
    listCustomers,
    getCustomerProperties,
    updateCustomerSettings,
    syncActiveCompanySettings,
  }
}
