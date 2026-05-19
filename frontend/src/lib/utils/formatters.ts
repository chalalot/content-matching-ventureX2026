export function formatVND(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return 'N/A'
  if (Math.abs(amount) >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B ₫`
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M ₫`
  }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'N/A'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return 'N/A'
  return `${value.toFixed(decimals)}%`
}

export function formatUSD(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return 'N/A'
  if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}
