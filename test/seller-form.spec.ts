import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compile } from '@vue/compiler-dom'
import { parse } from '@vue/compiler-sfc'
import { createSSRApp, reactive, ref } from 'vue'
import * as Vue from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'

async function renderSellerForm(): Promise<string> {
  const componentPath = fileURLToPath(new URL('../app/components/forms/SellerForm.vue', import.meta.url))
  const { descriptor } = parse(readFileSync(componentPath, 'utf8'))
  const template = descriptor.template?.content
  if (!template) throw new Error('SellerForm.vue não possui template')

  const { code } = compile(template, { mode: 'function' })
  const render = new Function('Vue', code)(Vue)
  const app = createSSRApp({
    setup() {
      const form = reactive({
        name: '',
        document: '',
        email: '',
        phone: '',
        mobile: '',
      })
      return {
        emit: () => undefined,
        errors: ref<Record<string, string>>({}),
        form,
        handleSubmit: () => undefined,
        loading: false,
        serverError: null,
        submitLabel: 'Salvar',
        updateDocument: () => undefined,
        updatePhone: () => undefined,
      }
    },
    render,
  })

  return renderToString(app)
}

describe('cadastro de vendedor', () => {
  it('exibe apenas CPF, sem opção de pessoa jurídica ou CNPJ', async () => {
    const html = await renderSellerForm()

    expect(html).toContain('CPF')
    expect(html).not.toContain('Pessoa jurídica')
    expect(html).not.toContain('CNPJ')
    expect(html).not.toContain('Razão social')
  })
})
