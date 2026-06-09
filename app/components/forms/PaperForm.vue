<script setup lang="ts">
/**
 * Formulário unificado para criar/editar uma Dimensão (SKU) de um Agrupamento
 * de medidas.
 *
 * Inteligências:
 *  - Agrupamento: gramatura, espessura e lado do papel são herdados do
 *    agrupamento e exibidos SOMENTE LEITURA. Quando `lockedPaperType` é
 *    informado, o agrupamento fica fixo; caso contrário há um seletor com ação
 *    de cadastro.
 *  - Formato: a dimensão do papel vem de um Formato cadastrado (padrão de
 *    mercado). O seletor é um combobox COM BUSCA, pois pode haver muitas opções.
 *    As medidas são exibidas na unidade da empresa ativa.
 *  - Sentido da fibra: propriedade do papel; o usuário escolhe se a fibra corre
 *    no sentido da largura ou do comprimento, com a medida do formato ao lado.
 *  - Preço por folha: calculado pelo backend a partir das dimensões do formato,
 *    da gramatura do agrupamento e do preço/kg. O input fica readonly e mostra
 *    um preview em tempo real.
 */
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import type { CreatePaperRequest, Paper, UpdatePaperRequest } from '@/types/Paper'
import type { PaperType } from '@/types/PaperType'
import type { Format } from '@/types/Format'
import type { GrainDirection } from '@/types/GrainDirection'
import { useUnitConverter } from '@/composables/useUnitConverter'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  /** Quando informado, o form opera em modo edição. */
  initial?: Paper | null
  /** Pré-preenche os campos a partir de um papel existente (ação "Duplicar"). */
  duplicateFrom?: Paper | null
  /** Agrupamentos disponíveis para o seletor (ignorado quando `lockedPaperType`). */
  paperTypes: PaperType[]
  /** Formatos disponíveis (dimensões-padrão de mercado) para o seletor com busca. */
  formats: Format[]
  /** Agrupamento fixo (tela de detalhe). Esconde o seletor. */
  lockedPaperType?: PaperType | null
  /** ID pré-selecionado no seletor (ex.: agrupamento recém-criado). */
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
const { format: formatMeasure } = useUnitConverter()

const isEditing = computed(() => !!props.initial)
const isDuplicating = computed(() => !props.initial && !!props.duplicateFrom)
const isFamilyLocked = computed(() => !!props.lockedPaperType)
const showCustomerAutoLinkHint = computed(
  () => !isEditing.value && auth.hasCustomer && !auth.isAdmin && !!auth.activeCompanyId,
)

const withCopySuffix = (value: string) => (value ? `${value} (cópia)` : '')

const seed = props.initial ?? props.duplicateFrom ?? null

const form = reactive({
  paperTypeId: props.lockedPaperType?.id ?? seed?.paperType.id ?? props.preselectPaperTypeId ?? 0,
  formatId: seed?.format.id ?? 0,
  code: isDuplicating.value ? withCopySuffix(seed?.code ?? '') : seed?.code ?? '',
  longName: isDuplicating.value ? withCopySuffix(seed?.longName ?? '') : seed?.longName ?? '',
  pricePerKg: seed?.pricePerKg ?? 0,
  grainDirection: (seed?.grainDirection ?? 'WIDTH') as GrainDirection,
  isEnvelope: seed?.isEnvelope ?? false,
  active: seed?.active ?? true,
})

/** Formato atualmente selecionado — fonte das dimensões exibidas e do preço. */
const selectedFormat = computed<Format | null>(
  () => props.formats.find((f) => f.id === form.formatId) ?? null,
)

// ----- Combobox de formato com busca -----
const formatQuery = ref('')
const formatOpen = ref(false)

const filteredFormats = computed<Format[]>(() => {
  const term = formatQuery.value.trim().toLowerCase()
  if (!term) return props.formats
  return props.formats.filter((f) => f.name.toLowerCase().includes(term))
})

/** Rótulo do formato com as medidas na unidade da empresa (ex.: "66x96 — 66 × 96 cm"). */
const formatLabel = (f: Format): string =>
  `${f.name} — ${formatMeasure(f.width.millimeters)} × ${formatMeasure(f.height.millimeters)}`

const selectFormat = (f: Format) => {
  form.formatId = f.id
  formatQuery.value = ''
  formatOpen.value = false
}

/**
 * Opções do sentido da fibra, com a medida de cada lado do formato embutida no
 * rótulo para deixar evidente o que está sendo escolhido (ex.: "Largura (66 cm)").
 */
