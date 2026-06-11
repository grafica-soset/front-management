<script setup lang="ts">
/**
 * Bloco específico da impressora OFFSET — modelo de Rampa de Velocidade
 * (cf. .docs/offset-machines-api.md). Edita diretamente o objeto reativo
 * `block` recebido por prop (o pai detém a mesma referência e monta o payload).
 *
 * Organização: configuração geral → tempos de setup → parâmetros gerais da
 * rampa (envelope + redutores) → uma seção por tipo de impressão (ajustes +
 * faixas de quantidade configuráveis: o usuário define De/Até, com validação de
 * contiguidade; só a última faixa pode ser aberta).
 */
import { computed } from 'vue'
import type { InkType, OffsetBlock, OffsetTier } from '@/types/Machine'
import { INK_TYPES, INK_TYPE_LABELS, makeTier } from '@/utils/machineCatalog'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  block: OffsetBlock
  errors: Record<string, string>
}>()

const colorOptions = Array.from({ length: 10 }, (_, i) => i + 1)

const { suffix: lengthUnit, fromMillimeters, toMillimeters } = useUnitConverter()

/** Altura de alimentação editada na unidade da empresa (armazenada em mm). */
const feedLoadIncrement = computed<number>({
  get: () => fromMillimeters(props.block.setupTimes.feedLoadIncrementMm) ?? 0,
  set: (v) => {
    props.block.setupTimes.feedLoadIncrementMm = toMillimeters(v) ?? 0
  },
})

/** Tiers agrupados por tipo de impressão (referências preservadas p/ v-model). */
const tiersByInk = computed<Record<InkType, OffsetTier[]>>(() => {
  const map = { LINE: [], CMYK: [], PANTONE: [] } as Record<InkType, OffsetTier[]>
  for (const tier of props.block.speedRamp.tiers) map[tier.inkType].push(tier)
  return map
})

const inkSettingFor = (ink: InkType) =>
  props.block.speedRamp.inkSettings.find((s) => s.inkType === ink)!

/** Tipo de impressão habilitado = possui ajuste (inkSetting). */
const isInkEnabled = (ink: InkType) =>
  props.block.speedRamp.inkSettings.some((s) => s.inkType === ink)

/** Tipos habilitados na ordem canônica de `INK_TYPES`. */
const enabledInks = computed<InkType[]>(() => INK_TYPES.filter(isInkEnabled))

/**
 * Habilita/desabilita um tipo de impressão. Ao habilitar, cria o ajuste e uma
 * faixa aberta default; ao desabilitar, remove ajuste e faixas (mantém ao menos
 * um tipo habilitado — nem toda máquina imprime os três, mas precisa de um).
 */
const toggleInk = (ink: InkType) => {
  if (isInkEnabled(ink)) {
    if (enabledInks.value.length <= 1) return
    props.block.speedRamp.inkSettings = props.block.speedRamp.inkSettings.filter((s) => s.inkType !== ink)
    props.block.speedRamp.tiers = props.block.speedRamp.tiers.filter((t) => t.inkType !== ink)
  } else {
    props.block.speedRamp.inkSettings.push({
      inkType: ink,
      initialWasteSheets: 0,
      fullCoverageExtraWastePercent: '0',
    })
    props.block.speedRamp.tiers.push(makeTier(ink, 0, null))
  }
}

/** Origem da cópia de dados entre tipos de impressão (CMYK ← Traço, Pantone ← CMYK). */
const COPY_SOURCE: Partial<Record<InkType, InkType>> = { CMYK: 'LINE', PANTONE: 'CMYK' }

/**
 * Adiciona uma faixa contígua à última (começa no fim da anterior + 1) e aberta
 * ("acima de"). O usuário define livremente os limites; a contiguidade é validada.
 */
const addTier = (ink: InkType) => {
  const list = tiersByInk.value[ink]
  const last = list[list.length - 1]
  let from = 0
  if (last) {
    // Se a última estava aberta, fecha-a para manter a contiguidade.
    if (last.toQuantity === null) last.toQuantity = last.fromQuantity
    from = last.toQuantity + 1
  }
  props.block.speedRamp.tiers.push(makeTier(ink, from, null))
}

