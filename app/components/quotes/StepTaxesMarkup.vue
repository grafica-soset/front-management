<script setup lang="ts">
/**
 * Passo 4 do assistente — IMPOSTOS E MARKUP (atividade 037).
 *
 * Impostos do produto (os que a nota vai precisar), comissão do vendedor e markup — e o PREÇO
 * FINAL mudando enquanto o usuário mexe:
 *
 *     preço = custo / (100% − (comissão + impostos que compõem o preço + markup))
 *
 * Aqui também mora o "Salvar como modelo": o catálogo SÓ recebe modelo NOVO a partir do orçamento.
 * Se o Modelo + Tipo já existe, o sistema pede outro tipo — nunca sobrescreve o salvo.
 */
import { computed, ref } from 'vue'
import { useQuoteDraftStore, templateRequestFromProduct } from '@/stores/quoteDraft'
import { useProductCatalog } from '@/composables/useProductCatalog'
import { useProductTemplates } from '@/composables/useProductTemplates'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { apiErrorCode, extractApiError } from '@/utils/apiError'
import { priceFromCost, pricingIssues } from '@/utils/pricing'
import TaxesPricingFields from '@/components/quotes/TaxesPricingFields.vue'
import PriceBreakdownCard from '@/components/quotes/PriceBreakdownCard.vue'

const store = useQuoteDraftStore()
const auth = useAuthStore()
const toast = useToast()
const catalog = useProductCatalog()
const productTemplates = useProductTemplates()
const product = computed(() => store.draft!)

const price = computed(() =>
  store.draftCost ? priceFromCost(store.draftCost.totalCost, product.value.pricing, product.value.taxes) : null,
)
const issues = computed(() => pricingIssues(product.value.pricing, product.value.taxes))
const unitLabel = computed(() => (product.value.structure === 'BLADE' ? 'peça' : 'bloco'))

// ---- Salvar como modelo ----
const savingTemplate = ref(false)
const templateError = ref<string | null>(null)
/** Deu 409: o par já existe. A tela abre o campo do tipo aqui mesmo para o usuário trocar. */
const duplicateKey = ref(false)

const templateBlockers = computed(() => {
  const list: string[] = []
  if (!product.value.productModelId) list.push('Escolher o Modelo (passo 1)')
  if (!product.value.typeName.trim()) list.push('Informar o Tipo (passo 1)')
  if (product.value.steps.length === 0) list.push('Ativar ao menos uma atividade')
  if (issues.value.length > 0) list.push('Corrigir os percentuais acima')
  return list
})

const saveAsTemplate = async () => {
  if (templateBlockers.value.length) return
  savingTemplate.value = true
  templateError.value = null
  try {
    const created = await productTemplates.create(
      templateRequestFromProduct(product.value, auth.activeCompanyId ?? 0),
    )
    product.value.productTemplateId = created.id
    duplicateKey.value = false
    await catalog.reloadTemplates()
    toast.success(`Modelo "${created.label}" salvo no catálogo.`)
  } catch (err) {
    duplicateKey.value = apiErrorCode(err) === 'ProductTemplateAlreadyExistsException'
    templateError.value = extractApiError(err, 'Não foi possível salvar o modelo.')
  } finally {
    savingTemplate.value = false
  }
}

const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
</script>

<template>
  <div class="space-y-6">
    <TaxesPricingFields
      :taxes="product.taxes"
      :pricing="product.pricing"
      @update:taxes="product.taxes = $event"
      @update:pricing="product.pricing = $event"
    />

    <div
      v-if="issues.length"
      class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
    >
      <ul class="list-inside list-disc space-y-0.5">
        <li v-for="issue in issues" :key="issue">{{ issue }}</li>
      </ul>
    </div>

    <PriceBreakdownCard :price="price" :quantity="product.quantity" :unit-label="unitLabel" />

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-slate-900 dark:text-white">Salvar como modelo</h2>
          <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Guarda a estrutura, as atividades e estes impostos em
            <strong class="text-slate-700 dark:text-slate-200">
              {{ product.productModelName || 'Modelo' }} &gt; {{ product.typeName.trim() || 'Tipo' }}
            </strong>
            para os próximos orçamentos. Formato, quantidade, papéis e parâmetros ficam de fora.
          </p>
        </div>
        <button
          type="button"
          :disabled="templateBlockers.length > 0 || savingTemplate"
          class="shrink-0 rounded-lg border border-indigo-300 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-slate-700"
          @click="saveAsTemplate"
        >
          {{ savingTemplate ? 'Salvando...' : 'Salvar como modelo' }}
        </button>
      </div>

      <p v-if="product.productTemplateId && !duplicateKey" class="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
        Este produto está ligado a um modelo do catálogo.
      </p>

      <ul v-if="templateBlockers.length" class="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
        <li v-for="b in templateBlockers" :key="b">• {{ b }}</li>
      </ul>

      <div v-if="templateError" class="mt-3 space-y-3">
        <p class="text-sm text-rose-600 dark:text-rose-400">{{ templateError }}</p>
        <!-- O catálogo não é sobrescrito pelo orçamento: troca-se o tipo e salva-se um modelo novo. -->
        <div v-if="duplicateKey" class="max-w-sm">
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Outro tipo</label>
          <input v-model="product.typeName" type="text" maxlength="150" :class="inputClass" />
        </div>
      </div>
    </section>
  </div>
</template>
