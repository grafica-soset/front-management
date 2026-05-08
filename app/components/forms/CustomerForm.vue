<script setup lang="ts">
import { z } from 'zod'
import {
  type CreateCustomerRequest,
  type CustomerResponse,
  type IcmsTaxpayerIndicator,
  ICMS_TAXPAYER_OPTIONS,
  type PersonDto,
  type UpdateCustomerRequest,
} from '~/types'

/**
 * Formulário de cliente com toggle Pessoa Física / Pessoa Jurídica.
 * Os campos exibidos mudam conforme o tipo, mas o payload final é sempre
 * o `PersonDto` esperado pelo backend.
 */

interface Props {
  initialValue?: CustomerResponse | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialValue: null,
  loading: false,
})

const emit = defineEmits<{
  submit: [payload: CreateCustomerRequest | UpdateCustomerRequest]
  cancel: []
}>()

const isEdit = computed(() => Boolean(props.initialValue?.id))

type PersonType = 'PF' | 'PJ'

const PERSON_TYPE_OPTIONS = [
  { value: 'PF' as const, label: 'Pessoa Física' },
  { value: 'PJ' as const, label: 'Pessoa Jurídica' },
]

interface FormState {
  personType: PersonType
  name: string
  corporateName: string
  document: string
  email: string
  stateRegistration: string
  icmsTaxpayerIndicator: IcmsTaxpayerIndicator
  creditLimit: number
  active: boolean
}

/**
 * Detecta se o registro inicial é PF ou PJ a partir do tamanho do documento
 * (CPF tem 11 dígitos, CNPJ tem 14) e da presença de razão social.
 */
const detectPersonType = (person?: PersonDto | null): PersonType => {
  if (!person) return 'PF'
  if (person.corporateName) return 'PJ'
  const onlyDigits = (person.document ?? '').replace(/\D/g, '')
  return onlyDigits.length > 11 ? 'PJ' : 'PF'
}