const grainOptions = computed<{ value: GrainDirection; label: string }[]>(() => {
  const f = selectedFormat.value
  return [
    { value: 'WIDTH', label: `Largura (${f ? formatMeasure(f.width.millimeters) : '—'})` },
    { value: 'HEIGHT', label: `Comprimento (${f ? formatMeasure(f.height.millimeters) : '—'})` },
  ]
})

/** Agrupamento atualmente selecionado — fonte da gramatura/espessura/face exibidas. */
const selectedFamily = computed<PaperType | null>(
  () => props.lockedPaperType ?? props.paperTypes.find((t) => t.id === form.paperTypeId) ?? null,
)

/**
 * Preview do preço por folha (espelha a fórmula do backend; valor final é
 * recalculado no servidor): áreaM² × (g/m² / 1000) × R$/kg.
 */
const pricePerSheetPreview = computed(() => {
  const widthMm = selectedFormat.value?.width.millimeters ?? 0
  const heightMm = selectedFormat.value?.height.millimeters ?? 0
  const areaM2 = (widthMm / 1000) * (heightMm / 1000)
  const grammageKg = (selectedFamily.value?.weightPerM2Grams ?? 0) / 1000
  const simulated = areaM2 * grammageKg * form.pricePerKg
  return Number.isFinite(simulated) && simulated > 0 ? simulated : 0
})

watch(
  () => props.preselectPaperTypeId,
  (next) => {
    if (next && !isEditing.value && !isFamilyLocked.value) form.paperTypeId = next
  },
)

watch(
  () => props.lockedPaperType,
  (next) => {
    if (next) form.paperTypeId = next.id
  },
)

watch(
  () => props.initial,
  (next) => {
    if (!next) return
    form.paperTypeId = next.paperType.id
    form.formatId = next.format.id
    form.code = next.code
    form.longName = next.longName
    form.pricePerKg = next.pricePerKg ?? 0
    form.grainDirection = next.grainDirection ?? 'WIDTH'
    form.isEnvelope = next.isEnvelope
    form.active = next.active
  },
)

watch(
  () => props.duplicateFrom,
  (next) => {
    if (!next || props.initial) return
    form.paperTypeId = props.lockedPaperType?.id ?? next.paperType.id
    form.formatId = next.format.id
    form.code = withCopySuffix(next.code)
    form.longName = withCopySuffix(next.longName)
    form.pricePerKg = next.pricePerKg ?? 0
    form.grainDirection = next.grainDirection ?? 'WIDTH'
    form.isEnvelope = next.isEnvelope
    form.active = true
  },
)

const errors = ref<Partial<Record<keyof typeof form, string>>>({})

