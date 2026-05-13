<script setup lang="ts">
/**
 * Formulário unificado para criar/editar Papel.
 *
 * Inteligências:
 *  - Dimensões: o input mostra o sufixo da unidade da empresa ativa
 *    (mm/cm/m) e o componente converte para milímetros antes de emitir.
 *  - Tipo de papel: se a lista veio vazia ou o usuário não encontrou o tipo
 *    desejado, emite `request-new-paper-type` para a página abrir o modal de
 *    cadastro de tipo e, ao terminar, voltar para este form com o novo id
 *    pré-selecionado.
 *  - Preço por folha: calculado automaticamente pelo backend a partir das
 *    dimensões, gramatura e preço/kg. O input fica readonly e mostra um
 *    preview em tempo real para feedback imediato ao usuário.
 *  - Feedback CUSTOMER: badge informando que ao salvar o papel será ativado
 *    automaticamente para a empresa atual (auto-link da API).
 */
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import type { CreatePaperRequest, Paper, UpdatePaperRequest } from '@/types/Paper'
import type { PaperType } from '@/types/PaperType'
import { useUnitConverter } from '@/composables/useUnitConverter'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  /** Quando informado, o form opera em modo edição. */
  initial?: Paper | null
  /**
   * Quando informado (e `initial` está nulo), o form opera em modo criação
   * mas pré-preenche os campos a partir de um papel existente. Usado pela
   * ação "Duplicar". Os campos de identificação (code/longName/shortName)
   * recebem sufixo "(cópia)" para evitar colisão de unique constraints.
   */
  duplicateFrom?: Paper | null
  paperTypes: PaperType[]
  /** ID que deve ser pré-selecionado no select (ex.: novo tipo recém-criado). */
  preselectPaperTypeId?: number | null
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: CreatePaperRequest | UpdatePaperRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
  (e: 'request-new-paper-type'): void
}>()

const auth = useAuthStore()
const { suffix, fromMillimeters, toMillimeters } = useUnitConverter()

const isEditing = computed(() => !!props.initial)
const isDuplicating = computed(() => !props.initial && !!props.duplicateFrom)
const showCustomerAutoLinkHint = computed(
  () => !isEditing.value && auth.hasCustomer && !auth.isAdmin && !!auth.activeCompanyId,
)

/** Sufixo aplicado aos campos de identificação ao duplicar para evitar conflito. */
const withCopySuffix = (value: string) => (value ? `${value} (cópia)` : '')

/** Fonte de dados iniciais: prioriza edição; em duplicação, usa o papel-base. */
const seed = props.initial ?? props.duplicateFrom ?? null

/** Converte mm → unidade atual para popular o input quando há seed. */
const initialWidth = seed ? fromMillimeters(seed.width.millimeters) ?? 0 : 0
const initialHeight = seed ? fromMillimeters(seed.height.millimeters) ?? 0 : 0

const form = reactive({
  paperTypeId: seed?.paperType.id ?? props.preselectPaperTypeId ?? 0,
  code: isDuplicating.value ? withCopySuffix(seed?.code ?? '') : seed?.code ?? '',
  longName: isDuplicating.value ? withCopySuffix(seed?.longName ?? '') : seed?.longName ?? '',
  shortName: isDuplicating.value ? withCopySuffix(seed?.shortName ?? '') : seed?.shortName ?? '',
  pricePerKg: seed?.pricePerKg ?? 0,
  width: initialWidth,
  height: initialHeight,
  thicknessMicrometers: seed?.thicknessMicrometers ?? 0,
  weightPerM2Grams: seed?.weightPerM2Grams ?? 0,
  isEnvelope: seed?.isEnvelope ?? false,
  active: seed?.active ?? true,
})

/**
 * Preview do preço por folha calculado no frontend (espelha a fórmula do
 * backend). O valor enviado é sempre recalculado pelo servidor — aqui é só
 * feedback visual durante a edição.
 *
 *   areaM² × (g/m² / 1000) × R$/kg = R$/folha
 */
const pricePerSheetPreview = computed(() => {
  const widthMm = toMillimeters(form.width) ?? 0
  const heightMm = toMillimeters(form.height) ?? 0
  const widthMeters = widthMm / 1000
  const heightMeters = heightMm / 1000
  const areaM2 = widthMeters * heightMeters
  const grammageKg = form.weightPerM2Grams / 1000
  const simulated = areaM2 * grammageKg * form.pricePerKg
  return Number.isFinite(simulated) && simulated > 0 ? simulated : 0
})

// Sincroniza quando a página informa um tipo recém-criado.
watch(
  () => props.preselectPaperTypeId,
  (next) => {
    if (next && !isEditing.value) form.paperTypeId = next
  },
)

