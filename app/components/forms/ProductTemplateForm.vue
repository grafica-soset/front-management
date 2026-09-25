<script setup lang="ts">
/**
 * Formulário de MODELO DE PRODUTO salvo (atividade 037).
 *
 * Os mesmos campos que o orçamento guarda ao "Salvar como modelo": Modelo + Tipo, a estrutura
 * (lâmina ou bloco, vias, capa, vias iguais), as atividades NA ORDEM de produção e os impostos com
 * comissão e markup. Formato, quantidade, papéis e parâmetros das etapas são do pedido e não moram
 * aqui.
 *
 * Autocontido: recebe o modelo e as listas por props e emite `submit`. Cadastrar um Modelo novo
 * (digitado no combobox) é pedido ao pai via `create-model`.
 */
import { computed, reactive, ref, watch } from 'vue'
import type { ProductModelKeyValue } from '@/types/ProductModel'
import type { ProductTemplate, ProductTemplateKeyValue, ProductTemplateRequest } from '@/types/ProductTemplate'
import type { ProductStructure } from '@/types/QuoteDraft'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'
import { ACTIVITY_TYPE_LABELS } from '@/utils/activityCatalog'
import { emptyPricing, emptyTaxes, normalizePricing, normalizeTaxes, pricingIssues } from '@/utils/pricing'
import ModelTypeFields from '@/components/quotes/ModelTypeFields.vue'
import TaxesPricingFields from '@/components/quotes/TaxesPricingFields.vue'
import ActivityPickerModal from '@/components/quotes/ActivityPickerModal.vue'

const props = defineProps<{
  initial?: ProductTemplate | null
  mode?: 'create' | 'edit'
  loading?: boolean
  serverError?: string | null
  models: ProductModelKeyValue[]
  templates: ProductTemplateKeyValue[]
  creatingModel?: boolean
  /** Modelo recém-cadastrado pelo pai (via `create-model`), para já deixá-lo escolhido. */
  createdModel?: ProductModelKeyValue | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: ProductTemplateRequest): void
  (e: 'cancel'): void
  (e: 'create-model', name: string): void
}>()

const catalogs = useQuoteCatalogs()
const isEditing = computed(() => props.mode === 'edit')

const form = reactive({
  productModelId: props.initial?.productModelId ?? (null as number | null),
  productModelName: props.initial?.productModelName ?? '',
  typeName: props.initial?.typeName ?? '',
  structure: (props.initial?.structure ?? 'BLOCK') as ProductStructure,
  blades: props.initial?.blades ?? 1,
  vias: props.initial?.vias ?? 2,
  hasCovers: props.initial?.hasCovers ?? false,
  coverCount: props.initial?.coverCount || 1,
  identicalArtwork: props.initial?.identicalArtwork ?? (null as boolean | null),
  distinctArtworks: props.initial?.distinctArtworks ?? (null as number | null),
  activityIds: [...(props.initial?.activityIds ?? [])],
  taxes: props.initial ? normalizeTaxes(props.initial.taxes) : emptyTaxes(),
  pricing: props.initial ? normalizePricing(props.initial.pricing) : emptyPricing(),
  active: props.initial?.active ?? true,
})

// O pai cadastrou o Modelo digitado: deixa escolhido.
watch(
  () => props.createdModel,
  (created) => {
    if (!created) return
    form.productModelId = created.id
    form.productModelName = created.value
  },
)

const artworkCount = computed(() => (form.structure === 'BLADE' ? form.blades : form.vias))
const artworkLabel = computed(() => (form.structure === 'BLADE' ? 'lâminas' : 'vias'))

const identicalChoice = computed({
  get: () => (form.identicalArtwork === null ? '' : form.identicalArtwork ? 'yes' : 'no'),
  set: (value: string) => {
    form.identicalArtwork = value === '' ? null : value === 'yes'
    form.distinctArtworks = value === 'no' ? artworkCount.value : null
  },
})

// ---- Atividades, na ordem de produção ----
const pickerOpen = ref(false)
const usageCount = computed(() => {
  const counts: Record<number, number> = {}
  for (const id of form.activityIds) counts[id] = (counts[id] ?? 0) + 1
  return counts
})
const addActivity = (id: number) => form.activityIds.push(id)
const removeActivity = (index: number) => form.activityIds.splice(index, 1)
const moveActivity = (index: number, direction: -1 | 1) => {
  const target = index + direction
  if (target < 0 || target >= form.activityIds.length) return
  const [moved] = form.activityIds.splice(index, 1)
  form.activityIds.splice(target, 0, moved!)
}
const activityName = (id: number) => catalogs.findActivity(id)?.value ?? `Atividade #${id}`
const activityType = (id: number) => {
  const type = catalogs.findActivity(id)?.type
  return type ? ACTIVITY_TYPE_LABELS[type] : ''
}

const error = ref<string | null>(null)

