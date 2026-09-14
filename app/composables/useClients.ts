import type {
  Client,
  ClientAddressInput,
  ClientContactInput,
  ClientKeyValue,
  ClientPage,
  ClientStatusFilter,
  RegisterClientRequest,
  UpdateClientRequest,
} from '@/types/Client'
import { useAuthStore } from '@/stores/auth'
import { createTenantBoundClientApi } from '@/utils/clientRequestScope'

interface ClientPageOptions {
  page?: number
  size?: number
  search?: string
  status?: ClientStatusFilter
}

export function useClients() {
  const api = useApi()
  const auth = useAuthStore()
  const request = createTenantBoundClientApi(api, () => auth.activeCompanyId)

  const list = () => request<ClientKeyValue[]>('/clients')

  const listPage = (options: ClientPageOptions = {}) => request<ClientPage>('/clients/page', {
    query: {
      page: options.page ?? 0,
      size: options.size ?? 20,
      search: options.search || undefined,
      status: options.status ?? 'ALL',
    },
  })

  const getById = (clientId: number) => request<Client>(`/clients/${clientId}`)
  const create = (payload: RegisterClientRequest) => request<Client>('/clients', { method: 'POST', body: payload })
  const update = (clientId: number, payload: UpdateClientRequest) =>
    request<Client>(`/clients/${clientId}`, { method: 'PUT', body: payload })
  const activate = (clientId: number) => request<Client>(`/clients/${clientId}/activate`, { method: 'PATCH' })
  const deactivate = (clientId: number) => request<Client>(`/clients/${clientId}/deactivate`, { method: 'PATCH' })

  const addAddress = (clientId: number, payload: ClientAddressInput) =>
    request<Client>(`/clients/${clientId}/addresses`, { method: 'POST', body: payload })
  const updateAddress = (clientId: number, addressId: number, payload: ClientAddressInput) =>
    request<Client>(`/clients/${clientId}/addresses/${addressId}`, { method: 'PUT', body: payload })
  const removeAddress = (clientId: number, addressId: number) =>
    request<Client>(`/clients/${clientId}/addresses/${addressId}`, { method: 'DELETE' })

  const addContact = (clientId: number, payload: ClientContactInput) =>
    request<Client>(`/clients/${clientId}/contacts`, { method: 'POST', body: payload })
  const updateContact = (clientId: number, contactId: number, payload: ClientContactInput) =>
    request<Client>(`/clients/${clientId}/contacts/${contactId}`, { method: 'PUT', body: payload })
  const removeContact = (clientId: number, contactId: number) =>
    request<Client>(`/clients/${clientId}/contacts/${contactId}`, { method: 'DELETE' })

  return {
    list,
    listPage,
    getById,
    create,
    update,
    activate,
    deactivate,
    addAddress,
    updateAddress,
    removeAddress,
    addContact,
    updateContact,
    removeContact,
  }
}
