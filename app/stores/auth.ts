import { defineStore } from 'pinia'
import type { UserResponse } from '~/types/user'

interface AuthState {
  token: string | null
  user: UserResponse | null
}

interface LoginPayload {
  username: string
  password: string
}

interface LoginResponse {
  token: string
  user: UserResponse
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
  }),

  getters: {
    isAuthenticated: (state): boolean => Boolean(state.token),
    displayName: (state): string => state.user?.person?.name ?? state.user?.username ?? 'Usuário',
  },

  actions: {
    async login(payload: LoginPayload): Promise<void> {
      const data = await $fetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: payload,
      })
      this.token = data.token
      this.user = data.user
    },

    logout(): void {
      this.token = null
      this.user = null
    },
  },

  // Persistência via cookies (configuração global em nuxt.config.ts).
  persist: true,
})
