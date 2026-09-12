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
import { computed, onMounted, ref } from 'vue'
import type { InkType, OffsetBlock, OffsetTier } from '@/types/Machine'
import type { PlateType } from '@/types/PlateType'
import type { InkColorType, SupplyKeyValue } from '@/types/Supply'
import { useSupplies } from '@/composables/useSupplies'
import { INK_TYPES, INK_TYPE_LABELS, makeTier } from '@/utils/machineCatalog'
import { OFFSET_PLATE_TYPES, PLATE_TYPE_LABELS } from '@/utils/plateTypes'
import { CONVENTIONAL_INK_SUBTYPES, INK_COLOR_TYPES, INK_COLOR_TYPE_LABELS, INK_SUBTYPE_LABELS } from '@/utils/inkTypes'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  block: OffsetBlock
  errors: Record<string, string>
}>()

/** Matriz Fotográfica: marca/desmarca um tipo de chapa aceito pela máquina (atividade 027). */
const isPlateAccepted = (plate: PlateType) => props.block.acceptedPlateTypes.includes(plate)
const togglePlate = (plate: PlateType) => {
  if (isPlateAccepted(plate)) {
    props.block.acceptedPlateTypes = props.block.acceptedPlateTypes.filter((p) => p !== plate)
  } else {
    props.block.acceptedPlateTypes = [...props.block.acceptedPlateTypes, plate]
  }
  prunePlateSupplies()
}

/**
 * AS CHAPAS DESTA MÁQUINA (atividade 034).
 *
 * Os tipos acima dizem o que a máquina SABE GRAVAR; esta lista diz quais chapas a gráfica tem para
 * ela. A chapa é comprada para a impressora — no tamanho dela —, e a chapa de outra máquina não
 * entra nesta; é desta lista que o orçamento passa a oferecer a escolha.
 *
 * Só aparecem as chapas de um tipo que a máquina aceita, porque é exatamente o que a API permite
 * salvar. Desmarcar um TIPO, portanto, tira dele as chapas já marcadas: deixá-las ali guardaria um
 * cadastro que o servidor recusa, e a mensagem falaria de um campo que o usuário não tocou.
 */
const plates = ref<SupplyKeyValue[]>([])
onMounted(async () => {
  try {
    plates.value = await useSupplies().listKeyValues({ type: 'PLATE', onlyActive: true })
  } catch {
    plates.value = []
  }
})

const plateOptions = computed(() =>
  plates.value.filter((plate) => !!plate.plateType && isPlateAccepted(plate.plateType)),
)

const isPlateSupplySelected = (id: number) => props.block.plateSupplyIds.includes(id)
const togglePlateSupply = (id: number) => {
  if (isPlateSupplySelected(id)) {
    props.block.plateSupplyIds = props.block.plateSupplyIds.filter((p) => p !== id)
  } else {
    props.block.plateSupplyIds = [...props.block.plateSupplyIds, id]
  }
}

// Tira as chapas cujo tipo deixou de ser aceito. Só mexe no que a lista carregada CONHECE: com o
// catálogo ainda em voo, ou com uma chapa inativa que já estava na máquina, apagar seria perder a
// seleção que o usuário nunca desfez.
const prunePlateSupplies = () => {
  const proibidas = new Set(
    plates.value
      .filter((plate) => !!plate.plateType && !isPlateAccepted(plate.plateType))
      .map((plate) => plate.id),
  )
  if (proibidas.size === 0) return
  props.block.plateSupplyIds = props.block.plateSupplyIds.filter((id) => !proibidas.has(id))
}

/** Tinta aceita: marca/desmarca um TIPO (CMYK/Pantone) — atividade 032 (ajuste 0001). */
const isInkColorAccepted = (color: InkColorType) => props.block.acceptedInkColorTypes.includes(color)
const toggleInkColor = (color: InkColorType) => {
  if (isInkColorAccepted(color)) {
    props.block.acceptedInkColorTypes = props.block.acceptedInkColorTypes.filter((c) => c !== color)
  } else {
    props.block.acceptedInkColorTypes = [...props.block.acceptedInkColorTypes, color]
  }
}

/**
 * COR PADRÃO da máquina (atividade 034): a tinta que fica nela entre um trabalho e outro.
 *
 * Só entram as tintas do MESMO subtipo da máquina — apontar a cor padrão de uma offset para um
 * toner faria o orçamento comparar tintas de máquinas diferentes e nunca reconhecer a cor que está
 * lá. Trocar o subtipo derruba a escolha pelo mesmo motivo.
 */
const inks = ref<SupplyKeyValue[]>([])
onMounted(async () => {
  try {
    inks.value = await useSupplies().listKeyValues({ type: 'INK', onlyActive: true })
  } catch {
    inks.value = []
  }
})

const inkOptions = computed(() => inks.value.filter((ink) => ink.inkSubtype === props.block.inkSubtype))

const defaultInk = computed<number | null>({
  get: () => props.block.defaultInkSupplyId,
  set: (value) => {
    props.block.defaultInkSupplyId = value == null || Number.isNaN(Number(value)) ? null : Number(value)
  },
})

