<script setup lang="ts">
import { z } from 'zod'
import type {
  CreateCustomerRequest,
  CustomerResponse,
  UpdateCustomerRequest,
} from '~/types/customer'
import type { PersonDto } from '~/types/shared'

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

interface FormState {
  active: boolean
  creditLimit: number
  person: PersonDto
}

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

const buildInitialState = (): FormState => ({
  active: props.initialValue?.active ?? true,
  creditLimit: props.initialValue?.creditLimit ?? 0,
  person: { ...buildEmptyPerson(), ...(props.initialValue?.person ?? {}) },
})

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
  creditLimit: z.number({ message: 'Informe um valor numérico' }).min(0, 'Limite não pode ser negativo'),
  active: z.boolean(),
  person: z.object({
    name: z.string().min(2, 'Nome obrigatório'),
    document: z.string().min(3, 'Documento obrigatório'),
    email: z.string().email('E-mail inválido').or(z.literal('')).optional().nullable(),
    icmsTaxpayerIndicator: z.enum(['1', '2', '9']),
    isFinalConsumer: z.boolean(),
  }).passthrough(),
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

const buildPayload = (): CreateCustomerRequest | UpdateCustomerRequest => {
  const personPayload: PersonDto = {
    ...form.person,
    email: form.person.email || null,
    corporateName: form.person.corporateName || null,
    stateRegistration: form.person.stateRegistration || null,
    municipalRegistration: form.person.municipalRegistration || null,
    suframaRegistration: form.person.suframaRegistration || null,
    ...(props.initialValue?.person?.id ? { id: props.initialValue.person.id } : {}),
  }

  return {
    active: form.active,
    creditLimit: Number(form.creditLimit),
    person: personPayload,
  }
}

const handleSubmit = () => {
  if (!validate()) return
  emit('submit', buildPayload())
}
</script>

<template>
  <BaseForm @submit="handleSubmit">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <BaseInput
        v-model.number="form.creditLimit"
        type="number"
        label="Limite de crédito (R$)"
        placeholder="0,00"
        required
        :error="errors.creditLimit"
      />
      <label class="flex items-end gap-2 text-sm text-slate-700">
        <input
          v-model="form.active"
          type="checkbox"
          class="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        Cliente ativo
      </label>
    </div>

    <PersonFieldset v-model="form.person" :errors="errors" />

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
