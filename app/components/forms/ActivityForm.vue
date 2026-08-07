<script setup lang="ts">
/**
 * Formulário de ATIVIDADE (028/029; tipos reestruturados na 032 — ajuste 0004).
 *
 * O TIPO decide o que aparece — e é isso que faz o orçamento só perguntar tinta quando existe
 * impressão de verdade no produto:
 *  - MANUAL     custo hora-homem.
 *  - PRINTING   tipo de tinta + as impressoras (1+). Sem insumo: a tinta de cada face é
 *               informada no ORÇAMENTO.
 *  - CUTTING    as guilhotinas que fazem o corte (1+). Sem insumo.
 *  - FINISHING  subtipo (manual / acabamento cadastrado / máquina) + insumo opcional.
 *  - PACKAGING  família de papéis do pacote (o mesmo cadastro de /papeis) + a tarefa Empacotar.
 *
 * Autocontido (props + emit).
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type {
  Activity,
  ActivityFinishingSubtype,
  ConsumptionBasis,
  CreateActivityRequest,
  PrintingInkKind,
  UpdateActivityRequest,
} from '@/types/Activity'
import type { MachineKeyValue } from '@/types/Machine'
import type { SupplyGroupKeyValue } from '@/types/SupplyGroup'
import type { FinishingTaskKeyValue } from '@/types/FinishingTask'
import type { PaperType } from '@/types/PaperType'
import {
  ACTIVITY_FINISHING_SUBTYPES,
  ACTIVITY_FINISHING_SUBTYPE_HINTS,
  ACTIVITY_FINISHING_SUBTYPE_LABELS,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_HINTS,
  ACTIVITY_TYPE_LABELS,
  CONSUMPTION_BASES,
  CONSUMPTION_BASIS_LABELS,
  PRINTING_INK_KINDS,
  PRINTING_INK_KIND_LABELS,
  SUPPLY_UNIT_SHORT_LABELS,
} from '@/utils/activityCatalog'
import { useMachineCatalog } from '@/composables/useMachineCatalog'
import { useSupplyGroups } from '@/composables/useSupplyGroups'
import { useFinishingTasks } from '@/composables/useFinishingTasks'
import { usePaperTypes } from '@/composables/usePaperTypes'
import { isBlank } from '@/utils/formNumbers'

const props = defineProps<{
  initial?: Activity | null
  mode?: 'create' | 'edit'
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: CreateActivityRequest | UpdateActivityRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
}>()

const isEditing = computed(() => props.mode === 'edit')

const form = reactive({
  name: '',
  type: 'MANUAL' as CreateActivityRequest['type'],
  machineIds: [] as number[],
  laborHourlyCost: '0',
  printingInkKind: 'CMYK' as PrintingInkKind,
  finishingSubtype: 'FINISHING_TASK' as ActivityFinishingSubtype,
  finishingTaskId: null as number | null,
  paperTypeId: null as number | null,
  supplyGroupId: null as number | null,
  supplyConsumptionQuantity: '',
  supplyConsumptionBasis: null as ConsumptionBasis | null,
  active: true,
})

const errors = ref<Record<string, string>>({})
const machines = ref<MachineKeyValue[]>([])
const groups = ref<SupplyGroupKeyValue[]>([])
const finishingTasks = ref<FinishingTaskKeyValue[]>([])
const paperTypes = ref<PaperType[]>([])

onMounted(async () => {
  try { machines.value = await useMachineCatalog().listAll() } catch { machines.value = [] }
  try { groups.value = await useSupplyGroups().listKeyValues() } catch { groups.value = [] }
  try { finishingTasks.value = await useFinishingTasks().listKeyValues() } catch { finishingTasks.value = [] }
  try { paperTypes.value = await usePaperTypes().listPaperTypes() } catch { paperTypes.value = [] }
})

if (props.initial) hydrate(props.initial)

function hydrate(a: Activity) {
  form.name = a.name
  form.type = a.type
  form.machineIds = [...(a.machineIds ?? [])]
  form.laborHourlyCost = a.laborHourlyCost != null ? String(a.laborHourlyCost) : '0'
  form.printingInkKind = a.printingInkKind ?? 'CMYK'
  form.finishingSubtype = a.finishingSubtype ?? 'FINISHING_TASK'
  form.finishingTaskId = a.finishingTaskId
  form.paperTypeId = a.paperTypeId
  form.supplyGroupId = a.supplyGroupId
  form.supplyConsumptionQuantity = a.supplyConsumptionQuantity != null ? String(a.supplyConsumptionQuantity) : ''
  form.supplyConsumptionBasis = a.supplyConsumptionBasis
  form.active = a.active
}

const isManual = computed(() => form.type === 'MANUAL')
const isPrinting = computed(() => form.type === 'PRINTING')
const isCutting = computed(() => form.type === 'CUTTING')
const isFinishing = computed(() => form.type === 'FINISHING')
const isPackaging = computed(() => form.type === 'PACKAGING')

// Cobra hora-homem: no tipo Manual e no acabamento de subtipo manual.
const usesLaborCost = computed(() => isManual.value || (isFinishing.value && form.finishingSubtype === 'MANUAL'))
const usesFinishingTask = computed(() => isFinishing.value && form.finishingSubtype === 'FINISHING_TASK')
// Uma única máquina: só o acabamento automatizado.
const usesSingleMachine = computed(() => isFinishing.value && form.finishingSubtype === 'AUTOMATED')
const consumesSupply = computed(() => isFinishing.value && form.supplyGroupId != null)

// Máquinas oferecidas conforme o tipo. Na impressão a lista acompanha a TINTA escolhida: além da
// família (serigrafia × offset/digital), a impressora precisa declarar aquele tipo de tinta na
// "Tinta da máquina" — senão o usuário escolheria uma máquina que o servidor recusa ao salvar.
const machineOptions = computed<MachineKeyValue[]>(() => {
  if (isCutting.value) return machines.value.filter((m) => m.machineType === 'GUILLOTINE')
  if (isPrinting.value) {
    if (form.printingInkKind === 'SCREEN_PRINTING') {
      return machines.value.filter((m) => m.machineType === 'SCREEN_PRINTING')
    }
    return machines.value.filter(
      (m) =>
        (m.machineType === 'OFFSET' || m.machineType === 'DIGITAL') &&
        (m.acceptedInkColorTypes ?? []).includes(form.printingInkKind),
    )
  }
  return machines.value
})

// Impressoras da família certa que ficaram de fora só por não aceitarem a tinta — o usuário
// precisa saber que elas existem e onde arrumar, senão a lista vazia parece bug.
const printersWithoutInk = computed<MachineKeyValue[]>(() => {
  if (!isPrinting.value || form.printingInkKind === 'SCREEN_PRINTING') return []
  return machines.value.filter(
    (m) =>
      (m.machineType === 'OFFSET' || m.machineType === 'DIGITAL') &&
      !(m.acceptedInkColorTypes ?? []).includes(form.printingInkKind),
  )
})

// Empacotar tem tipo próprio de atividade: fica fora da lista do acabamento comum, e o
// empacotamento só oferece as tarefas de empacotar.
const finishingTaskOptions = computed<FinishingTaskKeyValue[]>(() =>
  isPackaging.value
    ? finishingTasks.value.filter((t) => t.type === 'PACKAGING')
    : finishingTasks.value.filter((t) => t.type !== 'PACKAGING'),
)

const singleMachineId = computed<number | null>({
  get: () => form.machineIds[0] ?? null,
  set: (id) => { form.machineIds = id == null ? [] : [id] },
})

const isMachineSelected = (id: number) => form.machineIds.includes(id)

const toggleMachine = (id: number) => {
  form.machineIds = isMachineSelected(id)
    ? form.machineIds.filter((m) => m !== id)
    : [...form.machineIds, id]
}

// Unidade do grupo selecionado, para exibir ao lado da quantidade de consumo.
const selectedGroupUnit = computed(() => {
  const g = groups.value.find((x) => x.id === form.supplyGroupId)
  return g ? SUPPLY_UNIT_SHORT_LABELS[g.unitOfMeasure] : ''
})

// Ao trocar de tipo, zera o que não se aplica — evita enviar resto de outro tipo.
watch(() => form.type, () => {
  form.machineIds = []
  form.finishingTaskId = null
  form.paperTypeId = null
  form.supplyGroupId = null
  form.supplyConsumptionQuantity = ''
  form.supplyConsumptionBasis = null
  if (!usesLaborCost.value) form.laborHourlyCost = '0'
})

// Trocar o subtipo do acabamento troca a fonte de custo: nada de sobra do subtipo anterior.
watch(() => form.finishingSubtype, () => {
  form.machineIds = []
  form.finishingTaskId = null
  if (!usesLaborCost.value) form.laborHourlyCost = '0'
})

// Serigrafia e offset/digital não compartilham impressora: ao trocar a tinta, a seleção cai.
watch(() => form.printingInkKind, () => {
  if (isPrinting.value) form.machineIds = []
})

// Consumo só existe quando há grupo; ao escolher um grupo, sugere base "Por unidade".
watch(() => form.supplyGroupId, (g) => {
  if (g == null) {
    form.supplyConsumptionQuantity = ''
    form.supplyConsumptionBasis = null
  } else if (form.supplyConsumptionBasis == null && isFinishing.value) {
    form.supplyConsumptionBasis = 'UNIT'
  }
})

const inputClass = (errKey: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  errors.value[errKey] ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]

const selectClass = 'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white'

function validate(): Record<string, string> {
  const e: Record<string, string> = {}
  const name = form.name.trim()
  if (!name) e['name'] = 'Informe o nome.'
  else if (name.length > 150) e['name'] = 'Máximo de 150 caracteres.'

  if (usesLaborCost.value) {
    const cost = Number(form.laborHourlyCost)
    if (isBlank(form.laborHourlyCost) || !Number.isFinite(cost) || cost < 0) {
      e['laborHourlyCost'] = 'Informe o custo hora-homem (≥ 0).'
    }
  }
  if (usesSingleMachine.value && !form.machineIds.length) e['machineIds'] = 'Selecione a máquina.'
  if (isPrinting.value && !form.machineIds.length) e['machineIds'] = 'Selecione ao menos uma impressora.'
  if (isCutting.value && !form.machineIds.length) e['machineIds'] = 'Selecione ao menos uma máquina de corte.'
  if (usesFinishingTask.value && !form.finishingTaskId) {
    e['finishingTaskId'] = 'Selecione o acabamento.'
  }
  if (isPackaging.value) {
    if (!form.finishingTaskId) e['finishingTaskId'] = 'Selecione a tarefa de empacotar.'
    if (!form.paperTypeId) e['paperTypeId'] = 'Selecione a família de papéis do pacote.'
  }
  if (consumesSupply.value) {
    const q = Number(form.supplyConsumptionQuantity)
    if (isBlank(form.supplyConsumptionQuantity) || !Number.isFinite(q) || q <= 0) {
      e['supplyConsumptionQuantity'] = 'Informe a quantidade (> 0).'
    }
    if (!form.supplyConsumptionBasis) e['supplyConsumptionBasis'] = 'Selecione a base de cobrança.'
  }
  return e
}

const handleSubmit = () => {
  errors.value = validate()
  if (Object.keys(errors.value).length) return

  const base: CreateActivityRequest = {
    customerId: 0,
    name: form.name.trim(),
    type: form.type,
    machineIds: form.machineIds,
    laborHourlyCost: usesLaborCost.value ? String(form.laborHourlyCost) : null,
    printingInkKind: isPrinting.value ? form.printingInkKind : null,
    finishingSubtype: isFinishing.value ? form.finishingSubtype : null,
    finishingTaskId: usesFinishingTask.value || isPackaging.value ? form.finishingTaskId : null,
    paperTypeId: isPackaging.value ? form.paperTypeId : null,
    supplyGroupId: isFinishing.value ? form.supplyGroupId : null,
    supplyConsumptionQuantity: consumesSupply.value ? String(form.supplyConsumptionQuantity) : null,
    supplyConsumptionBasis: consumesSupply.value ? form.supplyConsumptionBasis : null,
  }

  if (isEditing.value) emit('submit', { ...base, active: form.active }, 'update')
  else emit('submit', base, 'create')
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-2">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Nome <span class="text-rose-500">*</span></label>
        <input v-model="form.name" type="text" maxlength="150" placeholder="Ex.: Impressão 4x0 / Refile / Grampear" :class="inputClass('name')" />
        <p v-if="errors['name']" class="mt-1 text-xs text-rose-600">{{ errors['name'] }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Tipo <span class="text-rose-500">*</span></label>
        <select v-model="form.type" :class="selectClass">
          <option v-for="t in ACTIVITY_TYPES" :key="t" :value="t">{{ ACTIVITY_TYPE_LABELS[t] }}</option>
        </select>
      </div>
    </div>

    <p class="-mt-3 text-xs text-slate-500 dark:text-slate-400">{{ ACTIVITY_TYPE_HINTS[form.type] }}</p>

    <!-- MANUAL / ACABAMENTO MANUAL: custo hora-homem -->
    <div v-if="usesLaborCost" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Custo por hora-homem (R$/h) <span class="text-rose-500">*</span></label>
        <input v-model="form.laborHourlyCost" type="number" min="0" step="0.0001" :class="inputClass('laborHourlyCost')" />
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">O tempo é informado no orçamento (custo = R$/h × tempo).</p>
        <p v-if="errors['laborHourlyCost']" class="mt-1 text-xs text-rose-600">{{ errors['laborHourlyCost'] }}</p>
      </div>
    </div>

    <!-- IMPRESSÃO: tipo de tinta + impressoras -->
    <fieldset v-if="isPrinting" class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Impressão</legend>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Tipo de tinta <span class="text-rose-500">*</span></label>
          <select v-model="form.printingInkKind" :class="selectClass">
            <option v-for="k in PRINTING_INK_KINDS" :key="k" :value="k">{{ PRINTING_INK_KIND_LABELS[k] }}</option>
          </select>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            A <strong>quantidade</strong> de tinta de cada face é informada no orçamento, não aqui.
          </p>
        </div>
        <div>
          <span class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
            Impressoras que fazem esta atividade <span class="text-rose-500">*</span>
          </span>
          <div v-if="machineOptions.length" class="space-y-2 max-h-44 overflow-y-auto pr-1">
            <label v-for="m in machineOptions" :key="m.id" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                :checked="isMachineSelected(m.id)"
                @change="toggleMachine(m.id)"
                class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
              />
              {{ m.value }}
            </label>
          </div>
          <p v-else class="text-xs text-amber-700 dark:text-amber-300">
            Nenhuma impressora aceita esse tipo de tinta.
          </p>
          <p v-if="printersWithoutInk.length" class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Fora da lista por não aceitarem {{ PRINTING_INK_KIND_LABELS[form.printingInkKind] }}:
            {{ printersWithoutInk.map((m) => m.value).join(', ') }}. Ajuste em
            <strong>Máquinas → Tinta da máquina</strong>.
          </p>
          <p v-if="errors['machineIds']" class="mt-1 text-xs text-rose-600">{{ errors['machineIds'] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- ACABAMENTO: subtipo -->
    <fieldset v-if="isFinishing" class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Acabamento</legend>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Subtipo <span class="text-rose-500">*</span></label>
          <select v-model="form.finishingSubtype" :class="selectClass">
            <option v-for="st in ACTIVITY_FINISHING_SUBTYPES" :key="st" :value="st">
              {{ ACTIVITY_FINISHING_SUBTYPE_LABELS[st] }}
            </option>
          </select>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ ACTIVITY_FINISHING_SUBTYPE_HINTS[form.finishingSubtype] }}</p>
        </div>

        <div v-if="usesFinishingTask">
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Acabamento <span class="text-rose-500">*</span></label>
          <select v-model="form.finishingTaskId" :class="inputClass('finishingTaskId')">
            <option :value="null">— Selecione —</option>
            <option v-for="f in finishingTaskOptions" :key="f.id" :value="f.id">{{ f.value }}</option>
          </select>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">O custo da atividade vem do acabamento.</p>
          <p v-if="errors['finishingTaskId']" class="mt-1 text-xs text-rose-600">{{ errors['finishingTaskId'] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- CORTE: uma ou mais guilhotinas -->
    <fieldset v-if="isCutting" class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Corte</legend>
      <span class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Máquinas de corte <span class="text-rose-500">*</span>
      </span>
      <div v-if="machineOptions.length" class="space-y-2 max-h-44 overflow-y-auto pr-1">
        <label v-for="m in machineOptions" :key="m.id" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            :checked="isMachineSelected(m.id)"
            @change="toggleMachine(m.id)"
            class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
          />
          {{ m.value }}
        </label>
      </div>
      <p v-else class="text-xs text-amber-700 dark:text-amber-300">Nenhuma guilhotina cadastrada.</p>
      <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Marque todas as guilhotinas que fazem este corte — o orçamento escolhe a de melhor preço.
      </p>
      <p v-if="errors['machineIds']" class="mt-1 text-xs text-rose-600">{{ errors['machineIds'] }}</p>
    </fieldset>

    <!-- ACABAMENTO AUTOMATIZADO: máquina única -->
    <div v-if="usesSingleMachine" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Máquina <span class="text-rose-500">*</span></label>
        <select v-model="singleMachineId" :class="inputClass('machineIds')">
          <option :value="null">— Selecione —</option>
          <option v-for="m in machineOptions" :key="m.id" :value="m.id">{{ m.value }}</option>
        </select>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">O custo da atividade vem do custo-hora da máquina.</p>
        <p v-if="errors['machineIds']" class="mt-1 text-xs text-rose-600">{{ errors['machineIds'] }}</p>
      </div>
    </div>

    <!-- EMPACOTAMENTO: grupo de papéis + tarefa de empacotar -->
    <fieldset v-if="isPackaging" class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Empacotamento</legend>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Papel do pacote <span class="text-rose-500">*</span></label>
          <select v-model="form.paperTypeId" :class="inputClass('paperTypeId')">
            <option :value="null">— Selecione —</option>
            <option v-for="pt in paperTypes" :key="pt.id" :value="pt.id">
              {{ pt.name }}<span v-if="pt.weightPerM2Grams"> — {{ pt.weightPerM2Grams }}g</span>
            </option>
          </select>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Família de papéis do cadastro de papéis (ex.: Papel Kraft); a quantidade sai do peso do pacote.
          </p>
          <p v-if="errors['paperTypeId']" class="mt-1 text-xs text-rose-600">{{ errors['paperTypeId'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Tarefa de empacotar <span class="text-rose-500">*</span></label>
          <select v-model="form.finishingTaskId" :class="inputClass('finishingTaskId')">
            <option :value="null">— Selecione —</option>
            <option v-for="f in finishingTaskOptions" :key="f.id" :value="f.id">{{ f.value }}</option>
          </select>
          <p v-if="errors['finishingTaskId']" class="mt-1 text-xs text-rose-600">{{ errors['finishingTaskId'] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Consumo de insumo: só no acabamento -->
    <fieldset v-if="isFinishing" class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Consumo de insumo</legend>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Grupo de insumo</label>
          <select v-model="form.supplyGroupId" :class="selectClass">
            <option :value="null">— Nenhum —</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.value }}</option>
          </select>
        </div>
        <div v-if="consumesSupply">
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
            Quantidade <span v-if="selectedGroupUnit" class="text-xs font-normal text-slate-400">({{ selectedGroupUnit }})</span> <span class="text-rose-500">*</span>
          </label>
          <input v-model="form.supplyConsumptionQuantity" type="number" min="0" step="0.0001" :class="inputClass('supplyConsumptionQuantity')" />
          <p v-if="errors['supplyConsumptionQuantity']" class="mt-1 text-xs text-rose-600">{{ errors['supplyConsumptionQuantity'] }}</p>
        </div>
        <div v-if="consumesSupply">
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Base de cobrança <span class="text-rose-500">*</span></label>
          <select v-model="form.supplyConsumptionBasis" :class="inputClass('supplyConsumptionBasis')">
            <option v-for="b in CONSUMPTION_BASES" :key="b" :value="b">{{ CONSUMPTION_BASIS_LABELS[b] }}</option>
          </select>
          <p v-if="errors['supplyConsumptionBasis']" class="mt-1 text-xs text-rose-600">{{ errors['supplyConsumptionBasis'] }}</p>
        </div>
      </div>
      <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
        A unidade da quantidade vem do grupo. No orçamento escolhe-se o insumo específico e as dimensões.
      </p>
    </fieldset>

    <label v-if="isEditing" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input v-model="form.active" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
      Atividade ativa
    </label>

    <div v-if="serverError" class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300">
      {{ serverError }}
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <button type="button" @click="emit('cancel')" class="text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">
        Cancelar
      </button>
      <button type="submit" :disabled="loading" class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-2.5 shadow-md shadow-indigo-500/20">
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar atividade' }}
      </button>
    </div>
  </form>
</template>