const onInkSubtypeChange = () => {
  if (!inkOptions.value.some((ink) => ink.id === props.block.defaultInkSupplyId)) {
    props.block.defaultInkSupplyId = null
  }
}

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

    <!-- Matriz Fotográfica: tipos de chapa aceitos (atividade 027) -->
    <fieldset class="rounded-lg border border-slate-200 p-3 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Matriz Fotográfica (chapas aceitas)</legend>
      <p class="mb-2 text-xs text-slate-500 dark:text-slate-400">Selecione um ou mais tipos de chapa que esta máquina aceita.</p>
      <div class="flex flex-wrap gap-4">
        <label v-for="plate in OFFSET_PLATE_TYPES" :key="plate" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            :checked="isPlateAccepted(plate)"
            @change="togglePlate(plate)"
            class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
          />
          {{ PLATE_TYPE_LABELS[plate] }}
        </label>
      </div>
      <p v-if="errors['acceptedPlateTypes']" class="mt-2 text-xs text-rose-600">{{ errors['acceptedPlateTypes'] }}</p>

      <!-- As chapas (insumos) desta máquina — atividade 034 -->
      <div class="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
        <span class="block text-sm font-medium text-slate-900 dark:text-white">Chapas desta máquina</span>
        <p class="mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400">
          Quais chapas do estoque esta impressora usa. A chapa é comprada para a máquina, e no
          orçamento a escolha é feita <strong>dentro desta lista</strong> — com o preço de cada uma.
          Sem nenhuma marcada, o orçamento desta máquina sai sem matriz.
        </p>
        <p v-if="!block.acceptedPlateTypes.length" class="text-xs text-slate-500 dark:text-slate-400">
          Selecione antes o tipo de matriz fotográfica — as chapas oferecidas aqui são as desses tipos.
        </p>
        <p v-else-if="!plateOptions.length" class="text-xs text-slate-500 dark:text-slate-400">
          Nenhuma chapa cadastrada nos tipos aceitos. Cadastre a chapa em
          <strong>Insumos</strong> para poder marcá-la aqui.
        </p>
        <div v-else class="grid grid-cols-1 gap-2 md:grid-cols-2">
          <label
            v-for="chapa in plateOptions"
            :key="chapa.id"
            class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
          >
            <input
              type="checkbox"
              :checked="isPlateSupplySelected(chapa.id)"
              @change="togglePlateSupply(chapa.id)"
              class="h-4 w-4 rounded border-slate-300 bg-slate-100 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
            />
            <span>
              {{ chapa.value }}
              <span class="text-xs text-slate-500 dark:text-slate-400">
                — {{ PLATE_TYPE_LABELS[chapa.plateType!] }}
              </span>
            </span>
          </label>
        </div>
        <p v-if="errors['plateSupplyIds']" class="mt-2 text-xs text-rose-600">{{ errors['plateSupplyIds'] }}</p>
      </div>
    </fieldset>

    <!-- Tinta aceita pela máquina (atividade 032 — ajuste 0001) -->
    <fieldset class="rounded-lg border border-slate-200 p-3 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Tinta da máquina</legend>
      <p class="mb-2 text-xs text-slate-500 dark:text-slate-400">
        Quais tipos de tinta esta impressora aceita (pode ser os dois) e qual é o subtipo que ela usa.
        É o que casa a máquina com o cadastro de tintas no orçamento.
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span class="block mb-1.5 text-sm font-medium text-slate-900 dark:text-white">Tipos aceitos</span>
          <div class="flex flex-wrap gap-4">
            <label v-for="color in INK_COLOR_TYPES" :key="color" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                :checked="isInkColorAccepted(color)"
                @change="toggleInkColor(color)"
                class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
              />
              {{ INK_COLOR_TYPE_LABELS[color] }}
            </label>
          </div>
          <p v-if="errors['acceptedInkColorTypes']" class="mt-2 text-xs text-rose-600">{{ errors['acceptedInkColorTypes'] }}</p>
        </div>
        <div>
          <label class="block mb-1.5 text-sm font-medium text-slate-900 dark:text-white">Subtipo</label>
          <select v-model="block.inkSubtype" @change="onInkSubtypeChange" :class="inputClass('inkSubtype')">
            <option v-for="st in CONVENTIONAL_INK_SUBTYPES" :key="st" :value="st">{{ INK_SUBTYPE_LABELS[st] }}</option>
          </select>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Seleção única — ou toner, ou tinta offset.</p>
        </div>
        <div class="md:col-span-2">
          <label class="block mb-1.5 text-sm font-medium text-slate-900 dark:text-white">Cor padrão da máquina</label>
          <select v-model="defaultInk" :class="inputClass('defaultInkSupplyId')">
            <option :value="null">Sem cor padrão</option>
            <option v-for="ink in inkOptions" :key="ink.id" :value="ink.id">{{ ink.value }}</option>
          </select>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            A tinta que fica na máquina entre um trabalho e outro — na prática, o preto. O orçamento
            não cobra <strong>lavagem</strong> quando o trabalho pede justamente essa cor: não há
            troca de cor a fazer. Sem cor padrão, toda impressão paga lavagem.
          </p>
          <p v-if="errors['defaultInkSupplyId']" class="mt-1 text-xs text-rose-600">{{ errors['defaultInkSupplyId'] }}</p>
        </div>
      </div>
    </fieldset>

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
