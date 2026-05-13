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

export function useAuth() {
  const api = useApi()
  const auth = useAuthStore()

  /** POST /users — cadastra uma pessoa física com role USER. */
  async function registerUser(payload: RegisterUserRequest): Promise<Person> {
    return await api<Person>('/users', {
      method: 'POST',
      body: payload,
    })
  }

  /** POST /auth/login — autentica e grava a sessão na store. */
  async function login(payload: LoginRequest): Promise<LoginResponse> {
    const response = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: payload,
    })
    auth.setSession(response)
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
