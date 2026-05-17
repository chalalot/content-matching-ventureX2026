'use client'

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { CHART_COLORS } from '@/lib/utils/chart-colors'

interface LineConfig {
  key: string
  label: string
}

interface AreaChartProps {
  data: Record<string, unknown>[]
  xKey: string
  lines: LineConfig[]
  height?: number
}

export default function AreaChart({ data, xKey, lines, height = 250 }: AreaChartProps) {
  const config: ChartConfig = Object.fromEntries(
    lines.map((l, i) => [l.key, { label: l.label, color: CHART_COLORS[i] }])
  )

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RechartsAreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip content={<ChartTooltipContent />} />
        {lines.map((line, i) => (
          <Area
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={CHART_COLORS[i]}
            fill={CHART_COLORS[i]}
            fillOpacity={0.1}
            strokeWidth={2}
          />
        ))}
      </RechartsAreaChart>
    </ChartContainer>
  )
}