/** Remove a faixa indicada (mantém ao menos uma por impressão). */
const removeTier = (tier: OffsetTier) => {
  if (tiersByInk.value[tier.inkType].length <= 1) return
  const idx = props.block.speedRamp.tiers.indexOf(tier)
  if (idx >= 0) props.block.speedRamp.tiers.splice(idx, 1)
}

/** Define o "até" de uma faixa (vazio = aberta/null). */
const setTo = (tier: OffsetTier, event: Event) => {
  const raw = (event.target as HTMLInputElement).value
  tier.toQuantity = raw === '' ? null : Number(raw)
}

/** Alterna entre faixa aberta (null) e fechada (volta a um valor numérico). */
const toggleOpen = (tier: OffsetTier, event: Event) => {
  const open = (event.target as HTMLInputElement).checked
  tier.toQuantity = open ? null : tier.fromQuantity
}

/** Copia ajustes e faixas de uma impressão de origem para a de destino. */
const copyInk = (to: InkType) => {
  const from = COPY_SOURCE[to]
  if (!from) return
  const src = inkSettingFor(from)
  const dst = inkSettingFor(to)
  dst.initialWasteSheets = src.initialWasteSheets
  dst.fullCoverageExtraWastePercent = src.fullCoverageExtraWastePercent

  const cloned = props.block.speedRamp.tiers
    .filter((t) => t.inkType === from)
    .map((t) => ({ ...t, inkType: to }))
  const others = props.block.speedRamp.tiers.filter((t) => t.inkType !== to)
  props.block.speedRamp.tiers = [...others, ...cloned]
}

// `min-w-0` deixa o input encolher abaixo da largura intrínseca (~20 caracteres
// do type=number), evitando que as colunas do grid estourem a tela no celular.
const inputClass = (errKey?: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  errKey && props.errors[errKey] ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]
const cellClass =
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-1.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white'
</script>