watch(
  () => props.initial,
  (next) => {
    if (!next) return
    form.paperTypeId = next.paperType.id
    form.code = next.code
    form.longName = next.longName
    form.shortName = next.shortName
    form.pricePerKg = next.pricePerKg
    form.width = fromMillimeters(next.width.millimeters) ?? 0
    form.height = fromMillimeters(next.height.millimeters) ?? 0
    form.thicknessMicrometers = next.thicknessMicrometers
    form.weightPerM2Grams = next.weightPerM2Grams
    form.isEnvelope = next.isEnvelope
    form.active = next.active
  },
)

watch(
  () => props.duplicateFrom,
  (next) => {
    if (!next || props.initial) return
    form.paperTypeId = next.paperType.id
    form.code = withCopySuffix(next.code)
    form.longName = withCopySuffix(next.longName)
    form.shortName = withCopySuffix(next.shortName)
    form.pricePerKg = next.pricePerKg
    form.width = fromMillimeters(next.width.millimeters) ?? 0
    form.height = fromMillimeters(next.height.millimeters) ?? 0
    form.thicknessMicrometers = next.thicknessMicrometers
    form.weightPerM2Grams = next.weightPerM2Grams
    form.isEnvelope = next.isEnvelope
    form.active = true
  },
)

const errors = ref<Partial<Record<keyof typeof form, string>>>({})

const schema = z.object({
  paperTypeId: z.number().int().positive('Selecione um tipo de papel.'),
  code: z.string().min(1, 'Informe o código.').max(50),
  longName: z.string().min(1, 'Informe o nome longo.'),
  shortName: z.string().min(1, 'Informe o nome curto.'),
  pricePerKg: z.number().min(0, 'Preço por quilo inválido.'),
  width: z.number().positive('Largura deve ser maior que zero.'),
  height: z.number().positive('Altura deve ser maior que zero.'),
  thicknessMicrometers: z.number().int().min(1, 'Espessura inválida.'),
  weightPerM2Grams: z.number().int().min(1, 'Gramatura inválida.'),
  isEnvelope: z.boolean(),
  active: z.boolean(),
})

