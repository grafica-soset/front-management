<template>
  <div class="flex min-h-full items-center justify-center bg-slate-100 px-4 py-10">
    <div class="w-full max-w-sm">
      <div class="mb-6 flex flex-col items-center gap-2 text-center">
        <div class="flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md">
          <Icon name="lucide:layers" class="size-6" />
        </div>
        <h1 class="text-2xl font-semibold text-slate-800">Soset</h1>
        <p class="text-sm text-slate-500">Gestão para a indústria gráfica</p>
      </div>
      <div class="card p-6">
        <slot />
      </div>
    </div>
  </div>
</template>
