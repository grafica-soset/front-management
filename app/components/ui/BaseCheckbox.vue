<script setup lang="ts">
interface Props {
  label?: string
  disabled?: boolean
  hint?: string
}

withDefaults(defineProps<Props>(), {
  label: '',
  disabled: false,
  hint: '',
})

const model = defineModel<boolean>({ default: false })

const inputId = useId()
</script>

<template>
  <label :for="inputId" class="inline-flex items-start gap-2 text-sm text-slate-700">
    <input
      :id="inputId"
      v-model="model"
      type="checkbox"
      :disabled="disabled"
      class="mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
    />
    <span class="flex flex-col">
      <span>{{ label }}</span>
      <span v-if="hint" class="text-xs text-slate-500">{{ hint }}</span>
    </span>
  </label>
</template>
