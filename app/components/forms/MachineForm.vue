<script setup lang="ts">
import { z } from 'zod'
import type {
  CreateMachineRequest,
  MachineDimensionsDto,
  MachineResponse,
  MachineTechnicalSpecsDto,
  UpdateMachineRequest,
} from '~/types'

interface Props {
  initialValue?: MachineResponse | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialValue: null,
  loading: false,
})

const emit = defineEmits<{
  submit: [payload: CreateMachineRequest | UpdateMachineRequest]
  cancel: []
}>()

const isEdit = computed(() => Boolean(props.initialValue?.id))

interface FormState {
  // Basic
  name: string
  manufacturer: string
  model: string
  serialNumber: string
  hourlyRate: number
  powerConsumptionKwh: number
  operatorCount: number
  active: boolean
  // Aninhados
  technicalSpecs: MachineTechnicalSpecsDto
  dimensions: MachineDimensionsDto
}

const buildEmptyTechnicalSpecs = (): MachineTechnicalSpecsDto => ({
  maxColors: 4,
  minSpeed: 0,
  maxSpeed: 0,
  cruisingSheets: 0,
  setupTimeMinutes: 0,
  cleaningTimeMinutes: 0,
  makereadyWasteSheets: 0,
  requiresPlate: false,
  requiresPhotolith: false,
  platesPerColor: 0,
  photolithsPerColor: 0,
})

const buildEmptyDimensions = (): MachineDimensionsDto => ({
  minSheetWidthMm: 0,
  maxSheetWidthMm: 0,
  minSheetHeightMm: 0,
  maxSheetHeightMm: 0,
  maxPrintableWidthMm: 0,
  maxPrintableHeightMm: 0,
  gripperMarginMm: 0,
  minGrammageG: 0,
  maxGrammageG: 0,
})

const buildInitialState = (): FormState => {
  const initial = props.initialValue
  return {
    name: initial?.name ?? '',
    manufacturer: initial?.manufacturer ?? '',
    model: initial?.model ?? '',
    serialNumber: initial?.serialNumber ?? '',
    hourlyRate: initial?.hourlyRate ?? 0,
    powerConsumptionKwh: initial?.powerConsumptionKwh ?? 0,
    operatorCount: initial?.operatorCount ?? 1,
    active: initial?.active ?? true,
    technicalSpecs: { ...buildEmptyTechnicalSpecs(), ...(initial?.technicalSpecs ?? {}) },
    dimensions: { ...buildEmptyDimensions(), ...(initial?.dimensions ?? {}) },
  }
}

const form = reactive<FormState>(buildInitialState())
const errors = reactive<Record<string, string>>({})

watch(
  () => props.initialValue,
  () => {
    Object.assign(form, buildInitialState())
    Object.keys(errors).forEach((key) => delete errors[key])
  },
)

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

const technicalSchema = z
  .object({
    maxColors: z.number().int().min(1, 'Mínimo 1 cor'),
    minSpeed: z.number().nonnegative('Velocidade não pode ser negativa'),
    maxSpeed: z.number().nonnegative('Velocidade não pode ser negativa'),
    cruisingSheets: z.number().int().nonnegative(),
    setupTimeMinutes: z.number().nonnegative(),
    cleaningTimeMinutes: z.number().nonnegative(),
    makereadyWasteSheets: z.number().int().nonnegative(),
    requiresPlate: z.boolean(),
    requiresPhotolith: z.boolean(),
    platesPerColor: z.number().int().nonnegative(),
    photolithsPerColor: z.number().int().nonnegative(),
  })
  .superRefine((data, ctx) => {
    if (data.maxSpeed < data.minSpeed) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxSpeed'],
        message: 'Velocidade máxima não pode ser menor que a mínima',
      })
    }
  })

