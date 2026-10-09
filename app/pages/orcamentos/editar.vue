<script setup lang="ts">
/**
 * Endereço antigo do editor (`/orcamentos/editar?id=6`). Desde a atividade 047 o orçamento fica na
 * URL — `/orcamentos/6` —; os links e favoritos antigos caem aqui e seguem para o novo.
 */
import { quotePath } from '@/utils/quoteRoutes'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const id = Number(route.query.id)
await navigateTo(quotePath(Number.isInteger(id) && id > 0 ? id : null), { replace: true })
</script>

<template>
  <div />
</template>
