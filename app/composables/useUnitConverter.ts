/**
 * Composable de conversão de unidades de medida.
 *
 * Lê a unidade configurada da empresa ativa (store de auth) e converte valores
 * vindos do backend (sempre em milímetros) para a unidade preferida do usuário.
 *
 * Exemplo:
 *   const { format } = useUnitConverter()
 *   format(1500) // => "1,5 m"  (se a empresa ativa estiver em METER)
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  MEASUREMENT_UNIT_SHORT,
  type MeasurementUnit,
} from '@/types/MeasurementUnit'
import { useAuthStore } from '@/stores/auth'

/** Divisor aplicado sobre o valor em milímetros para obter a unidade alvo. */
const MM_DIVISOR: Record<MeasurementUnit, number> = {
  MILLIMETER: 1,
  CENTIMETER: 10,
  METER: 1000,
}

/** Casas decimais default por unidade (mm não precisa, m precisa de mais). */
const DEFAULT_FRACTION_DIGITS: Record<MeasurementUnit, number> = {
  MILLIMETER: 0,
  CENTIMETER: 1,
  METER: 3,
}

export interface FormatOptions {
  /** Sobrescreve a unidade alvo (default: empresa ativa). */
  unit?: MeasurementUnit
  /** Casas decimais — default depende da unidade. */
  fractionDigits?: number
  /** Quando false, não inclui o sufixo (mm/cm/m). */
  withSuffix?: boolean
}

export function useUnitConverter() {
  const auth = useAuthStore()
  const { activeMeasurementUnit } = storeToRefs(auth)

  /** Reativo: unidade preferida atualmente em uso. */
  const currentUnit = computed<MeasurementUnit>(() => activeMeasurementUnit.value)

  /** Converte milímetros para a unidade configurada (ou opts.unit). */
  function fromMillimeters(millimeters: number | null | undefined, opts: FormatOptions = {}): number | null {
    if (millimeters == null || Number.isNaN(millimeters)) return null
    const target = opts.unit ?? currentUnit.value
    return millimeters / MM_DIVISOR[target]
  }

  /** Converte um valor na unidade configurada de volta para milímetros (útil em formulários). */
  function toMillimeters(value: number | null | undefined, opts: FormatOptions = {}): number | null {
    if (value == null || Number.isNaN(value)) return null
    const source = opts.unit ?? currentUnit.value
    return Math.round(value * MM_DIVISOR[source])
  }

  /**
   * Formata um valor armazenado em milímetros como string localizada (pt-BR)
   * com o sufixo da unidade. Retorna '—' quando o valor é nulo.
   */
  function format(millimeters: number | null | undefined, opts: FormatOptions = {}): string {
    const converted = fromMillimeters(millimeters, opts)
    if (converted === null) return '—'
    const target = opts.unit ?? currentUnit.value
    const digits = opts.fractionDigits ?? DEFAULT_FRACTION_DIGITS[target]
    const formatted = converted.toLocaleString('pt-BR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    return opts.withSuffix === false ? formatted : `${formatted} ${MEASUREMENT_UNIT_SHORT[target]}`
  }

  /** Sufixo curto da unidade configurada (ex.: "cm"). */
  const suffix = computed(() => MEASUREMENT_UNIT_SHORT[currentUnit.value])

  return {
    currentUnit,
    suffix,
    fromMillimeters,
    toMillimeters,
    format,
  }
}
