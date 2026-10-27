<script setup lang="ts">
/**
 * CABEÇALHO DA PROPOSTA — logo à esquerda, texto da gráfica à direita.
 *
 * As medidas seguem a proposta que a Soset já envia (vivimoveis05-24.doc): a logo ocupa
 * 6,9 × 2,6 cm, e o texto é 8pt alinhado à direita. A mesma peça serve à página de impressão e à
 * pré-visualização das configurações, para a gráfica ver o que vai sair.
 *
 * A FONTE da proposta é Calibri (pedido da gráfica). A Calibri é da Microsoft e não pode ser servida
 * pela web: sai a instalada no computador e, sem ela, a Carlito — livre e com as mesmas medidas,
 * letra a letra, então as linhas quebram no mesmo lugar. Quem usa a fonte é o contêiner (classe
 * `font-[Calibri,Carlito,sans-serif]`); o link da Carlito fica aqui porque toda proposta tem cabeçalho.
 */
import { computed, ref, watch } from 'vue'
import { headerLines } from '@/utils/proposal'

const props = defineProps<{
  logoUrl: string | null
  /** Linhas com **negrito** / *itálico*. */
  headerText: string
  /** Sem logo (ou logo que não carrega), o nome da empresa vai no lugar. */
  companyName: string
}>()

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Carlito:wght@400;700&display=swap' },
  ],
})

const logoFailed = ref(false)
watch(() => props.logoUrl, () => { logoFailed.value = false })

const lines = computed(() => headerLines(props.headerText))
</script>

<template>
  <header class="proposal-header flex items-start justify-between gap-6">
    <div class="flex h-[26mm] w-[69mm] shrink-0 items-center">
      <img
        v-if="logoUrl && !logoFailed"
        :src="logoUrl"
        :alt="companyName"
        class="max-h-full max-w-full object-contain object-left"
        @error="logoFailed = true"
      />
      <span v-else class="text-[18pt] font-bold">{{ companyName }}</span>
    </div>
    <div class="text-right text-[8pt] leading-[1.2]">
      <p v-for="(segments, index) in lines" :key="index" class="min-h-[1.2em]">
        <span
          v-for="(segment, i) in segments"
          :key="i"
          :class="{ 'font-bold': segment.bold, italic: segment.italic }"
        >{{ segment.text }}</span>
      </p>
    </div>
  </header>
</template>