const dimensionsSchema = z
  .object({
    minSheetWidthMm: z.number().positive('Deve ser maior que zero'),
    maxSheetWidthMm: z.number().positive('Deve ser maior que zero'),
    minSheetHeightMm: z.number().positive('Deve ser maior que zero'),
    maxSheetHeightMm: z.number().positive('Deve ser maior que zero'),
    maxPrintableWidthMm: z.number().positive('Deve ser maior que zero'),
    maxPrintableHeightMm: z.number().positive('Deve ser maior que zero'),
    gripperMarginMm: z.number().nonnegative(),
    minGrammageG: z.number().nonnegative(),
    maxGrammageG: z.number().nonnegative(),
  })
  .superRefine((data, ctx) => {
    if (data.maxSheetWidthMm < data.minSheetWidthMm) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxSheetWidthMm'],
        message: 'Largura máxima da folha não pode ser menor que a mínima',
      })
    }
    if (data.maxSheetHeightMm < data.minSheetHeightMm) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxSheetHeightMm'],
        message: 'Altura máxima da folha não pode ser menor que a mínima',
      })
    }
    if (data.maxPrintableWidthMm > data.maxSheetWidthMm) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxPrintableWidthMm'],
        message: 'Área imprimível não pode exceder a folha',
      })
    }
    if (data.maxPrintableHeightMm > data.maxSheetHeightMm) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxPrintableHeightMm'],
        message: 'Área imprimível não pode exceder a folha',
      })
    }
    if (data.maxGrammageG < data.minGrammageG) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxGrammageG'],
        message: 'Gramatura máxima não pode ser menor que a mínima',
      })
    }
  })

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  hourlyRate: z.number().nonnegative('Valor não pode ser negativo'),
  powerConsumptionKwh: z.number().nonnegative('Valor não pode ser negativo'),
  operatorCount: z.number().int().min(1, 'Mínimo 1 operador'),
  active: z.boolean(),
  technicalSpecs: technicalSchema,
  dimensions: dimensionsSchema,
})

const validate = (): boolean => {
  Object.keys(errors).forEach((key) => delete errors[key])
  const result = schema.safeParse(form)
  if (result.success) return true
  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    if (!errors[path]) errors[path] = issue.message
  }
  return false
}

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

const buildPayload = (): CreateMachineRequest | UpdateMachineRequest => ({
  name: form.name.trim(),
  manufacturer: form.manufacturer.trim() || null,
  model: form.model.trim() || null,
  serialNumber: form.serialNumber.trim() || null,
  hourlyRate: Number(form.hourlyRate),
  powerConsumptionKwh: Number(form.powerConsumptionKwh),
  operatorCount: Number(form.operatorCount),
  active: form.active,
  technicalSpecs: {
    maxColors: Number(form.technicalSpecs.maxColors),
    minSpeed: Number(form.technicalSpecs.minSpeed),
    maxSpeed: Number(form.technicalSpecs.maxSpeed),
    cruisingSheets: Number(form.technicalSpecs.cruisingSheets),
    setupTimeMinutes: Number(form.technicalSpecs.setupTimeMinutes),
    cleaningTimeMinutes: Number(form.technicalSpecs.cleaningTimeMinutes),
    makereadyWasteSheets: Number(form.technicalSpecs.makereadyWasteSheets),
    requiresPlate: form.technicalSpecs.requiresPlate,
    requiresPhotolith: form.technicalSpecs.requiresPhotolith,
    platesPerColor: Number(form.technicalSpecs.platesPerColor),
    photolithsPerColor: Number(form.technicalSpecs.photolithsPerColor),
  },
  dimensions: {
    minSheetWidthMm: Number(form.dimensions.minSheetWidthMm),
    maxSheetWidthMm: Number(form.dimensions.maxSheetWidthMm),
    minSheetHeightMm: Number(form.dimensions.minSheetHeightMm),
    maxSheetHeightMm: Number(form.dimensions.maxSheetHeightMm),
    maxPrintableWidthMm: Number(form.dimensions.maxPrintableWidthMm),
    maxPrintableHeightMm: Number(form.dimensions.maxPrintableHeightMm),
    gripperMarginMm: Number(form.dimensions.gripperMarginMm),
    minGrammageG: Number(form.dimensions.minGrammageG),
    maxGrammageG: Number(form.dimensions.maxGrammageG),
  },
})

