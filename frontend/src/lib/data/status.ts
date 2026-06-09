type StatusValue = string | boolean | null | undefined

function normalizeStatus(value: StatusValue): string {
  return String(value ?? '').trim().toLowerCase()
}

export function isStatus(value: StatusValue, expected: string): boolean {
  return normalizeStatus(value) === expected.toLowerCase()
}

export function isAvailableStatus(value: StatusValue): boolean {
  const normalized = normalizeStatus(value)
  return normalized === 'true' || normalized === 'available'
}
