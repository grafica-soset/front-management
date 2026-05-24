<script setup lang="ts">
/**
 * Bloco específico FOLDING (dobradeira). Além dos campos planos (fabricante,
 * gramaturas e velocidade máxima), tem uma lista 1:N de unidades de dobra —
 * cada unidade é um conjunto de bolsas (1, 2 ou 4), com ou sem faca. As
 * unidades com faca são sempre as últimas (no máx. 2).
 *
 * Muta diretamente o objeto reativo `block` recebido por prop — o pai detém a
 * mesma referência e lê os valores ao montar o payload.
 */
import type { FoldingBlock } from '@/types/Machine'
import { FOLD_POCKET_OPTIONS } from '@/utils/machineCatalog'

const props = defineProps<{
  block: FoldingBlock
  errors: Record<string, string>
}>()

const addUnit = () => {
  props.block.foldUnits.push({
    orderIndex: props.block.foldUnits.length,
    pockets: 1,
    hasKnife: false,
  })
}

const removeUnit = (index: number) => {
  props.block.foldUnits.splice(index, 1)
  reindex()
}

/** Reindexa orderIndex após inserção/remoção. */
const reindex = () => {
  props.block.foldUnits.forEach((unit, i) => {
    unit.orderIndex = i
  })
}

const fieldClass = (hasError: boolean) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  hasError ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Fabricante <span class="text-rose-500">*</span></label>
        <input v-model="block.manufacturer" type="text" maxlength="100" :class="fieldClass(!!errors['manufacturer'])" />
        <p v-if="errors['manufacturer']" class="mt-1 text-xs text-rose-600">{{ errors['manufacturer'] }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Modelo <span class="text-rose-500">*</span></label>
        <input v-model="block.model" type="text" maxlength="150" :class="fieldClass(!!errors['model'])" />
        <p v-if="errors['model']" class="mt-1 text-xs text-rose-600">{{ errors['model'] }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Gramatura mín. (g/m²)</label>
        <input v-model.number="block.minWeightGsm" type="number" min="1" step="1" :class="fieldClass(!!errors['minWeightGsm'])" />
        <p v-if="errors['minWeightGsm']" class="mt-1 text-xs text-rose-600">{{ errors['minWeightGsm'] }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Gramatura máx. (g/m²)</label>
        <input v-model.number="block.maxWeightGsm" type="number" min="1" step="1" :class="fieldClass(!!errors['maxWeightGsm'])" />
        <p v-if="errors['maxWeightGsm']" class="mt-1 text-xs text-rose-600">{{ errors['maxWeightGsm'] }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Gramatura ideal (g/m²)</label>
        <input v-model.number="block.idealWeightGsm" type="number" min="1" step="1" :class="fieldClass(!!errors['idealWeightGsm'])" />
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Base do percentual de perda de velocidade.</p>
        <p v-if="errors['idealWeightGsm']" class="mt-1 text-xs text-rose-600">{{ errors['idealWeightGsm'] }}</p>
      </div>
    </div>

    <div class="max-w-xs">
      <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Velocidade máxima (folhas/h)</label>
      <input v-model.number="block.maxSpeedSheetsPerHour" type="number" min="1" step="1" :class="fieldClass(!!errors['maxSpeedSheetsPerHour'])" />
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Velocidade na quantidade total de dobras, na gramatura ideal.</p>
      <p v-if="errors['maxSpeedSheetsPerHour']" class="mt-1 text-xs text-rose-600">{{ errors['maxSpeedSheetsPerHour'] }}</p>
    </div>

    <!-- Unidades de dobra -->
    <div class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-medium text-slate-900 dark:text-white">Unidades de dobra</label>
        <span class="text-xs text-slate-500 dark:text-slate-400">As unidades com faca são sempre as últimas (máx. 2).</span>
      </div>
      <p v-if="errors['foldUnits']" class="mb-2 text-xs text-rose-600">{{ errors['foldUnits'] }}</p>

      <div class="space-y-3">
        <div
          v-for="(unit, index) in block.foldUnits"
          :key="index"
          class="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
        >
          <div class="w-12">
            <label class="block mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">#</label>
            <span class="block p-3 text-sm text-slate-500">{{ index + 1 }}</span>
          </div>
          <div class="w-32">
            <label class="block mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">Bolsas</label>
            <select
              v-model.number="unit.pockets"
              :class="fieldClass(!!errors[`foldUnits.${index}.pockets`])"
            >
              <option v-for="p in FOLD_POCKET_OPTIONS" :key="p" :value="p">{{ p }} bolsa(s)</option>
            </select>
            <p v-if="errors[`foldUnits.${index}.pockets`]" class="mt-1 text-xs text-rose-600">{{ errors[`foldUnits.${index}.pockets`] }}</p>
          </div>
          <label class="inline-flex items-center gap-2 p-3 text-sm text-slate-700 dark:text-slate-200">
            <input
              v-model="unit.hasKnife"
              type="checkbox"
              class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
            />
            Com faca
          </label>
          <button
            type="button"
            @click="removeUnit(index)"
            :disabled="block.foldUnits.length === 1"
            class="ml-auto px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Remover
          </button>
        </div>
      </div>

      <button
        type="button"
        @click="addUnit"
        class="mt-3 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800 dark:hover:bg-indigo-900/50"
      >
        + Adicionar unidade de dobra
      </button>
    </div>
  </div>
</template>
