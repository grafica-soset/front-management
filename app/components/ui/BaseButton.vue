<script setup lang="ts">
/**
 * Botão padrão da aplicação. Suporta variants e estado de loading.
 * Mantém o tipo `button` por padrão para evitar submits acidentais.
 */
interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  loading: false,
  disabled: false,
  block: false,
})

const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary': return 'btn-primary'
    case 'secondary': return 'btn-secondary'
    case 'danger': return 'btn-danger'
    case 'ghost': return 'btn text-slate-600 hover:bg-slate-100 focus:ring-brand-500'
    default: return 'btn-primary'
  }
})
</script>

<template>
  <button
    :type="type"
    :class="[variantClass, block && 'w-full']"
    :disabled="disabled || loading"
  >
    <Icon v-if="loading" name="lucide:loader-2" class="size-4 animate-spin" />
    <slot />
  </button>
</template>