<template>
  <div class="space-y-4">
    <!-- Configuração geral -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label class="block mb-1.5 text-sm font-medium text-slate-900 dark:text-white">Nº de cores (castelos)</label>
        <select v-model.number="block.numberOfColors" :class="inputClass('numberOfColors')">
          <option v-for="n in colorOptions" :key="n" :value="n">{{ n }}</option>
        </select>
        <p v-if="errors['numberOfColors']" class="mt-1 text-xs text-rose-600">{{ errors['numberOfColors'] }}</p>
      </div>
      <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 sm:pt-7">
        <input v-model="block.supportsNumbering" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
        Possui módulo numerador?
      </label>
      <div v-if="block.supportsNumbering">
        <label class="block mb-1.5 text-sm font-medium text-slate-900 dark:text-white">Máx. de numeradores</label>
        <input v-model.number="block.maxNumberingUnits" type="number" min="0" step="1" :class="inputClass('maxNumberingUnits')" />
        <p v-if="errors['maxNumberingUnits']" class="mt-1 text-xs text-rose-600">{{ errors['maxNumberingUnits'] }}</p>
      </div>
      <div v-if="block.supportsNumbering">
        <label class="block mb-1.5 text-sm font-medium text-slate-900 dark:text-white">Velocidade máxima com numeração (folhas/h)</label>
        <input v-model.number="block.speedRamp.numberingMaxSheetsPerHour" type="number" min="1" step="1" :class="inputClass('speedRamp.numberingMaxSheetsPerHour')" />
        <p v-if="errors['speedRamp.numberingMaxSheetsPerHour']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.numberingMaxSheetsPerHour'] }}</p>
      </div>
    </div>

    <!-- Tempos de setup -->
    <fieldset class="rounded-lg border border-slate-200 p-3 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Tempos de setup</legend>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Acerto de Chapa por Cor (min)</label>
          <input v-model.number="block.setupTimes.plateSetupMinutesPerColor" type="number" min="0" step="1" :class="inputClass('setupTimes.plateSetupMinutesPerColor')" />
          <p v-if="errors['setupTimes.plateSetupMinutesPerColor']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.plateSetupMinutesPerColor'] }}</p>
        </div>
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Acerto das Cores (min)</label>
          <input v-model.number="block.setupTimes.colorMatchingMinutes" type="number" min="0" step="1" :class="inputClass('setupTimes.colorMatchingMinutes')" />
          <p v-if="errors['setupTimes.colorMatchingMinutes']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.colorMatchingMinutes'] }}</p>
        </div>
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Ajuste do papel (min)</label>
          <input v-model.number="block.setupTimes.paperFeedSetupMinutes" type="number" min="0" step="1" :class="inputClass('setupTimes.paperFeedSetupMinutes')" />
          <p v-if="errors['setupTimes.paperFeedSetupMinutes']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.paperFeedSetupMinutes'] }}</p>
        </div>
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Lavagem por cor (min)</label>
          <input v-model.number="block.setupTimes.washMinutesPerColor" type="number" min="0" step="1" :class="inputClass('setupTimes.washMinutesPerColor')" />
          <p v-if="errors['setupTimes.washMinutesPerColor']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.washMinutesPerColor'] }}</p>
        </div>
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Tempo por alimentação (segundos)</label>
          <input v-model.number="block.setupTimes.feedTimeSecondsPerLoad" type="number" min="0" step="1" :class="inputClass('setupTimes.feedTimeSecondsPerLoad')" />
          <p v-if="errors['setupTimes.feedTimeSecondsPerLoad']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.feedTimeSecondsPerLoad'] }}</p>
        </div>
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Altura de alimentação ({{ lengthUnit }})</label>
          <input v-model.number="feedLoadIncrement" type="number" min="0" step="0.001" :class="inputClass('setupTimes.feedLoadIncrementMm')" />
          <p v-if="errors['setupTimes.feedLoadIncrementMm']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.feedLoadIncrementMm'] }}</p>
        </div>
        <div v-if="block.supportsNumbering">
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Setup por numerador (min)</label>
          <input v-model.number="block.setupTimes.numberingSetupMinutesPerUnit" type="number" min="0" step="1" :class="inputClass('setupTimes.numberingSetupMinutesPerUnit')" />
          <p v-if="errors['setupTimes.numberingSetupMinutesPerUnit']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.numberingSetupMinutesPerUnit'] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Parâmetros gerais da rampa -->
    <fieldset class="rounded-lg border border-slate-200 p-3 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Rampa de velocidade — parâmetros gerais</legend>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Velocidade mínima (folhas/h)</label>
          <input v-model.number="block.speedRamp.minSpeedSheetsPerHour" type="number" min="1" step="1" :class="inputClass('speedRamp.minSpeedSheetsPerHour')" />
          <p v-if="errors['speedRamp.minSpeedSheetsPerHour']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.minSpeedSheetsPerHour'] }}</p>
        </div>
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Velocidade máxima (folhas/h)</label>
          <input v-model.number="block.speedRamp.maxSpeedSheetsPerHour" type="number" min="1" step="1" :class="inputClass('speedRamp.maxSpeedSheetsPerHour')" />
          <p v-if="errors['speedRamp.maxSpeedSheetsPerHour']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.maxSpeedSheetsPerHour'] }}</p>
        </div>
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Gramatura ideal mín. (g/m²)</label>
          <input v-model.number="block.speedRamp.idealWeightMinGsm" type="number" min="0" step="1" :class="inputClass('speedRamp.idealWeightMinGsm')" />
          <p v-if="errors['speedRamp.idealWeightMinGsm']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.idealWeightMinGsm'] }}</p>
        </div>
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Gramatura ideal máx. (g/m²)</label>
          <input v-model.number="block.speedRamp.idealWeightMaxGsm" type="number" min="0" step="1" :class="inputClass('speedRamp.idealWeightMaxGsm')" />
          <p v-if="errors['speedRamp.idealWeightMaxGsm']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.idealWeightMaxGsm'] }}</p>
        </div>
      </div>
      <p class="mt-1 mb-3 text-xs text-slate-500 dark:text-slate-400">
        Piso e teto físicos da máquina. A velocidade de cada faixa deve ficar dentro desse envelope.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Redutor de velocidade abaixo do ideal (%)</label>
          <input v-model="block.speedRamp.belowIdealSpeedReducerPercent" type="number" min="0" step="any" :class="inputClass('speedRamp.belowIdealSpeedReducerPercent')" />
          <p v-if="errors['speedRamp.belowIdealSpeedReducerPercent']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.belowIdealSpeedReducerPercent'] }}</p>
        </div>
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Redutor de velocidade acima do ideal (%)</label>
          <input v-model="block.speedRamp.aboveIdealSpeedReducerPercent" type="number" min="0" step="any" :class="inputClass('speedRamp.aboveIdealSpeedReducerPercent')" />
          <p v-if="errors['speedRamp.aboveIdealSpeedReducerPercent']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.aboveIdealSpeedReducerPercent'] }}</p>
        </div>
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Redutor de velocidade impressão chapada (%)</label>
          <input v-model="block.speedRamp.fullCoverageSpeedReducerPercent" type="number" min="0" step="any" :class="inputClass('speedRamp.fullCoverageSpeedReducerPercent')" />
          <p v-if="errors['speedRamp.fullCoverageSpeedReducerPercent']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.fullCoverageSpeedReducerPercent'] }}</p>
        </div>
        <div>
          <label class="block mb-1.5 text-sm text-slate-700 dark:text-slate-300">Redutor de velocidade numeração (%)</label>
          <input v-model="block.speedRamp.numberingSpeedReducerPercent" type="number" min="0" step="any" :class="inputClass('speedRamp.numberingSpeedReducerPercent')" />
          <p v-if="errors['speedRamp.numberingSpeedReducerPercent']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.numberingSpeedReducerPercent'] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Faixas por tipo de impressão -->
    <fieldset class="rounded-lg border border-slate-200 p-3 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Velocidade e quebra por tipo de impressão</legend>

      <!-- Seleção dos tipos de impressão da máquina (nem toda imprime os três) -->
      <p class="mb-2 text-xs text-slate-500 dark:text-slate-400">
        Marque os tipos de impressão que esta máquina realiza. Desmarque os que não se aplicam.
      </p>
      <div class="mb-4 flex flex-wrap gap-4">
        <label
          v-for="ink in INK_TYPES"
          :key="`toggle-${ink}`"
          class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
        >
          <input
            type="checkbox"
            :checked="isInkEnabled(ink)"
            :disabled="isInkEnabled(ink) && enabledInks.length <= 1"
            @change="toggleInk(ink)"
            class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 disabled:opacity-50 dark:bg-slate-700 dark:border-slate-600"
          />
          {{ INK_TYPE_LABELS[ink] }}
        </label>
      </div>

      <p v-if="errors['inkSettings']" class="mb-3 text-xs text-rose-600">{{ errors['inkSettings'] }}</p>

      <div v-for="ink in enabledInks" :key="ink" class="mb-5 last:mb-0">
        <div class="mb-2 flex items-center justify-between gap-2">
          <h4 class="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{{ INK_TYPE_LABELS[ink] }}</h4>
          <button
            v-if="COPY_SOURCE[ink] && isInkEnabled(COPY_SOURCE[ink]!)"
            type="button"
            @click="copyInk(ink)"
            class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Copiar de {{ INK_TYPE_LABELS[COPY_SOURCE[ink]!] }}
          </button>
        </div>

        <!-- Ajustes do tipo de impressão -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block mb-1.5 text-xs text-slate-600 dark:text-slate-400">Quebra inicial (folhas)</label>
            <input v-model.number="inkSettingFor(ink).initialWasteSheets" type="number" min="0" step="1" :class="cellClass" />
          </div>
          <div>
            <label class="block mb-1.5 text-xs text-slate-600 dark:text-slate-400">Quebra extra chapado (%)</label>
            <input v-model="inkSettingFor(ink).fullCoverageExtraWastePercent" type="number" min="0" step="any" :class="cellClass" />
          </div>
        </div>

        <!-- Faixas — tabela (telas grandes) -->
        <div class="hidden lg:block overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table class="w-full table-fixed text-sm">
            <thead class="text-xs text-slate-600 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-300">
              <tr>
                <th class="px-3 py-1.5 text-left font-semibold w-24">De (folhas)</th>
                <th class="px-3 py-1.5 text-left font-semibold w-44">Até (folhas)</th>
                <th class="px-3 py-1.5 text-left font-semibold w-40">Velocidade (folhas/h)</th>
                <th class="px-3 py-1.5 text-left font-semibold w-28">Quebra (%)</th>
                <th class="px-3 py-1.5 text-right font-semibold w-24"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr v-for="(tier, i) in tiersByInk[ink]" :key="i">
                <td class="px-3 py-1.5">
                  <input v-model.number="tier.fromQuantity" type="number" min="0" step="1" :class="cellClass" />
                </td>
                <td class="px-3 py-1.5">
                  <div class="flex items-center gap-2">
                    <input
                      :value="tier.toQuantity ?? ''"
                      :disabled="tier.toQuantity === null"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="—"
                      @input="setTo(tier, $event)"
                      :class="[cellClass, tier.toQuantity === null ? 'opacity-50' : '']"
                    />
                    <label class="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap" title="Faixa aberta (acima de)">
                      <input
                        type="checkbox"
                        :checked="tier.toQuantity === null"
                        @change="toggleOpen(tier, $event)"
                        class="w-3.5 h-3.5 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
                      />
                      ∞
                    </label>
                  </div>
                </td>
                <td class="px-3 py-1.5">
                  <input v-model.number="tier.sheetsPerHour" type="number" min="0" step="1" :class="cellClass" />
                </td>
                <td class="px-3 py-1.5">
                  <input v-model="tier.wastePercent" type="number" min="0" step="any" :class="cellClass" />
                </td>
                <td class="px-3 py-1.5 text-right">
                  <button
                    type="button"
                    :disabled="tiersByInk[ink].length <= 1"
                    @click="removeTier(tier)"
                    class="px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md disabled:opacity-40 disabled:cursor-not-allowed dark:text-rose-300 dark:hover:bg-slate-700"
                    title="Remover faixa"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Faixas — cartões (telas estreitas): todos os campos sempre visíveis -->
        <div class="lg:hidden space-y-3">
          <div
            v-for="(tier, i) in tiersByInk[ink]"
            :key="i"
            class="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
          >
            <div class="mb-2 flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Faixa {{ i + 1 }}</span>
              <button
                type="button"
                :disabled="tiersByInk[ink].length <= 1"
                @click="removeTier(tier)"
                class="px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md disabled:opacity-40 disabled:cursor-not-allowed dark:text-rose-300 dark:hover:bg-slate-700"
              >
                Remover
              </button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block mb-1 text-xs text-slate-600 dark:text-slate-400">De (folhas)</label>
                <input v-model.number="tier.fromQuantity" type="number" min="0" step="1" :class="cellClass" />
              </div>
              <div>
                <label class="block mb-1 text-xs text-slate-600 dark:text-slate-400">Até (folhas)</label>
                <div class="flex items-center gap-2">
                  <input
                    :value="tier.toQuantity ?? ''"
                    :disabled="tier.toQuantity === null"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="—"
                    @input="setTo(tier, $event)"
                    :class="[cellClass, tier.toQuantity === null ? 'opacity-50' : '']"
                  />
                  <label class="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap" title="Faixa aberta (acima de)">
                    <input
                      type="checkbox"
                      :checked="tier.toQuantity === null"
                      @change="toggleOpen(tier, $event)"
                      class="w-3.5 h-3.5 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
                    />
                    ∞
                  </label>
                </div>
              </div>
              <div>
                <label class="block mb-1 text-xs text-slate-600 dark:text-slate-400">Velocidade (folhas/h)</label>
                <input v-model.number="tier.sheetsPerHour" type="number" min="0" step="1" :class="cellClass" />
              </div>
              <div>
                <label class="block mb-1 text-xs text-slate-600 dark:text-slate-400">Quebra (%)</label>
                <input v-model="tier.wastePercent" type="number" min="0" step="any" :class="cellClass" />
              </div>
            </div>
          </div>
        </div>

        <div class="mt-2 flex items-center justify-between">
          <button
            type="button"
            @click="addTier(ink)"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-50 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-slate-700"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            Adicionar faixa
          </button>
          <p v-if="errors[`tiers.${ink}`]" class="text-xs text-rose-600">{{ errors[`tiers.${ink}`] }}</p>
        </div>
      </div>

      <p class="text-xs text-slate-500 dark:text-slate-400">
        Defina os limites <span class="font-medium">De</span>/<span class="font-medium">Até</span> de cada faixa
        (podem ter saltos diferentes). As faixas devem ser contíguas — o início de uma é o fim da anterior + 1 — e
        somente a última pode ser aberta (marque <span class="font-medium">∞</span> para "acima de").
      </p>
    </fieldset>
  </div>
</template>
