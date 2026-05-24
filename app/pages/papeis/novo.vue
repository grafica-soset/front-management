<script setup lang="ts">
/**
 * Cadastro de um Agrupamento de medidas em 2 etapas:
 *  1. Dados do agrupamento: nome, gramatura, espessura, lado do papel.
 *  2. Primeiras dimensões (SKUs) do agrupamento recém-criado.
 *
 * O agrupamento é criado ao concluir a etapa 1 (POST /paper-types); a etapa 2
 * já opera sobre ele persistido, adicionando as dimensões.
 */
import { computed, ref } from 'vue'
import PaperTypeForm from '@/components/forms/PaperTypeForm.vue'
import PaperDimensionsManager from '@/components/PaperDimensionsManager.vue'
import { usePaperTypes } from '@/composables/usePaperTypes'
import { useToast } from '@/composables/useToast'
import { extractApiError } from '@/utils/apiError'
import type { PaperType } from '@/types/PaperType'

definePageMeta({ middleware: 'auth' })

const toast = useToast()
const { createPaperType } = usePaperTypes()

const step = ref<1 | 2>(1)
const createdFamily = ref<PaperType | null>(null)

const loading = ref(false)
const serverError = ref<string | null>(null)

const steps = computed(() => [
  { n: 1, label: 'Dados do agrupamento' },
  { n: 2, label: 'Dimensões' },
])

const handleFamilySubmit = async (payload: {
  name: string
  description: string | null
  weightPerM2Grams: number
  thicknessMicrometers: number
  bothSidesEqual: boolean
}) => {
  loading.value = true
  serverError.value = null
  try {
    createdFamily.value = await createPaperType({
      name: payload.name,
      description: payload.description,
      weightPerM2Grams: payload.weightPerM2Grams,
      thicknessMicrometers: payload.thicknessMicrometers,
      bothSidesEqual: payload.bothSidesEqual,
    })
    toast.success('Agrupamento de medidas criado. Agora adicione as primeiras dimensões.')
    step.value = 2
  } catch (err) {
    serverError.value = extractApiError(err, 'Falha ao cadastrar o agrupamento de medidas.')
  } finally {
    loading.value = false
  }
}

const finish = () => navigateTo('/papeis')
</script>

<template>
  <div class="mx-auto w-full max-w-4xl space-y-6">
    <header>
      <NuxtLink to="/papeis" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Voltar para a lista
      </NuxtLink>
      <h1 class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Novo agrupamento de medidas</h1>
    </header>

    <!-- Stepper -->
    <ol class="flex items-center gap-3">
      <li v-for="(s, i) in steps" :key="s.n" class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors"
            :class="step >= s.n
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'"
          >
            {{ s.n }}
          </span>
          <span
            class="text-sm font-medium"
            :class="step >= s.n ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
          >
            {{ s.label }}
          </span>
        </div>
        <span v-if="i < steps.length - 1" class="h-px w-8 bg-slate-300 dark:bg-slate-600" />
      </li>
    </ol>

    <!-- Etapa 1: dados do agrupamento -->
    <div v-if="step === 1" class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
      <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Defina os atributos do agrupamento. Eles são compartilhados por todas as dimensões.
      </p>
      <PaperTypeForm
        :loading="loading"
        :server-error="serverError"
        @submit="handleFamilySubmit"
        @cancel="navigateTo('/papeis')"
      />
    </div>

    <!-- Etapa 2: primeiras dimensões -->
    <template v-else-if="createdFamily">
      <div class="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200">
        Agrupamento <strong>{{ createdFamily.name }}</strong> criado. Adicione as primeiras dimensões abaixo — você pode incluir quantas quiser.
      </div>

      <PaperDimensionsManager :family="createdFamily" />

      <div class="flex justify-end gap-3">
        <NuxtLink
          :to="`/papeis/${createdFamily.id}`"
          class="text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
        >
          Abrir agrupamento
        </NuxtLink>
        <button
          type="button"
          @click="finish"
          class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-2.5 shadow-md shadow-indigo-500/20"
        >
          Concluir
        </button>
      </div>
    </template>
  </div>
</template>
