<script setup lang="ts">
/**
 * Seletor de empresa (tenant) — dropdown no header do layout administrativo.
 *
 * - Lista as empresas vindas de GET /customers (carregadas na store).
 * - Permite trocar a activeCompany; ao trocar, sincroniza as settings (unidade
 *   de medida) e recarrega a página para que telas dependentes de tenant
 *   reconsultem os dados do contexto correto.
 */
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCustomers } from '@/composables/useCustomers'
import { usePapersStore } from '@/stores/papers'

const auth = useAuthStore()
const papersStore = usePapersStore()
const { listCustomers, syncActiveCompanySettings } = useCustomers()

const isOpen = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const companies = computed(() => auth.companies)
const activeCompany = computed(() => auth.activeCompany)
const activeLabel = computed(() => activeCompany.value?.value ?? 'Selecionar empresa')

const refresh = async () => {
  loading.value = true
  error.value = null
  try {
    await listCustomers()
    if (auth.activeCompanyId) await syncActiveCompanySettings()
  } catch (_err) {
    error.value = 'Falha ao carregar empresas.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Garante uma lista atualizada quando o usuário expande o header.
  if (auth.companies.length === 0) refresh()
})

const toggle = () => {
  isOpen.value = !isOpen.value
}

const closeOnOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.company-switcher')) isOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', closeOnOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeOnOutside)
})

const selectCompany = async (id: number) => {
  if (id === auth.activeCompanyId) {
    isOpen.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    // Limpa caches específicos do tenant antes de trocar (papers, vínculos).
    papersStore.clear()
    auth.setActiveCompany(id)
    await syncActiveCompanySettings()
    isOpen.value = false
    // Recarrega a rota corrente para que páginas dependentes de tenant
    // refaçam suas chamadas com o novo contexto.
    await reloadNuxtApp({ force: true })
  } catch (_err) {
    error.value = 'Falha ao trocar de empresa.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="company-switcher relative">
    <button
      type="button"
      @click="toggle"
      class="flex items-center gap-2 max-w-[14rem] sm:max-w-xs px-3 py-1.5 text-sm font-medium text-white bg-indigo-700/40 hover:bg-indigo-700/70 rounded-lg ring-1 ring-indigo-400/40 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300"
      :disabled="loading"
    >
      <svg class="w-4 h-4 flex-shrink-0 text-indigo-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
      <span class="truncate">{{ loading ? 'Carregando...' : activeLabel }}</span>
      <svg class="w-4 h-4 flex-shrink-0 text-indigo-100" :class="{ 'rotate-180': isOpen }" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
    </button>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-show="isOpen"
        class="absolute right-0 mt-2 z-50 w-72 bg-white rounded-lg shadow-xl ring-1 ring-slate-900/5 divide-y divide-slate-100 dark:bg-slate-800 dark:divide-slate-700"
      >
        <div class="py-2 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-t-lg">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Empresas</p>
        </div>

        <div class="max-h-72 overflow-y-auto py-1">
          <p v-if="error" class="px-4 py-3 text-xs text-rose-600">{{ error }}</p>
          <p v-else-if="companies.length === 0" class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
            Nenhuma empresa disponível.
          </p>
          <button
            v-for="company in companies"
            :key="company.id"
            type="button"
            @click="selectCompany(company.id)"
            class="w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-slate-700"
            :class="company.id === auth.activeCompanyId ? 'bg-indigo-50 text-indigo-700 dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'"
          >
            <span class="truncate">{{ company.value }}</span>
            <svg
              v-if="company.id === auth.activeCompanyId"
              class="w-4 h-4 flex-shrink-0 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </button>
        </div>

        <div class="py-1">
          <NuxtLink
            to="/settings/company"
            @click="isOpen = false"
            class="block py-2 px-4 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-indigo-300 transition-colors"
          >
            Configurações da empresa
          </NuxtLink>
          <button
            type="button"
            @click="refresh"
            class="block w-full text-left py-2 px-4 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          >
            Atualizar lista
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
