<script setup lang="ts">
import { z } from 'zod'
import {
  type CreatePaperRequest,
  type PaperResponse,
  type UnitOfMeasure,
  type UpdatePaperRequest,
  UNIT_OF_MEASURE_OPTIONS,
} from '~/types'

interface Props {
  initialValue?: PaperResponse | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialValue: null,
  loading: false,
})

const emit = defineEmits<{
  submit: [payload: CreatePaperRequest | UpdatePaperRequest]
  cancel: []
}>()

const isEdit = computed(() => Boolean(props.initialValue?.id))

interface FormState {
  skuCode: string
  skuName: string
  unitOfMeasure: UnitOfMeasure
  typeId: number | null
  typeName: string
  typeDescription: string
  isEnvelope: boolean
  formatWidth: number
  formatHeight: number
  thicknessUm: number
  grammageG: number
  pricePerKg: number | null
  pricePerSheet: number | null
}

const buildInitialState = (): FormState => {
  const initial = props.initialValue
  return {
    skuCode: initial?.sku?.code ?? '',
    skuName: initial?.sku?.name ?? '',
    unitOfMeasure: initial?.sku?.unitOfMeasure ?? 'SHEET',
    typeId: initial?.type?.id ?? null,
    typeName: initial?.type?.name ?? '',
    typeDescription: initial?.type?.description ?? '',
    isEnvelope: initial?.isEnvelope ?? false,
    formatWidth: initial?.formatWidth ?? 0,
    formatHeight: initial?.formatHeight ?? 0,
    thicknessUm: initial?.thicknessUm ?? 0,
    grammageG: initial?.grammageG ?? 0,
    pricePerKg: initial?.pricePerKg ?? null,
    pricePerSheet: initial?.pricePerSheet ?? null,
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

const schema = z.object({
  skuName: z.string().min(2, 'Nome do SKU obrigatório'),
  unitOfMeasure: z.enum(['SHEET', 'KG', 'UN', 'LITERS', 'METER', 'BOX', 'PACKAGE']),
  typeName: z.string().min(2, 'Nome do tipo obrigatório'),
  formatWidth: z.number().positive('Largura deve ser maior que zero'),
  formatHeight: z.number().positive('Altura deve ser maior que zero'),
  thicknessUm: z.number().positive('Espessura deve ser maior que zero'),
  grammageG: z.number().positive('Gramatura deve ser maior que zero'),
  pricePerKg: z.number().nonnegative().nullable().optional(),
  pricePerSheet: z.number().nonnegative().nullable().optional(),
  isEnvelope: z.boolean(),
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

const buildPayload = (): CreatePaperRequest | UpdatePaperRequest => {
  const numericPrice = (value: number | null) =>
    value === null || value === undefined ? null : Number(value)

  const base = {
    skuCode: form.skuCode.trim() || null,
    skuName: form.skuName.trim(),
    unitOfMeasure: form.unitOfMeasure,
    typeName: form.typeName.trim(),
    typeDescription: form.typeDescription.trim() || null,
    isEnvelope: form.isEnvelope,
    formatWidth: Number(form.formatWidth),
    formatHeight: Number(form.formatHeight),
    thicknessUm: Number(form.thicknessUm),
    grammageG: Number(form.grammageG),
    pricePerKg: numericPrice(form.pricePerKg),
    pricePerSheet: numericPrice(form.pricePerSheet),
  }

  // PUT exige skuCode + typeId + typeName preenchidos.
  if (isEdit.value && form.typeId !== null && base.skuCode) {
    return {
      ...base,
      skuCode: base.skuCode,
      typeId: form.typeId,
    } as UpdatePaperRequest
  }

  return base satisfies CreatePaperRequest
}

const handleSubmit = () => {
  if (!validate()) return
  emit('submit', buildPayload())
}
</script>

<template>
  <BaseForm @submit="handleSubmit">
    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">SKU</legend>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BaseInput
          v-model="form.skuCode"
          label="Código (SKU)"
          placeholder="Ex.: PPL-75-A4"
          :error="errors.skuCode"
        />
        <BaseInput
          v-model="form.skuName"
          label="Nome do SKU"
          placeholder="Ex.: Sulfite 75g A4"
          required
          :error="errors.skuName"
          class="md:col-span-2"
        />
        <BaseSelect
          v-model="form.unitOfMeasure"
          label="Unidade de medida"
          :options="UNIT_OF_MEASURE_OPTIONS"
          required
          :error="errors.unitOfMeasure"
        />
      </div>
    </fieldset>

    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">Tipo de papel</legend>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseInput
          v-model="form.typeName"
          label="Nome do tipo"
          placeholder="Ex.: Sulfite"
          required
          :error="errors.typeName"
        />
        <BaseInput
          v-model="form.typeDescription"
          label="Descrição do tipo"
          placeholder="Ex.: Papel sulfite branco"
          :error="errors.typeDescription"
        />
      </div>
    </fieldset>

    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">Especificações</legend>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BaseInput
          v-model.number="form.formatWidth"
          type="number"
          step="0.01"
          min="0"
          label="Largura (mm)"
          placeholder="0"
          required
          :error="errors.formatWidth"
        />
        <BaseInput
          v-model.number="form.formatHeight"
          type="number"
          step="0.01"
          min="0"
          label="Altura (mm)"
          placeholder="0"
          required
          :error="errors.formatHeight"
        />
        <BaseInput
          v-model.number="form.thicknessUm"
          type="number"
          step="0.01"
          min="0"
          label="Espessura (µm)"
          placeholder="0"
          required
          :error="errors.thicknessUm"
        />
        <BaseInput
          v-model.number="form.grammageG"
          type="number"
          step="0.01"
          min="0"
          label="Gramatura (g/m²)"
          placeholder="0"
          required
          :error="errors.grammageG"
        />
        <div class="flex items-end md:col-span-2">
          <BaseCheckbox v-model="form.isEnvelope" label="É envelope" />
        </div>
      </div>
    </fieldset>

    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">Preços</legend>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseInput
          v-model.number="form.pricePerKg"
          type="number"
          step="0.01"
          min="0"
          label="Preço por kg (R$)"
          placeholder="0,00"
          :error="errors.pricePerKg"
        />
        <BaseInput
          v-model.number="form.pricePerSheet"
          type="number"
          step="0.01"
          min="0"
          label="Preço por folha (R$)"
          placeholder="0,00"
          :error="errors.pricePerSheet"
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
