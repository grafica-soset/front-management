<script setup lang="ts">
/**
 * CONTATO NOVO, de dentro do orçamento: quem aprova do lado do cliente nem sempre está cadastrado, e
 * sair para Clientes perderia o fio. É o mesmo `ClientContactForm` do cadastro completo.
 *
 * Volta em `created` o cliente atualizado e o contato criado, para o orçamento já selecioná-lo.
 */
import { ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import ClientContactForm from '@/components/forms/ClientContactForm.vue'
import { useClients } from '@/composables/useClients'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import type { Client, ClientContact, ClientContactInput } from '@/types/Client'
import { extractApiError } from '@/utils/apiError'

const props = defineProps<{ isOpen: boolean; clientId: number | null }>()
const emit = defineEmits<{ close: []; created: [client: Client, contact: ClientContact] }>()

const auth = useAuthStore()
const toast = useToast()
const { addContact } = useClients()
const loading = ref(false)
const error = ref<string | null>(null)
// Cada abertura começa com o formulário limpo: a chave nova remonta o ClientContactForm.
const formKey = ref(0)

watch(() => props.isOpen, (open) => {
  if (!open) return
  error.value = null
  formKey.value += 1
})

async function handleSubmit(payload: ClientContactInput) {
  const customerId = auth.activeCompanyId
  if (!customerId || !props.clientId) return
  loading.value = true
  error.value = null
  try {
    const client = await addContact(props.clientId, payload)
    // Trocou de empresa durante o cadastro: o contato é da outra, não entra neste orçamento.
    if (customerId !== auth.activeCompanyId) return
    // O id é sequencial: o maior é o que acabou de ser criado.
    const contact = client.contacts.reduce((newest, current) => (current.id > newest.id ? current : newest))
    toast.success(`Contato "${contact.name}" cadastrado.`)
    emit('created', client, contact)
  } catch (err) {
    if (customerId === auth.activeCompanyId) {
      error.value = extractApiError(err, 'Não foi possível cadastrar o contato.')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Modal :is-open="isOpen" title="Novo contato" size="lg" @close="emit('close')">
    <ClientContactForm
      :key="formKey"
      :loading="loading"
      :server-error="error"
      @submit="handleSubmit"
      @cancel="emit('close')"
    />
  </Modal>
</template>
