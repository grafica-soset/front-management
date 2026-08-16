<script setup lang="ts">
/**
 * Modal de escolha de atividade para o produto (atividade 034).
 *
 * Segue o padrão do modal de consumo de insumo da atividade: busca + lista agrupada. A diferença
 * importante é que aqui a REPETIÇÃO É PERMITIDA — a mesma atividade pode entrar duas vezes no
 * mesmo produto (dois cortes, duas impressões). Por isso nada aparece desabilitado; as já
 * escolhidas só ganham a contagem "já no produto ×2", como informação, não como bloqueio.
 */
import { computed, ref, watch } from 'vue'
import { ACTIVITY_TYPE_LABEL, DEMO_ACTIVITIES, type DemoActivity } from '@/utils/quoteDemoData'

const props = defineProps<{
  isOpen: boolean
  /** Quantas vezes cada atividade já foi adicionada ao produto. */
  usageCount: Record<number, number>
}>()

const emit = defineEmits<{
  (e: 'pick', activityId: number): void
  (e: 'close'): void
}>()

const search = ref('')

watch(
  () => props.isOpen,
  (open) => {
    if (open) search.value = ''
  },
)

const groups = computed(() => {
  const term = search.value.trim().toLowerCase()
  const matches = DEMO_ACTIVITIES.filter((a) => !term || a.name.toLowerCase().includes(term))
  const byType = new Map<DemoActivity['type'], DemoActivity[]>()
  for (const activity of matches) {
    const list = byType.get(activity.type) ?? []
    list.push(activity)
    byType.set(activity.type, list)
  }
  return Array.from(byType.entries())
})

const needsSetup = (activity: DemoActivity) => activity.paramKind !== 'NONE'
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/50 p-4 dark:bg-gray-900/80"
  >
    <div class="relative w-full max-w-xl rounded-lg bg-white shadow dark:bg-slate-800">
      <div class="flex items-start justify-between border-b border-slate-200 p-4 dark:border-slate-700">
        <div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Adicionar atividade</h3>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            A mesma atividade pode entrar mais de uma vez no produto.
          </p>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-600 dark:hover:text-white"
        >
          <svg class="h-3 w-3" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
          </svg>
          <span class="sr-only">Fechar</span>
        </button>
      </div>

      <div class="space-y-4 p-5">
        <input
          v-model="search"
          type="search"
          placeholder="Buscar atividade..."
          class="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />

        <div class="max-h-80 space-y-4 overflow-y-auto pr-1">
          <div v-for="[type, activities] in groups" :key="type">
            <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {{ ACTIVITY_TYPE_LABEL[type] }}
            </p>
            <div class="space-y-1.5">
              <button
                v-for="activity in activities"
                :key="activity.id"
                type="button"
                @click="emit('pick', activity.id)"
                class="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-slate-700 dark:hover:bg-slate-700/60"
              >
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium text-slate-900 dark:text-white">{{ activity.name }}</span>
                  <span v-if="needsSetup(activity)" class="text-xs text-amber-600 dark:text-amber-400">pede configuração no passo 3</span>
                  <span v-else class="text-xs text-slate-400 dark:text-slate-500">calculada pelo sistema</span>
                </span>
                <span
                  v-if="usageCount[activity.id]"
                  class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                >
                  já no produto ×{{ usageCount[activity.id] }}
                </span>
              </button>
            </div>
          </div>
          <p v-if="groups.length === 0" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhuma atividade encontrada.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
