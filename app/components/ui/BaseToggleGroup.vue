<script setup lang="ts">
/**
 * Grupo de botões mutuamente exclusivos (estilo "tabs as buttons").
 * Útil como toggle PF/PJ, status, etc.
 */
type Primitive = string | number | boolean

interface Option {
  value: Primitive
  label: string
}

interface Props {
  label?: string
  options: ReadonlyArray<Option>
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  label: '',
  disabled: false,
})

const model = defineModel<Primitive>({ required: true })
</script>

<template>
  <div class="flex flex-col gap-1 text-sm">
    <span v-if="label" class="font-medium text-slate-700">{{ label }}</span>
    <div class="inline-flex w-fit rounded-lg bg-slate-100 p-1">
      <button
        v-for="option in options"
        :key="String(option.value)"
        type="button"
        :disabled="disabled"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        :class="model === option.value
          ? 'bg-white text-brand-700 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'"
        @click="model = option.value"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
