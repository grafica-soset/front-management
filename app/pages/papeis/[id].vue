<script setup lang="ts">
/**
 * Detalhe de um Agrupamento de medidas + gestão das suas dimensões.
 *
 * Topo: detalhamento do agrupamento (somente leitura) com botão "Editar" que
 * abre um modal para alterar os atributos. Abaixo: as Dimensões (SKUs), via
 * PaperDimensionsManager. Alterar gramatura/espessura/face recalcula os papéis,
 * então recarregamos as dimensões após uma edição que mude esses atributos.
 */
import { computed, onMounted, ref } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import PaperTypeForm from '@/components/forms/PaperTypeForm.vue'
import PaperDimensionsManager from '@/components/PaperDimensionsManager.vue'
import { usePaperTypes } from '@/composables/usePaperTypes'
import { useToast } from '@/composables/useToast'
import { usePapersStore } from '@/stores/papers'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import type { PaperType } from '@/types/PaperType'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const paperId = Number(route.params.id)
if (!Number.isFinite(paperId) || paperId <= 0) {
  throw createError({ statusCode: 404, statusMessage: 'Papel inválido', fatal: true })
}

const auth = useAuthStore()
const store = usePapersStore()
const { listPaperTypes, updatePaperType } = usePaperTypes()
const toast = useToast()

const canManage = computed(() => auth.isAdmin || auth.hasCustomer)

const family = computed<PaperType | null>(() => store.paperTypeById(paperId))

const loading = ref(true)
const loadError = ref<string | null>(null)
const dimensionsRef = ref<{ reload: () => Promise<void> } | null>(null)

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    await listPaperTypes()
    if (!family.value) loadError.value = 'Agrupamento de medidas não encontrado.'
  } catch (err) {
    loadError.value = extractApiError(err, 'Falha ao carregar o agrupamento de medidas.')
  } finally {
    loading.value = false
  }
})

// ---------- Modal de edição dos atributos ----------
const isEditModalOpen = ref(false)
const editLoading = ref(false)
const editError = ref<string | null>(null)

const openEdit = () => {
  editError.value = null
  isEditModalOpen.value = true
}
const closeEdit = () => {
  isEditModalOpen.value = false
}

const handleEditSubmit = async (payload: {
  name: string
  description: string | null
  weightPerM2Grams: number
  thicknessMicrometers: number
  hasTwoSides: boolean
  active?: boolean
}) => {
  const current = family.value
  if (!current) return

  const attributeChanged =
    payload.weightPerM2Grams !== current.weightPerM2Grams
    || payload.thicknessMicrometers !== current.thicknessMicrometers
    || payload.hasTwoSides !== current.hasTwoSides
  if (
    attributeChanged
    && !window.confirm(
      'Alterar gramatura, espessura ou face muda esses atributos em todas as dimensões deste papel (e recalcula o preço por folha). Deseja continuar?',
    )
  ) {
    return
  }

  editLoading.value = true
  editError.value = null
  try {
    await updatePaperType(current.id, {
      name: payload.name,
      description: payload.description,
      weightPerM2Grams: payload.weightPerM2Grams,
      thicknessMicrometers: payload.thicknessMicrometers,
      hasTwoSides: payload.hasTwoSides,
      active: payload.active ?? current.active,
    })
    toast.success('Agrupamento de medidas atualizado.')
    closeEdit()
    if (attributeChanged) await dimensionsRef.value?.reload()
  } catch (err) {
    editError.value = extractApiError(err, 'Não foi possível salvar o agrupamento de medidas.')
  } finally {
    editLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <NuxtLink to="/papeis" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Voltar para a lista
      </NuxtLink>
      <h1 class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
        Agrupamento de medidas<span v-if="family"> — {{ family.name }}</span>
      </h1>
    </header>

    <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando agrupamento de medidas...</div>
    <div v-else-if="loadError" class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300">
      {{ loadError }}
    </div>

    <template v-else-if="family">
      <!-- Detalhamento do papel (somente leitura) -->
      <section class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ family.name }}</h2>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="family.active
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'"
              >
                {{ family.active ? 'Ativo' : 'Inativo' }}
              </span>
            </div>
            <p v-if="family.description" class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ family.description }}</p>
          </div>
          <button
            v-if="canManage"
            type="button"
            @click="openEdit"
            class="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800 dark:hover:bg-indigo-900/50"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Editar
          </button>
        </div>

        <dl class="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <dt class="text-xs text-slate-500 dark:text-slate-400">Gramatura</dt>
            <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ family.weightPerM2Grams }} g/m²</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500 dark:text-slate-400">Espessura</dt>
            <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ family.thicknessMicrometers }} µm</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500 dark:text-slate-400">Face</dt>
            <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ family.hasTwoSides ? '2 faces' : '1 face' }}</dd>
          </div>
        </dl>
      </section>

      <!-- Dimensões (SKUs) -->
      <PaperDimensionsManager ref="dimensionsRef" :family="family" />
    </template>

    <!-- Modal: editar atributos do agrupamento -->
    <Modal :is-open="isEditModalOpen" title="Editar agrupamento de medidas" @close="closeEdit">
      <PaperTypeForm
        :initial="family"
        :loading="editLoading"
        :server-error="editError"
        @submit="handleEditSubmit"
        @cancel="closeEdit"
      />
    </Modal>
  </div>
</template>
