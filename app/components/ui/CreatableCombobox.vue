<script setup lang="ts">
/**
 * Combobox que CADASTRA o que não existe (atividade 037).
 *
 * O usuário digita: se o texto bate com uma opção, ela é escolhida; se não bate com nenhuma, a
 * lista oferece "Cadastrar “texto”". Era assim no sistema anterior da gráfica para os Modelos
 * (Blocos, Talões...) e é o que evita ir a outra tela no meio do orçamento.
 *
 * O componente não fala com a API: emite `create` com o texto e quem o usa cadastra e devolve a
 * opção nova em `options`, já selecionada via `modelValue`.
 */
import { computed, ref, watch } from 'vue'

interface Option {
  id: number
  value: string
}

const props = defineProps<{
  options: Option[]
  /** Id escolhido (nulo = nada escolhido). */
  modelValue: number | null
  /** Texto a exibir quando o id ainda não está nas opções (ex.: veio de um orçamento salvo). */
  label?: string
  placeholder?: string
  disabled?: boolean
  /** Enquanto o pai cadastra, a opção de criar fica desabilitada. */
  creating?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', id: number | null, label: string): void
  (e: 'create', text: string): void
}>()

const text = ref('')
const open = ref(false)

const selectedLabel = computed(
  () => props.options.find((o) => o.id === props.modelValue)?.value ?? props.label ?? '',
)

// O campo mostra o escolhido; digitar troca a busca, e sair sem escolher volta ao escolhido.
watch(selectedLabel, (label) => { text.value = label }, { immediate: true })

const normalized = (value: string) => value.trim().toLocaleLowerCase('pt-BR')

const filtered = computed(() => {
  const term = normalized(text.value)
  if (!term || term === normalized(selectedLabel.value)) return props.options
  return props.options.filter((o) => normalized(o.value).includes(term))
})

const exactMatch = computed(() => props.options.find((o) => normalized(o.value) === normalized(text.value)))
const canCreate = computed(() => !!text.value.trim() && !exactMatch.value)

const choose = (option: Option) => {
  emit('update:modelValue', option.id, option.value)
  text.value = option.value
  open.value = false
}

const create = () => {
  if (!canCreate.value || props.creating) return
  emit('create', text.value.trim())
  open.value = false
}

const onEnter = () => {
  if (exactMatch.value) choose(exactMatch.value)
  else if (filtered.value.length === 1) choose(filtered.value[0]!)
  else create()
}

const clear = () => {
  emit('update:modelValue', null, '')
  text.value = ''
}

// Espera o clique numa opção acontecer antes de fechar a lista.
const onBlur = () => {
  window.setTimeout(() => {
    open.value = false
    if (exactMatch.value && exactMatch.value.id !== props.modelValue) choose(exactMatch.value)
    else text.value = selectedLabel.value
  }, 150)
}

const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 pr-9 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
</script>

<template>
  <div class="relative">
    <input
      v-model="text"
      type="text"
      maxlength="150"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="inputClass"
      role="combobox"
      :aria-expanded="open"
      autocomplete="off"
      @focus="open = true"
      @input="open = true"
      @blur="onBlur"
      @keydown.enter.prevent="onEnter"
      @keydown.esc="open = false"
    />
    <button
      v-if="modelValue != null && !disabled"
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
      aria-label="Limpar"
      @mousedown.prevent="clear"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <ul
      v-if="open && !disabled && (filtered.length || canCreate)"
      class="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-600 dark:bg-slate-800"
      role="listbox"
    >
      <li
        v-for="option in filtered"
        :key="option.id"
        role="option"
        :aria-selected="option.id === modelValue"
        class="cursor-pointer px-3 py-2 text-slate-700 hover:bg-indigo-50 dark:text-slate-200 dark:hover:bg-slate-700"
        :class="option.id === modelValue ? 'font-semibold text-indigo-700 dark:text-indigo-300' : ''"
        @mousedown.prevent="choose(option)"
      >
        {{ option.value }}
      </li>
      <li
        v-if="canCreate"
        role="option"
        :aria-selected="false"
        class="cursor-pointer border-t border-slate-100 px-3 py-2 font-medium text-indigo-700 hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-300 dark:hover:bg-slate-700"
        :class="creating ? 'pointer-events-none opacity-50' : ''"
        @mousedown.prevent="create"
      >
        + Cadastrar “{{ text.trim() }}”
      </li>
    </ul>
  </div>
</template>
