<script setup lang="ts">
/**
 * TELA INICIAL DO ORÇAMENTO (atividade 034) — PROTÓTIPO.
 *
 * Nesta fase o orçamento é só a lista de PRODUTOS e o total. Cliente, condições de pagamento e
 * impostos ainda não existem no sistema: ficam como um bloco reservado, para o desenho já mostrar
 * onde entram sem fingir que funcionam.
 *
 * "Adicionar produto" leva ao assistente (/orcamentos/produto), que é onde mora a complexidade.
 */
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { brl, findActivity, sheetsPerUnit } from '@/utils/quoteDemoData'
import { useUnitConverter } from '@/composables/useUnitConverter'

definePageMeta({ middleware: 'auth' })

const router = useRouter()
const store = useQuoteDraftStore()
const { format } = useUnitConverter()

const openNew = () => {
  store.startNew()
  router.push('/orcamentos/produto')
}

const openEdit = (uid: string) => {
  store.edit(uid)
  router.push('/orcamentos/produto')
}

/** Resumo de uma linha: estrutura + etapas, para a lista dizer o que o produto é sem abrir. */
const describe = (index: number) => {
  const p = store.products[index]!
  const structure =
    p.structure === 'BLADE'
      ? `${p.blades} lâmina(s)`
      : `${p.sets} jogos × ${p.vias} vias`
  const covers = p.hasCovers ? ` + ${p.coverCount} capa(s)` : ''
  const steps = p.steps.map((s) => findActivity(s.activityId)?.name).filter(Boolean).join(' · ')
  return { structure: `${structure}${covers}`, steps: steps || 'sem etapas' }
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      <strong>Protótipo.</strong> Valores ilustrativos, sem integração com a API.
    </div>

    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Orçamento</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Um orçamento é composto por produtos. Cada produto tem formato, papéis e as atividades que
          o produzem.
        </p>
      </div>
      <button
        type="button"
        @click="openNew"
        class="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Adicionar produto
      </button>
    </header>

    <!-- Bloco reservado: o que ainda não existe no sistema -->
    <section class="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 dark:border-slate-600 dark:bg-slate-800/40">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-semibold text-slate-600 dark:text-slate-300">Cliente e condições de pagamento</h2>
        <span class="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">em breve</span>
      </div>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Cadastro de cliente, prazo, forma de pagamento e impostos entram aqui. Nesta fase o
        orçamento valida só a construção do preço de produção.
      </p>
    </section>

    <!-- Produtos -->
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div v-if="store.products.length === 0" class="px-6 py-12 text-center">
        <p class="text-sm text-slate-500 dark:text-slate-400">Nenhum produto no orçamento ainda.</p>
        <button
          type="button"
          @click="openNew"
          class="mt-4 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-slate-700"
        >
          Adicionar o primeiro produto
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50/50 text-xs uppercase text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
            <tr>
              <th class="px-5 py-3 font-semibold">Produto</th>
              <th class="px-5 py-3 font-semibold">Formato</th>
              <th class="px-5 py-3 text-right font-semibold">Tiragem</th>
              <th class="px-5 py-3 text-right font-semibold">Folhas/un.</th>
              <th class="px-5 py-3 text-right font-semibold">Unitário</th>
              <th class="px-5 py-3 text-right font-semibold">Total</th>
              <th class="px-5 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="(p, index) in store.products" :key="p.uid" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
              <td class="px-5 py-3">
                <span class="block font-medium text-slate-900 dark:text-white">{{ p.name || 'Sem nome' }}</span>
                <span class="block text-xs text-slate-500 dark:text-slate-400">{{ describe(index).structure }}</span>
                <span class="block truncate text-xs text-slate-400 dark:text-slate-500">{{ describe(index).steps }}</span>
              </td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">
                {{ format(p.widthMm) }} × {{ format(p.heightMm) }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ (p.quantity ?? 0).toLocaleString('pt-BR') }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{{ sheetsPerUnit(p) }}</td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ brl(store.productCosts[index]?.unitCost ?? 0) }}
              </td>
              <td class="px-5 py-3 text-right font-medium tabular-nums text-slate-900 dark:text-white">
                {{ brl(store.productCosts[index]?.total ?? 0) }}
              </td>
              <td class="px-5 py-3 text-right">
                <div class="inline-flex items-center gap-1">
                  <button type="button" @click="openEdit(p.uid)" class="rounded-md px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-700">Editar</button>
                  <button type="button" @click="store.duplicate(p.uid)" class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Duplicar</button>
                  <button type="button" @click="store.remove(p.uid)" class="rounded-md px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-slate-700">Remover</button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot class="border-t-2 border-slate-200 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-700/40">
            <tr>
              <td colspan="5" class="px-5 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                Total do orçamento
              </td>
              <td class="px-5 py-3 text-right text-base font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
                {{ brl(store.quoteTotal) }}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <div v-if="store.products.length" class="flex justify-end">
      <button
        type="button"
        @click="store.clearQuote()"
        class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        Limpar orçamento
      </button>
    </div>
  </div>
</template>
