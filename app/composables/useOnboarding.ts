/**
 * Composable do fluxo de onboarding — cadastro da empresa cliente.
 *
 * O JWT é injetado automaticamente pelo useApi(), portanto o chamador
 * só precisa estar autenticado.
 */
import type { CreateCustomerRequest } from '@/types/CreateCustomerRequest'
import type { CustomerResponse } from '@/types/CustomerResponse'
import { useAuthStore } from '@/stores/auth'

export function useOnboarding() {
  const api = useApi()
  const auth = useAuthStore()

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
    return response
  }

  return {
    createCustomer,
  }
}
