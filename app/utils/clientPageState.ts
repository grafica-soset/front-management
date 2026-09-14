interface EmptyPageResult {
  requestedPage: number
  totalPages: number
  itemCount: number
}

export function pageToReloadAfterEmptyResult({
  requestedPage,
  totalPages,
  itemCount,
}: EmptyPageResult): number | null {
  if (itemCount > 0 || requestedPage <= 0) return null
  return Math.max(0, Math.min(requestedPage - 1, totalPages - 1))
}

export function hasPendingClientEditor(
  addressEditor: string | number | null,
  contactEditor: string | number | null,
): boolean {
  return addressEditor !== null || contactEditor !== null
}

export function canSubmitClientForm({
  loading,
  hasPendingEditor,
}: {
  loading: boolean
  hasPendingEditor: boolean
}): boolean {
  return !loading && !hasPendingEditor
}

export function canRefreshAfterStatusMutation(
  requestTenantVersion: number,
  currentTenantVersion: number,
): boolean {
  return requestTenantVersion === currentTenantVersion
}

export function addStatusMutation(activeIds: readonly number[], clientId: number): number[] {
  return activeIds.includes(clientId) ? [...activeIds] : [...activeIds, clientId]
}

export function removeStatusMutation(activeIds: readonly number[], clientId: number): number[] {
  return activeIds.filter((id) => id !== clientId)
}