const schema = z.object({
  paperTypeId: z.number().int().positive('Selecione um agrupamento de medidas.'),
  formatId: z.number().int().positive('Selecione um formato.'),
  code: z.string().min(1, 'Informe o código.').max(50),
  longName: z.string().min(1, 'Informe o nome completo.').max(255),
  pricePerKg: z.number().min(0, 'Preço por quilo inválido.'),
  grainDirection: z.enum(['WIDTH', 'HEIGHT'], { message: 'Selecione o sentido da fibra.' }),
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

  const base = {
    paperTypeId: data.paperTypeId,
    formatId: data.formatId,
    code: data.code,
    longName: data.longName,
    pricePerKg: data.pricePerKg,
    grainDirection: data.grainDirection,
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
      Duplicando um papel existente. Ajuste o código, o nome e o formato antes de salvar — não pode haver dois papéis com o mesmo formato no agrupamento.
    </div>

    <div
      v-if="showCustomerAutoLinkHint"
      class="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-800 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-200"
    >
      Ao salvar, este papel será automaticamente ativado para a sua empresa.
    </div>

    <!-- Agrupamento de medidas: seletor (modo catálogo) ou fixo (modo detalhe) -->
    <div v-if="!isFamilyLocked">
      <label for="paper-type" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Agrupamento de medidas <span class="text-rose-500">*</span>
      </label>
      <div class="flex gap-2">
        <select
          id="paper-type"
          v-model.number="form.paperTypeId"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.paperTypeId }"
        >
          <option :value="0" disabled>Selecione...</option>
          <option v-for="type in paperTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
        </select>
        <button
          type="button"
          @click="emit('request-new-paper-type')"
          class="flex-shrink-0 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800 dark:hover:bg-indigo-900/50"
          title="Cadastrar novo agrupamento de medidas"
        >
          + Novo agrupamento
        </button>
      </div>
      <p v-if="errors.paperTypeId" class="mt-1 text-xs text-rose-600">{{ errors.paperTypeId }}</p>
      <p v-else-if="paperTypes.length === 0" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Nenhum agrupamento cadastrado. Clique em "Novo agrupamento" para criar o primeiro.
      </p>
    </div>

    <!-- Atributos herdados do agrupamento (somente leitura) -->
    <div
      v-if="selectedFamily"
      class="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 dark:bg-slate-900/40 dark:border-slate-700"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Agrupamento de medidas</p>
      <p class="text-sm font-medium text-slate-900 dark:text-white">{{ selectedFamily.name }}</p>
      <div class="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        <span>Gramatura: <strong>{{ selectedFamily.weightPerM2Grams }} g/m²</strong></span>
        <span>Espessura: <strong>{{ selectedFamily.thicknessMicrometers }} µm</strong></span>
        <span>Lado do papel: <strong>{{ selectedFamily.bothSidesEqual ? '2 lados' : '1 lado' }}</strong></span>
      </div>
    </div>

    <!-- Formato (dimensão) — combobox com busca -->
    <div class="relative">
      <label for="paper-format" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Formato (dimensão) <span class="text-rose-500">*</span>
      </label>
      <div
        class="flex items-center justify-between gap-2 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg p-3 cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        :class="{ 'border-rose-500': errors.formatId }"
        @click="formatOpen = !formatOpen"
      >
        <span v-if="selectedFormat" class="truncate">{{ formatLabel(selectedFormat) }}</span>
        <span v-else class="text-slate-400">Selecione um formato...</span>
        <svg class="w-4 h-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
      </div>

      <div
        v-if="formatOpen"
        class="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:bg-slate-800 dark:border-slate-700"
      >
        <div class="p-2 border-b border-slate-100 dark:border-slate-700">
          <input
            id="paper-format"
            v-model="formatQuery"
            type="search"
            placeholder="Buscar formato (ex.: 66x96)..."
            class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            @click.stop
          />
        </div>
        <ul class="max-h-56 overflow-y-auto py-1">
          <li v-if="filteredFormats.length === 0" class="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
            Nenhum formato encontrado.
          </li>
          <li
            v-for="f in filteredFormats"
            :key="f.id"
            class="px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700"
            :class="{ 'bg-indigo-50 dark:bg-slate-700 font-medium': f.id === form.formatId }"
            @click="selectFormat(f)"
          >
            {{ formatLabel(f) }}
          </li>
        </ul>
      </div>
      <p v-if="errors.formatId" class="mt-1 text-xs text-rose-600">{{ errors.formatId }}</p>
      <p v-else-if="formats.length === 0" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Nenhum formato cadastrado. Cadastre os formatos em "Papéis › Formatos" antes de criar papéis.
      </p>
    </div>

    <!-- Nome completo -->
    <div>
      <label for="paper-long-name" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Nome completo <span class="text-rose-500">*</span>
      </label>
      <input
        id="paper-long-name"
        v-model="form.longName"
        type="text"
        maxlength="255"
        placeholder="Couché Brilho 150g — 660 x 960 mm"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.longName }"
      />
      <p v-if="errors.longName" class="mt-1 text-xs text-rose-600">{{ errors.longName }}</p>
    </div>

    <!-- Código / SKU -->
    <div>
      <label for="paper-code" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Código / SKU <span class="text-rose-500">*</span>
      </label>
      <input
        id="paper-code"
        v-model="form.code"
        type="text"
        maxlength="50"
        placeholder="COUCHE-150-66X96"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.code }"
      />
      <p v-if="errors.code" class="mt-1 text-xs text-rose-600">{{ errors.code }}</p>
    </div>

    <!-- Sentido da fibra -->
    <div>
      <label for="paper-grain" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Sentido da fibra <span class="text-rose-500">*</span>
      </label>
      <select
        id="paper-grain"
        v-model="form.grainDirection"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.grainDirection }"
      >
        <option v-for="opt in grainOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <p v-if="errors.grainDirection" class="mt-1 text-xs text-rose-600">{{ errors.grainDirection }}</p>
      <p v-else class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Lado da folha em que a fibra corre — largura ou comprimento.
      </p>
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
          Calculado a partir da área do formato, da gramatura do agrupamento e do preço/kg. O valor final é confirmado pelo servidor ao salvar.
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
