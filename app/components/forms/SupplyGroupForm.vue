<script setup lang="ts">
/**
 * Formulário de GRUPO DE INSUMO (atividade 028): nome (+ ativo na edição) + seleção dos insumos
 * que pertencem ao grupo. Elegíveis: todos os insumos, exceto tinta (papel tem cadastro próprio).
 * Autocontido: lê as listas de referência e emite o payload validado + os IDs selecionados por @submit.
 */
import { computed, onMounted, reactive, ref } from 'vue'
import type { CreateSupplyGroupRequest, SupplyGroup, UpdateSupplyGroupRequest } from '@/types/SupplyGroup'
import type { SupplyKeyValue, SupplyUnitOfMeasure } from '@/types/Supply'
import { useSupplies } from '@/composables/useSupplies'
import { useSupplyGroups } from '@/composables/useSupplyGroups'
import { useCustomerPapers } from '@/composables/useCustomerPapers'
import { SUPPLY_UNITS, SUPPLY_UNIT_LABELS } from '@/utils/supplyCatalog'

const props = defineProps<{
  initial?: SupplyGroup | null
  mode?: 'create' | 'edit'
  /** Papéis já marcados na criação — usado pela duplicação, que herda os papéis da origem. */
  presetPaperIds?: number[]
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (
    e: 'submit',
    payload: CreateSupplyGroupRequest | UpdateSupplyGroupRequest,
    mode: 'create' | 'update',
    supplyIds: number[],
    paperIds: number[],
  ): void
  (e: 'cancel'): void
}>()

const isEditing = computed(() => props.mode === 'edit')
const form = reactive({
  name: props.initial?.name ?? '',
  unitOfMeasure: (props.initial?.unitOfMeasure ?? 'UNIT') as SupplyUnitOfMeasure,
  active: props.initial?.active ?? true,
})
const error = ref<string | null>(null)

// Insumos elegíveis (tudo menos tinta) e o conjunto selecionado (IDs).
const supplies = ref<SupplyKeyValue[]>([])
const selectedIds = ref<Set<number>>(new Set())
const loadingSupplies = ref(false)

// Papéis da empresa (para grupos de embrulho — ex.: Empacotar) e o conjunto selecionado.
const papers = ref<{ id: number; label: string }[]>([])
const selectedPaperIds = ref<Set<number>>(new Set())
const loadingPapers = ref(false)

onMounted(async () => {
  loadingSupplies.value = true
  try {
    const all = await useSupplies().listKeyValues({ onlyActive: true })
    supplies.value = all.filter((s) => s.type !== 'INK')
    if (isEditing.value && props.initial?.id) {
      const members = await useSupplyGroups().listSupplies(props.initial.id)
      selectedIds.value = new Set(members.map((m) => m.id))
    }
  } catch {
    supplies.value = []
  } finally {
    loadingSupplies.value = false
  }

  loadingPapers.value = true
  try {
    const entries = await useCustomerPapers().listCustomerPapers({ onlyActive: true })
    papers.value = entries.map((e) => ({ id: e.paper.id, label: `${e.paper.code} — ${e.paper.longName}` }))
    if (isEditing.value && props.initial?.id) {
      const groupPapers = await useSupplyGroups().listPapers(props.initial.id)
      selectedPaperIds.value = new Set(groupPapers.map((p) => p.id))
    } else if (props.presetPaperIds?.length) {
      // Duplicação: herda os papéis da origem (papel pode estar em vários grupos).
      selectedPaperIds.value = new Set(props.presetPaperIds)
    }
  } catch {
    papers.value = []
  } finally {
    loadingPapers.value = false
  }
})

const toggleSupply = (id: number) => {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

const togglePaper = (id: number) => {
  const next = new Set(selectedPaperIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedPaperIds.value = next
}

const selectedCount = computed(() => selectedIds.value.size)
const selectedPaperCount = computed(() => selectedPaperIds.value.size)

const inputClass = computed(() => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  error.value ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
])

const handleSubmit = () => {
  const name = form.name.trim()
  if (!name) { error.value = 'Informe o nome do grupo.'; return }
  if (name.length > 120) { error.value = 'Máximo de 120 caracteres.'; return }
  error.value = null
  const supplyIds = Array.from(selectedIds.value)
  const paperIds = Array.from(selectedPaperIds.value)
  if (isEditing.value) {
    emit('submit', { customerId: 0, name, unitOfMeasure: form.unitOfMeasure, active: form.active }, 'update', supplyIds, paperIds)
  } else {
    emit('submit', { customerId: 0, name, unitOfMeasure: form.unitOfMeasure }, 'create', supplyIds, paperIds)
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

    <div>
      <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Unidade de medida do consumo <span class="text-rose-500">*</span>
      </label>
      <select v-model="form.unitOfMeasure"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
        <option v-for="u in SUPPLY_UNITS" :key="u" :value="u">{{ SUPPLY_UNIT_LABELS[u] }}</option>
      </select>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Unidade em que a atividade informa quanto consome (ex.: Colas em grama, Grampos unitário).</p>
    </div>

    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Insumos do grupo
        <span v-if="selectedCount" class="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">({{ selectedCount }} selecionado{{ selectedCount > 1 ? 's' : '' }})</span>
      </legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Marque os insumos que fazem parte desta família. No orçamento, escolhe-se o insumo específico
        do grupo (tamanho/gramatura). Tinta e papel não podem ser agrupados.
      </p>

      <div v-if="loadingSupplies" class="text-sm text-slate-500 dark:text-slate-400">Carregando insumos...</div>
      <div v-else-if="supplies.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
        Nenhum insumo elegível cadastrado.
      </div>
      <div v-else class="space-y-1 max-h-56 overflow-y-auto pr-1">
        <label
          v-for="s in supplies"
          :key="s.id"
          class="flex items-center gap-2 py-1.5 text-sm text-slate-800 cursor-pointer dark:text-slate-100"
        >
          <input
            type="checkbox"
            :checked="selectedIds.has(s.id)"
            @change="toggleSupply(s.id)"
            class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
          />
          <span class="truncate">{{ s.value }}</span>
        </label>
      </div>
    </fieldset>

    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Papéis do grupo
        <span v-if="selectedPaperCount" class="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">({{ selectedPaperCount }} selecionado{{ selectedPaperCount > 1 ? 's' : '' }})</span>
      </legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Para grupos de <strong>embrulho</strong> (ex.: usados pelo acabamento Empacotar), marque os papéis
        da empresa que fazem parte da família.
      </p>

      <div v-if="loadingPapers" class="text-sm text-slate-500 dark:text-slate-400">Carregando papéis...</div>
      <div v-else-if="papers.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
        Nenhum papel cadastrado na empresa.
      </div>
      <div v-else class="space-y-1 max-h-56 overflow-y-auto pr-1">
        <label
          v-for="p in papers"
          :key="p.id"
          class="flex items-center gap-2 py-1.5 text-sm text-slate-800 cursor-pointer dark:text-slate-100"
        >
          <input
            type="checkbox"
            :checked="selectedPaperIds.has(p.id)"
            @change="togglePaper(p.id)"
            class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
          />
          <span class="truncate">{{ p.label }}</span>
        </label>
      </div>
    </fieldset>

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
