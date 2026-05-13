import { defineStore } from 'pinia'
import type { GlobalRole } from '@/types/Person'
import type { LoginResponse } from '@/types/LoginResponse'

/**
 * Sessão do usuário autenticado.
 * Persistida via cookies (cf. piniaPluginPersistedstate em nuxt.config) para
 * sobreviver a refresh e ficar disponível também no SSR.
 */
interface SessionUser {
  personId: number
  name: string
  roles: GlobalRole[]
}

interface AuthState {
  token: string | null
  user: SessionUser | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
  }),

  getters: {
    isAuthenticated: (state): boolean => Boolean(state.token && state.user),
    /** Indica se o usuário já vinculou ao menos uma empresa (role global CUSTOMER). */
    hasCustomer: (state): boolean => state.user?.roles?.includes('CUSTOMER') ?? false,
  },

  actions: {
    setSession(payload: LoginResponse) {
      this.token = payload.token
      this.user = {
        personId: payload.personId,
        name: payload.name,
        roles: payload.roles,
      }
    },

    /** Adiciona uma role global ao usuário logado (ex.: CUSTOMER após criar empresa). */
    addRole(role: GlobalRole) {
      if (!this.user) return
      if (!this.user.roles.includes(role)) {
        this.user = { ...this.user, roles: [...this.user.roles, role] }
      }
    },

    clear() {
      this.token = null
      this.user = null
    },
  },

  persist: true,
})
