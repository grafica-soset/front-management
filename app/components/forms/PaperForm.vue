<script setup lang="ts">
import { z } from 'zod'
import type {
  CreatePaperRequest,
  PaperResponse,
  SkuDto,
  UpdatePaperRequest,
} from '~/types/paper'
import type { KeyValueDto, PersonDto } from '~/types/shared'

interface Props {
  initialValue?: PaperResponse | null
  loading?: boolean
  /** Tipos de papel disponíveis para o select. */
  typeOptions?: KeyValueDto[]
}

const props = withDefaults(defineProps<Props>(), {
  initialValue: null,
  loading: false,
  typeOptions: () => [],
})

const emit = defineEmits<{
  submit: [payload: CreatePaperRequest | UpdatePaperRequest]
  cancel: []
}>()

const isEdit = computed(() => Boolean(props.initialValue?.id))

const typeSelectOptions = computed(() =>
  props.typeOptions.map((option) => ({ value: option.id, label: option.value })),
)

const hasTypeOptions = computed(() => props.typeOptions.length > 0)

interface FormState {
  sku: SkuDto
  typeId: number | null
  typeName: string
  formatWidth: number
  formatHeight: number
  grammageG: number
  pricePerKg: number | null
  pricePerSheet: number | null
  active: boolean
  hasSupplier: boolean
  supplier: PersonDto
}

// Quando há tipos cadastrados, seleciona um existente; caso contrário, cai
// direto no modo "criar novo" digitando o nome.
const useNewType = ref(false)

const buildEmptyPerson = (): PersonDto => ({
  name: '',
  corporateName: '',
  document: '',
  email: '',
  stateRegistration: '',
  municipalRegistration: '',
  suframaRegistration: '',
  isFinalConsumer: false,
  icmsTaxpayerIndicator: '9',
})

const buildInitialState = (): FormState => {
  const initial = props.initialValue
  return {
    sku: {
      id: initial?.sku?.id,
      name: initial?.sku?.name ?? '',
      code: initial?.sku?.code ?? '',
      description: initial?.sku?.description ?? '',
    },
    typeId: initial?.type?.id ?? null,
    typeName: '',
    formatWidth: initial?.formatWidth ?? 0,
    formatHeight: initial?.formatHeight ?? 0,
    grammageG: initial?.grammageG ?? 0,
    pricePerKg: initial?.pricePerKg ?? null,
    pricePerSheet: initial?.pricePerSheet ?? null,
    active: initial?.active ?? true,
    hasSupplier: Boolean(initial?.supplier),
    supplier: { ...buildEmptyPerson(), ...(initial?.supplier ?? {}) },
  }
}

const form = reactive<FormState>(buildInitialState())
const errors = reactive<Record<string, string>>({})

const resolveTypeMode = () => {
  // Sem opções OU sem tipo previamente vinculado -> modo "criar novo".
  useNewType.value = !hasTypeOptions.value && !props.initialValue?.type?.id
}

resolveTypeMode()

watch(
  () => props.initialValue,
  () => {
    Object.assign(form, buildInitialState())
    Object.keys(errors).forEach((key) => delete errors[key])
    resolveTypeMode()
  },
)

watch(hasTypeOptions, (has) => {
  if (!has) useNewType.value = true
})

const toggleTypeMode = () => {
  useNewType.value = !useNewType.value
  delete errors.typeId
  delete errors.typeName
}

const schema = z.object({
  sku: z.object({
    name: z.string().min(2, 'Nome do SKU obrigatório'),
  }).passthrough(),
  formatWidth: z.number().positive('Largura deve ser maior que zero'),
  formatHeight: z.number().positive('Altura deve ser maior que zero'),
  grammageG: z.number().positive('Gramatura deve ser maior que zero'),
  pricePerKg: z.number().nonnegative().nullable().optional(),
  pricePerSheet: z.number().nonnegative().nullable().optional(),
  active: z.boolean(),
})

const validate = (): boolean => {
  Object.keys(errors).forEach((key) => delete errors[key])
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.')
      if (!errors[path]) errors[path] = issue.message
    }
  }

  if (useNewType.value) {
    if (!form.typeName.trim()) errors.typeName = 'Informe o nome do novo tipo'
  } else if (!form.typeId) {
    errors.typeId = 'Selecione um tipo'
  }

  if (form.hasSupplier) {
    if (!form.supplier.name) errors['supplier.name'] = 'Nome obrigatório'
    if (!form.supplier.document) errors['supplier.document'] = 'Documento obrigatório'
  }

  return Object.keys(errors).length === 0
}

