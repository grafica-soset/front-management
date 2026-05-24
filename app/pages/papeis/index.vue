<script setup lang="ts">
/**
 * Lista de Papéis (agrupamentos de medidas).
 *
 * Cada item é um agrupamento de medidas (PaperType): define gramatura,
 * espessura e lado do papel. Suas dimensões concretas (os SKUs) são gerenciadas
 * dentro dele, na tela de detalhe/edição (/papeis/{id}).
 */
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { usePaperTypes } from '@/composables/usePaperTypes'
import { usePapersStore } from '@/stores/papers'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { extractApiError } from '@/utils/apiError'
import type { PaperType } from '@/types/PaperType'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const store = usePapersStore()
const { paperTypes } = storeToRefs(store)
const { listPaperTypes, deletePaperType } = usePaperTypes()
const toast = useToast()

const canManage = computed(() => auth.isAdmin || auth.hasCustomer)
const canDelete = computed(() => auth.isAdmin)

const loading = ref(false)
const listError = ref<string | null>(null)
const search = ref('')

const filtered = computed<PaperType[]>(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return paperTypes.value
  return paperTypes.value.filter((t) => t.name.toLowerCase().includes(term))
})

const refresh = async () => {
  loading.value = true
  listError.value = null
  try {
    await listPaperTypes()
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar os papéis.')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

const handleDelete = async (paper: PaperType) => {
  if (!window.confirm(`Remover o agrupamento de medidas "${paper.name}" e todas as suas dimensões? Esta ação não pode ser desfeita.`)) return
  try {
    await deletePaperType(paper.id)
    toast.success('Agrupamento de medidas removido.')
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível remover o papel.'))
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Papéis</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cada agrupamento de medidas define gramatura, espessura e lado do papel; as dimensões (tamanhos) são cadastradas dentro dele.
        </p>
      </div>
      <NuxtLink
        v-if="canManage"
        to="/papeis/novo"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Novo agrupamento de medidas
      </NuxtLink>
    </header>

    <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 dark:bg-slate-800 dark:border-slate-700">
      <label class="block mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Buscar</label>
      <input
        v-model="search"
        type="search"
        placeholder="Nome do papel..."
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full md:w-1/2 p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
      />
    </div>

    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
      <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando papéis...</div>
      <div v-else-if="listError" class="p-6 text-sm text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>
      <div v-else-if="filtered.length === 0" class="p-8 text-sm text-center text-slate-500 dark:text-slate-400">
        Nenhum agrupamento de medidas cadastrado. Clique em "Novo agrupamento de medidas" para começar.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-300">
            <tr>
              <th class="px-5 py-3 font-semibold">Nome</th>
              <th class="px-5 py-3 font-semibold">Gramatura</th>
              <th class="px-5 py-3 font-semibold">Espessura</th>
              <th class="px-5 py-3 font-semibold">Lado do papel</th>
              <th class="px-5 py-3 font-semibold text-center">Status</th>
              <th v-if="canManage" class="px-5 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="paper in filtered" :key="paper.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
              <td class="px-5 py-3">
                <div class="font-medium text-slate-900 dark:text-white">{{ paper.name }}</div>
                <div v-if="paper.description" class="text-xs text-slate-500 dark:text-slate-400">{{ paper.description }}</div>
              </td>
              <td class="px-5 py-3 whitespace-nowrap">{{ paper.weightPerM2Grams }} g/m²</td>
              <td class="px-5 py-3 whitespace-nowrap">{{ paper.thicknessMicrometers }} µm</td>
              <td class="px-5 py-3 whitespace-nowrap">{{ paper.bothSidesEqual ? '2 lados' : '1 lado' }}</td>
              <td class="px-5 py-3 text-center">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="paper.active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'"
                >
                  {{ paper.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td v-if="canManage" class="px-5 py-3 text-right">
                <div class="inline-flex items-center gap-1">
                  <NuxtLink :to="`/papeis/${paper.id}`" class="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-md dark:text-indigo-300 dark:hover:bg-slate-700">
                    Editar / dimensões
                  </NuxtLink>
                  <button v-if="canDelete" type="button" @click="handleDelete(paper)" class="px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md dark:text-rose-300 dark:hover:bg-slate-700">
                    Remover
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
