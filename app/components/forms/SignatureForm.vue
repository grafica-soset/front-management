<script setup lang="ts">
/**
 * ASSINATURA do usuário na proposta: a URL da imagem, com a pré-visualização no tamanho em que sai
 * acima do nome de quem criou o orçamento. Vazia remove a assinatura (a proposta fica só com o nome).
 */
import { computed, ref } from 'vue'
import { imageUrlIssue } from '@/utils/proposal'

const props = defineProps<{
  initial: string | null
  personName: string
  loading?: boolean
  serverError?: string | null
}>()
const emit = defineEmits<{ submit: [signatureUrl: string | null]; cancel: [] }>()

const url = ref(props.initial ?? '')
const issue = computed(() => imageUrlIssue(url.value))
const preview = computed(() => (url.value.trim() && !issue.value ? url.value.trim() : null))
const broken = ref(false)

function handleSubmit() {
  if (issue.value) return
  emit('submit', url.value.trim() || null)
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div>
      <label for="signature-url" class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">URL da imagem da assinatura</label>
      <input
        id="signature-url"
        v-model="url"
        type="url"
        maxlength="1000"
        placeholder="https://cdn.suagrafica.com.br/assinaturas/nome.png"
        class="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        :class="{ 'border-rose-500': issue }"
        @input="broken = false"
      />
      <p v-if="issue" class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ issue }}</p>
      <p v-else class="mt-1 text-xs text-slate-500 dark:text-slate-400">PNG com fundo transparente fica melhor. Deixe vazio para tirar a assinatura.</p>
    </div>

    <!-- Como sai na proposta: a imagem logo acima do nome. -->
    <div class="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-black dark:border-slate-600">
      <p class="text-xs text-slate-500">Na proposta:</p>
      <p class="mt-2 font-[Calibri,Carlito,sans-serif] text-[11pt]">Atenciosamente</p>
      <img
        v-if="preview && !broken"
        :src="preview"
        alt="Assinatura"
        class="mt-1 h-[16mm] max-w-[60mm] object-contain object-left"
        @error="broken = true"
      />
      <p v-else-if="preview" class="mt-1 text-xs text-amber-700">Não foi possível carregar a imagem dessa URL.</p>
      <div v-else class="h-[16mm]" />
      <p class="font-[Calibri,Carlito,sans-serif] text-[11pt]">{{ personName }}</p>
    </div>

    <div v-if="serverError" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">{{ serverError }}</div>
    <div class="flex justify-end gap-3">
      <button type="button" :disabled="loading" class="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" @click="emit('cancel')">Cancelar</button>
      <button type="submit" :disabled="loading || !!issue" class="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">{{ loading ? 'Salvando...' : 'Salvar assinatura' }}</button>
    </div>
  </form>
</template>
