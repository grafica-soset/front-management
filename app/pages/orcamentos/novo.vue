<script setup lang="ts">
/**
 * "Novo orçamento" (atividade 037): zera o rascunho e abre o editor.
 *
 * O editor em si não zera nada ao montar — ele é o mesmo quando o usuário volta do assistente de
 * produto, e ali o rascunho tem que continuar como estava.
 */
import { useQuoteDraftStore } from '@/stores/quoteDraft'

definePageMeta({ middleware: 'auth' })

const store = useQuoteDraftStore()
store.clearQuote()
await navigateTo('/orcamentos/editar', { replace: true })
</script>

<template>
  <div />
</template>
