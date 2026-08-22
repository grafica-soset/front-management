<script setup lang="ts">
import { computed, ref } from 'vue'
import ClientAddressForm from '@/components/forms/ClientAddressForm.vue'
import ClientContactForm from '@/components/forms/ClientContactForm.vue'
import ClientDataForm from '@/components/forms/ClientDataForm.vue'
import type {
  ClientAddressInput,
  ClientContactInput,
  RegisterClientRequest,
  UpdateClientRequest,
} from '@/types/Client'
import { formatPhone, formatPostalCode } from '@/utils/clientFormatting'
import { canSubmitClientForm, hasPendingClientEditor } from '@/utils/clientPageState'

const props = defineProps<{ loading?: boolean; serverError?: string | null }>()
const emit = defineEmits<{ submit: [payload: RegisterClientRequest]; cancel: [] }>()

const dataForm = ref<{ validate: () => UpdateClientRequest | null } | null>(null)
const addresses = ref<ClientAddressInput[]>([])
const contacts = ref<ClientContactInput[]>([])
const addressEditor = ref<number | 'new' | null>(null)
const contactEditor = ref<number | 'new' | null>(null)

const addressInitial = computed(() => typeof addressEditor.value === 'number' ? addresses.value[addressEditor.value] : null)
const contactInitial = computed(() => typeof contactEditor.value === 'number' ? contacts.value[contactEditor.value] : null)
const hasPendingEditor = computed(() => hasPendingClientEditor(addressEditor.value, contactEditor.value))

const addressTypeLabel = (type: ClientAddressInput['addressType']) => ({ MAIN: 'Principal', BILLING: 'Cobrança', SHIPPING: 'Entrega' })[type]

function saveAddress(payload: ClientAddressInput) {
  if (addressEditor.value === 'new') {
    const added = addresses.value.length === 0 ? { ...payload, addressType: 'MAIN' as const } : payload
    if (added.addressType === 'MAIN') {
      addresses.value = addresses.value.map((item) => item.addressType === 'MAIN' ? { ...item, addressType: 'SHIPPING' } : item)
      addresses.value.unshift(added)
    } else {
      addresses.value.push(added)
    }
  } else if (typeof addressEditor.value === 'number') {
    const index = addressEditor.value
    const current = addresses.value[index]!
    const effective = current.addressType === 'MAIN' && payload.addressType !== 'MAIN'
      ? { ...payload, addressType: 'MAIN' as const }
      : payload
    if (effective.addressType === 'MAIN' && current.addressType !== 'MAIN') {
      addresses.value = addresses.value.map((item, itemIndex) =>
        itemIndex !== index && item.addressType === 'MAIN' ? { ...item, addressType: current.addressType } : item,
      )
    }
    addresses.value[index] = effective
    if (effective.addressType === 'MAIN' && index > 0) {
      addresses.value.splice(index, 1)
      addresses.value.unshift(effective)
    }
  }
  addressEditor.value = null
}

function removeAddress(index: number) {
  const wasMain = addresses.value[index]?.addressType === 'MAIN'
  addresses.value.splice(index, 1)
  if (wasMain && addresses.value.length) addresses.value[0] = { ...addresses.value[0]!, addressType: 'MAIN' }
}

function saveContact(payload: ClientContactInput) {
  if (contactEditor.value === 'new') {
    const added = contacts.value.length === 0 ? { ...payload, primary: true } : payload
    if (added.primary) contacts.value = contacts.value.map((item) => ({ ...item, primary: false }))
    contacts.value.push(added)
  } else if (typeof contactEditor.value === 'number') {
    const index = contactEditor.value
    const current = contacts.value[index]!
    const effective = current.primary && !payload.primary ? { ...payload, primary: true } : payload
    if (effective.primary) contacts.value = contacts.value.map((item, itemIndex) => ({ ...item, primary: itemIndex === index }))
    contacts.value[index] = effective
  }
  contactEditor.value = null
}

function removeContact(index: number) {
  const wasPrimary = contacts.value[index]?.primary
  contacts.value.splice(index, 1)
  if (wasPrimary && contacts.value.length) contacts.value[0] = { ...contacts.value[0]!, primary: true }
}

