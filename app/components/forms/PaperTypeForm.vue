<script setup lang="ts">
import { z } from 'zod'
import type {
  CreatePaperTypeRequest,
  PaperTypeResponse,
  UpdatePaperTypeRequest,
} from '~/types'

interface Props {
  initialValue?: PaperTypeResponse | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialValue: null,
  loading: false,
})

const emit = defineEmits<{
  submit: [payload: CreatePaperTypeRequest | UpdatePaperTypeRequest]
  cancel: []
}>()

const isEdit = computed(() => Boolean(props.initialValue?.id))

interface FormState {
  name: string
  description: string
}

const buildInitialState = (): FormState => ({
  name: props.initialValue?.name ?? '',
  description: props.initialValue?.description ?? '',
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
  name: z.string().min(2, 'Nome do tipo obrigatório'),
  description: z.string().max(500, 'Descrição muito longa').or(z.literal('')),
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

const buildPayload = (): CreatePaperTypeRequest | UpdatePaperTypeRequest => ({
  name: form.name.trim(),
  description: form.description.trim() || null,
})

const handleSubmit = () => {
  if (!validate()) return
  emit('submit', buildPayload())
}
</script>

<template>
  <BaseForm @submit="handleSubmit">
    <fieldset class="rounded-lg border border-slate-200 p-4">
      <legend class="px-1 text-sm font-semibold text-slate-700">Identificação</legend>
      <div class="grid grid-cols-1 gap-4">
        <BaseInput
          v-model="form.name"
          label="Nome"
          placeholder="Ex.: Papel Sulfite A4"
          required
          :error="errors.name"
        />
        <label class="flex flex-col gap-1 text-sm">
          <span class="font-medium text-slate-700">Descrição</span>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Ex.: Papel branco padrão para impressões gerais, 75g/m²"
            class="input-base resize-y"
            :class="errors.description && 'border-red-400 focus:border-red-500 focus:ring-red-500/30'"
          />
          <span v-if="errors.description" class="text-xs text-red-600">
            {{ errors.description }}
          </span>
        </label>
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
