<script setup lang="ts">
import { ICMS_TAXPAYER_OPTIONS, type PersonDto } from '~/types/shared'

interface Props {
  errors?: Record<string, string>
  legend?: string
}

withDefaults(defineProps<Props>(), {
  errors: () => ({}),
  legend: 'Dados pessoais / fiscais',
})

const person = defineModel<PersonDto>({ required: true })
</script>

<template>
  <fieldset class="rounded-lg border border-slate-200 p-4">
    <legend class="px-1 text-sm font-semibold text-slate-700">
      {{ legend }}
    </legend>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <BaseInput
        v-model="person.name"
        label="Nome"
        placeholder="Nome / Nome fantasia"
        required
        :error="errors['person.name']"
      />
      <BaseInput
        v-model="person.corporateName"
        label="Razão social"
        placeholder="Razão social (opcional)"
        :error="errors['person.corporateName']"
      />
      <BaseInput
        v-model="person.document"
        label="Documento (CPF/CNPJ)"
        placeholder="00.000.000/0000-00"
        required
        :error="errors['person.document']"
      />
      <BaseInput
        v-model="person.email"
        type="email"
        label="E-mail"
        placeholder="email@exemplo.com"
        :error="errors['person.email']"
      />
      <BaseInput
        v-model="person.stateRegistration"
        label="Inscrição estadual"
        placeholder="IE"
        :error="errors['person.stateRegistration']"
      />
      <BaseInput
        v-model="person.municipalRegistration"
        label="Inscrição municipal"
        placeholder="IM"
        :error="errors['person.municipalRegistration']"
      />
      <BaseInput
        v-model="person.suframaRegistration"
        label="Inscrição SUFRAMA"
        placeholder="SUFRAMA"
        :error="errors['person.suframaRegistration']"
      />
      <BaseSelect
        v-model="person.icmsTaxpayerIndicator"
        label="Indicador de contribuinte"
        :options="ICMS_TAXPAYER_OPTIONS"
        required
        :error="errors['person.icmsTaxpayerIndicator']"
      />
    </div>

    <label class="mt-3 flex items-center gap-2 text-sm text-slate-700">
      <input
        v-model="person.isFinalConsumer"
        type="checkbox"
        class="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      Consumidor final
    </label>
  </fieldset>
</template>
