<script setup lang="ts">
/**
 * IMPOSTOS, COMISSÕES E MARKUP de um produto (atividade 037).
 *
 * O mesmo bloco no assistente do orçamento (passo "Impostos e Markup") e no cadastro de Modelo de
 * Produto. Recebe os dois objetos por props e devolve cópias alteradas por `update:*` — nenhuma
 * chamada de API aqui.
 *
 * As alíquotas seguem a Webmania, por onde sai a nota. Cada uma tem o "compõe o preço": marcada, ela
 * entra no divisor do preço; desmarcada, só vai para a nota (IPI por fora, retenções).
 */
import { computed } from 'vue'
import type { PricingTerms, ProductTaxes, TaxRateKey } from '@/types/ProductTaxes'
import {
  CSOSN_OPTIONS,
  CST_PIS_COFINS_OPTIONS,
  TAX_RATE_FIELDS,
  formatPercent,
  salesCommissionPercent,
  taxPricePercent,
} from '@/utils/pricing'

const props = defineProps<{
  taxes: ProductTaxes
  pricing: PricingTerms
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:taxes', value: ProductTaxes): void
  (e: 'update:pricing', value: PricingTerms): void
}>()

const num = (raw: string) => {
  const value = Number(String(raw).replace(',', '.'))
  return Number.isFinite(value) ? value : 0
}

const setPricing = (key: keyof PricingTerms, raw: string) =>
  emit('update:pricing', { ...props.pricing, [key]: num(raw) })

const setRate = (key: TaxRateKey, raw: string) =>
  emit('update:taxes', { ...props.taxes, [key]: { ...props.taxes[key], percent: num(raw) } })

const setComposes = (key: TaxRateKey, value: boolean) =>
  emit('update:taxes', { ...props.taxes, [key]: { ...props.taxes[key], composesPrice: value } })

const setText = (key: 'webmaniaTaxClass' | 'municipalBenefitId' | 'cstPisCofins' | 'ncm' | 'csosn', raw: string) =>
  emit('update:taxes', { ...props.taxes, [key]: raw.trim() === '' ? null : raw })

const setReduction = (raw: string) => emit('update:taxes', { ...props.taxes, baseReductionPercent: num(raw) })

const commission = computed(() => salesCommissionPercent(props.pricing))
const taxTotal = computed(() => taxPricePercent(props.taxes))

const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200'
</script>

<template>
  <div class="space-y-6">
    <!-- Comissões e markup -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">Comissão de vendas e markup</h2>
      <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
        A comissão de vendas é a soma das duas parcelas pagas ao vendedor.
      </p>
      <div class="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label :class="labelClass">Comissão na entrega (%)</label>
          <input :value="pricing.deliveryCommissionPercent" type="number" min="0" max="100" step="0.01" :disabled="disabled" :class="inputClass" @input="setPricing('deliveryCommissionPercent', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label :class="labelClass">Comissão no recebimento (%)</label>
          <input :value="pricing.receiptCommissionPercent" type="number" min="0" max="100" step="0.01" :disabled="disabled" :class="inputClass" @input="setPricing('receiptCommissionPercent', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label :class="labelClass">Markup (%)</label>
          <input :value="pricing.markupPercent" type="number" min="0" max="100" step="0.01" :disabled="disabled" :class="inputClass" @input="setPricing('markupPercent', ($event.target as HTMLInputElement).value)" />
        </div>
      </div>
      <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Comissão de vendas: <strong class="tabular-nums">{{ formatPercent(commission) }}</strong>
      </p>
    </section>

    <!-- Impostos -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 class="text-base font-semibold text-slate-900 dark:text-white">Impostos</h2>
          <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Vão para a nota fiscal (Webmania) quando o orçamento for aprovado. Marque as alíquotas que
            compõem o preço.
          </p>
        </div>
        <span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          No preço: {{ formatPercent(taxTotal) }}
        </span>
      </div>

      <div class="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label :class="labelClass">Classe de imposto Webmania</label>
          <input :value="taxes.webmaniaTaxClass ?? ''" type="text" maxlength="30" placeholder="Ex.: REF4471023" :disabled="disabled" :class="inputClass" @input="setText('webmaniaTaxClass', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label :class="labelClass">NCM</label>
          <input :value="taxes.ncm ?? ''" type="text" maxlength="10" placeholder="Ex.: 4820.10.00" :disabled="disabled" :class="inputClass" @input="setText('ncm', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label :class="labelClass">CSOSN</label>
          <select :value="taxes.csosn ?? ''" :disabled="disabled" :class="inputClass" @change="setText('csosn', ($event.target as HTMLSelectElement).value)">
            <option value="">Não informado</option>
            <option v-for="o in CSOSN_OPTIONS" :key="o.code" :value="o.code">{{ o.code }} — {{ o.label }}</option>
          </select>
        </div>
        <div class="sm:col-span-3">
          <label :class="labelClass">CST do PIS/COFINS</label>
          <select :value="taxes.cstPisCofins ?? ''" :disabled="disabled" :class="inputClass" @change="setText('cstPisCofins', ($event.target as HTMLSelectElement).value)">
            <option value="">Não informado</option>
            <option v-for="o in CST_PIS_COFINS_OPTIONS" :key="o.code" :value="o.code">{{ o.code }} — {{ o.label }}</option>
          </select>
        </div>
        <div>
          <label :class="labelClass">Redução da base de cálculo (%)</label>
          <input :value="taxes.baseReductionPercent" type="number" min="0" max="100" step="0.01" :disabled="disabled" :class="inputClass" @input="setReduction(($event.target as HTMLInputElement).value)" />
        </div>
        <div class="sm:col-span-2">
          <label :class="labelClass">
            Identificador do benefício municipal
            <span v-if="taxes.baseReductionPercent > 0" class="text-rose-500">*</span>
          </label>
          <input :value="taxes.municipalBenefitId ?? ''" type="text" maxlength="30" :disabled="disabled" :class="inputClass" @input="setText('municipalBenefitId', ($event.target as HTMLInputElement).value)" />
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Obrigatório quando há redução (Padrão Nacional).</p>
        </div>
      </div>

      <div class="mt-5 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th class="py-2 pr-3 font-semibold">Alíquota</th>
              <th class="w-32 py-2 pr-3 font-semibold">%</th>
              <th class="py-2 font-semibold">Compõe o preço</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
            <tr v-for="field in TAX_RATE_FIELDS" :key="field.key">
              <td class="py-2 pr-3">
                <span class="block text-slate-800 dark:text-slate-100">{{ field.label }}</span>
                <span v-if="field.hint" class="block text-xs text-slate-400 dark:text-slate-500">{{ field.hint }}</span>
              </td>
              <td class="py-2 pr-3">
                <input :value="taxes[field.key].percent" type="number" min="0" max="100" step="0.01" :disabled="disabled" :class="inputClass" :aria-label="`${field.label} (%)`" @input="setRate(field.key, ($event.target as HTMLInputElement).value)" />
              </td>
              <td class="py-2">
                <label class="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <input type="checkbox" :checked="taxes[field.key].composesPrice" :disabled="disabled" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" @change="setComposes(field.key, ($event.target as HTMLInputElement).checked)" />
                  sim
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
