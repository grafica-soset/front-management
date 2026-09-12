<script setup lang="ts">
/**
 * Passo 1 do assistente — DEFINIÇÃO DO PRODUTO (atividade 034).
 *
 * Nome, formato final, quantidade, estrutura (lâmina ou bloco), papéis e capas.
 *
 * Decisão de usabilidade sobre lâminas × jogos/vias: em vez de "preencher lâmina desabilita jogos
 * e vias" — que deixa na tela campos mortos e faz o usuário testar para descobrir a regra —, a
 * escolha é explícita, num seletor de duas opções. A regra é a mesma (nunca os dois ao mesmo
 * tempo), mas fica dita em vez de deduzida.
 *
 * O rodapé traduz a estrutura em folhas, que é o número que gera o custo: "50 jogos × 2 vias = 100
 * folhas por bloco · 1.000 folhas do produto".
 *
 * Aqui não se fala em TIRAGEM: no jargão gráfico ela é o total de folhas IMPRESSAS, que só o
 * motor sabe — depende de quantas aplicações cabem no formato de impressão.
 */
import { computed } from 'vue'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { useUnitConverter } from '@/composables/useUnitConverter'
import SheetPaperRow from '@/components/quotes/SheetPaperRow.vue'
import { sheetsForSheet, sheetsPerUnit } from '@/utils/quoteModel'

const store = useQuoteDraftStore()
const product = computed(() => store.draft!)
const { suffix, fromMillimeters, toMillimeters } = useUnitConverter()

/** Dimensões trafegam em mm na store; o formulário mostra a unidade da empresa. */
const width = computed({
  get: () => fromMillimeters(product.value.widthMm) ?? '',
  set: (value: number | string) => {
    product.value.widthMm = value === '' ? null : toMillimeters(Number(value))
  },
})
const height = computed({
  get: () => fromMillimeters(product.value.heightMm) ?? '',
  set: (value: number | string) => {
    product.value.heightMm = value === '' ? null : toMillimeters(Number(value))
  },
})

const unitLabel = computed(() => (product.value.structure === 'BLADE' ? 'peça' : 'bloco'))

/** Como se chama, nesta estrutura, a folha que carrega o desenho. */
const artworkLabel = computed(() => (product.value.structure === 'BLADE' ? 'lâminas' : 'vias'))
/** Quantas delas existem — abaixo de duas não há o que comparar, e a pergunta não aparece. */
const artworkCount = computed(() =>
  product.value.structure === 'BLADE' ? product.value.blades : product.value.vias,
)
const asksIdentical = computed(() => artworkCount.value >= 2)

/** Frase que traduz jogos × vias em folhas — o elo entre a estrutura e o custo. */
const structureSummary = computed(() => {
  const p = product.value
  const perUnit = sheetsPerUnit(p)
  const runs = p.quantity ?? 0
  const parts: string[] = []
  if (p.structure === 'BLADE') {
    parts.push(`${p.blades} lâmina(s)`)
  } else {
    parts.push(`${p.sets} jogos × ${p.vias} vias = ${p.sets * p.vias} folhas`)
  }
  if (p.hasCovers) parts.push(`+ ${p.coverCount} capa(s)`)
  if (asksIdentical.value && p.identicalArtwork !== null) {
    const desenhos = p.identicalArtwork ? 1 : (p.distinctArtworks ?? artworkCount.value)
    parts.push(`${desenhos} desenho(s) = ${desenhos} jogo(s) de chapa`)
  }
  parts.push(`${perUnit} folha(s) por ${unitLabel.value}`)
  if (runs > 0) parts.push(`${(perUnit * runs).toLocaleString('pt-BR')} folhas do produto`)
  return parts.join(' · ')
})

const setStructure = (structure: 'BLADE' | 'BLOCK') => store.setStructure(structure)

const onBladesChange = (value: string) => {
  product.value.blades = Math.max(1, Math.floor(Number(value) || 1))
  store.syncSheets()
}
const onSetsChange = (value: string) => {
  product.value.sets = Math.max(1, Math.floor(Number(value) || 1))
}
const onViasChange = (value: string) => {
  product.value.vias = Math.min(9, Math.max(1, Math.floor(Number(value) || 1)))
  store.syncSheets()
}
const setIdentical = (value: boolean) => store.setIdenticalArtwork(value)
const onDistinctChange = (value: string) => store.setDistinctArtworks(Number(value))

const onCoversToggle = (value: boolean) => {
  product.value.hasCovers = value
  if (value && product.value.coverCount < 1) product.value.coverCount = 1
  store.syncSheets()
}
const onCoverCountChange = (value: string) => {
  // Cada capa é uma folha própria: mudar a quantidade cria/remove linhas de papel.
  product.value.coverCount = Math.max(1, Math.floor(Number(value) || 1))
  store.syncSheets()
}

