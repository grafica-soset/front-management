<script setup lang="ts" generic="T extends string | number">
interface Option {
  value: T
  label: string
}

interface Props {
  modelValue: T | null | undefined
  options: Option[]
  label?: string
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: T | null]
}>()

const inputId = useId()

const onChange = (event: Event) => {
  const raw = (event.target as HTMLSelectElement).value
  if (raw === '') {
    emit('update:modelValue', null)
    return
  }
  const match = props.options.find((option) => String(option.value) === raw)
  emit('update:modelValue', match ? match.value : (raw as T))
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

    <select
      :id="inputId"
      :value="modelValue ?? ''"
      :disabled="disabled"
      class="input-base appearance-none bg-white pr-8"
      :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-500/30': error }"
      @change="onChange"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="String(option.value)"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <span v-if="error" class="text-xs text-red-600">{{ error }}</span>
  </div>
</template>
