<script setup lang="ts">
/**
 * CABEÇALHO DA PROPOSTA — a logo por URL (atividade 038) e o texto do lado direito.
 *
 * O texto é da gráfica: cada linha sai como foi escrita, com **negrito** e *itálico*, porque o
 * cabeçalho montado do cadastro não sai como ela escreve o dela. Vazio = o montado do cadastro.
 * A pré-visualização é em tamanho real (as medidas da proposta impressa).
 *
 * Autocontido: emite `submit` com a logo e o texto (nulos para remover / voltar ao cadastro).
 */
import { computed, ref, watch } from 'vue'
import ProposalHeader from '@/components/quotes/ProposalHeader.vue'
import { logoUrlIssue, proposalHeaderIssue } from '@/utils/proposal'
import type { UpdateProposalHeaderRequest } from '@/types/CustomerSettings'

const props = defineProps<{
  initialLogoUrl: string | null
  initialHeaderText: string | null
  /** O cabeçalho montado do cadastro: o que sai com o texto vazio e o ponto de partida do texto. */
  defaultHeaderText: string
  companyName: string
  loading?: boolean
  serverError?: string | null
  saved?: boolean
}>()

const emit = defineEmits<{ (e: 'submit', payload: UpdateProposalHeaderRequest): void }>()

const url = ref(props.initialLogoUrl ?? '')
const text = ref(props.initialHeaderText ?? '')
watch(() => props.initialLogoUrl, (value) => { url.value = value ?? '' })
watch(() => props.initialHeaderText, (value) => { text.value = value ?? '' })

const urlIssue = computed(() => logoUrlIssue(url.value))
const textIssue = computed(() => proposalHeaderIssue(text.value))
const previewLogo = computed(() => (url.value.trim() && !urlIssue.value ? url.value.trim() : null))
const previewText = computed(() => (text.value.trim() ? text.value : props.defaultHeaderText))
const changed = computed(() =>
  url.value.trim() !== (props.initialLogoUrl ?? '') || text.value.trim() !== (props.initialHeaderText ?? '').trim(),
)

const fillFromRegistry = () => { text.value = props.defaultHeaderText }

const submit = () => {
  if (urlIssue.value || textIssue.value) return
  emit('submit', { logoUrl: url.value.trim() || null, headerText: text.value.trim() ? text.value : null })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div>
      <label for="logo-url" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Endereço (URL) da logo</label>
      <input
        id="logo-url"
        v-model="url"
        type="url"
        maxlength="1000"
        placeholder="https://www.suagrafica.com.br/logo.png"
        class="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      />
      <p v-if="urlIssue" class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ urlIssue }}</p>
      <p v-else class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Link público de uma imagem (PNG, JPG ou SVG). Na proposta ela ocupa até 6,9 × 2,6 cm — uma imagem
        de 800 × 300 px fica nítida na impressão. O envio de arquivo virá depois.
      </p>
    </div>

    <div>
      <div class="mb-1.5 flex items-center justify-between gap-2">
        <label for="header-text" class="block text-sm font-medium text-slate-700 dark:text-slate-200">Texto do cabeçalho</label>
        <button type="button" class="text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400" @click="fillFromRegistry">
          Preencher com o cadastro
        </button>
      </div>
      <textarea
        id="header-text"
        v-model="text"
        rows="9"
        maxlength="2000"
        :placeholder="defaultHeaderText"
        class="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 font-mono text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      />
      <p v-if="textIssue" class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ textIssue }}</p>
      <p v-else class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Cada linha sai como está, alinhada à direita. <code>**texto**</code> = negrito, <code>*texto*</code> = itálico,
        <code>***texto***</code> = os dois. Linha em branco vira espaço. Deixe vazio para usar os dados do cadastro.
      </p>
    </div>

    <!-- Pré-visualização em tamanho real: a largura útil da folha A4 da proposta. -->
    <div>
      <p class="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Como sai na proposta</p>
      <div class="overflow-x-auto rounded-lg border border-dashed border-slate-300 bg-white p-4 dark:border-slate-600">
        <div class="w-[174mm] font-[Calibri,Carlito,sans-serif] text-black">
          <ProposalHeader :logo-url="previewLogo" :header-text="previewText" :company-name="companyName" />
        </div>
      </div>
    </div>

    <p v-if="serverError" class="text-sm text-rose-600 dark:text-rose-400">{{ serverError }}</p>
    <p v-else-if="saved && !changed" class="text-sm text-emerald-700 dark:text-emerald-300">Cabeçalho salvo.</p>

    <div class="flex justify-end">
      <button type="submit" :disabled="loading || !!urlIssue || !!textIssue || !changed" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
        {{ loading ? 'Salvando...' : 'Salvar cabeçalho' }}
      </button>
    </div>
  </form>
</template>