function submitAll(validatedData?: UpdateClientRequest) {
  if (!canSubmitClientForm({ loading: !!props.loading, hasPendingEditor: hasPendingEditor.value })) return
  const data = validatedData ?? dataForm.value?.validate()
  if (!data) {
    document.getElementById('client-data-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  emit('submit', { ...data, addresses: addresses.value, contacts: contacts.value })
}
</script>

<template>
  <div class="space-y-8">
    <section id="client-data-section" aria-labelledby="client-data-title">
      <div class="mb-4">
        <h2 id="client-data-title" class="text-lg font-semibold text-slate-900 dark:text-white">Dados do cliente</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Informe a identificação usada nos cadastros e documentos comerciais.</p>
      </div>
      <ClientDataForm ref="dataForm" form-id="client-registration-data-form" :show-actions="false" @submit="submitAll" />
    </section>

    <section class="border-t border-slate-200 pt-7 dark:border-slate-700" aria-labelledby="client-addresses-title">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="client-addresses-title" class="text-lg font-semibold text-slate-900 dark:text-white">Endereços</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">O primeiro endereço será definido como principal.</p>
        </div>
        <button v-if="addressEditor === null" type="button" class="btn-secondary" @click="addressEditor = 'new'">Adicionar endereço</button>
      </div>
      <div v-if="addressEditor !== null" class="mb-5 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
        <h3 class="mb-4 font-medium text-slate-900 dark:text-white">{{ addressEditor === 'new' ? 'Novo endereço' : 'Editar endereço' }}</h3>
        <ClientAddressForm :key="String(addressEditor)" :initial="addressInitial" @submit="saveAddress" @cancel="addressEditor = null" />
      </div>
      <div v-if="addresses.length" class="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
        <div v-for="(address, index) in addresses" :key="index" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-slate-900 dark:text-white">{{ address.nickname || address.street || `Endereço ${index + 1}` }}</span>
              <span class="badge">{{ addressTypeLabel(address.addressType) }}</span>
            </div>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ [address.city, address.state, formatPostalCode(address.postalCode)].filter(Boolean).join(' · ') || 'Sem localidade informada' }}</p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="link-button" @click="addressEditor = index">Editar</button>
            <button type="button" class="link-button text-rose-700 dark:text-rose-300" @click="removeAddress(index)">Remover</button>
          </div>
        </div>
      </div>
      <p v-else-if="addressEditor === null" class="empty-state">Nenhum endereço adicionado. Você pode cadastrar o cliente sem endereço.</p>
    </section>

    <section class="border-t border-slate-200 pt-7 dark:border-slate-700" aria-labelledby="client-contacts-title">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="client-contacts-title" class="text-lg font-semibold text-slate-900 dark:text-white">Contatos</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">O primeiro contato será definido como principal.</p>
        </div>
        <button v-if="contactEditor === null" type="button" class="btn-secondary" @click="contactEditor = 'new'">Adicionar contato</button>
      </div>
      <div v-if="contactEditor !== null" class="mb-5 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
        <h3 class="mb-4 font-medium text-slate-900 dark:text-white">{{ contactEditor === 'new' ? 'Novo contato' : 'Editar contato' }}</h3>
        <ClientContactForm :key="String(contactEditor)" :initial="contactInitial" @submit="saveContact" @cancel="contactEditor = null" />
      </div>
      <div v-if="contacts.length" class="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
        <div v-for="(contact, index) in contacts" :key="index" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-slate-900 dark:text-white">{{ contact.name }}</span>
              <span v-if="contact.primary" class="badge">Principal</span>
            </div>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ [contact.position, contact.email, formatPhone(contact.mobile || contact.phone)].filter(Boolean).join(' · ') || 'Sem dados adicionais' }}</p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="link-button" @click="contactEditor = index">Editar</button>
            <button type="button" class="link-button text-rose-700 dark:text-rose-300" @click="removeContact(index)">Remover</button>
          </div>
        </div>
      </div>
      <p v-else-if="contactEditor === null" class="empty-state">Nenhum contato adicionado. Você pode cadastrar o cliente sem contatos.</p>
    </section>

    <div v-if="serverError" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">{{ serverError }}</div>
    <div v-if="hasPendingEditor" role="status" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      Salve ou cancele o endereço ou contato em edição antes de cadastrar o cliente.
    </div>
    <div class="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end dark:border-slate-700">
      <button type="button" class="btn-secondary" :disabled="loading" @click="emit('cancel')">Cancelar</button>
      <button type="submit" form="client-registration-data-form" class="btn-primary" :disabled="loading || hasPendingEditor">{{ loading ? 'Cadastrando...' : 'Cadastrar cliente' }}</button>
    </div>
  </div>
</template>

<style scoped>
.btn-primary { @apply rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60; }
.btn-secondary { @apply rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700; }
.link-button { @apply rounded-md px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-300 dark:text-indigo-300 dark:hover:bg-slate-700; }
.badge { @apply inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200; }
.empty-state { @apply rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400; }
</style>
