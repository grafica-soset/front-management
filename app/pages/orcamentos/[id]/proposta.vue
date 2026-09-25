<script setup lang="ts">
/**
 * PROPOSTA DE FORNECIMENTO (atividade 038) — o orçamento como vai para o cliente.
 *
 * Segue a proposta que a gráfica já envia: cabeçalho com a logo e os dados da gráfica, "À:" o
 * cliente e "A/C:" o contato, cada produto com quantidade, descrição e valores ("Idem acima ..."
 * quando só a quantidade muda), as condições de fornecimento e a assinatura de quem fez o
 * orçamento.
 *
 * Página própria, sem o layout do sistema: é uma folha A4 que o navegador imprime (ou salva em
 * PDF). A barra de cima some na impressão.
 */
import { computed, ref } from 'vue'
import { useQuotes } from '@/composables/useQuotes'
import { extractApiError } from '@/utils/apiError'
import { formatBrazilianDocument, formatPhone } from '@/utils/clientFormatting'
import { addressLines, itemsForPrint, proposalMoney, proposalPlaceAndDate } from '@/utils/proposal'
import type { QuoteProposal } from '@/types/QuoteProposal'

definePageMeta({ middleware: 'auth', layout: false })

const route = useRoute()
const quotes = useQuotes()

const proposal = ref<QuoteProposal | null>(null)
const error = ref<string | null>(null)
const logoFailed = ref(false)

onMounted(async () => {
  try {
    proposal.value = await quotes.getProposal(Number(route.params.id))
    useHead({ title: `Proposta nº ${proposal.value.number} — ${proposal.value.recipient.name}` })
  } catch (err) {
    error.value = extractApiError(err, 'Não foi possível abrir a proposta.')
  }
})

const company = computed(() => proposal.value?.company)
const companyDisplayName = computed(() => company.value?.name ?? '')
const items = computed(() => (proposal.value ? itemsForPrint(proposal.value.items) : []))
const conditions = computed(() => {
  const c = proposal.value?.conditions
  if (!c) return []
  return [
    ['Validade da Proposta', c.proposalValidity],
    ['Prazo de entrega', c.deliveryTerms],
    ['Condições de Pagamento', c.paymentTerms],
    ['Dados para pagamento', c.bankDetails],
  ].filter((row): row is [string, string] => !!row[1]?.trim())
})
const hasConditions = computed(() => conditions.value.length > 0 || !!proposal.value?.notes?.trim())

const phone = (value: string | null | undefined) => (value ? formatPhone(value) : '')

const print = () => window.print()
</script>

<template>
  <div class="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0">
    <!-- Barra de ações: some na impressão -->
    <div class="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4 print:hidden">
      <NuxtLink
        :to="proposal ? { path: '/orcamentos/editar', query: { id: proposal.quoteId } } : '/orcamentos'"
        class="text-sm text-slate-600 hover:text-slate-900"
      >
        ← Voltar ao orçamento
      </NuxtLink>
      <button
        type="button"
        :disabled="!proposal"
        class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:opacity-50"
        @click="print"
      >
        Imprimir
      </button>
    </div>

    <p v-if="error" class="mx-auto max-w-[210mm] rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ error }}</p>
    <p v-else-if="!proposal" class="mx-auto max-w-[210mm] px-4 text-sm text-slate-600">Carregando a proposta...</p>

    <!-- A folha -->
    <article
      v-else
      class="proposal-sheet mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[18mm] py-[15mm] text-[10.5pt] leading-snug text-black shadow-lg print:min-h-0 print:max-w-none print:p-0 print:shadow-none"
    >
      <!-- Cabeçalho: logo à esquerda, dados da gráfica à direita -->
      <header class="flex items-start justify-between gap-6">
        <div class="flex min-h-[22mm] max-w-[60%] items-center">
          <img
            v-if="company!.logoUrl && !logoFailed"
            :src="company!.logoUrl"
            :alt="companyDisplayName"
            class="max-h-[26mm] max-w-full object-contain"
            @error="logoFailed = true"
          />
          <span v-else class="text-2xl font-bold">{{ companyDisplayName }}</span>
        </div>
        <div class="text-right text-[8.5pt] leading-tight">
          <p class="font-bold">{{ company!.corporateName || company!.name }}</p>
          <p v-for="line in addressLines(company!.address)" :key="line" class="mt-0.5">{{ line }}</p>
          <p v-if="company!.phone" class="mt-0.5">Fone: {{ phone(company!.phone) }}</p>
          <p v-if="company!.email">E-mail: {{ company!.email }}</p>
          <p>CNPJ <strong class="italic">{{ formatBrazilianDocument(company!.document) }}</strong></p>
        </div>
      </header>

      <!-- Destinatário -->
      <section class="mt-8">
        <p class="font-bold">À: {{ proposal.recipient.name }}</p>
        <p v-if="proposal.recipient.contactName">A/C: {{ proposal.recipient.contactName }}</p>
        <p>Email: {{ proposal.recipient.email ?? '' }}</p>
        <p>Fone: {{ phone(proposal.recipient.phone) }}</p>
        <p v-if="proposal.recipient.mobile">Cel: {{ phone(proposal.recipient.mobile) }}</p>
      </section>

      <section class="mt-6">
        <p class="font-bold">PROPOSTA DE FORNECIMENTO</p>
        <p>{{ proposalPlaceAndDate(company!.address?.city, proposal.issuedAt) }}</p>
      </section>

      <p class="mt-6">
        Proposta que faz a {{ companyDisplayName }} para o fornecimento dos seguintes produtos impressos:
      </p>

      <!-- Produtos -->
      <section class="mt-4 space-y-4">
        <div v-for="item in items" :key="item.position" class="break-inside-avoid">
          <p>Quantidade: {{ item.quantity.toLocaleString('pt-BR') }}</p>
          <p>Descrição: {{ item.printedDescription }}</p>
          <p>
            Valor R$: {{ proposalMoney(item.totalPrice) }}
            <span class="ml-4">Valor Unitário R$: {{ proposalMoney(item.unitPrice) }}</span>
          </p>
        </div>
      </section>

      <!-- Comissão de agência: só quando existe, porque muda o total que o cliente paga. -->
      <section v-if="proposal.agencyCommissionAmount > 0" class="mt-4 break-inside-avoid">
        <p>Total dos produtos R$: {{ proposalMoney(proposal.productsTotal) }}</p>
        <p>Comissão de agência R$: {{ proposalMoney(proposal.agencyCommissionAmount) }}</p>
        <p class="font-bold">Total R$: {{ proposalMoney(proposal.total) }}</p>
      </section>

      <!-- Condições -->
      <section v-if="hasConditions" class="mt-6 break-inside-avoid">
        <p class="font-bold">Das Condições de Fornecimento:</p>
        <p v-for="[label, value] in conditions" :key="label">{{ label }}: {{ value }}</p>
        <p v-if="proposal.notes?.trim()" class="whitespace-pre-line">Obs.: {{ proposal.notes }}</p>
      </section>

      <!-- Assinatura -->
      <section class="mt-8 break-inside-avoid">
        <p>Atenciosamente</p>
        <p class="mt-10">{{ proposal.signedBy ?? companyDisplayName }}</p>
      </section>

      <p class="mt-8">N/Ref.: {{ proposal.number }}</p>
    </article>
  </div>
</template>

<style>
/* A4 com margem de impressão; a folha na tela já simula a margem pelo padding. */
@page {
  size: A4;
  margin: 15mm 18mm;
}

@media print {
  html,
  body {
    background: #fff !important;
  }
}
</style>
