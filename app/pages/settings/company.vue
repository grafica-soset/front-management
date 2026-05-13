<script setup lang="ts">
/**
 * Página de configurações da empresa ativa.
 *
 * Acesso: usuário autenticado com vínculo ao tenant ativo (ADMIN global vê
 * qualquer empresa; demais usuários só veem aquelas a que estão vinculados —
 * a regra é aplicada server-side em GET /customers/{id}/properties).
 *
 * Hoje expõe apenas a unidade de medida; este é o ponto de extensão natural
 * para futuras settings de empresa.
 */
import { computed, ref, watch } from 'vue'
import MeasurementUnitForm from '@/components/forms/MeasurementUnitForm.vue'
import { useAuthStore } from '@/stores/auth'
import { useCustomers } from '@/composables/useCustomers'
import { extractApiError } from '@/utils/apiError'
import type { MeasurementUnit } from '@/types/MeasurementUnit'
import type { CustomerProperties } from '@/types/CustomerProperties'
import type { UpdateCustomerSettingsRequest } from '@/types/CustomerSettings'

definePageMeta({
  middleware: 'auth',
})

const auth = useAuthStore()
const { getCustomerProperties, updateCustomerSettings } = useCustomers()

const loadingProperties = ref(false)
const loadingSave = ref(false)
const loadError = ref<string | null>(null)
const saveError = ref<string | null>(null)
const saved = ref(false)
const properties = ref<CustomerProperties | null>(null)

const activeCompany = computed(() => auth.activeCompany)
const activeCompanyId = computed(() => auth.activeCompanyId)

const initialUnit = computed<MeasurementUnit | null>(
  () => properties.value?.settings.measurementUnit ?? null,
)

const loadProperties = async (customerId: number) => {
  loadingProperties.value = true
  loadError.value = null
  properties.value = null
  try {
    properties.value = await getCustomerProperties(customerId)
    // Mantém a store em sincronia com o que veio do servidor.
    auth.setActiveMeasurementUnit(properties.value.settings.measurementUnit)
  } catch (err) {
    loadError.value = extractApiError(err, 'Não foi possível carregar a empresa.')
  } finally {
    loadingProperties.value = false
  }
}

// Recarrega ao trocar de empresa ativa (cenário do CompanySwitcher também
// recarrega a rota, mas mantém o watch para edge cases — ex.: programaticamente).
watch(
  activeCompanyId,
  (id) => {
    saved.value = false
    saveError.value = null
    if (id) loadProperties(id)
  },
  { immediate: true },
)

const handleSubmit = async (payload: UpdateCustomerSettingsRequest) => {
  if (!activeCompanyId.value) return
  loadingSave.value = true
  saveError.value = null
  saved.value = false
  try {
    const settings = await updateCustomerSettings(activeCompanyId.value, payload)
    if (properties.value) {
      properties.value = { ...properties.value, settings }
    }
    saved.value = true
  } catch (err) {
    saveError.value = extractApiError(err, 'Não foi possível salvar as configurações.')
  } finally {
    loadingSave.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <header>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Configurações da empresa</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Ajustes aplicados ao tenant atualmente selecionado.
      </p>
    </header>

    <!-- Estado: nenhuma empresa selecionada -->
    <div
      v-if="!activeCompanyId"
      class="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300"
    >
      Selecione uma empresa no menu do topo para visualizar suas configurações.
    </div>

    <template v-else>
      <!-- Card da empresa -->
      <section class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
        <div v-if="loadingProperties" class="text-sm text-slate-500 dark:text-slate-400">
          Carregando dados da empresa...
        </div>

        <div
          v-else-if="loadError"
          class="text-sm rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300"
        >
          {{ loadError }}
        </div>

        <div v-else-if="properties" class="space-y-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Empresa</p>
            <p class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ properties.person.corporateName || properties.person.name }}
            </p>
            <p v-if="properties.person.corporateName && properties.person.name" class="text-sm text-slate-500 dark:text-slate-400">
              {{ properties.person.name }}
            </p>
          </div>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt class="text-slate-500 dark:text-slate-400">CNPJ</dt>
              <dd class="font-medium text-slate-900 dark:text-slate-200">{{ properties.person.document }}</dd>
            </div>
            <div>
              <dt class="text-slate-500 dark:text-slate-400">E-mail</dt>
              <dd class="font-medium text-slate-900 dark:text-slate-200">{{ properties.person.email || '—' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500 dark:text-slate-400">Telefone</dt>
              <dd class="font-medium text-slate-900 dark:text-slate-200">{{ properties.person.phone || '—' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500 dark:text-slate-400">Status</dt>
              <dd>
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="properties.active
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'"
                >
                  {{ properties.active ? 'Ativa' : 'Inativa' }}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- Card de unidade de medida -->
      <section class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
        <div class="mb-5">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">Unidade de medida</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            Como dimensões (largura, altura, comprimento) serão exibidas no sistema.
          </p>
        </div>

        <p v-if="loadingProperties" class="text-sm text-slate-500 dark:text-slate-400">
          Carregando configuração atual...
        </p>

        <MeasurementUnitForm
          v-else-if="!loadError"
          :initial="initialUnit"
          :loading="loadingSave"
          :server-error="saveError"
          :saved="saved"
          @submit="handleSubmit"
        />
      </section>
    </template>

    <p v-if="activeCompany" class="text-xs text-slate-400 dark:text-slate-500">
      Empresa ativa: <span class="font-medium">{{ activeCompany.value }}</span>
    </p>
  </div>
</template>
