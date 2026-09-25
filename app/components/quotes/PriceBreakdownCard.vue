<script setup lang="ts">
/**
 * A CONTA DO PREÇO, aberta (atividade 037).
 *
 * O usuário vê o preço mudar enquanto mexe em comissão, impostos e markup — e vê de onde ele sai:
 * custo ÷ (100% − a soma). As parcelas em R$ saem do PREÇO, não do custo, e somadas ao custo
 * fecham o preço.
 */
import { computed } from 'vue'
import type { PriceBreakdown } from '@/utils/pricing'
import { formatPercent } from '@/utils/pricing'
import { brl } from '@/utils/quoteModel'

const props = defineProps<{
  price: PriceBreakdown | null
  quantity: number | null
  unitLabel: string
}>()

const unitPrice = computed(() => {
  const p = props.price?.price
  const q = props.quantity ?? 0
  return p != null && q > 0 ? p / q : null
})
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <h2 class="text-base font-semibold text-slate-900 dark:text-white">Preço final</h2>
    <p v-if="!price" class="mt-2 text-sm text-slate-500 dark:text-slate-400">
      O preço aparece assim que o custo do produto estiver calculado.
    </p>
    <template v-else>
      <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
        {{ brl(price.cost) }} ÷ (100% − {{ formatPercent(price.totalPercent) }})
      </p>
      <dl class="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-700/60">
        <div class="flex justify-between py-2">
          <dt class="text-slate-600 dark:text-slate-300">Custo</dt>
          <dd class="tabular-nums text-slate-900 dark:text-white">{{ brl(price.cost) }}</dd>
        </div>
        <div class="flex justify-between py-2">
          <dt class="text-slate-600 dark:text-slate-300">Comissão de vendas ({{ formatPercent(price.commissionPercent) }})</dt>
          <dd class="tabular-nums text-slate-900 dark:text-white">{{ brl(price.commissionAmount) }}</dd>
        </div>
        <div class="flex justify-between py-2">
          <dt class="text-slate-600 dark:text-slate-300">Impostos no preço ({{ formatPercent(price.taxPercent) }})</dt>
          <dd class="tabular-nums text-slate-900 dark:text-white">{{ brl(price.taxAmount) }}</dd>
        </div>
        <div class="flex justify-between py-2">
          <dt class="text-slate-600 dark:text-slate-300">Markup ({{ formatPercent(price.markupPercent) }})</dt>
          <dd class="tabular-nums text-slate-900 dark:text-white">{{ brl(price.markupAmount) }}</dd>
        </div>
      </dl>
      <div class="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
        <p v-if="price.price == null" class="text-sm font-medium text-rose-600 dark:text-rose-400">
          Comissão + impostos + markup somam {{ formatPercent(price.totalPercent) }}. Precisam ficar abaixo
          de 100% para existir um preço.
        </p>
        <template v-else>
          <div class="flex items-baseline justify-between">
            <span class="text-sm font-semibold text-slate-900 dark:text-white">Preço de venda</span>
            <span class="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{{ brl(price.price) }}</span>
          </div>
          <div v-if="unitPrice != null" class="mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>por {{ unitLabel }}</span>
            <span class="tabular-nums">{{ brl(unitPrice) }}</span>
          </div>
        </template>
      </div>
    </template>
  </section>
</template>
