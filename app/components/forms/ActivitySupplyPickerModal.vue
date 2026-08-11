<script setup lang="ts">
/**
 * Modal "Adicionar item de consumo" da atividade (032 — ajuste 0006).
 *
 * Dois passos, porque o que se adiciona pode ser duas coisas diferentes:
 *  1. ORIGEM — grupo de insumos (o orçamento escolhe o insumo depois) ou item do estoque
 *     (o insumo já fica decidido aqui).
 *  2. SELEÇÃO — a lista da origem escolhida, com busca. Clicar em um item fecha o modal e o
 *     devolve pelo `@select`.
 *
 * Itens já adicionados aparecem desabilitados (marcados como "já adicionado") em vez de sumirem:
 * some o item e o usuário fica procurando o que não some.
 *
 * Tem overlay próprio em z-[60] porque o formulário de atividade também abre dentro de um modal
 * (edição/duplicação) — reusar o `ui/Modal` empilharia dois z-50.
 */
import { computed, ref, watch } from 'vue'
import type { ActivitySupply, ActivitySupplySource } from '@/types/Activity'
import type { SupplyGroupKeyValue } from '@/types/SupplyGroup'
import type { SupplyKeyValue } from '@/types/Supply'
import {
  ACTIVITY_SUPPLY_SOURCES,
  ACTIVITY_SUPPLY_SOURCE_HINTS,
  ACTIVITY_SUPPLY_SOURCE_LABELS,
  SUPPLY_UNIT_SHORT_LABELS,
} from '@/utils/activityCatalog'

const props = defineProps<{
  isOpen: boolean
  groups: SupplyGroupKeyValue[]
  supplies: SupplyKeyValue[]
  /** Itens já no formulário — ficam desabilitados na lista. */
  selected: ActivitySupply[]
}>()

const emit = defineEmits<{
  (e: 'select', item: ActivitySupply): void
  (e: 'close'): void
}>()

// `null` = ainda no passo da origem.
const source = ref<ActivitySupplySource | null>(null)
const search = ref('')

// Cada abertura recomeça do passo 1: o modal é "adicionar UM item", não um estado que persiste.
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      source.value = null
      search.value = ''
    }
  },
)

const chooseSource = (value: ActivitySupplySource) => {
  source.value = value
  search.value = ''
}

const matches = (name: string) => name.toLowerCase().includes(search.value.trim().toLowerCase())

const groupOptions = computed(() => props.groups.filter((g) => matches(g.value)))
const supplyOptions = computed(() => props.supplies.filter((s) => matches(s.value)))

const isGroupTaken = (id: number) => props.selected.some((i) => i.supplyGroupId === id)
const isSupplyTaken = (id: number) => props.selected.some((i) => i.supplyId === id)

const pickGroup = (id: number) => {
  if (isGroupTaken(id)) return
  emit('select', { source: 'SUPPLY_GROUP', supplyGroupId: id, supplyId: null })
}

const pickSupply = (id: number) => {
  if (isSupplyTaken(id)) return
  emit('select', { source: 'SUPPLY', supplyGroupId: null, supplyId: id })
}

const title = computed(() =>
  source.value === null
    ? 'O que a atividade vai consumir?'
    : `Selecione — ${ACTIVITY_SUPPLY_SOURCE_LABELS[source.value]}`,
)

const optionClass =
  'w-full text-left rounded-lg border border-slate-200 px-4 py-3 hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-600 dark:hover:bg-slate-700/50'

const rowClass = (taken: boolean) => [
  'w-full flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm text-left',
  taken
    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
    : 'border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/50',
]
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 dark:bg-slate-900/80"
  >
    <div class="relative w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-slate-800">
      <div class="flex items-start justify-between border-b p-4 dark:border-slate-700">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{{ title }}</h3>
        <button
          type="button"
          @click="emit('close')"
          class="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-600 dark:hover:text-white"
        >
          <svg class="h-3 w-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
          </svg>
          <span class="sr-only">Fechar</span>
        </button>
      </div>

      <!-- PASSO 1: grupo de insumos ou item do estoque? -->
      <div v-if="source === null" class="space-y-3 p-6">
        <button
          v-for="s in ACTIVITY_SUPPLY_SOURCES"
          :key="s"
          type="button"
          @click="chooseSource(s)"
          :class="optionClass"
        >
          <span class="block text-sm font-medium text-slate-900 dark:text-white">
            {{ ACTIVITY_SUPPLY_SOURCE_LABELS[s] }}
          </span>
          <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            {{ ACTIVITY_SUPPLY_SOURCE_HINTS[s] }}
          </span>
        </button>
      </div>

      <!-- PASSO 2: a lista da origem escolhida -->
      <div v-else class="space-y-4 p-6">
        <input
          v-model="search"
          type="search"
          :placeholder="source === 'SUPPLY_GROUP' ? 'Buscar grupo...' : 'Buscar insumo...'"
          class="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />

        <div class="max-h-72 space-y-2 overflow-y-auto pr-1">
          <template v-if="source === 'SUPPLY_GROUP'">
            <button
              v-for="g in groupOptions"
              :key="g.id"
              type="button"
              :disabled="isGroupTaken(g.id)"
              @click="pickGroup(g.id)"
              :class="rowClass(isGroupTaken(g.id))"
            >
              <span class="font-medium">{{ g.value }}</span>
              <span class="shrink-0 text-xs">
                {{ isGroupTaken(g.id) ? 'já adicionado' : `consumo em ${SUPPLY_UNIT_SHORT_LABELS[g.unitOfMeasure]}` }}
              </span>
            </button>
            <p v-if="!groupOptions.length" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum grupo de insumos encontrado.
            </p>
          </template>

          <template v-else>
            <button
              v-for="s in supplyOptions"
              :key="s.id"
              type="button"
              :disabled="isSupplyTaken(s.id)"
              @click="pickSupply(s.id)"
              :class="rowClass(isSupplyTaken(s.id))"
            >
              <span class="font-medium">{{ s.value }}</span>
              <span class="shrink-0 text-xs">
                {{ isSupplyTaken(s.id) ? 'já adicionado' : `consumo em ${SUPPLY_UNIT_SHORT_LABELS[s.unitOfMeasure]}` }}
              </span>
            </button>
            <p v-if="!supplyOptions.length" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum insumo encontrado.
            </p>
          </template>
        </div>

        <button
          type="button"
          @click="source = null"
          class="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
        >
          ← Trocar tipo de item
        </button>
      </div>
    </div>
  </div>
</template>
