<script setup lang="ts">
interface Props {
  modelValue: string | number | null | undefined
  label?: string
  type?: string
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  autocomplete?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputId = useId()

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label
      v-if="label"
      :for="inputId"
      class="text-sm font-medium text-slate-700"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <input
      :id="inputId"
      :type="props.type"
      :value="props.modelValue ?? ''"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :autocomplete="props.autocomplete"
      class="input-base"
      :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-500/30': props.error }"
      @input="onInput"
    />

    <span v-if="props.error" class="text-xs text-red-600">{{ props.error }}</span>
  </div>
</template>
