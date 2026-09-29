<script setup lang="ts">
/**
 * ORÇAMENTO > CONFIGURAÇÕES (atividade 038): as opções das condições de fornecimento da empresa —
 * validade da proposta, condições de pagamento, prazo de entrega e dados bancários.
 *
 * A PADRÃO de cada tipo entra sozinha no orçamento novo; as demais aparecem no popup de escolha do
 * campo. O orçamento copia o texto: alterar ou excluir uma opção aqui não mexe em orçamento nenhum.
 */
import { computed, ref } from 'vue'
import { useQuoteTermOptions } from '@/composables/useQuoteTermOptions'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import { optionsOfKind, QUOTE_TERM_KINDS, quoteTermKindInfo } from '@/utils/quoteTermOptions'
import type { QuoteTermKind, QuoteTermOptionFormValue, QuoteTermOptionKeyValue } from '@/types/QuoteTermOption'
import Modal from '@/components/ui/Modal.vue'
import QuoteTermOptionForm from '@/components/forms/QuoteTermOptionForm.vue'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()
const api = useQuoteTermOptions()

const options = ref<QuoteTermOptionKeyValue[]>([])
const loading = ref(false)
const listError = ref<string | null>(null)
const busyId = ref<number | null>(null)

const hasCompany = computed(() => !!auth.activeCompanyId)

const refresh = async () => {
  if (!hasCompany.value) return
  loading.value = true
  listError.value = null
  try {
    options.value = await api.listKeyValues()
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar as configurações do orçamento.')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

// ---- Modal de cadastro/edição ----
const modalOpen = ref(false)
const modalKind = ref<QuoteTermKind>('PROPOSAL_VALIDITY')
const editing = ref<QuoteTermOptionKeyValue | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)

const modalTitle = computed(() => {
  const label = quoteTermKindInfo(modalKind.value).label
  return editing.value ? `Editar opção — ${label}` : `Nova opção — ${label}`
})
const formInitial = computed<QuoteTermOptionFormValue | null>(() =>
  editing.value ? { text: editing.value.value, defaultOption: editing.value.defaultOption } : null,
)

const openCreate = (kind: QuoteTermKind) => {
  modalKind.value = kind
  editing.value = null
  saveError.value = null
  modalOpen.value = true
}

const openEdit = (option: QuoteTermOptionKeyValue) => {
  modalKind.value = option.kind
  editing.value = option
  saveError.value = null
  modalOpen.value = true
}

const closeModal = () => {
  modalOpen.value = false
  editing.value = null
}

const handleSubmit = async (payload: QuoteTermOptionFormValue) => {
  saving.value = true
  saveError.value = null
  try {
    if (editing.value) {
      await api.update(editing.value.id, { customerId: 0, ...payload })
      toast.success('Opção atualizada.')
    } else {
      await api.create({ customerId: 0, kind: modalKind.value, ...payload })
      toast.success('Opção cadastrada.')
    }
    closeModal()
    await refresh()
  } catch (err) {
    saveError.value = extractApiError(err, 'Falha ao salvar a opção.')
  } finally {
    saving.value = false
  }
}

/** Liga/desliga a padrão direto da lista. Ligar numa tira a marca da anterior (o servidor faz). */
const toggleDefault = async (option: QuoteTermOptionKeyValue) => {
  busyId.value = option.id
  try {
    await api.update(option.id, { customerId: 0, text: option.value, defaultOption: !option.defaultOption })
    await refresh()
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível alterar a opção padrão.'))
  } finally {
    busyId.value = null
  }
}

const handleDelete = async (option: QuoteTermOptionKeyValue) => {
  if (!window.confirm(`Excluir a opção "${option.value}"? Os orçamentos que já a usam continuam com o texto.`)) return
  busyId.value = option.id
  try {
    await api.remove(option.id)
    toast.success('Opção excluída.')
    await refresh()
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível excluir a opção.'))
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Configurações do orçamento</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Opções das condições de fornecimento da proposta. A <strong>padrão</strong> de cada campo já vem
        preenchida no orçamento novo; as outras ficam na lista de escolha do campo. No orçamento o texto
        continua editável, para as condições exclusivas de um cliente.
      </p>
    </header>

    <div v-if="!hasCompany" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      Selecione uma empresa para configurar o orçamento.
    </div>
    <div v-else-if="loading && options.length === 0" class="text-sm text-slate-500 dark:text-slate-400">Carregando...</div>
    <div v-else-if="listError" class="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>

    <div v-else class="grid gap-6 lg:grid-cols-2">
      <section
        v-for="info in QUOTE_TERM_KINDS"
        :key="info.kind"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <h2 class="text-base font-semibold text-slate-900 dark:text-white">{{ info.label }}</h2>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            @click="openCreate(info.kind)"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            Nova opção
          </button>
        </div>
        <p v-if="optionsOfKind(options, info.kind).length === 0" class="px-5 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Nenhuma opção cadastrada. O campo vem vazio no orçamento novo.
        </p>
        <ul v-else class="divide-y divide-slate-100 dark:divide-slate-700/50">
          <li v-for="option in optionsOfKind(options, info.kind)" :key="option.id" class="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0 text-sm text-slate-800 dark:text-slate-100">
              <span class="whitespace-pre-line break-words">{{ option.value }}</span>
              <span v-if="option.defaultOption" class="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Padrão</span>
            </div>
            <div class="inline-flex shrink-0 items-center gap-1">
              <button
                type="button"
                :disabled="busyId === option.id"
                class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
                @click="toggleDefault(option)"
              >
                {{ option.defaultOption ? 'Tirar padrão' : 'Tornar padrão' }}
              </button>
              <button type="button" class="rounded-md px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-700" @click="openEdit(option)">Editar</button>
              <button
                type="button"
                :disabled="busyId === option.id"
                class="rounded-md px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-slate-700"
                @click="handleDelete(option)"
              >
                Excluir
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <Modal :is-open="modalOpen" :title="modalTitle" @close="closeModal">
      <QuoteTermOptionForm
        v-if="modalOpen"
        :key="editing?.id ?? `new-${modalKind}`"
        :kind="modalKind"
        :initial="formInitial"
        :loading="saving"
        :server-error="saveError"
        @submit="handleSubmit"
        @cancel="closeModal"
      />
    </Modal>
  </div>
</template>
