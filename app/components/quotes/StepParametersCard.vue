<script setup lang="ts">
/**
 * Card de parâmetros de UMA etapa no passo 3 (atividade 034).
 *
 * EM ABERTO — escolha do item dentro de um GRUPO de insumo: quando a atividade consome um grupo
 * (ex.: "Espirais"), o critério de escolha é TÉCNICO e específico da atividade — a espiral tem que
 * caber na espessura do bloco —, não "o mais barato". Consumo por medida também entra aqui: o
 * grampo é cobrado por centímetro linear, dependendo do tamanho do bloco. Será tratado por tipo de
 * atividade; nenhuma etapa deste protótipo consome grupo.
 *
 * Cada tipo de atividade pede uma coisa diferente — e várias não pedem nada. Este componente é o
 * despachante: escolhe os campos pelo tipo da atividade e, quando não há o que perguntar, explica
 * de onde o número vem em vez de deixar um card vazio (card vazio faz o usuário procurar o campo
 * que não existe).
 */
import { computed } from 'vue'
import type { QuoteStep } from '@/types/QuoteDraft'
import { ACTIVITY_TYPE_LABEL, brl, findActivity } from '@/utils/quoteDemoData'
import PrintingParameters from '@/components/quotes/PrintingParameters.vue'

const props = defineProps<{
  step: QuoteStep
  /** Posição da etapa entre as de impressão (1ª, 2ª...), para o usuário se localizar. */
  printingIndex?: number
  printingTotal?: number
}>()

const activity = computed(() => findActivity(props.step.activityId))
const paramKind = computed(() => activity.value?.paramKind ?? 'NONE')
const params = computed(() => props.step.parameters)
const laborCost = computed(() => (params.value.laborHours ?? 0) * (activity.value?.hourlyCost ?? 0))

const setNumber = (key: 'laborHours' | 'parallelFolds' | 'crossFolds' | 'staples' | 'holes' | 'numberingUnits', value: string) => {
  const parsed = Number(value.replace(',', '.'))
  props.step.parameters[key] = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

const inputClass =
  'w-28 rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
</script>

<template>
  <div v-if="activity" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">
        {{ activity.name }}<span v-if="(printingTotal ?? 0) > 1" class="text-slate-400"> ({{ printingIndex }}ª)</span>
      </h3>
      <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        {{ ACTIVITY_TYPE_LABEL[activity.type] }}
      </span>
    </div>

    <!-- Nada a perguntar: o valor é calculado a partir do cadastro e do encaixe -->
    <p v-if="paramKind === 'NONE'" class="mt-2 flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
      <svg class="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Nada a configurar. {{ activity.autoNote }}</span>
    </p>

    <!-- Atividade manual: horas -->
    <div v-else-if="paramKind === 'HOURS'" class="mt-3">
      <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
        Horas de trabalho <span class="text-rose-500">*</span>
      </label>
      <div class="flex flex-wrap items-center gap-3">
        <input
          :value="params.laborHours ?? ''"
          type="number"
          min="0"
          step="0.5"
          placeholder="0"
          @input="setNumber('laborHours', ($event.target as HTMLInputElement).value)"
          :class="inputClass"
        />
        <span class="text-sm text-slate-500 dark:text-slate-400">
          × {{ brl(activity.hourlyCost) }}/h =
          <span class="font-medium text-slate-900 dark:text-white">{{ brl(laborCost) }}</span>
        </span>
      </div>
    </div>

    <!-- Impressão: cada etapa tem a sua configuração completa, e os custos se somam -->
    <div v-else-if="paramKind === 'PRINTING'" class="mt-4">
      <p
        v-if="(printingTotal ?? 0) > 1"
        class="mb-4 rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
      >
        <strong>{{ printingIndex }}ª de {{ printingTotal }} impressões</strong> deste produto — configuração
        própria, somada às demais. Zere as cores das folhas que não entram nesta passada.
      </p>
      <PrintingParameters :step="step" />
    </div>

  </div>
</template>
