export const CHART_COLORS = [
  "#2563EB", // blue
  "#16A34A", // green
  "#F59E0B", // amber
  "#DC2626", // red
  "#7C3AED", // violet
  "#0891B2", // cyan
  "#DB2777", // rose
  "#475569", // slate
]

export const STATUS_COLORS = {
  hired: "#16A34A",
  completed: "#059669",
  pending: "#F59E0B",
  pitching: "#0EA5E9",
  shortlisted: "#2563EB",
  interview: "#7C3AED",
  rejected: "#DC2626",
  active: "#16A34A",
  inactive: "#64748B",
  suspended: "#9F1239",
  open: "#2563EB",
  in_progress: "#F59E0B",
  unknown: "#64748B",
} as const

export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

export function getStatusColor(status: string | null | undefined): string {
  const key = String(status ?? "unknown").toLowerCase()
  return STATUS_COLORS[key as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.unknown
}
