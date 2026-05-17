/**
 * Composable de gestão de usuários da empresa.
 *
 * Encapsula os endpoints /customer-users (cf. .docs/customer-users.md):
 *  - GET    /customer-users           → listagem enxuta (KeyValue, somente ativos).
 *  - GET    /customer-users/page      → listagem paginada (ativos e inativos).
 *  - POST   /customer-users           → cadastra usuário interno da empresa.
 *  - PATCH  /customer-users/{id}/deactivate → desativa o vínculo.
 *  - PUT    /customer-users/{id}/password   → admin redefine a senha.
 *
 * O header `X-Customer-Id` é injetado automaticamente pelo `useApi`
 * a partir da empresa ativa.
 */
import type {
  CreateCustomerUserRequest,
  CreateCustomerUserResponse,
  CustomerUserKeyValue,
  CustomerUserLinkSummary,
  CustomerUserPage,
  ResetCustomerUserPasswordRequest,
} from '@/types/CustomerUser'

interface ListPageOptions {
  page?: number
  size?: number
}

export function useCustomerUsers() {
  const api = useApi()

  async function listKeyValues(): Promise<CustomerUserKeyValue[]> {
    return await api<CustomerUserKeyValue[]>('/customer-users')
  }

  async function listPage(options: ListPageOptions = {}): Promise<CustomerUserPage> {
    const query: Record<string, number> = {}
    if (options.page !== undefined) query.page = options.page
    if (options.size !== undefined) query.size = options.size
    return await api<CustomerUserPage>('/customer-users/page', { query })
  }

  async function createUser(payload: CreateCustomerUserRequest): Promise<CreateCustomerUserResponse> {
    return await api<CreateCustomerUserResponse>('/customer-users', {
      method: 'POST',
      body: payload,
    })
  }

  async function deactivateUser(linkId: number): Promise<CustomerUserLinkSummary> {
    return await api<CustomerUserLinkSummary>(`/customer-users/${linkId}/deactivate`, {
      method: 'PATCH',
    })
  }

  async function resetPassword(
    linkId: number,
    payload: ResetCustomerUserPasswordRequest,
  ): Promise<void> {
    await api(`/customer-users/${linkId}/password`, {
      method: 'PUT',
      body: payload,
    })
  }

  return {
    listKeyValues,
    listPage,
    createUser,
    deactivateUser,
    resetPassword,
  }
}
