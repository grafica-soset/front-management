<script setup lang="ts">
/**
 * Formulário unificado para criar/editar um Formato (dimensão-padrão de mercado) e
 * suas conversões de corte (subformatos).
 *
 * Inteligências:
 *  - Dimensões: os inputs mostram o sufixo da unidade da empresa ativa (mm/cm/m) e o
 *    componente converte para milímetros antes de emitir. A largura é sempre apresentada
 *    antes do comprimento.
 *  - Nome: gerado automaticamente no padrão larguraXcomprimento em centímetros (padrão de
 *    mercado). Exibido como preview somente leitura — o backend é a fonte da verdade.
 *  - Conversões: bloco dinâmico (adicionar/remover) de subformatos. Cada linha tem
 *    dimensões próprias, número do formato e quantidade de cortes. Não é permitido repetir
 *    o mesmo subformato (mesma dimensão) dentro de um formato.
 */
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import type {
  CreateFormatRequest,
  Format,
  FormatConversionRequest,
  UpdateFormatRequest,
} from '@/types/Format'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  /** Quando informado, o form opera em modo edição. */
  initial?: Format | null
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: CreateFormatRequest | UpdateFormatRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
}>()

const { suffix, fromMillimeters, toMillimeters } = useUnitConverter()

const isEditing = computed(() => !!props.initial)

/** Linha editável de conversão (valores na unidade da empresa ativa). */
interface ConversionRow {
  width: number
  height: number
  formatNumber: number
  cutCount: number
}

const toRows = (format: Format | null | undefined): ConversionRow[] =>
  (format?.conversions ?? []).map((c, idx) => ({
    width: fromMillimeters(c.width.millimeters) ?? 0,
    height: fromMillimeters(c.height.millimeters) ?? 0,
    formatNumber: c.formatNumber || idx + 1,
    cutCount: c.cutCount || 1,
  }))

const form = reactive({
  width: props.initial ? fromMillimeters(props.initial.width.millimeters) ?? 0 : 0,
  height: props.initial ? fromMillimeters(props.initial.height.millimeters) ?? 0 : 0,
  active: props.initial?.active ?? true,
  conversions: toRows(props.initial) as ConversionRow[],
})

watch(
  () => props.initial,
  (next) => {
    if (!next) return
    form.width = fromMillimeters(next.width.millimeters) ?? 0
    form.height = fromMillimeters(next.height.millimeters) ?? 0
    form.active = next.active
    form.conversions = toRows(next)
  },
)

/** Gera o nome no padrão larguraXcomprimento em centímetros (espelha o backend). */
const nameInCm = (widthMm: number, heightMm: number): string => {
  const cm = (mm: number) => {
    const value = mm / 10
    return Number.isInteger(value) ? String(value) : String(value)
  }
  return `${cm(widthMm)}x${cm(heightMm)}`
}

/** Preview do nome do formato — recalculado a partir das dimensões digitadas. */
const namePreview = computed(() => {
  const widthMm = toMillimeters(form.width) ?? 0
  const heightMm = toMillimeters(form.height) ?? 0
  if (widthMm <= 0 || heightMm <= 0) return '—'
  return nameInCm(widthMm, heightMm)
})

const conversionName = (row: ConversionRow): string => {
  const widthMm = toMillimeters(row.width) ?? 0
  const heightMm = toMillimeters(row.height) ?? 0
  if (widthMm <= 0 || heightMm <= 0) return '—'
  return nameInCm(widthMm, heightMm)
}

const addConversion = () => {
  form.conversions.push({
    width: 0,
    height: 0,
    formatNumber: form.conversions.length + 1,
    cutCount: 1,
  })
}
const removeConversion = (index: number) => {
  form.conversions.splice(index, 1)
}

const errors = ref<{ width?: string; height?: string; conversions?: string }>({})

const dimensionSchema = z.object({
  width: z.number().positive('Largura deve ser maior que zero.'),
  height: z.number().positive('Comprimento deve ser maior que zero.'),
})

const conversionSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  formatNumber: z.number().int().positive(),
  cutCount: z.number().int().positive(),
})

