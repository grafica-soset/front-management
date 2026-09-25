<script setup lang="ts">
/**
 * "Adicionar do catálogo" (atividade 037): escolhe um Modelo de Produto salvo.
 *
 * A lista vem agrupada por Modelo — "Blocos" com os seus tipos embaixo —, que é como a gráfica
 * pensa o catálogo. Emite só o id; quem abre o assistente com ele é a página.
 */
import { computed, ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import type { ProductTemplateKeyValue } from '@/types/ProductTemplate'

const props = defineProps<{
  isOpen: boolean
  templates: ProductTemplateKeyValue[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'pick', templateId: number): void
  (e: 'close'): void
}>()

const search = ref('')
watch(() => props.isOpen, (open) => { if (open) search.value = '' })

const groups = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('pt-BR')
  const byModel = new Map<string, ProductTemplateKeyValue[]>()
  for (const t of props.templates) {
    if (term && !t.value.toLocaleLowerCase('pt-BR').includes(term)) continue
    const model = t.value.slice(0, t.value.length - t.typeName.length - 3)
    byModel.set(model, [...(byModel.get(model) ?? []), t])
  }
  return [...byModel.entries()].map(([model, items]) => ({ model, items }))
})
</script>

<template>
  <Modal :is-open="isOpen" title="Adicionar do catálogo" @close="emit('close')">
    <div class="space-y-4">
      <input
        v-model="search"
        type="search"
        placeholder="Buscar por modelo ou tipo"
        class="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      />
      <p v-if="loading" class="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
      <p v-else-if="templates.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
        Nenhum modelo salvo ainda. Configure um produto novo e use "Salvar como modelo" no passo de
        impostos.
      </p>
      <p v-else-if="groups.length === 0" class="text-sm text-slate-500 dark:text-slate-400">Nada encontrado.</p>
      <div v-else class="max-h-96 space-y-4 overflow-y-auto">
        <div v-for="group in groups" :key="group.model">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ group.model }}</h3>
          <ul class="mt-1.5 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            <li v-for="t in group.items" :key="t.id">
              <button
                type="button"
                class="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-slate-800 hover:bg-indigo-50 dark:text-slate-100 dark:hover:bg-slate-700"
                @click="emit('pick', t.id)"
              >
                {{ t.typeName }}
                <span class="text-xs font-medium text-indigo-600 dark:text-indigo-300">Usar →</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Modal>
</template>
