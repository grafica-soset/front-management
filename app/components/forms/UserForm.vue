<script setup lang="ts">
import { z } from 'zod'
import type { CreateUserRequest, UpdateUserRequest, UserResponse } from '~/types/user'

interface Props {
  /** Quando passado, o formulário entra em modo edição. */
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
  username: string
  password: string
  active: boolean
  person: {
    name: string
    email: string
    phone: string
    document: string
  }
}

const buildInitialState = (): FormState => ({
  username: props.initialValue?.username ?? '',
  password: '',
  active: props.initialValue?.active ?? true,
  person: {
    name: props.initialValue?.person?.name ?? '',
    email: props.initialValue?.person?.email ?? '',
    phone: props.initialValue?.person?.phone ?? '',
    document: props.initialValue?.person?.document ?? '',
  },
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

// Schema base para criação; em edição a senha é opcional.
const baseSchema = z.object({
  username: z.string().min(3, 'Usuário deve ter ao menos 3 caracteres'),
  active: z.boolean(),
  person: z.object({
    name: z.string().min(2, 'Nome obrigatório'),
    email: z.string().email('E-mail inválido').or(z.literal('')),
    phone: z.string().optional(),
    document: z.string().optional(),
  }),
})

const createSchema = baseSchema.extend({
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
})

const updateSchema = baseSchema.extend({
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres').or(z.literal('')),
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

const buildPayload = (): CreateUserRequest | UpdateUserRequest => {
  const personPayload = {
    ...(props.initialValue?.person?.id ? { id: props.initialValue.person.id } : {}),
    name: form.person.name,
    email: form.person.email || null,
    phone: form.person.phone || null,
    document: form.person.document || null,
  }

  if (isEdit.value) {
    const payload: UpdateUserRequest = {
      username: form.username,
      active: form.active,
      person: personPayload,
    }
    if (form.password) payload.password = form.password
    return payload
  }

  return {
    username: form.username,
    password: form.password,
    active: form.active,
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
        v-model="form.person.name"
        label="Nome"
        placeholder="Nome completo"
        required
        :error="errors['person.name']"
      />
      <BaseInput
        v-model="form.username"
        label="Usuário"
        placeholder="login do usuário"
        required
        autocomplete="username"
        :error="errors.username"
      />
      <BaseInput
        v-model="form.person.email"
        type="email"
        label="E-mail"
        placeholder="email@exemplo.com"
        :error="errors['person.email']"
      />
      <BaseInput
        v-model="form.person.phone"
        label="Telefone"
        placeholder="(00) 00000-0000"
        :error="errors['person.phone']"
      />
      <BaseInput
        v-model="form.person.document"
        label="Documento"
        placeholder="CPF/CNPJ"
        :error="errors['person.document']"
      />
      <BaseInput
        v-model="form.password"
        type="password"
        :label="isEdit ? 'Nova senha (opcional)' : 'Senha'"
        :required="!isEdit"
        autocomplete="new-password"
        :error="errors.password"
      />
    </div>

    <label class="flex items-center gap-2 text-sm text-slate-700">
      <input
        v-model="form.active"
        type="checkbox"
        class="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      Usuário ativo
    </label>

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
