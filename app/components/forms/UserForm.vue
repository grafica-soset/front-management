<script setup lang="ts">
import { z } from 'zod'
import {
  USER_ROLE_OPTIONS,
  type CreateUserRequest,
  type PersonDto,
  type UpdateUserRequest,
  type UserResponse,
  type UserRole,
} from '~/types'

/**
 * Formulário de usuário (sempre Pessoa Física no Soset).
 * Coleta apenas dados comuns no Brasil: nome, CPF, e-mail e dados de acesso.
 *
 * Recebe `initialValue` para edição e emite `submit` com o payload pronto
 * para o backend. A integração com `$fetch` fica nas páginas que consomem
 * este componente.
 */

interface Props {
  initialValue?: UserResponse | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialValue: null,
  loading: false,
})

const emit = defineEmits<{
  submit: [payload: CreateUserRequest | UpdateUserRequest]
  cancel: []
}>()

const isEdit = computed(() => Boolean(props.initialValue?.id))

interface FormState {
  name: string
  document: string
  email: string
  username: string
  password: string
  role: UserRole
  active: boolean
}

const buildInitialState = (): FormState => ({
  name: props.initialValue?.person?.name ?? '',
  document: props.initialValue?.person?.document ?? '',
  email: props.initialValue?.person?.email ?? '',
  username: props.initialValue?.username ?? '',
  password: '',
  role: props.initialValue?.role ?? 'OPERATOR',
  active: props.initialValue?.active ?? true,
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

const baseSchema = z.object({
  name: z.string().min(2, 'Informe o nome completo'),
  document: z
    .string()
    .min(11, 'CPF deve ter 11 dígitos')
    .max(14, 'CPF inválido'),
  email: z
    .string()
    .email('E-mail inválido')
    .or(z.literal('')),
  username: z.string().min(3, 'Usuário deve ter ao menos 3 caracteres'),
  role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR', 'SELLER']),
  active: z.boolean(),
})

const createSchema = baseSchema.extend({
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

const updateSchema = baseSchema.extend({
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres').or(z.literal('')),
})

const validate = (): boolean => {
  Object.keys(errors).forEach((key) => delete errors[key])
  const schema = isEdit.value ? updateSchema : createSchema
  const result = schema.safeParse(form)
  if (result.success) return true
  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    if (!errors[path]) errors[path] = issue.message
  }
  return false
}

/**
 * Constrói o `PersonDto` esperado pela API. Como o usuário é sempre PF,
 * preenchemos os campos fiscais com defaults sensatos.
 */
const buildPersonPayload = (): PersonDto => ({
  ...(props.initialValue?.person?.id ? { id: props.initialValue.person.id } : {}),
  name: form.name.trim(),
  corporateName: null,
  document: form.document.replace(/\D/g, ''),
  email: form.email.trim() || null,
  stateRegistration: null,
  municipalRegistration: null,
  suframaRegistration: null,
  isFinalConsumer: true,
  icmsTaxpayerIndicator: 'NON_TAXPAYER',
})

const buildPayload = (): CreateUserRequest | UpdateUserRequest => {
  const person = buildPersonPayload()

  if (isEdit.value) {
    const payload: UpdateUserRequest = {
      person,
      username: form.username.trim(),
      role: form.role,
      active: form.active,
    }
    if (form.password) payload.password = form.password
    return payload
  }

  return {
    person,
    username: form.username.trim(),
    password: form.password,
    role: form.role,
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
      <legend class="px-1 text-sm font-semibold text-slate-700">Dados pessoais</legend>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseInput
          v-model="form.name"
          label="Nome completo"
          placeholder="Ex.: Ana Silva"
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
          placeholder="ana@empresa.com"
          autocomplete="email"
          :error="errors.email"
          class="md:col-span-2"
        />
      </div>
    </fieldset>

    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">Dados de acesso</legend>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseInput
          v-model="form.username"
          label="Usuário"
          placeholder="login do usuário"
          required
          autocomplete="username"
          :error="errors.username"
        />
        <BaseInput
          v-model="form.password"
          type="password"
          :label="isEdit ? 'Nova senha (deixe em branco para manter)' : 'Senha'"
          :required="!isEdit"
          autocomplete="new-password"
          :error="errors.password"
        />
        <BaseSelect
          v-model="form.role"
          label="Perfil"
          :options="USER_ROLE_OPTIONS"
          required
          :error="errors.role"
        />
        <div class="flex items-end">
          <BaseCheckbox v-model="form.active" label="Usuário ativo" />
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
