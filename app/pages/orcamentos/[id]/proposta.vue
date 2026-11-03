<script setup lang="ts">
/**
 * PROPOSTA DE FORNECIMENTO (atividade 038) — o orçamento como vai para o cliente.
 *
 * Segue a proposta que a gráfica já envia: cabeçalho com a logo e os dados da gráfica, "À:" o
 * cliente com o endereço e "A/C:" o contato que aprova, a data por extenso, cada produto com quantidade,
 * descrição e valores ("Idem acima ..." quando só a quantidade muda; sem descrição quando marcado como
 * similar ao anterior), as condições de fornecimento, a assinatura (imagem + nome) de quem fez o
 * orçamento com o carimbo da empresa ao lado, e o vendedor com os dados dele.
 *
 * Página própria, sem o layout do sistema: é uma folha A4 que o navegador imprime (ou salva em
 * PDF). A barra de cima some na impressão.
 */
import { computed, ref } from 'vue'
import { useQuotes } from '@/composables/useQuotes'
import { extractApiError } from '@/utils/apiError'
import { formatBrazilianDocument, formatPhone } from '@/utils/clientFormatting'
import ProposalHeader from '@/components/quotes/ProposalHeader.vue'
import { defaultProposalHeader, itemsForPrint, proposalMoney, proposalPlaceAndDate, proposalUnitMoney, recipientAddressLine } from '@/utils/proposal'
import type { QuoteProposal } from '@/types/QuoteProposal'

definePageMeta({ middleware: 'auth', layout: false })

const route = useRoute()
const quotes = useQuotes()

const proposal = ref<QuoteProposal | null>(null)
const error = ref<string | null>(null)

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
// O texto que a gráfica configurou; sem ele, o montado do cadastro.
const headerText = computed(() => {
  const c = company.value
  if (!c) return ''
  return c.headerText?.trim()
    ? c.headerText
    : defaultProposalHeader(c, { document: formatBrazilianDocument, phone: formatPhone })
})
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
// O telefone que vai na linha do vendedor: o fixo; sem ele, o celular.
const sellerLinePhone = computed(() => {
  const seller = proposal.value?.seller
  if (!seller) return ''
  if (seller.phone) return `Fone: ${phone(seller.phone)}`
  return seller.mobile ? `Cel: ${phone(seller.mobile)}` : ''
})
const recipientAddress = computed(() => recipientAddressLine(proposal.value?.recipient.address))
// Imagem que não carrega (link quebrado) some, em vez de imprimir o ícone de imagem quebrada.
const signatureBroken = ref(false)
const stampBroken = ref(false)

const print = () => window.print()
</script>

