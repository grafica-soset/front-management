import { defineStore } from 'pinia'

/**
 * Sessão do usuário logado.
 * Mantida em cookie pelo `pinia-plugin-persistedstate` (configurado no
 * nuxt.config.ts), assim sobrevive a refresh e SSR.
 *
 * O fluxo de login real ainda não foi integrado — esta store já existe
 * para alimentar o topbar e o botão de logout do layout.
 */

export interface SessionUser {
  id: number
  name: string
  username: string
  role: string
}

interface SessionState {
  user: SessionUser | null
  token: string | null
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    user: null,
    token: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    displayName: (state) => state.user?.name ?? 'Usuário',
  },
  actions: {
    setSession(payload: { user: SessionUser, token: string }) {
      this.user = payload.user
      this.token = payload.token
    },
    logout() {
      this.user = null
      this.token = null
    },
  },
  persist: true,
})