const buildPayload = (): CreatePaperRequest | UpdatePaperRequest => {
  const supplierPayload: PersonDto | null = form.hasSupplier
    ? {
      ...form.supplier,
      email: form.supplier.email || null,
      corporateName: form.supplier.corporateName || null,
      stateRegistration: form.supplier.stateRegistration || null,
      municipalRegistration: form.supplier.municipalRegistration || null,
      suframaRegistration: form.supplier.suframaRegistration || null,
      ...(props.initialValue?.supplier?.id ? { id: props.initialValue.supplier.id } : {}),
    }
    : null

  const typePayload = useNewType.value
    ? { typeName: form.typeName.trim() }
    : { typeId: Number(form.typeId) }

  return {
    sku: {
      ...(form.sku.id ? { id: form.sku.id } : {}),
      name: form.sku.name,
      code: form.sku.code || null,
      description: form.sku.description || null,
    },
    ...typePayload,
    formatWidth: Number(form.formatWidth),
    formatHeight: Number(form.formatHeight),
    grammageG: Number(form.grammageG),
    pricePerKg: form.pricePerKg !== null && form.pricePerKg !== undefined ? Number(form.pricePerKg) : null,
    pricePerSheet: form.pricePerSheet !== null && form.pricePerSheet !== undefined ? Number(form.pricePerSheet) : null,
    supplier: supplierPayload,
    active: form.active,
  }
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
          v-model="form.sku.name"
          label="Nome"
          placeholder="Ex.: Couché 150g 66x96"
          required
          :error="errors['sku.name']"
        />
        <BaseInput
          v-model="form.sku.code"
          label="Código"
          placeholder="SKU/ERP"
          :error="errors['sku.code']"
        />
        <BaseInput
          v-model="form.sku.description"
          label="Descrição"
          placeholder="Descrição livre"
          :error="errors['sku.description']"
        />
      </div>
    </fieldset>

    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">Especificações</legend>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-700">
              Tipo <span class="text-red-500">*</span>
            </span>
            <button
              v-if="hasTypeOptions"
              type="button"
              class="text-xs font-medium text-brand-600 hover:underline"
              @click="toggleTypeMode"
            >
              {{ useNewType ? 'Selecionar existente' : '+ Criar novo' }}
            </button>
          </div>
          <BaseSelect
            v-if="!useNewType"
            v-model="form.typeId"
            :options="typeSelectOptions"
            placeholder="Selecione..."
            :error="errors.typeId"
          />
          <BaseInput
            v-else
            v-model="form.typeName"
            placeholder="Nome do novo tipo (ex.: Couché)"
            :error="errors.typeName"
          />
          <span v-if="useNewType && !errors.typeName" class="text-xs text-slate-400">
            Será cadastrado um novo tipo de papel ao salvar.
          </span>
        </div>
        <BaseInput
          v-model.number="form.grammageG"
          type="number"
          label="Gramatura (g/m²)"
          placeholder="0"
          required
          :error="errors.grammageG"
        />
        <label class="flex items-end gap-2 text-sm text-slate-700">
          <input
            v-model="form.active"
            type="checkbox"
            class="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Item ativo
        </label>
        <BaseInput
          v-model.number="form.formatWidth"
          type="number"
          label="Formato — Largura (mm)"
          placeholder="0"
          required
          :error="errors.formatWidth"
        />
        <BaseInput
          v-model.number="form.formatHeight"
          type="number"
          label="Formato — Altura (mm)"
          placeholder="0"
          required
          :error="errors.formatHeight"
        />
      </div>
    </fieldset>

    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">Preços</legend>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseInput
          v-model.number="form.pricePerKg"
          type="number"
          label="Preço por kg (R$)"
          placeholder="0,00"
          :error="errors.pricePerKg"
        />
        <BaseInput
          v-model.number="form.pricePerSheet"
          type="number"
          label="Preço por folha (R$)"
          placeholder="0,00"
          :error="errors.pricePerSheet"
        />
      </div>
    </fieldset>

    <div class="flex flex-col gap-3 rounded-lg border border-slate-200 p-4">
      <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          v-model="form.hasSupplier"
          type="checkbox"
          class="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        Vincular fornecedor
      </label>
      <PersonFieldset
        v-if="form.hasSupplier"
        v-model="form.supplier"
        :errors="errors"
        legend="Fornecedor"
      />
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <BaseButton variant="secondary" type="button" @click="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton variant="primary" type="submit" :loading="props.loading">
        {{ isEdit ? 'Atualizar' : 'Criar' }}
      </BaseButton>
    </div>
  </BaseForm>
</template>
