<script setup lang="ts">
/**
 * Passo 3 do assistente — PARÂMETROS DAS ATIVIDADES (atividade 034).
 *
 * Um card por etapa ativada, na ordem do passo 2. As que pedem informação vêm primeiro, abertas;
 * as que não pedem nada ficam agrupadas no fim, recolhidas — elas existem no orçamento e o
 * usuário precisa saber disso, mas não devem competir por atenção com os campos que ele tem que
 * preencher.
 */
import { computed, ref } from 'vue'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import StepParametersCard from '@/components/quotes/StepParametersCard.vue'
import { ACTIVITY_TYPE_LABEL, findActivity } from '@/utils/quoteDemoData'

const store = useQuoteDraftStore()
const product = computed(() => store.draft!)

/** Posição de cada etapa de impressão (1ª, 2ª...): cada uma tem configuração própria. */
const printingOrder = computed(() => {
  const order: Record<string, number> = {}
  let n = 0
  for (const step of product.value.steps) {
    if (findActivity(step.activityId)?.type === 'PRINTING') {
      n += 1
      order[step.uid] = n
    }
  }
  return order
})
const printingTotal = computed(() => Object.keys(printingOrder.value).length)

const configurable = computed(() =>
  product.value.steps.filter((s) => findActivity(s.activityId)?.paramKind !== 'NONE'),
)
const automatic = computed(() =>
  product.value.steps.filter((s) => findActivity(s.activityId)?.paramKind === 'NONE'),
)

const showAutomatic = ref(false)
</script>

<template>
  <div class="space-y-4">
    <p
      v-if="product.steps.length === 0"
      class="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400"
    >
      Nenhuma atividade ativada — volte ao passo 2.
    </p>

    <StepParametersCard
      v-for="step in configurable"
      :key="step.uid"
      :step="step"
      :printing-index="printingOrder[step.uid]"
      :printing-total="printingTotal"
    />

    <div v-if="automatic.length" class="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <button
        type="button"
        @click="showAutomatic = !showAutomatic"
        class="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span>
          <span class="text-sm font-medium text-slate-900 dark:text-white">
            {{ automatic.length }} etapa(s) sem nada a configurar
          </span>
          <span class="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
            {{ automatic.map((s) => findActivity(s.activityId)?.name).join(' · ') }}
          </span>
        </span>
        <svg
          class="h-4 w-4 shrink-0 text-slate-400 transition-transform"
          :class="showAutomatic ? 'rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <ul v-if="showAutomatic" class="divide-y divide-slate-100 border-t border-slate-200 dark:divide-slate-700/60 dark:border-slate-700">
        <li v-for="step in automatic" :key="step.uid" class="px-5 py-3">
          <span class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ findActivity(step.activityId)?.name }}</span>
          <span class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {{ ACTIVITY_TYPE_LABEL[findActivity(step.activityId)!.type] }}
          </span>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ findActivity(step.activityId)?.autoNote }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>
