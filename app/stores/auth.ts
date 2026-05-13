import { defineStore } from 'pinia'
import type { GlobalRole } from '@/types/Person'
import type { LoginResponse } from '@/types/LoginResponse'
import type { CustomerKeyValue } from '@/types/CustomerKeyValue'
import type { MeasurementUnit } from '@/types/MeasurementUnit'

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
  /** Empresas (tenants) que o usuário pode acessar — vindas de GET /customers. */
  companies: CustomerKeyValue[]
  /** ID da empresa atualmente selecionada (multi-tenant). */
  activeCompanyId: number | null
  /** Unidade de medida da empresa ativa — usada pelo useUnitConverter. */
  activeMeasurementUnit: MeasurementUnit
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
    companies: [],
    activeCompanyId: null,
    activeMeasurementUnit: 'MILLIMETER',
  }),

  getters: {
    isAuthenticated: (state): boolean => Boolean(state.token && state.user),
    /** Indica se o usuário já vinculou ao menos uma empresa (role global CUSTOMER). */
    hasCustomer: (state): boolean => state.user?.roles?.includes('CUSTOMER') ?? false,
    /** Empresa atualmente selecionada (ou null). */
    activeCompany: (state): CustomerKeyValue | null =>
      state.companies.find((c) => c.id === state.activeCompanyId) ?? null,
    /** Atalho para o usuário ser ADMIN global. */
    isAdmin: (state): boolean => state.user?.roles?.includes('ADMIN') ?? false,
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

    /** Substitui a lista de empresas e mantém ou redefine a ativa. */
    setCompanies(companies: CustomerKeyValue[]) {
      this.companies = companies
      // Se a empresa ativa não existir mais (ex.: usuário perdeu acesso), descarta a seleção.
      if (this.activeCompanyId && !companies.some((c) => c.id === this.activeCompanyId)) {
        this.activeCompanyId = null
        this.activeMeasurementUnit = 'MILLIMETER'
      }
      // Auto-seleciona quando há apenas uma empresa disponível.
      if (!this.activeCompanyId && companies.length === 1) {
        this.activeCompanyId = companies[0]!.id
      }
    },

    setActiveCompany(companyId: number | null) {
      this.activeCompanyId = companyId
      // Reset da unidade até carregar as settings da nova empresa.
      this.activeMeasurementUnit = 'MILLIMETER'
    },

    setActiveMeasurementUnit(unit: MeasurementUnit) {
      this.activeMeasurementUnit = unit
    },

    clear() {
      this.token = null
      this.user = null
      this.companies = []
      this.activeCompanyId = null
      this.activeMeasurementUnit = 'MILLIMETER'
    },
  },

  persist: true,
})
