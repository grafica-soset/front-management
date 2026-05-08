<script setup lang="ts">
type Primitive = string | number | boolean | null

interface Option {
  value: Primitive
  label: string
}

interface Props {
  label?: string
  options: ReadonlyArray<Option>
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
}

withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: '',
  required: false,
  disabled: false,
  error: '',
  hint: '',
})

const model = defineModel<Primitive | undefined>()

const selectId = useId()
</script>

<template>
  <label :for="selectId" class="flex flex-col gap-1 text-sm">
    <span v-if="label" class="font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </span>
    <select
      :id="selectId"
      v-model="model"
      :required="required"
      :disabled="disabled"
      class="input-base"
      :class="error && 'border-red-400 focus:border-red-500 focus:ring-red-500/30'"
    >
      <option v-if="placeholder" :value="null">{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="String(option.value)"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <span v-if="error" class="text-xs text-red-600">{{ error }}</span>
    <span v-else-if="hint" class="text-xs text-slate-500">{{ hint }}</span>
  </label>
</template>