const handleSubmit = () => {
  const problems: string[] = []
  if (!form.productModelId) problems.push('Escolha o Modelo.')
  if (!form.typeName.trim()) problems.push('Informe o Tipo.')
  if (form.activityIds.length === 0) problems.push('Adicione ao menos uma atividade.')
  problems.push(...pricingIssues(form.pricing, form.taxes))
  if (problems.length) {
    error.value = problems.join(' ')
    return
  }
  error.value = null
  const asks = artworkCount.value >= 2
  emit('submit', {
    customerId: 0,
    productModelId: form.productModelId!,
    typeName: form.typeName.trim(),
    structure: form.structure,
    blades: Math.max(1, Math.floor(form.blades) || 1),
    vias: Math.min(9, Math.max(1, Math.floor(form.vias) || 1)),
    hasCovers: form.hasCovers,
    coverCount: form.hasCovers ? Math.max(1, Math.floor(form.coverCount) || 1) : 0,
    identicalArtwork: asks ? form.identicalArtwork : null,
    distinctArtworks: asks && form.identicalArtwork === false ? form.distinctArtworks : null,
    activityIds: [...form.activityIds],
    taxes: form.taxes,
    pricing: form.pricing,
    active: isEditing.value ? form.active : true,
  })
}

const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200'
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <section class="space-y-4">
      <ModelTypeFields
        :models="models"
        :templates="templates"
        :product-model-id="form.productModelId"
        :product-model-name="form.productModelName"
        :type-name="form.typeName"
        :creating-model="creatingModel"
        required
        @update:product-model-id="form.productModelId = $event"
        @update:product-model-name="form.productModelName = $event"
        @update:type-name="form.typeName = $event"
        @create-model="emit('create-model', $event)"
      />
    </section>

    <fieldset class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Estrutura</legend>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label :class="labelClass">O produto é</label>
          <select v-model="form.structure" :class="inputClass">
            <option value="BLADE">Lâmina (folha única)</option>
            <option value="BLOCK">Bloco (jogos × vias)</option>
          </select>
        </div>
        <div v-if="form.structure === 'BLADE'">
          <label :class="labelClass">Quantidade de lâminas</label>
          <input v-model.number="form.blades" type="number" min="1" :class="inputClass" />
        </div>
        <div v-else>
          <label :class="labelClass">Quantidade de vias</label>
          <input v-model.number="form.vias" type="number" min="1" max="9" :class="inputClass" />
        </div>
        <div>
          <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input v-model="form.hasCovers" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
            Tem capa
          </label>
          <input v-if="form.hasCovers" v-model.number="form.coverCount" type="number" min="1" class="mt-2" :class="inputClass" aria-label="Quantidade de capas" />
        </div>
        <div v-if="artworkCount >= 2">
          <label :class="labelClass">As {{ artworkLabel }} são iguais?</label>
          <select v-model="identicalChoice" :class="inputClass">
            <option value="">Perguntar no orçamento</option>
            <option value="yes">Sim — o mesmo desenho</option>
            <option value="no">Não</option>
          </select>
          <div v-if="form.identicalArtwork === false" class="mt-2">
            <label :class="labelClass">Desenhos diferentes</label>
            <input v-model.number="form.distinctArtworks" type="number" min="1" :max="artworkCount" :class="inputClass" />
          </div>
        </div>
      </div>
    </fieldset>

    <fieldset class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Atividades (na ordem de produção)</legend>
      <ol v-if="form.activityIds.length" class="divide-y divide-slate-100 dark:divide-slate-700/60">
        <li v-for="(id, index) in form.activityIds" :key="`${id}-${index}`" class="flex items-center gap-3 py-2">
          <span class="w-6 text-right text-xs tabular-nums text-slate-400">{{ index + 1 }}.</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm text-slate-800 dark:text-slate-100">{{ activityName(id) }}</span>
            <span class="block text-xs text-slate-400">{{ activityType(id) }}</span>
          </span>
          <button type="button" :disabled="index === 0" class="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700" aria-label="Subir" @click="moveActivity(index, -1)">↑</button>
          <button type="button" :disabled="index === form.activityIds.length - 1" class="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700" aria-label="Descer" @click="moveActivity(index, 1)">↓</button>
          <button type="button" class="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700" @click="removeActivity(index)">Remover</button>
        </li>
      </ol>
      <p v-else class="text-sm text-slate-500 dark:text-slate-400">Nenhuma atividade ainda.</p>
      <button type="button" class="mt-3 rounded-lg border border-indigo-300 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-slate-700" @click="pickerOpen = true">
        + Adicionar atividade
      </button>
    </fieldset>

    <TaxesPricingFields :taxes="form.taxes" :pricing="form.pricing" @update:taxes="form.taxes = $event" @update:pricing="form.pricing = $event" />

    <label v-if="isEditing" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input v-model="form.active" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
      Ativo (aparece no "Adicionar do catálogo")
    </label>

    <p v-if="error || serverError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
      {{ error || serverError }}
    </p>

    <div class="flex justify-end gap-2">
      <button type="button" class="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" :disabled="loading" class="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar modelo' }}
      </button>
    </div>

    <ActivityPickerModal :is-open="pickerOpen" :usage-count="usageCount" @pick="addActivity" @close="pickerOpen = false" />
  </form>
</template>
