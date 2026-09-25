<script setup lang="ts">
/**
 * LOGO DA EMPRESA por URL (atividade 038) — vai no cabeçalho da proposta impressa.
 *
 * Por enquanto é um link: o upload de arquivos terá um tratamento próprio. A pré-visualização
 * carrega a própria URL, para o usuário ver na hora se o endereço é mesmo de uma imagem.
 * Autocontido: emite `submit` com a URL (ou nulo, para remover).
 */
import { computed, ref, watch } from 'vue'
import { logoUrlIssue } from '@/utils/proposal'

const props = defineProps<{
  initial: string | null
  loading?: boolean
  serverError?: string | null
  saved?: boolean
}>()

const emit = defineEmits<{ (e: 'submit', logoUrl: string | null): void }>()

const url = ref(props.initial ?? '')
watch(() => props.initial, (value) => { url.value = value ?? '' })

const previewFailed = ref(false)
watch(url, () => { previewFailed.value = false })

const issue = computed(() => logoUrlIssue(url.value))
const preview = computed(() => (url.value.trim() && !issue.value ? url.value.trim() : null))
const changed = computed(() => url.value.trim() !== (props.initial ?? ''))

const submit = () => {
  if (issue.value) return
  emit('submit', url.value.trim() || null)
}
const clear = () => {
  url.value = ''
  emit('submit', null)
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
      <p v-if="issue" class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ issue }}</p>
      <p v-else class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Link público de uma imagem (PNG, JPG ou SVG). O envio de arquivo virá depois.
      </p>
    </div>

    <div class="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-4 dark:border-slate-600">
      <img v-if="preview && !previewFailed" :src="preview" alt="Pré-visualização da logo" class="max-h-20 max-w-full object-contain" @error="previewFailed = true" />
      <p v-else-if="previewFailed" class="text-sm text-amber-700 dark:text-amber-300">Não foi possível carregar a imagem deste endereço.</p>
      <p v-else class="text-sm text-slate-400">Sem logo</p>
    </div>

    <p v-if="serverError" class="text-sm text-rose-600 dark:text-rose-400">{{ serverError }}</p>
    <p v-else-if="saved && !changed" class="text-sm text-emerald-700 dark:text-emerald-300">Logo salva.</p>

    <div class="flex justify-end gap-2">
      <button v-if="initial" type="button" :disabled="loading" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700" @click="clear">
        Remover logo
      </button>
      <button type="submit" :disabled="loading || !!issue || !changed" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
        {{ loading ? 'Salvando...' : 'Salvar logo' }}
      </button>
    </div>
  </form>
</template>
