<script setup lang="ts">
/**
 * Input com label, mensagem de erro e suporte a v-model.
 * Aceita qualquer atributo HTML extra via `$attrs` (autocomplete, min, etc.).
 */
interface Props {
  label?: string
  type?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
}

withDefaults(defineProps<Props>(), {
  label: '',
  type: 'text',
  placeholder: '',
  required: false,
  disabled: false,
  error: '',
  hint: '',
})

const model = defineModel<string | number | null>({ default: '' })

const inputId = useId()
</script>

<template>
  <label :for="inputId" class="flex flex-col gap-1 text-sm">
    <span v-if="label" class="font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </span>
    <input
      :id="inputId"
      v-model="model"
      v-bind="$attrs"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      class="input-base"
      :class="error && 'border-red-400 focus:border-red-500 focus:ring-red-500/30'"
    />
    <span v-if="error" class="text-xs text-red-600">{{ error }}</span>
    <span v-else-if="hint" class="text-xs text-slate-500">{{ hint }}</span>
  </label>
</template>
