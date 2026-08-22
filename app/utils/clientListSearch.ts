import type { ClientPageItem } from '@/types/Client'

export interface ClientListSearchState {
  results: ClientPageItem[]
  loading: boolean
  error: unknown | null
}

interface ClientListSearchOptions {
  search: (term: string) => Promise<ClientPageItem[]>
  invalidate?: () => void
  onStateChange: (state: ClientListSearchState) => void
  minChars?: number
  debounceMs?: number
}

export function createClientListSearch({
  search,
  invalidate = () => undefined,
  onStateChange,
  minChars = 3,
  debounceMs = 300,
}: ClientListSearchOptions) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let requestVersion = 0
  let activeTerm = ''
  let state: ClientListSearchState = {
    results: [],
    loading: false,
    error: null,
  }

  function publish(next: ClientListSearchState) {
    state = next
    onStateChange({ ...state })
  }

  function clearTimer() {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  function schedule(rawTerm: string) {
    const term = rawTerm.trim()
    const version = ++requestVersion
    clearTimer()
    publish({ results: [], loading: false, error: null })

    if (term.length < minChars) {
      if (!activeTerm) return
      invalidate()
      activeTerm = ''
      publish({ results: [], loading: true, error: null })
      void search('').then((results) => {
        if (version === requestVersion) {
          publish({ results, loading: false, error: null })
        }
      }).catch((error) => {
        if (version === requestVersion) {
          publish({ results: [], loading: false, error })
        }
      })
      return
    }
    invalidate()
    publish({ results: [], loading: true, error: null })

    timer = setTimeout(async () => {
      timer = undefined
      if (version !== requestVersion) return
      activeTerm = term
      try {
        const results = await search(term)
        if (version === requestVersion) {
          publish({ results, loading: false, error: null })
        }
      } catch (error) {
        if (version === requestVersion) {
          publish({ results: [], loading: false, error })
        }
      }
    }, debounceMs)
  }

  function cancel(activeTermAfterCancel = '') {
    requestVersion += 1
    invalidate()
    const normalizedActiveTerm = activeTermAfterCancel.trim()
    activeTerm = normalizedActiveTerm.length >= minChars ? normalizedActiveTerm : ''
    clearTimer()
    publish({ results: [], loading: false, error: null })
  }

  return { schedule, cancel }
}