const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">Identificação</h2>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Nome do produto <span class="text-rose-500">*</span>
          </label>
          <input v-model="product.name" type="text" maxlength="150" placeholder="Ex.: Bloco de Pedidos" :class="inputClass" />
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Dimensão final ({{ suffix }}) <span class="text-rose-500">*</span>
          </label>
          <div class="flex items-center gap-2">
            <input v-model="width" type="number" min="0" step="0.1" placeholder="10" :class="inputClass" />
            <span class="text-slate-400">×</span>
            <input v-model="height" type="number" min="0" step="0.1" placeholder="15" :class="inputClass" />
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Quantidade ({{ unitLabel }}s) <span class="text-rose-500">*</span>
          </label>
          <input v-model.number="product.quantity" type="number" min="1" placeholder="10" :class="inputClass" />
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">Estrutura</h2>
      <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
        Folha única (folder, cartaz) ou bloco montado em jogos e vias.
      </p>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          @click="setStructure('BLADE')"
          class="rounded-xl border p-4 text-left transition-colors"
          :class="
            product.structure === 'BLADE'
              ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-900/20'
              : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50'
          "
        >
          <span class="block font-medium text-slate-900 dark:text-white">Lâmina</span>
          <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            Uma folha por peça: folder, cartaz, panfleto.
          </span>
        </button>

        <button
          type="button"
          @click="setStructure('BLOCK')"
          class="rounded-xl border p-4 text-left transition-colors"
          :class="
            product.structure === 'BLOCK'
              ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-900/20'
              : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50'
          "
        >
          <span class="block font-medium text-slate-900 dark:text-white">Bloco (jogos × vias)</span>
          <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            Talão, bloco de pedidos: cada jogo repete todas as vias.
          </span>
        </button>
      </div>

      <div class="mt-4 flex flex-wrap items-end gap-4">
        <div v-if="product.structure === 'BLADE'">
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Lâminas</label>
          <input
            :value="product.blades"
            type="number"
            min="1"
            @input="onBladesChange(($event.target as HTMLInputElement).value)"
            class="w-28 rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>

        <template v-else>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Jogos</label>
            <input
              :value="product.sets"
              type="number"
              min="1"
              @input="onSetsChange(($event.target as HTMLInputElement).value)"
              class="w-28 rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Vias (1 a 9)</label>
            <input
              :value="product.vias"
              type="number"
              min="1"
              max="9"
              @input="onViasChange(($event.target as HTMLInputElement).value)"
              class="w-28 rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </template>

        <div class="flex items-center gap-3">
          <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              :checked="product.hasCovers"
              type="checkbox"
              @change="onCoversToggle(($event.target as HTMLInputElement).checked)"
              class="h-4 w-4 rounded border-slate-300 bg-slate-100 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
            />
            Tem capa
          </label>
          <input
            v-if="product.hasCovers"
            :value="product.coverCount"
            type="number"
            min="1"
            @input="onCoverCountChange(($event.target as HTMLInputElement).value)"
            class="w-24 rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>

      <!--
        A pergunta que decide quantas chapas o trabalho paga. Fica aqui, logo abaixo de jogos e
        vias, porque é continuação da mesma frase: "são 2 vias — e são iguais?". Nasce sem resposta
        de propósito: assumir "sim" cobraria a menos e assumir "não", a mais.
      -->
      <div
        v-if="asksIdentical"
        class="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
        :class="product.identicalArtwork === null ? 'border-amber-300 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-500/5' : ''"
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200">
            As {{ artworkLabel }} são iguais? <span class="text-rose-500">*</span>
          </span>
          <div class="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
            <button
              type="button"
              @click="setIdentical(true)"
              class="px-4 py-1.5 text-sm transition-colors"
              :class="
                product.identicalArtwork === true
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              "
            >
              Sim
            </button>
            <button
              type="button"
              @click="setIdentical(false)"
              class="border-l border-slate-300 px-4 py-1.5 text-sm transition-colors dark:border-slate-600"
              :class="
                product.identicalArtwork === false
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              "
            >
              Não
            </button>
          </div>

          <div v-if="product.identicalArtwork === false" class="flex items-center gap-2">
            <label class="text-sm text-slate-700 dark:text-slate-200">Quantas são diferentes?</label>
            <input
              :value="product.distinctArtworks ?? artworkCount"
              type="number"
              min="1"
              :max="artworkCount"
              @input="onDistinctChange(($event.target as HTMLInputElement).value)"
              class="w-20 rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <span class="text-sm text-slate-500 dark:text-slate-400">de {{ artworkCount }}</span>
          </div>
        </div>

        <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {{ artworkLabel === 'vias' ? 'Vias' : 'Lâminas' }} com o mesmo desenho saem da mesma
          chapa: cobra-se uma matriz e uma montagem, e todas rodam na mesma impressora.
        </p>
      </div>

      <p class="mt-4 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
        {{ structureSummary }}
      </p>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">Papéis</h2>
      <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
        Uma família por {{ product.structure === 'BLADE' ? 'lâmina' : 'via' }}. O tamanho da folha é
        decidido no cálculo, junto com a impressora.
      </p>

      <div class="mt-4 space-y-2">
        <SheetPaperRow
          v-for="sheet in product.sheets"
          :key="sheet.uid"
          :sheet="sheet"
          :sheet-count="sheetsForSheet(product, sheet)"
          @update="sheet.paperTypeId = $event"
        />
      </div>
    </section>
  </div>
</template>
