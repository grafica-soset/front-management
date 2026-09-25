<script setup lang="ts">
/**
 * MODELO + TIPO do produto (atividade 037) — "Blocos > Anotações".
 *
 * O Modelo é um combobox que cadastra o que não existe (como no sistema anterior da gráfica). O
 * Tipo é texto livre, com sugestão dos tipos já salvos naquele modelo: é o par que identifica o
 * modelo de produto no catálogo, e só pode existir um de cada.
 *
 * Os dados chegam e saem por props/emits; o cadastro do Modelo novo é pedido ao pai via `create-model`.
 */
import { computed } from 'vue'
import CreatableCombobox from '@/components/ui/CreatableCombobox.vue'
import type { ProductModelKeyValue } from '@/types/ProductModel'
import type { ProductTemplateKeyValue } from '@/types/ProductTemplate'

const props = defineProps<{
  models: ProductModelKeyValue[]
  /** Modelos de produto salvos — daqui saem as sugestões de Tipo. */
  templates: ProductTemplateKeyValue[]
  productModelId: number | null
  productModelName: string
  typeName: string
  creatingModel?: boolean
  disabled?: boolean
  /** Marca os dois campos como obrigatórios (no cadastro do catálogo eles são a chave). */
  required?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:productModelId', id: number | null): void
  (e: 'update:productModelName', name: string): void
  (e: 'update:typeName', name: string): void
  (e: 'create-model', name: string): void
}>()

const activeModels = computed(() => props.models.filter((m) => m.active || m.id === props.productModelId))

const typeSuggestions = computed(() =>
  props.templates.filter((t) => t.productModelId === props.productModelId).map((t) => t.typeName),
)

const onModel = (id: number | null, label: string) => {
  emit('update:productModelId', id)
  emit('update:productModelName', label)
}

const datalistId = `tipos-${Math.random().toString(36).slice(2, 8)}`

const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <div>
      <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
        Modelo <span v-if="required" class="text-rose-500">*</span>
      </label>
      <CreatableCombobox
        :options="activeModels"
        :model-value="productModelId"
        :label="productModelName"
        :creating="creatingModel"
        :disabled="disabled"
        placeholder="Ex.: Blocos, Talões, Calendários"
        @update:model-value="onModel"
        @create="emit('create-model', $event)"
      />
    </div>
    <div>
      <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
        Tipo <span v-if="required" class="text-rose-500">*</span>
      </label>
      <input
        :value="typeName"
        type="text"
        maxlength="150"
        :list="datalistId"
        :disabled="disabled"
        placeholder="Ex.: Anotações, Pedido 2 vias"
        :class="inputClass"
        @input="emit('update:typeName', ($event.target as HTMLInputElement).value)"
      />
      <datalist :id="datalistId">
        <option v-for="name in typeSuggestions" :key="name" :value="name" />
      </datalist>
    </div>
  </div>
</template>
