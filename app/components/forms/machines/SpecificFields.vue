<script setup lang="ts">
/**
 * Renderer genérico do bloco específico de uma máquina, dirigido por
 * descritores (cf. machineCatalog.SPECIFIC_FIELDS). Cobre todos os tipos
 * "planos"; FOLDING usa o componente dedicado FoldingBlock.
 *
 * Os campos de comprimento (suffix "mm" e inteiros) são exibidos na unidade da
 * empresa ativa e convertidos para milímetros ao escrever — o objeto `block`
 * armazena sempre milímetros (o que é enviado à API). Demais campos (decimais
 * sub-mm como espessura de arame, dpi, g/m², s, kgf) ficam no valor cru.
 *
 * Muta diretamente o objeto reativo `block` recebido por prop — o pai detém a
 * mesma referência e lê os valores ao montar o payload.
 */
import { useUnitConverter } from '@/composables/useUnitConverter'
import { getByPath, setByPath, type FieldDescriptor } from '@/utils/machineCatalog'

const props = defineProps<{
  block: Record<string, unknown>
  descriptors: FieldDescriptor[]
  errors: Record<string, string>
}>()

const { suffix, fromMillimeters, toMillimeters } = useUnitConverter()

/** Campo de comprimento que armazena milímetros inteiros (canônico) e é exibido na unidade da empresa. */
const isLength = (d: FieldDescriptor) => d.suffix === 'mm' && d.kind === 'int'

const numberValue = (d: FieldDescriptor): number => {
  const v = getByPath(props.block, d.key)
  const num = typeof v === 'number' ? v : 0
  return isLength(d) ? (fromMillimeters(num) ?? 0) : num
}
const textValue = (key: string): string => {
  const v = getByPath(props.block, key)
  return typeof v === 'string' ? v : ''
}
const boolValue = (key: string): boolean => getByPath(props.block, key) === true

const onNumber = (d: FieldDescriptor, event: Event) => {
  const raw = (event.target as HTMLInputElement).value
  const parsed = raw === '' ? 0 : Number(raw)
  setByPath(props.block, d.key, isLength(d) ? (toMillimeters(parsed) ?? 0) : parsed)
}
const onText = (key: string, event: Event) => {
  setByPath(props.block, key, (event.target as HTMLInputElement).value)
}
const onSelect = (key: string, event: Event) => {
  setByPath(props.block, key, Number((event.target as HTMLSelectElement).value))
}
const onBool = (key: string, event: Event) => {
  setByPath(props.block, key, (event.target as HTMLInputElement).checked)
}

const suffixFor = (d: FieldDescriptor): string | undefined => (isLength(d) ? suffix.value : d.suffix)
const stepFor = (d: FieldDescriptor): number | 'any' => {
  if (isLength(d)) return suffix.value === 'mm' ? 1 : 'any'
  return d.kind === 'int' ? 1 : (d.step ?? 'any')
}

const inputClass = (key: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  props.errors[key] ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div
      v-for="d in descriptors"
      :key="d.key"
      :class="d.kind === 'boolean' ? 'flex items-center md:col-span-2' : ''"
    >
      <!-- Booleano -->
      <label v-if="d.kind === 'boolean'" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input
          type="checkbox"
          :checked="boolValue(d.key)"
          @change="onBool(d.key, $event)"
          class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
        />
        {{ d.label }}
      </label>

      <!-- Texto -->
      <template v-else-if="d.kind === 'text'">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          {{ d.label }} <span class="text-rose-500">*</span>
        </label>
        <input
          type="text"
          :value="textValue(d.key)"
          :maxlength="d.maxLength"
          @input="onText(d.key, $event)"
          :class="inputClass(d.key)"
        />
        <p v-if="d.help" class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ d.help }}</p>
        <p v-if="errors[d.key]" class="mt-1 text-xs text-rose-600">{{ errors[d.key] }}</p>
      </template>

      <!-- Seleção (valor numérico) -->
      <template v-else-if="d.kind === 'select'">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">{{ d.label }}</label>
        <select
          :value="numberValue(d)"
          @change="onSelect(d.key, $event)"
          :class="inputClass(d.key)"
        >
          <option v-for="opt in d.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <p v-if="d.help" class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ d.help }}</p>
        <p v-if="errors[d.key]" class="mt-1 text-xs text-rose-600">{{ errors[d.key] }}</p>
      </template>

      <!-- Número (int/decimal) -->
      <template v-else>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">{{ d.label }}</label>
        <div class="relative">
          <input
            type="number"
            :value="numberValue(d)"
            :min="isLength(d) ? 0 : d.min"
            :max="d.max"
            :step="stepFor(d)"
            @input="onNumber(d, $event)"
            :class="[inputClass(d.key), suffixFor(d) ? 'pr-14' : '']"
          />
          <span v-if="suffixFor(d)" class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffixFor(d) }}</span>
        </div>
        <p v-if="d.help" class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ d.help }}</p>
        <p v-if="errors[d.key]" class="mt-1 text-xs text-rose-600">{{ errors[d.key] }}</p>
      </template>
    </div>
  </div>
</template>
