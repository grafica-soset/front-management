<script setup lang="ts">
type Variant = 'primary' | 'secondary' | 'danger'

interface Props {
  variant?: Variant
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  loading: false,
  disabled: false,
})

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
}
</script>

<template>
  <button
    :type="props.type"
    :class="variantClass[props.variant]"
    :disabled="props.disabled || props.loading"
  >
    <Icon
      v-if="props.loading"
      name="lucide:loader-2"
      class="size-4 animate-spin"
    />
    <slot />
  </button>
</template>