const handleSubmit = () => {
  errors.value = {}
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof typeof form
      if (key && !errors.value[key]) errors.value[key] = issue.message
    }
    return
  }
  const data = result.data
  const widthMm = toMillimeters(data.width) ?? 0
  const heightMm = toMillimeters(data.height) ?? 0

  const base = {
    paperTypeId: data.paperTypeId,
    code: data.code,
    longName: data.longName,
    shortName: data.shortName,
    pricePerKg: data.pricePerKg,
    // Valor de referência; o backend recalcula e sobrescreve.
    pricePerSheet: pricePerSheetPreview.value,
    widthMm,
    heightMm,
    thicknessMicrometers: data.thicknessMicrometers,
    weightPerM2Grams: data.weightPerM2Grams,
    isEnvelope: data.isEnvelope,
  }

  if (isEditing.value) {
    const payload: UpdatePaperRequest = { ...base, active: data.active }
    emit('submit', payload, 'update')
  } else {
    const payload: CreatePaperRequest = base
    emit('submit', payload, 'create')
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <div
      v-if="isDuplicating"
      class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200"
    >
      Duplicando um papel existente. Ajuste o código e os nomes antes de salvar — eles precisam ser únicos.
    </div>

    <div
      v-if="showCustomerAutoLinkHint"
      class="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-800 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-200"
    >
      Ao salvar, este papel será automaticamente ativado para a sua empresa.
    </div>

    <!-- Tipo + ação inline -->
    <div>
      <label for="paper-type" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Tipo de papel <span class="text-rose-500">*</span>
      </label>
      <div class="flex gap-2">
        <select
          id="paper-type"
          v-model.number="form.paperTypeId"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.paperTypeId }"
        >
          <option :value="0" disabled>Selecione...</option>
          <option v-for="type in paperTypes" :key="type.id" :value="type.id">
            {{ type.name }}
          </option>
        </select>
        <button
          type="button"
          @click="emit('request-new-paper-type')"
          class="flex-shrink-0 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800 dark:hover:bg-indigo-900/50"
          title="Cadastrar novo tipo de papel"
        >
          + Novo tipo
        </button>
      </div>
      <p v-if="errors.paperTypeId" class="mt-1 text-xs text-rose-600">{{ errors.paperTypeId }}</p>
      <p v-else-if="paperTypes.length === 0" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Nenhum tipo cadastrado. Clique em "Novo tipo" para criar o primeiro.
      </p>
    </div>

    <!-- Nomes e código -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-2">
        <label for="paper-long-name" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Nome longo <span class="text-rose-500">*</span>
        </label>
        <input
          id="paper-long-name"
          v-model="form.longName"
          type="text"
          placeholder="Sulfite 90 g/m² A4 Premium"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.longName }"
        />
        <p v-if="errors.longName" class="mt-1 text-xs text-rose-600">{{ errors.longName }}</p>
      </div>
      <div>
        <label for="paper-short-name" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Nome curto <span class="text-rose-500">*</span>
        </label>
        <input
          id="paper-short-name"
          v-model="form.shortName"
          type="text"
          placeholder="A4 90g"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.shortName }"
        />
        <p v-if="errors.shortName" class="mt-1 text-xs text-rose-600">{{ errors.shortName }}</p>
      </div>
    </div>

    <div>
      <label for="paper-code" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Código <span class="text-rose-500">*</span>
      </label>
      <input
        id="paper-code"
        v-model="form.code"
        type="text"
        placeholder="SULFITE-A4-90"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.code }"
      />
      <p v-if="errors.code" class="mt-1 text-xs text-rose-600">{{ errors.code }}</p>
    </div>

    <!-- Gramatura / espessura -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="paper-weight" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Gramatura <span class="text-rose-500">*</span>
        </label>
        <div class="relative">
          <input
            id="paper-weight"
            v-model.number="form.weightPerM2Grams"
            type="number"
            min="1"
            step="1"
            class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 pr-14 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.weightPerM2Grams }"
          />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">g/m²</span>
        </div>
        <p v-if="errors.weightPerM2Grams" class="mt-1 text-xs text-rose-600">{{ errors.weightPerM2Grams }}</p>
      </div>
      <div>
        <label for="paper-thickness" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Espessura <span class="text-rose-500">*</span>
        </label>
        <div class="relative">
          <input
            id="paper-thickness"
            v-model.number="form.thicknessMicrometers"
            type="number"
            min="1"
            step="1"
            class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 pr-12 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.thicknessMicrometers }"
          />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">µm</span>
        </div>
        <p v-if="errors.thicknessMicrometers" class="mt-1 text-xs text-rose-600">{{ errors.thicknessMicrometers }}</p>
      </div>
    </div>

    <!-- Dimensões (com sufixo dinâmico) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="paper-width" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Largura <span class="text-rose-500">*</span>
        </label>
        <div class="relative">
          <input
            id="paper-width"
            v-model.number="form.width"
            type="number"
            min="0"
            step="0.001"
            class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 pr-12 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.width }"
          />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
        </div>
        <p v-if="errors.width" class="mt-1 text-xs text-rose-600">{{ errors.width }}</p>
      </div>
      <div>
        <label for="paper-height" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Altura <span class="text-rose-500">*</span>
        </label>
        <div class="relative">
          <input
            id="paper-height"
            v-model.number="form.height"
            type="number"
            min="0"
            step="0.001"
            class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 pr-12 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.height }"
          />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
        </div>
        <p v-if="errors.height" class="mt-1 text-xs text-rose-600">{{ errors.height }}</p>
      </div>
    </div>

    <!-- Preços -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="paper-price-kg" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Preço por kg <span class="text-rose-500">*</span>
        </label>
        <div class="relative">
          <span class="absolute inset-y-0 left-3 flex items-center text-xs text-slate-500">R$</span>
          <input
            id="paper-price-kg"
            v-model.number="form.pricePerKg"
            type="number"
            min="0"
            step="0.0001"
            class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 pl-10 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.pricePerKg }"
          />
        </div>
        <p v-if="errors.pricePerKg" class="mt-1 text-xs text-rose-600">{{ errors.pricePerKg }}</p>
      </div>
      <div>
        <label for="paper-price-sheet" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Preço por folha
          <span class="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">(calculado)</span>
        </label>
        <div class="relative">
          <span class="absolute inset-y-0 left-3 flex items-center text-xs text-slate-500">R$</span>
          <input
            id="paper-price-sheet"
            :value="pricePerSheetPreview.toFixed(4)"
            type="text"
            readonly
            tabindex="-1"
            aria-readonly="true"
            class="bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-lg block w-full p-3 pl-10 cursor-not-allowed dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-300"
          />
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Preview calculado a partir da área, gramatura e preço/kg. O valor final é confirmado pelo servidor ao salvar.
        </p>
      </div>
    </div>

    <!-- Flags -->
    <div class="flex flex-wrap items-center gap-6">
      <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input
          v-model="form.isEnvelope"
          type="checkbox"
          class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
        />
        Envelope
      </label>
      <label v-if="isEditing" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input
          v-model="form.active"
          type="checkbox"
          class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
        />
        Papel ativo
      </label>
    </div>

    <div
      v-if="serverError"
      class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300"
    >
      {{ serverError }}
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <button
        type="button"
        @click="emit('cancel')"
        class="text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="loading"
        class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-2.5 shadow-md shadow-indigo-500/20"
      >
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : isDuplicating ? 'Duplicar papel' : 'Cadastrar papel' }}
      </button>
    </div>
  </form>
</template>
