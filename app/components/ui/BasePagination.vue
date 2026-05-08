<script setup lang="ts">
/**
 * Controle de paginação simples (anterior/próximo + indicador).
 * O componente pai mantém o estado da página e responde a `update:page`.
 */
interface Props {
  page: number
  totalPages: number
  totalElements?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const goTo = (target: number) => {
  if (target < 0 || target >= props.totalPages) return
  emit('update:page', target)
}
</script>

<template>
  <div
    v-if="totalPages > 1"
    class="flex flex-col items-start justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm sm:flex-row sm:items-center"
  >
    <div class="text-slate-500">
      Página {{ page + 1 }} de {{ totalPages }}
      <span v-if="totalElements !== undefined" class="text-slate-400">
        · {{ totalElements }} registro(s)
      </span>
    </div>
    <div class="flex items-center gap-1">
      <BaseButton
        variant="secondary"
        :disabled="page === 0"
        @click="goTo(page - 1)"
      >
        <Icon name="lucide:chevron-left" class="size-4" />
        Anterior
      </BaseButton>
      <BaseButton
        variant="secondary"
        :disabled="page + 1 >= totalPages"
        @click="goTo(page + 1)"
      >
        Próximo
        <Icon name="lucide:chevron-right" class="size-4" />
      </BaseButton>
    </div>
  </div>
</template>
