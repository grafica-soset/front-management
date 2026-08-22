export function digitsOnly(value: string | null | undefined): string {
  return value?.replace(/\D/gu, '') ?? ''
}

export function formatBrazilianDocument(value: string | null | undefined): string {
  const digits = digitsOnly(value).slice(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/u, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/u, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/u, '.$1-$2')
  }
  return digits
    .replace(/^(\d{2})(\d)/u, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/u, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/u, '.$1/$2')
    .replace(/(\d{4})(\d)/u, '$1-$2')
}

export function formatPhone(value: string | null | undefined): string {
  const digits = digitsOnly(value).slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/u, '($1) $2')
      .replace(/(\d{4})(\d)/u, '$1-$2')
  }
  return digits
    .replace(/^(\d{2})(\d)/u, '($1) $2')
    .replace(/(\d{5})(\d)/u, '$1-$2')
}

export function formatPostalCode(value: string | null | undefined): string {
  return digitsOnly(value).slice(0, 8).replace(/(\d{5})(\d)/u, '$1-$2')
}
