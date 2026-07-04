<script setup lang="ts">
/**
 * Formulário de GRUPO DE INSUMO (atividade 028): nome (+ ativo na edição).
 * Autocontido: recebe dados iniciais por prop e emite o payload validado por @submit.
 */
import { computed, reactive, ref } from 'vue'
import type { CreateSupplyGroupRequest, SupplyGroup, UpdateSupplyGroupRequest } from '@/types/SupplyGroup'

const props = defineProps<{
  initial?: SupplyGroup | null
  mode?: 'create' | 'edit'
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: CreateSupplyGroupRequest | UpdateSupplyGroupRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
}>()

const isEditing = computed(() => props.mode === 'edit')
const form = reactive({ name: props.initial?.name ?? '', active: props.initial?.active ?? true })
const error = ref<string | null>(null)

const inputClass = computed(() => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  error.value ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
])

const handleSubmit = () => {
  const name = form.name.trim()
  if (!name) { error.value = 'Informe o nome do grupo.'; return }
  if (name.length > 120) { error.value = 'Máximo de 120 caracteres.'; return }
  error.value = null
  if (isEditing.value) {
    emit('submit', { customerId: 0, name, active: form.active }, 'update')
  } else {
    emit('submit', { customerId: 0, name }, 'create')
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div>
      <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Nome do grupo <span class="text-rose-500">*</span>
      </label>
      <input v-model="form.name" type="text" maxlength="120" placeholder="Ex.: Grampos" :class="inputClass" />
      <p v-if="error" class="mt-1 text-xs text-rose-600">{{ error }}</p>
    </div>

    <label v-if="isEditing" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input v-model="form.active" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
      Grupo ativo
    </label>

    <div
      v-if="serverError"
      class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300"
    >
      {{ serverError }}
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <button type="button" @click="emit('cancel')" class="text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">
        Cancelar
      </button>
      <button type="submit" :disabled="loading" class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-2.5 shadow-md shadow-indigo-500/20">
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Cadastrar grupo' }}
      </button>
    </div>
  </form>
</template>
