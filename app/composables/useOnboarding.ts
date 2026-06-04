/**
 * Composable do fluxo de onboarding — cadastro da empresa cliente.
 *
 * O JWT é injetado automaticamente pelo useApi(), portanto o chamador
 * só precisa estar autenticado.
 */
import type { CreateCustomerRequest } from '@/types/CreateCustomerRequest'
import type { CustomerResponse } from '@/types/CustomerResponse'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'
import { useCustomers } from '@/composables/useCustomers'

export function useOnboarding() {
  const api = useApi()
  const auth = useAuthStore()
  const { refresh } = useAuth()
  const { listCustomers, syncActiveCompanySettings } = useCustomers()

  /**
   * POST /customers — cria a empresa, vincula o usuário como ADMIN do tenant
   * e adiciona a role global CUSTOMER ao usuário autenticado.
   */
  async function createCustomer(payload: CreateCustomerRequest): Promise<CustomerResponse> {
    const response = await api<CustomerResponse>('/customers', {
      method: 'POST',
      body: payload,
    })
    // Reflete no estado local o efeito colateral server-side de ganhar a role CUSTOMER.
    auth.addRole('CUSTOMER')
    // O JWT atual foi emitido no login, ANTES de o usuário ganhar a role
    // CUSTOMER e o vínculo com a empresa. Como GET /customers exige essa role,
    // o token velho responde 403 (não 401, então o refresh transparente do
    // useApi não dispara). Renovamos a sessão para o novo access token já
    // carregar a role/vínculo — só então a listagem funciona neste 1º acesso.
    try {
      await refresh()
      await listCustomers()
      if (auth.activeCompanyId) await syncActiveCompanySettings()
    } catch (_err) {
      // Falha aqui não impede o onboarding; o switcher recarrega depois.
    }
    return response
  }

  return {
    createCustomer,
  }
}