const handleSubmit = () => {
  if (!validate()) return
  emit('submit', buildPayload())
}
</script>

<template>
  <BaseForm @submit="handleSubmit">
    <!-- Seção 1: Informações básicas -->
    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">
        Informações básicas
      </legend>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseInput
          v-model="form.name"
          label="Nome"
          placeholder="Ex.: Heidelberg SM 74"
          required
          :error="errors.name"
        />
        <BaseInput
          v-model="form.manufacturer"
          label="Fabricante"
          placeholder="Ex.: Heidelberg"
          :error="errors.manufacturer"
        />
        <BaseInput
          v-model="form.model"
          label="Modelo"
          placeholder="Ex.: SM 74"
          :error="errors.model"
        />
        <BaseInput
          v-model="form.serialNumber"
          label="Número de série"
          placeholder="Ex.: SN-123456"
          :error="errors.serialNumber"
        />
      </div>

      <h3 class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Custos e operação
      </h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BaseInput
          v-model.number="form.hourlyRate"
          type="number"
          step="0.01"
          min="0"
          label="Custo hora (R$)"
          placeholder="0,00"
          required
          :error="errors.hourlyRate"
        />
        <BaseInput
          v-model.number="form.powerConsumptionKwh"
          type="number"
          step="0.01"
          min="0"
          label="Consumo (kWh)"
          placeholder="0,00"
          required
          :error="errors.powerConsumptionKwh"
        />
        <BaseInput
          v-model.number="form.operatorCount"
          type="number"
          step="1"
          min="1"
          label="Nº de operadores"
          placeholder="1"
          required
          :error="errors.operatorCount"
        />
        <div class="flex items-end md:col-span-3">
          <BaseCheckbox v-model="form.active" label="Máquina ativa" />
        </div>
      </div>
    </fieldset>

    <!-- Seção 2: Especificações técnicas -->
    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">
        Especificações técnicas
      </legend>

      <h3 class="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Cores e velocidades
      </h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BaseInput
          v-model.number="form.technicalSpecs.maxColors"
          type="number"
          step="1"
          min="1"
          label="Máximo de cores"
          placeholder="4"
          required
          :error="errors['technicalSpecs.maxColors']"
        />
        <BaseInput
          v-model.number="form.technicalSpecs.minSpeed"
          type="number"
          step="1"
          min="0"
          label="Velocidade mín. (folhas/h)"
          placeholder="0"
          :error="errors['technicalSpecs.minSpeed']"
        />
        <BaseInput
          v-model.number="form.technicalSpecs.maxSpeed"
          type="number"
          step="1"
          min="0"
          label="Velocidade máx. (folhas/h)"
          placeholder="0"
          :error="errors['technicalSpecs.maxSpeed']"
        />
      </div>

      <h3 class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Tempos e desperdícios
      </h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <BaseInput
          v-model.number="form.technicalSpecs.setupTimeMinutes"
          type="number"
          step="1"
          min="0"
          label="Setup (min)"
          placeholder="0"
          :error="errors['technicalSpecs.setupTimeMinutes']"
        />
        <BaseInput
          v-model.number="form.technicalSpecs.cleaningTimeMinutes"
          type="number"
          step="1"
          min="0"
          label="Limpeza (min)"
          placeholder="0"
          :error="errors['technicalSpecs.cleaningTimeMinutes']"
        />
        <BaseInput
          v-model.number="form.technicalSpecs.cruisingSheets"
          type="number"
          step="1"
          min="0"
          label="Folhas até regime"
          placeholder="0"
          :error="errors['technicalSpecs.cruisingSheets']"
          hint="Folhas para entrar no cruise"
        />
        <BaseInput
          v-model.number="form.technicalSpecs.makereadyWasteSheets"
          type="number"
          step="1"
          min="0"
          label="Desperdício makeready"
          placeholder="0"
          :error="errors['technicalSpecs.makereadyWasteSheets']"
        />
      </div>

      <h3 class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Pré-impressão (chapas / fotolitos)
      </h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
          <BaseCheckbox
            v-model="form.technicalSpecs.requiresPlate"
            label="Requer chapas"
          />
          <BaseInput
            v-model.number="form.technicalSpecs.platesPerColor"
            type="number"
            step="1"
            min="0"
            label="Chapas por cor"
            placeholder="0"
            :disabled="!form.technicalSpecs.requiresPlate"
            :error="errors['technicalSpecs.platesPerColor']"
          />
        </div>
        <div class="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
          <BaseCheckbox
            v-model="form.technicalSpecs.requiresPhotolith"
            label="Requer fotolitos"
          />
          <BaseInput
            v-model.number="form.technicalSpecs.photolithsPerColor"
            type="number"
            step="1"
            min="0"
            label="Fotolitos por cor"
            placeholder="0"
            :disabled="!form.technicalSpecs.requiresPhotolith"
            :error="errors['technicalSpecs.photolithsPerColor']"
          />
        </div>
      </div>
    </fieldset>

    <!-- Seção 3: Dimensões -->
    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">Dimensões</legend>

      <h3 class="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Folha (mm)
      </h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <BaseInput
          v-model.number="form.dimensions.minSheetWidthMm"
          type="number"
          step="0.01"
          min="0"
          label="Largura mínima"
          placeholder="0"
          required
          :error="errors['dimensions.minSheetWidthMm']"
        />
        <BaseInput
          v-model.number="form.dimensions.maxSheetWidthMm"
          type="number"
          step="0.01"
          min="0"
          label="Largura máxima"
          placeholder="0"
          required
          :error="errors['dimensions.maxSheetWidthMm']"
        />
        <BaseInput
          v-model.number="form.dimensions.minSheetHeightMm"
          type="number"
          step="0.01"
          min="0"
          label="Altura mínima"
          placeholder="0"
          required
          :error="errors['dimensions.minSheetHeightMm']"
        />
        <BaseInput
          v-model.number="form.dimensions.maxSheetHeightMm"
          type="number"
          step="0.01"
          min="0"
          label="Altura máxima"
          placeholder="0"
          required
          :error="errors['dimensions.maxSheetHeightMm']"
        />
      </div>

      <h3 class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Área imprimível (mm)
      </h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BaseInput
          v-model.number="form.dimensions.maxPrintableWidthMm"
          type="number"
          step="0.01"
          min="0"
          label="Largura máxima"
          placeholder="0"
          required
          :error="errors['dimensions.maxPrintableWidthMm']"
        />
        <BaseInput
          v-model.number="form.dimensions.maxPrintableHeightMm"
          type="number"
          step="0.01"
          min="0"
          label="Altura máxima"
          placeholder="0"
          required
          :error="errors['dimensions.maxPrintableHeightMm']"
        />
        <BaseInput
          v-model.number="form.dimensions.gripperMarginMm"
          type="number"
          step="0.01"
          min="0"
          label="Margem das garras (mm)"
          placeholder="0"
          :error="errors['dimensions.gripperMarginMm']"
        />
      </div>

      <h3 class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Gramatura suportada (g/m²)
      </h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseInput
          v-model.number="form.dimensions.minGrammageG"
          type="number"
          step="0.01"
          min="0"
          label="Mínima"
          placeholder="0"
          :error="errors['dimensions.minGrammageG']"
        />
        <BaseInput
          v-model.number="form.dimensions.maxGrammageG"
          type="number"
          step="0.01"
          min="0"
          label="Máxima"
          placeholder="0"
          :error="errors['dimensions.maxGrammageG']"
        />
      </div>
    </fieldset>

    <div class="flex justify-end gap-2 pt-2">
      <BaseButton variant="secondary" type="button" @click="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton variant="primary" type="submit" :loading="loading">
        {{ isEdit ? 'Atualizar' : 'Criar' }}
      </BaseButton>
    </div>
  </BaseForm>
</template>
