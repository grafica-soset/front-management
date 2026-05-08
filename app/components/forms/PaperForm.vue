<script setup lang="ts">
import { z } from 'zod'
import {
  type CreatePaperRequest,
  type KeyValueDto,
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

/**
 * O usuário escolhe entre reaproveitar um tipo já cadastrado (`existing`)
 * ou criar um novo tipo no momento (`new`). O modo controla quais campos
 * aparecem no formulário e quais campos vão no payload.
 */
type TypeMode = 'existing' | 'new'

const TYPE_MODE_OPTIONS = [
  { value: 'existing' as const, label: 'Selecionar existente' },
  { value: 'new' as const, label: 'Cadastrar novo' },
]

interface FormState {
  skuCode: string
  skuName: string
  unitOfMeasure: UnitOfMeasure
  typeMode: TypeMode
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
    // Em edição, o papel sempre tem um tipo; já em criação assumimos que o
    // usuário vai querer reaproveitar a lista existente por padrão.
    typeMode: 'existing',
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

// ---------------------------------------------------------------------------
// Lista de tipos existentes (alimenta o select quando typeMode === 'existing').
// ---------------------------------------------------------------------------

const paperTypesApi = usePaperTypes()
const paperTypes = ref<KeyValueDto[]>([])
const loadingTypes = ref(false)
const typesError = ref<string | null>(null)

const paperTypeOptions = computed(() =>
  paperTypes.value.map((type) => ({ value: type.id, label: type.value })),
)

const loadPaperTypes = async () => {
  loadingTypes.value = true
  typesError.value = null
  try {
    paperTypes.value = await paperTypesApi.getAll()
  } catch (err) {
    logApiError('Falha ao carregar tipos de papel', err)
    typesError.value = extractApiErrorMessage(
      err,
      'Não foi possível carregar a lista de tipos.',
    )
  } finally {
    loadingTypes.value = false
  }
}

onMounted(loadPaperTypes)

/**
 * Sincroniza `typeName` quando o usuário escolhe um tipo no select.
 * Mantemos o nome no estado para que o payload do PUT (que exige `typeId`
 * e `typeName`) possa ser montado sem nova consulta.
 */
watch(
  () => form.typeId,
  (id) => {
    if (form.typeMode !== 'existing') return
    const match = paperTypes.value.find((type) => type.id === id)
    form.typeName = match?.value ?? ''
  },
)

/**
 * Quando o usuário troca o modo, limpamos os campos do modo oposto para
 * evitar enviar valores desatualizados. Em edição, ao voltar para
 * "existente" tentamos restaurar o tipo original do papel.
 */
watch(
  () => form.typeMode,
  (mode, prev) => {
    if (mode === prev) return
    if (mode === 'new') {
      form.typeId = null
      form.typeName = ''
      form.typeDescription = ''
    } else {
      const initialTypeId = props.initialValue?.type?.id ?? null
      form.typeId = initialTypeId
      form.typeName = props.initialValue?.type?.name ?? ''
      form.typeDescription = props.initialValue?.type?.description ?? ''
    }
  },
)

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

const baseSchema = z.object({
  skuName: z.string().min(2, 'Nome do SKU obrigatório'),
  unitOfMeasure: z.enum(['SHEET', 'KG', 'UN', 'LITERS', 'METER', 'BOX', 'PACKAGE']),
  formatWidth: z.number().positive('Largura deve ser maior que zero'),
  formatHeight: z.number().positive('Altura deve ser maior que zero'),
  thicknessUm: z.number().positive('Espessura deve ser maior que zero'),
  grammageG: z.number().positive('Gramatura deve ser maior que zero'),
  pricePerKg: z.number().nonnegative().nullable().optional(),
  pricePerSheet: z.number().nonnegative().nullable().optional(),
  isEnvelope: z.boolean(),
})

const existingSchema = baseSchema.extend({
  typeMode: z.literal('existing'),
  typeId: z.number({ message: 'Selecione um tipo' }).int().positive('Selecione um tipo'),
})

const newSchema = baseSchema.extend({
  typeMode: z.literal('new'),
  typeName: z.string().min(2, 'Nome do tipo obrigatório'),
})

const validate = (): boolean => {
  Object.keys(errors).forEach((key) => delete errors[key])
  const schema = form.typeMode === 'existing' ? existingSchema : newSchema
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

const buildPayload = (): CreatePaperRequest | UpdatePaperRequest => {
  const numericPrice = (value: number | null) =>
    value === null || value === undefined ? null : Number(value)

  const skuCode = form.skuCode.trim()
  const base = {
    skuCode: skuCode || null,
    skuName: form.skuName.trim(),
    unitOfMeasure: form.unitOfMeasure,
    isEnvelope: form.isEnvelope,
    formatWidth: Number(form.formatWidth),
    formatHeight: Number(form.formatHeight),
    thicknessUm: Number(form.thicknessUm),
    grammageG: Number(form.grammageG),
    pricePerKg: numericPrice(form.pricePerKg),
    pricePerSheet: numericPrice(form.pricePerSheet),
  }

  // Reaproveitando um tipo existente: enviamos `typeId` (e `typeName` como
  // referência, exigido pelo PUT). Não mandamos `typeDescription` para não
  // sobrescrever o registro original.
  if (form.typeMode === 'existing' && form.typeId !== null) {
    const payload = {
      ...base,
      typeId: form.typeId,
      typeName: form.typeName.trim(),
    }
    if (isEdit.value && skuCode) {
      return { ...payload, skuCode } as UpdatePaperRequest
    }
    return payload as CreatePaperRequest
  }

  // Cadastrando um tipo novo: enviamos `typeName` + `typeDescription`.
  // O backend cria o tipo e associa ao papel.
  const payload = {
    ...base,
    typeName: form.typeName.trim(),
    typeDescription: form.typeDescription.trim() || null,
  }
  if (isEdit.value && skuCode && form.typeId !== null) {
    return { ...payload, skuCode, typeId: form.typeId } as UpdatePaperRequest
  }
  return payload as CreatePaperRequest
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

    <fieldset class="flex flex-col gap-4 rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">Tipo de papel</legend>

      <BaseToggleGroup
        v-model="form.typeMode"
        label="Como você quer informar o tipo?"
        :options="TYPE_MODE_OPTIONS"
      />

      <!-- Reaproveitar tipo existente -->
      <div v-if="form.typeMode === 'existing'" class="flex flex-col gap-2">
        <BaseSelect
          v-model="form.typeId"
          label="Tipo cadastrado"
          :options="paperTypeOptions"
          :placeholder="loadingTypes ? 'Carregando tipos...' : 'Selecione um tipo'"
          :disabled="loadingTypes"
          required
          :error="errors.typeId"
          :hint="
            !loadingTypes && paperTypes.length === 0
              ? 'Nenhum tipo cadastrado. Troque para “Cadastrar novo” ou cadastre em Cadastros → Tipos de papel.'
              : ''
          "
        />
        <p v-if="typesError" class="text-xs text-red-600">{{ typesError }}</p>
        <button
          type="button"
          class="self-start text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
          :disabled="loadingTypes"
          @click="loadPaperTypes"
        >
          <Icon name="lucide:refresh-cw" class="inline size-3" /> Atualizar lista
        </button>
      </div>

      <!-- Cadastrar tipo novo no momento -->
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <p class="text-xs text-slate-500 md:col-span-2">
          O tipo será cadastrado junto com o papel.
        </p>
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
