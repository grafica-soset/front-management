<script setup lang="ts">
/**
 * Botão de recalcular (atividade 034).
 *
 * A tela mostra preço em mais de um lugar — na impressora e no formato de impressão —, e todos vêm
 * do MESMO cálculo. Mudou a tiragem, os números de todos eles ficam velhos ao mesmo tempo; o
 * usuário precisa disparar o recálculo de onde estiver olhando, sem subir a tela até achar o botão.
 *
 * Por isso ele é componente e não markup repetido: o rótulo, o giro e o desabilitado durante o
 * cálculo saem de um lugar só. `compact` é para o botão que fica ao lado de um subtítulo, onde o
 * tamanho cheio pesaria mais que o próprio título.
 */
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    /**
     * RELÊ OS CADASTROS antes de calcular.
     *
     * O rascunho não muda quando a MÁQUINA muda: quem corrige a espessura da grampeadeira em outra
     * tela volta para o orçamento e não tem o que mexer para disparar um cálculo novo — e a tela
     * segue mostrando a recusa antiga. Este botão fecha esse buraco.
     */
    refresh?: boolean
    label?: string
  }>(),
  { compact: false, refresh: false, label: 'Calcular' },
)

const store = useQuoteDraftStore()
const catalogs = useQuoteCatalogs()

const run = async () => {
  if (props.refresh) await catalogs.load(true)
  await store.calculateDraft()
}
</script>

<template>
  <button
    type="button"
    :disabled="store.calculating"
    @click="run()"
    class="flex items-center gap-1.5 rounded-lg bg-indigo-600 font-medium text-white shadow-md shadow-indigo-500/20 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
    :class="compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'"
  >
    <svg
      v-if="store.calculating"
      class="animate-spin"
      :class="compact ? 'h-3 w-3' : 'h-3.5 w-3.5'"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    {{ store.calculating ? 'Calculando...' : label }}
  </button>
</template>
