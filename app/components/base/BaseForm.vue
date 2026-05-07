<script setup lang="ts">
const emit = defineEmits<{ submit: [] }>()

const onSubmit = (event: Event) => {
  event.preventDefault()
  emit('submit')
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit="onSubmit">
    <slot />
  </form>
</template>
