<script setup lang="ts">
/**
 * Formulário reutilizável para criar/editar Tipo de Papel.
 *
 * Sem chamadas de API — a página chama o composable e dispara `@submit`.
 * Campo `active` só aparece em edição (POST não aceita esse campo).
 */
import { reactive, ref, watch } from 'vue'
import { z } from 'zod'
import type { PaperType } from '@/types/PaperType'

const props = defineProps<{
  /** Quando informado, o form atua em modo "edição" e exibe o toggle `active`. */
  initial?: PaperType | null
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: { name: string; description: string | null; active?: boolean }): void
  (e: 'cancel'): void
}>()

const isEditing = !!props.initial

const form = reactive({
  name: props.initial?.name ?? '',
  description: props.initial?.description ?? '',
  active: props.initial?.active ?? true,
})

watch(
  () => props.initial,
  (next) => {
    form.name = next?.name ?? ''
    form.description = next?.description ?? ''
    form.active = next?.active ?? true
  },
)

const errors = ref<Partial<Record<keyof typeof form, string>>>({})

const schema = z.object({
  name: z.string().min(1, 'Informe o nome do tipo.').max(100, 'Máximo de 100 caracteres.'),
  description: z.string().max(255, 'Máximo de 255 caracteres.').optional(),
  active: z.boolean(),
})

const handleSubmit = () => {
  errors.value = {}
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof typeof form
      if (key && !errors.value[key]) errors.value[key] = issue.message
    }
    return
  }
  const data = result.data
  emit('submit', {
    name: data.name,
    description: data.description?.trim() ? data.description : null,
    ...(isEditing ? { active: data.active } : {}),
  })
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <div>
      <label for="paper-type-name" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Nome <span class="text-rose-500">*</span>
      </label>
      <input
        id="paper-type-name"
        v-model="form.name"
        type="text"
        placeholder="Sulfite"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.name }"
      />
      <p v-if="errors.name" class="mt-1 text-xs text-rose-600">{{ errors.name }}</p>
    </div>

    <div>
      <label for="paper-type-description" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Descrição
      </label>
      <textarea
        id="paper-type-description"
        v-model="form.description"
        rows="2"
        placeholder="Papel branco padrão A4 para impressão laser"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.description }"
      />
      <p v-if="errors.description" class="mt-1 text-xs text-rose-600">{{ errors.description }}</p>
    </div>

    <div v-if="isEditing" class="flex items-center gap-3">
      <input
        id="paper-type-active"
        v-model="form.active"
        type="checkbox"
        class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:bg-slate-700 dark:border-slate-600"
      />
      <label for="paper-type-active" class="text-sm font-medium text-slate-700 dark:text-slate-200">
        Tipo ativo
      </label>
    </div>

    <div
      v-if="serverError"
      class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300"
    >
      {{ serverError }}
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <button
        type="button"
        @click="emit('cancel')"
        class="text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="loading"
        class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-2.5 shadow-md shadow-indigo-500/20"
      >
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar tipo' }}
      </button>
    </div>
  </form>
</template>
