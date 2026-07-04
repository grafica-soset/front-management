<script setup lang="ts">
/**
 * Formulário de MODELO DE PRODUTO (atividade 028): nome + seleção de atividades, marcando cada uma
 * como FIXA (obrigatória) ou COMPLEMENTAR (opcional). Só as atividades incluídas entram no modelo.
 * Autocontido (props + emit).
 */
import { computed, onMounted, reactive, ref } from 'vue'
import type { ActivityKeyValue } from '@/types/Activity'
import type { CreateProductModelRequest, ProductModel, UpdateProductModelRequest } from '@/types/ProductModel'
import { useActivities } from '@/composables/useActivities'

const props = defineProps<{
  initial?: ProductModel | null
  mode?: 'create' | 'edit'
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: CreateProductModelRequest | UpdateProductModelRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
}>()

const isEditing = computed(() => props.mode === 'edit')

const form = reactive({ name: props.initial?.name ?? '', active: props.initial?.active ?? true })

// Estado de seleção: activityId -> { included, required }. required=true = fixa; false = complementar.
const selection = reactive<Record<number, { included: boolean; required: boolean }>>({})
const activities = ref<ActivityKeyValue[]>([])
const error = ref<string | null>(null)

onMounted(async () => {
  try { activities.value = await useActivities().listKeyValues() } catch { activities.value = [] }
  // Garante que atividades já vinculadas (na edição) apareçam mesmo se inativas/fora da lista ativa.
  const initialLinks = props.initial?.activities ?? []
  for (const a of activities.value) {
    if (!(a.id in selection)) selection[a.id] = { included: false, required: true }
  }
  for (const link of initialLinks) {
    selection[link.activityId] = { included: true, required: link.required }
    if (!activities.value.some((a) => a.id === link.activityId)) {
      activities.value.push({ id: link.activityId, value: `Atividade #${link.activityId}`, type: 'MANUAL', active: true })
    }
  }
})

const includedCount = computed(() => Object.values(selection).filter((s) => s.included).length)

const handleSubmit = () => {
  const name = form.name.trim()
  if (!name) { error.value = 'Informe o nome do modelo.'; return }
  if (includedCount.value === 0) { error.value = 'Selecione ao menos uma atividade.'; return }
  error.value = null

  const activitiesPayload = Object.entries(selection)
    .filter(([, s]) => s.included)
    .map(([activityId, s]) => ({ activityId: Number(activityId), required: s.required }))

  const base: CreateProductModelRequest = { customerId: 0, name, activities: activitiesPayload }
  if (isEditing.value) emit('submit', { ...base, active: form.active }, 'update')
  else emit('submit', base, 'create')
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <div>
      <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Nome do modelo <span class="text-rose-500">*</span></label>
      <input v-model="form.name" type="text" maxlength="150" placeholder="Ex.: Bloco"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
    </div>

    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Atividades do modelo</legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Marque as atividades que fazem parte do modelo. <strong>Fixa</strong> entra sempre no orçamento;
        <strong>Complementar</strong> pode ser ligada/desligada no orçamento.
      </p>

      <div v-if="activities.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
        Nenhuma atividade cadastrada. Cadastre atividades antes de montar o modelo.
      </div>

      <div v-else class="space-y-2">
        <div v-for="a in activities" :key="a.id" class="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0 dark:border-slate-700/50">
          <label class="flex items-center gap-2 flex-1 min-w-0 text-sm text-slate-800 dark:text-slate-100">
            <input type="checkbox" v-model="selection[a.id].included" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
            <span class="truncate">{{ a.value }}</span>
          </label>
          <select v-if="selection[a.id]?.included" v-model="selection[a.id].required"
            class="bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            <option :value="true">Fixa (obrigatória)</option>
            <option :value="false">Complementar (opcional)</option>
          </select>
        </div>
      </div>
    </fieldset>

    <label v-if="isEditing" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input v-model="form.active" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
      Modelo ativo
    </label>

    <p v-if="error" class="text-xs text-rose-600">{{ error }}</p>
    <div v-if="serverError" class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300">
      {{ serverError }}
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <button type="button" @click="emit('cancel')" class="text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">
        Cancelar
      </button>
      <button type="submit" :disabled="loading" class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-2.5 shadow-md shadow-indigo-500/20">
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar modelo' }}
      </button>
    </div>
  </form>
</template>