const buildInitialState = (): FormState => {
  const person = props.initialValue?.person
  return {
    personType: detectPersonType(person),
    name: person?.name ?? '',
    corporateName: person?.corporateName ?? '',
    document: person?.document ?? '',
    email: person?.email ?? '',
    stateRegistration: person?.stateRegistration ?? '',
    icmsTaxpayerIndicator: person?.icmsTaxpayerIndicator ?? 'NON_TAXPAYER',
    creditLimit: props.initialValue?.creditLimit ?? 0,
    active: props.initialValue?.active ?? true,
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

/**
 * Quando o usuário troca PF <-> PJ ajustamos o indicador de ICMS para um
 * default sensato — sem sobrescrever caso o usuário já tenha mexido.
 */
watch(
  () => form.personType,
  (next, prev) => {
    if (next === prev) return
    if (next === 'PF') {
      form.icmsTaxpayerIndicator = 'NON_TAXPAYER'
      form.corporateName = ''
      form.stateRegistration = ''
    } else {
      form.icmsTaxpayerIndicator = 'TAXPAYER'
    }
  },
)

const baseSchema = z.object({
  creditLimit: z
    .number({ message: 'Informe um valor numérico' })
    .min(0, 'Limite não pode ser negativo'),
  active: z.boolean(),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  icmsTaxpayerIndicator: z.enum(['TAXPAYER', 'NON_TAXPAYER', 'EXEMPT']),
})

const pfSchema = baseSchema.extend({
  personType: z.literal('PF'),
  name: z.string().min(2, 'Nome obrigatório'),
  document: z
    .string()
    .min(11, 'CPF deve ter 11 dígitos')
    .max(14, 'CPF inválido'),
})

const pjSchema = baseSchema.extend({
  personType: z.literal('PJ'),
  corporateName: z.string().min(2, 'Razão social obrigatória'),
  name: z.string().min(2, 'Nome fantasia obrigatório'),
  document: z
    .string()
    .min(14, 'CNPJ deve ter 14 dígitos')
    .max(18, 'CNPJ inválido'),
  stateRegistration: z.string().optional(),
})

const validate = (): boolean => {
  Object.keys(errors).forEach((key) => delete errors[key])
  const schema = form.personType === 'PF' ? pfSchema : pjSchema
  const result = schema.safeParse(form)
  if (result.success) return true
  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    if (!errors[path]) errors[path] = issue.message
  }
  return false
}

const buildPersonPayload = (): PersonDto => {
  const onlyDigits = form.document.replace(/\D/g, '')
  const isPf = form.personType === 'PF'

  return {
    ...(props.initialValue?.person?.id ? { id: props.initialValue.person.id } : {}),
    name: form.name.trim(),
    corporateName: isPf ? null : form.corporateName.trim() || null,
    document: onlyDigits,
    email: form.email.trim() || null,
    stateRegistration: isPf ? null : form.stateRegistration.trim() || null,
    municipalRegistration: null,
    suframaRegistration: null,
    isFinalConsumer: isPf,
    icmsTaxpayerIndicator: form.icmsTaxpayerIndicator,
  }
}

const buildPayload = (): CreateCustomerRequest | UpdateCustomerRequest => ({
  person: buildPersonPayload(),
  creditLimit: Number(form.creditLimit),
  active: form.active,
})

const handleSubmit = () => {
  if (!validate()) return
  emit('submit', buildPayload())
}
</script>

<template>
  <BaseForm @submit="handleSubmit">
    <BaseToggleGroup
      v-model="form.personType"
      label="Tipo de pessoa"
      :options="PERSON_TYPE_OPTIONS"
    />

    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">
        Dados da {{ form.personType === 'PF' ? 'pessoa física' : 'pessoa jurídica' }}
      </legend>

      <!-- Pessoa Física -->
      <div v-if="form.personType === 'PF'" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseInput
          v-model="form.name"
          label="Nome completo"
          placeholder="Ex.: João Silva"
          required
          :error="errors.name"
        />
        <BaseInput
          v-model="form.document"
          label="CPF"
          placeholder="000.000.000-00"
          required
          :error="errors.document"
        />
        <BaseInput
          v-model="form.email"
          type="email"
          label="E-mail"
          placeholder="cliente@email.com"
          :error="errors.email"
          class="md:col-span-2"
        />
      </div>

      <!-- Pessoa Jurídica -->
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseInput
          v-model="form.corporateName"
          label="Razão social"
          placeholder="Empresa X Ltda."
          required
          :error="errors.corporateName"
          class="md:col-span-2"
        />
        <BaseInput
          v-model="form.name"
          label="Nome fantasia"
          placeholder="Empresa X"
          required
          :error="errors.name"
        />
        <BaseInput
          v-model="form.document"
          label="CNPJ"
          placeholder="00.000.000/0000-00"
          required
          :error="errors.document"
        />
        <BaseInput
          v-model="form.stateRegistration"
          label="Inscrição estadual"
          placeholder="IE"
          :error="errors.stateRegistration"
        />
        <BaseSelect
          v-model="form.icmsTaxpayerIndicator"
          label="Indicador de ICMS"
          :options="ICMS_TAXPAYER_OPTIONS"
          required
          :error="errors.icmsTaxpayerIndicator"
        />
        <BaseInput
          v-model="form.email"
          type="email"
          label="E-mail"
          placeholder="contato@empresa.com"
          :error="errors.email"
          class="md:col-span-2"
        />
      </div>
    </fieldset>

    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">Dados comerciais</legend>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseInput
          v-model.number="form.creditLimit"
          type="number"
          step="0.01"
          min="0"
          label="Limite de crédito (R$)"
          placeholder="0,00"
          required
          :error="errors.creditLimit"
        />
        <div class="flex items-end">
          <BaseCheckbox v-model="form.active" label="Cliente ativo" />
        </div>
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