const handleSubmit = () => {
  errors.value = {}

  const dim = dimensionSchema.safeParse({ width: form.width, height: form.height })
  if (!dim.success) {
    for (const issue of dim.error.issues) {
      const key = issue.path[0] as 'width' | 'height'
      if (key && !errors.value[key]) errors.value[key] = issue.message
    }
    return
  }

  // Valida cada conversão e detecta subformatos duplicados (mesma dimensão).
  const seen = new Set<string>()
  const conversions: FormatConversionRequest[] = []
  for (const row of form.conversions) {
    const parsed = conversionSchema.safeParse(row)
    if (!parsed.success) {
      errors.value.conversions = 'Preencha largura, comprimento, número do formato e cortes (todos > 0) em cada conversão.'
      return
    }
    const widthMm = toMillimeters(row.width) ?? 0
    const heightMm = toMillimeters(row.height) ?? 0
    const key = `${widthMm}x${heightMm}`
    if (seen.has(key)) {
      errors.value.conversions = `Subformato duplicado: ${nameInCm(widthMm, heightMm)}. Não repita a mesma dimensão.`
      return
    }
    seen.add(key)
    conversions.push({ widthMm, heightMm, formatNumber: row.formatNumber, cutCount: row.cutCount })
  }

  const widthMm = toMillimeters(form.width) ?? 0
  const heightMm = toMillimeters(form.height) ?? 0

  if (isEditing.value) {
    const payload: UpdateFormatRequest = { widthMm, heightMm, conversions, active: form.active }
    emit('submit', payload, 'update')
  } else {
    const payload: CreateFormatRequest = { widthMm, heightMm, conversions }
    emit('submit', payload, 'create')
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Dimensões do formato -->
    <div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="format-width" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
            Largura do papel <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <input
              id="format-width"
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
          <label for="format-height" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
            Comprimento do papel <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <input
              id="format-height"
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

      <!-- Nome gerado (somente leitura) -->
      <div class="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 dark:bg-slate-900/40 dark:border-slate-700">
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nome do formato (gerado)</span>
        <p class="text-sm font-medium text-slate-900 dark:text-white">{{ namePreview }}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">Gerado automaticamente em centímetros — padrão de mercado.</p>
      </div>
    </div>

    <!-- Bloco de conversões (subformatos) -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <div>
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Conversões de corte</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Subformatos obtidos ao cortar esta folha.</p>
        </div>
        <button
          type="button"
          @click="addConversion"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800 dark:hover:bg-indigo-900/50"
        >
          + Adicionar conversão
        </button>
      </div>

      <p v-if="errors.conversions" class="mb-2 text-xs text-rose-600">{{ errors.conversions }}</p>

      <div v-if="form.conversions.length === 0" class="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
        Nenhuma conversão. Clique em "Adicionar conversão" para incluir um subformato.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(row, index) in form.conversions"
          :key="index"
          class="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-slate-600 dark:text-slate-300">
              Subformato: <strong>{{ conversionName(row) }}</strong>
            </span>
            <button
              type="button"
              @click="removeConversion(index)"
              class="text-xs font-medium text-rose-700 hover:underline dark:text-rose-300"
            >
              Remover
            </button>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label class="block mb-1 text-xs text-slate-500 dark:text-slate-400">Largura</label>
              <div class="relative">
                <input
                  v-model.number="row.width"
                  type="number"
                  min="0"
                  step="0.001"
                  class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2 pr-8 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
                <span class="absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-500">{{ suffix }}</span>
              </div>
            </div>
            <div>
              <label class="block mb-1 text-xs text-slate-500 dark:text-slate-400">Comprimento</label>
              <div class="relative">
                <input
                  v-model.number="row.height"
                  type="number"
                  min="0"
                  step="0.001"
                  class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2 pr-8 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
                <span class="absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-500">{{ suffix }}</span>
              </div>
            </div>
            <div>
              <label class="block mb-1 text-xs text-slate-500 dark:text-slate-400">Nº do formato</label>
              <input
                v-model.number="row.formatNumber"
                type="number"
                min="1"
                step="1"
                class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>
            <div>
              <label class="block mb-1 text-xs text-slate-500 dark:text-slate-400">Qtde de cortes</label>
              <input
                v-model.number="row.cutCount"
                type="number"
                min="1"
                step="1"
                class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Flag de ativação (edição) -->
    <label v-if="isEditing" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input
        v-model="form.active"
        type="checkbox"
        class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
      />
      Formato ativo
    </label>

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
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar formato' }}
      </button>
    </div>
  </form>
</template>
