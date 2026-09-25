/**
 * Listas de MODELO e de MODELOS DE PRODUTO salvos para os comboboxes (atividade 037).
 *
 * Estado de módulo, como `useQuoteCatalogs`: o passo 1 (Modelo + Tipo), o passo de impostos
 * ("Salvar como modelo") e o "Adicionar do catálogo" veem a mesma lista — cadastrar um Modelo num
 * lugar aparece no outro sem recarregar.
 */
import { ref } from 'vue'
import type { ProductModelKeyValue } from '@/types/ProductModel'
import type { ProductTemplateKeyValue } from '@/types/ProductTemplate'
import { useProductModels } from '@/composables/useProductModels'
import { useProductTemplates } from '@/composables/useProductTemplates'

const models = ref<ProductModelKeyValue[]>([])
const templates = ref<ProductTemplateKeyValue[]>([])
const creatingModel = ref(false)

export function useProductCatalog() {
  const productModels = useProductModels()
  const productTemplates = useProductTemplates()

  async function load() {
    const [m, t] = await Promise.all([productModels.listKeyValues(false), productTemplates.listKeyValues()])
    models.value = m
    templates.value = t
  }

  async function reloadTemplates() {
    templates.value = await productTemplates.listKeyValues()
  }

  /** Cadastra o Modelo digitado no combobox e o devolve já na lista. */
  async function createModel(name: string): Promise<ProductModelKeyValue> {
    creatingModel.value = true
    try {
      const created = await productModels.create({ customerId: 0, name })
      const option = { id: created.id, value: created.name, active: created.active }
      models.value = [...models.value, option].sort((a, b) => a.value.localeCompare(b.value, 'pt-BR'))
      return option
    } finally {
      creatingModel.value = false
    }
  }

  return { models, templates, creatingModel, load, reloadTemplates, createModel }
}
