<script setup lang="ts">
/**
 * Wrapper de formulário que evita o reload nativo do navegador e expõe um
 * único evento `@submit`. Usado por todos os formulários do sistema.
 */
const emit = defineEmits<{
  submit: [event: Event]
}>()

const handleSubmit = (event: Event) => {
  event.preventDefault()
  emit('submit', event)
}
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit="handleSubmit">
    <slot />
  </form>
</template>
