<script setup lang="ts">
/**
 * CADASTRO RÁPIDO DE CLIENTE, de dentro do orçamento (atividade 039).
 *
 * O orçamentista está no meio do orçamento e o cliente ainda não existe: sair para `/clientes/novo`
 * perderia o fio. Aqui vai só o essencial — tipo de pessoa, nome, documento, e-mail e telefone, o
 * mesmo `ClientDataForm` do cadastro completo, com as mesmas validações. Endereços e contatos ficam
 * para depois, em Clientes: o backend aceita o cliente sem eles.
 *
 * Cadastrado, o cliente volta em `created` no formato da busca, para o orçamento já selecioná-lo.
 */
import { ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import ClientDataForm from '@/components/forms/ClientDataForm.vue'
import { useClients } from '@/composables/useClients'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import type { ClientSearchItem, UpdateClientRequest } from '@/types/Client'
import { extractApiError } from '@/utils/apiError'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: []; created: [client: ClientSearchItem] }>()

const auth = useAuthStore()
const toast = useToast()
const { create } = useClients()
const loading = ref(false)
const error = ref<string | null>(null)
// Cada abertura começa com o formulário limpo: a chave nova remonta o ClientDataForm.
const formKey = ref(0)

watch(() => props.isOpen, (open) => {
  if (!open) return
  error.value = null
  formKey.value += 1
})

async function handleSubmit(payload: UpdateClientRequest) {
  const customerId = auth.activeCompanyId
  if (!customerId) return
  loading.value = true
  error.value = null
  try {
    const client = await create({ ...payload, addresses: [], contacts: [] })
    // Trocou de empresa durante o cadastro: o cliente é da outra, não entra neste orçamento.
    if (customerId !== auth.activeCompanyId) return
    toast.success(`Cliente "${client.name}" cadastrado.`)
    emit('created', {
      id: client.id,
      personType: client.personType,
      name: client.name,
      corporateName: client.corporateName ?? null,
      email: client.email ?? null,
      document: client.document,
    })
  } catch (err) {
    if (customerId === auth.activeCompanyId) {
      error.value = extractApiError(err, 'Não foi possível cadastrar o cliente.')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Modal :is-open="isOpen" title="Novo cliente" size="lg" @close="emit('close')">
    <p class="mb-5 text-sm text-slate-500 dark:text-slate-400">
      Cadastro rápido, só com o essencial. Endereços e contatos podem ser completados depois, em
      Clientes.
    </p>
    <ClientDataForm
      :key="formKey"
      :loading="loading"
      :server-error="error"
      submit-label="Cadastrar e usar no orçamento"
      @submit="handleSubmit"
      @cancel="emit('close')"
    />
  </Modal>
</template>
