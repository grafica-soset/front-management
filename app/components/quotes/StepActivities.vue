<script setup lang="ts">
/**
 * Passo 2 do assistente — ATIVAÇÃO DE ATIVIDADES (atividade 034).
 *
 * A lista é ORDENADA e aceita repetição: a ordem é a sequência de produção, e a mesma atividade
 * pode entrar duas vezes (dois cortes em momentos diferentes, por exemplo). Por isso cada linha
 * tem setas de ordenação e o modal não bloqueia o que já foi escolhido.
 *
 * As linhas já avisam quem vai pedir configuração no passo 3 — assim o usuário não é surpreendido
 * por um passo cheio de campos que ele não esperava.
 */
import { computed, ref } from 'vue'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import ActivityPickerModal from '@/components/quotes/ActivityPickerModal.vue'
import { ACTIVITY_TYPE_LABEL, findActivity } from '@/utils/quoteDemoData'

const store = useQuoteDraftStore()
const product = computed(() => store.draft!)
const pickerOpen = ref(false)

const usageCount = computed(() => {
  const counts: Record<number, number> = {}
  for (const step of product.value.steps) counts[step.activityId] = (counts[step.activityId] ?? 0) + 1
  return counts
})

const rows = computed(() =>
  product.value.steps.map((step, index) => ({
    step,
    index,
    activity: findActivity(step.activityId),
  })),
)

const pick = (activityId: number) => {
  store.addStep(activityId)
  pickerOpen.value = false
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Atividades do produto</h2>
        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Na ordem de produção. A mesma atividade pode entrar mais de uma vez.
        </p>
      </div>
      <button
        type="button"
        @click="pickerOpen = true"
        class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Adicionar atividade
      </button>
    </div>

    <p v-if="rows.length === 0" class="mt-6 rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
      Nenhuma atividade ativada ainda.<br />
      Sem atividade de impressão, o produto não gera custo de impressão.
    </p>

    <ol v-else class="mt-4 space-y-2">
      <li
        v-for="row in rows"
        :key="row.step.uid"
        class="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"
      >
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {{ row.index + 1 }}
        </span>

        <div class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium text-slate-900 dark:text-white">{{ row.activity?.name }}</span>
          <span class="text-xs text-slate-500 dark:text-slate-400">
            {{ row.activity ? ACTIVITY_TYPE_LABEL[row.activity.type] : '' }}
            <template v-if="row.activity && row.activity.paramKind !== 'NONE'">
              · <span class="text-amber-600 dark:text-amber-400">pede configuração</span>
            </template>
          </span>
        </div>

        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            :disabled="row.index === 0"
            @click="store.moveStep(row.step.uid, -1)"
            class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Subir"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
          </button>
          <button
            type="button"
            :disabled="row.index === rows.length - 1"
            @click="store.moveStep(row.step.uid, 1)"
            class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Descer"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
          <button
            type="button"
            @click="store.removeStep(row.step.uid)"
            class="rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-slate-700"
          >
            Remover
          </button>
        </div>
      </li>
    </ol>

    <ActivityPickerModal
      :is-open="pickerOpen"
      :usage-count="usageCount"
      @pick="pick"
      @close="pickerOpen = false"
    />
  </section>
</template>
