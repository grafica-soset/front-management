<script setup lang="ts">
/**
 * Formulário reutilizável para escolha da unidade de medida da empresa.
 *
 * Recebe a unidade inicial via prop `initial` e emite `@submit` com o payload
 * pronto para o endpoint PUT /customers/{id}/settings. Sem lógica de API:
 * a página chamadora é quem orquestra a chamada (segue diretriz CLAUDE.md).
 */
import { reactive, ref, watch } from 'vue'
import { z } from 'zod'
import {
  MEASUREMENT_UNITS,
  MEASUREMENT_UNIT_LABEL,
  type MeasurementUnit,
} from '@/types/MeasurementUnit'
import type { UpdateCustomerSettingsRequest } from '@/types/CustomerSettings'

const props = defineProps<{
  /** Unidade já configurada — preenche o select ao montar e quando muda. */
  initial?: MeasurementUnit | null
  loading?: boolean
  serverError?: string | null
  /** Quando true, mostra estado de "Salvo com sucesso" abaixo do botão. */
  saved?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', payload: UpdateCustomerSettingsRequest): void
}>()

const form = reactive<{ measurementUnit: MeasurementUnit | '' }>({
  measurementUnit: props.initial ?? '',
})

// Reage à mudança de `initial` (ex.: empresa ativa carrega settings depois do mount).
watch(
  () => props.initial,
  (next) => {
    if (next) form.measurementUnit = next
  },
)

const errors = ref<{ measurementUnit?: string }>({})

const schema = z.object({
  measurementUnit: z.enum(['MILLIMETER', 'CENTIMETER', 'METER'], {
    message: 'Selecione uma unidade de medida.',
  }),
})

const handleSubmit = () => {
  errors.value = {}
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as 'measurementUnit'
      if (key && !errors.value[key]) errors.value[key] = issue.message
    }
    return
  }
  emit('submit', { measurementUnit: result.data.measurementUnit })
}

const unitOptions = MEASUREMENT_UNITS.map((unit) => ({
  value: unit,
  label: MEASUREMENT_UNIT_LABEL[unit],
}))
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <div>
      <label for="measurement-unit" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Unidade de medida <span class="text-rose-500">*</span>
      </label>
      <select
        id="measurement-unit"
        v-model="form.measurementUnit"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white transition-colors"
        :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.measurementUnit }"
      >
        <option value="" disabled>Selecione...</option>
        <option v-for="opt in unitOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <p v-if="errors.measurementUnit" class="mt-1 text-xs text-rose-600">{{ errors.measurementUnit }}</p>
      <p v-else class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Valores são sempre armazenados em milímetros; esta unidade controla apenas a exibição.
      </p>
    </div>

    <div
      v-if="serverError"
      class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300"
    >
      {{ serverError }}
    </div>

    <div
      v-else-if="saved"
      class="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300"
    >
      Configurações salvas com sucesso.
    </div>

    <div class="flex justify-end">
      <button
        type="submit"
        :disabled="loading"
        class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-3 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800 transition-colors shadow-md shadow-indigo-500/20"
      >
        {{ loading ? 'Salvando...' : 'Salvar configurações' }}
      </button>
    </div>
  </form>
</template>