<template>
  <div class="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0">
    <!-- Barra de ações: some na impressão -->
    <div class="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4 print:hidden">
      <NuxtLink
        :to="proposal ? `/orcamentos/${proposal.quoteId}` : '/orcamentos'"
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
      class="proposal-sheet mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[18mm] py-[15mm] font-[Calibri,Carlito,sans-serif] text-[11pt] leading-snug text-black shadow-lg print:min-h-0 print:max-w-none print:p-0 print:shadow-none"
    >
      <!-- Cabeçalho: logo à esquerda, texto da gráfica à direita (configurações da empresa) -->
      <ProposalHeader :logo-url="company!.logoUrl" :header-text="headerText" :company-name="companyDisplayName" />

      <!-- Destinatário -->
      <section class="mt-8">
        <p class="font-bold">À: {{ proposal.recipient.name }}</p>
        <p v-if="recipientAddress">Endereço: {{ recipientAddress }}</p>
        <p v-if="proposal.recipient.contactName">A/C: {{ proposal.recipient.contactName }}</p>
        <p>Email: {{ proposal.recipient.email ?? '' }}</p>
        <!-- O telefone e, na mesma linha, a cidade e a data à direita. -->
        <p class="flex justify-between gap-4">
          <span>Fone: {{ phone(proposal.recipient.phone) }}</span>
          <span class="text-right">{{ proposalPlaceAndDate(company!.address?.city, proposal.issuedAt) }}</span>
        </p>
        <p v-if="proposal.recipient.mobile">Cel: {{ phone(proposal.recipient.mobile) }}</p>
      </section>

      <section class="mt-3">
        <p class="text-center font-bold">PROPOSTA DE FORNECIMENTO</p>
      </section>

      <p class="mt-2">
        Proposta que faz a {{ companyDisplayName }} para o fornecimento dos seguintes produtos impressos:
      </p>

      <!-- Produtos -->
      <section class="mt-2 space-y-2">
        <div v-for="item in items" :key="item.position" class="break-inside-avoid">
          <p>Quantidade: {{ item.quantity.toLocaleString('pt-BR') }}</p>
          <!-- Item similar ao anterior: sem descrição e sem observação. -->
          <template v-if="item.printedDescription != null">
            <p>Descrição: {{ item.printedDescription }}</p>
            <p v-if="item.notes?.trim()" class="whitespace-pre-line">Obs.: {{ item.notes }}</p>
          </template>
          <p>
            Valor R$: {{ proposalMoney(item.totalPrice) }}
            <span class="ml-4">Valor Unitário R$: {{ proposalUnitMoney(item.unitPrice) }}</span>
          </p>
          <!-- O prazo do produto, quando tem; o geral sai nas condições — os dois são impressos. -->
          <p v-if="item.deliveryTerms?.trim()">Prazo de entrega: {{ item.deliveryTerms }}</p>
        </div>
      </section>

      <!--
        Total: só quando o orçamento é TOTALIZADO (atividade 044). Sem isso os produtos são opções
        (outra quantidade, outro papel), e somar opções daria um valor que ninguém vai pagar.
      -->
      <section v-if="proposal.totalized" class="mt-2 break-inside-avoid">
        <template v-if="proposal.agencyCommissionAmount > 0">
          <p>Total dos produtos R$: {{ proposalMoney(proposal.productsTotal) }}</p>
          <p>Comissão de agência R$: {{ proposalMoney(proposal.agencyCommissionAmount) }}</p>
        </template>
        <p class="font-bold">Total R$: {{ proposalMoney(proposal.total) }}</p>
      </section>
      <!-- Sem totalizar, a comissão de agência sai como percentual: ela incide sobre o que for escolhido. -->
      <p v-else-if="Number(proposal.agencyCommissionPercent) > 0" class="mt-2 break-inside-avoid">
        Acrescentar {{ Number(proposal.agencyCommissionPercent).toLocaleString('pt-BR') }}% de comissão de agência sobre o valor dos itens escolhidos.
      </p>

      <!-- Condições -->
      <section v-if="hasConditions" class="mt-3 break-inside-avoid">
        <p class="font-bold">Das Condições de Fornecimento:</p>
        <p v-for="[label, value] in conditions" :key="label">{{ label }}: {{ value }}</p>
        <p v-if="proposal.notes?.trim()" class="whitespace-pre-line">Obs.: {{ proposal.notes }}</p>
      </section>

      <!--
        Assinatura: a imagem de quem criou o orçamento logo acima do nome (sem imagem, o espaço em
        branco de antes) e, com "Imprimir carimbo", o carimbo da empresa à direita do nome.
      -->
      <section class="mt-8 break-inside-avoid">
        <p>Atenciosamente</p>
        <!-- Assinatura à esquerda e o carimbo logo depois dela, puxado para o meio da folha. -->
        <div class="flex items-end gap-10">
          <div class="text-left">
            <img
              v-if="proposal.signatureUrl && !signatureBroken"
              :src="proposal.signatureUrl"
              alt="Assinatura"
              class="mt-1 h-[16mm] max-w-[60mm] object-contain object-left-bottom"
              @error="signatureBroken = true"
            />
            <div v-else class="h-10" />
            <p>{{ proposal.signedBy ?? companyDisplayName }}</p>
          </div>
          <img
            v-if="proposal.stampUrl && !stampBroken"
            :src="proposal.stampUrl"
            alt="Carimbo"
            class="h-[16mm] max-w-[45mm] object-contain object-left-bottom"
            @error="stampBroken = true"
          />
        </div>
      </section>

      <!-- Vendedor: com quem o cliente fala sobre a proposta. -->
      <!--
        Uma linha: vendedor e telefone à esquerda, a referência à direita. Sem telefone fixo, vai o
        celular nessa linha; o que sobrar (celular, e-mail) fica embaixo.
      -->
      <section class="mt-6 break-inside-avoid">
        <p class="flex justify-between gap-4">
          <span v-if="proposal.seller">
            Vendedor: {{ proposal.seller.name }}
            <template v-if="sellerLinePhone">
              <span class="ml-4">{{ sellerLinePhone }}</span>
            </template>
          </span>
          <span v-else />
          <span class="text-right">N/Ref.: {{ proposal.reference }}</span>
        </p>
        <template v-if="proposal.seller">
          <p v-if="proposal.seller.phone && proposal.seller.mobile">Cel: {{ phone(proposal.seller.mobile) }}</p>
          <p v-if="proposal.seller.email">Email: {{ proposal.seller.email }}</p>
        </template>
      </section>
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
