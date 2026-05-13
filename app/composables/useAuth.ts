/**
 * Composable de autenticação — isola as chamadas a /users e /auth/login.
 *
 * Encapsula a lógica de gravar a sessão no Pinia após o login,
 * mantendo as páginas focadas em UI.
 */
import type { RegisterUserRequest } from '@/types/RegisterUserRequest'
import type { LoginRequest } from '@/types/LoginRequest'
import type { LoginResponse } from '@/types/LoginResponse'
import type { Person } from '@/types/Person'
import { useAuthStore } from '@/stores/auth'
import { useCustomers } from '@/composables/useCustomers'

export function useAuth() {
  const api = useApi()
  const auth = useAuthStore()
  const { listCustomers, syncActiveCompanySettings } = useCustomers()

  /** POST /users — cadastra uma pessoa física com role USER. */
  async function registerUser(payload: RegisterUserRequest): Promise<Person> {
    return await api<Person>('/users', {
      method: 'POST',
      body: payload,
    })
  }

  /**
   * POST /auth/login — autentica, grava a sessão na store e, se o usuário já
   * tiver vínculo com empresas (role CUSTOMER ou ADMIN), carrega a lista e
   * sincroniza a unidade de medida da empresa ativa.
   */
  async function login(payload: LoginRequest): Promise<LoginResponse> {
    const response = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: payload,
    })
    auth.setSession(response)

    // Apenas usuários com role CUSTOMER ou ADMIN podem listar /customers.
    if (auth.hasCustomer || auth.isAdmin) {
      try {
        await listCustomers()
        // listCustomers auto-seleciona quando há apenas uma empresa; nesse caso
        // já sincronizamos as settings para deixar a sessão pronta.
        if (auth.activeCompanyId) await syncActiveCompanySettings()
      } catch (_err) {
        // Não bloqueia o login; o seletor pode tentar recarregar depois.
      }
    }

    return response
  }

  /** Limpa a sessão local. Não há endpoint server-side de logout (JWT stateless). */
  function logout() {
    auth.clear()
  }

  return {
    registerUser,
    login,
    logout,
  }
}
