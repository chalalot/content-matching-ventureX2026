'use client'

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { CHART_COLORS } from '@/lib/utils/chart-colors'

interface BarConfig {
  key: string
  label: string
}

interface BarChartProps {
  data: Record<string, unknown>[]
  xKey: string
  bars: BarConfig[]
  horizontal?: boolean
  stacked?: boolean
  height?: number
}

export default function BarChart({
  data,
  xKey,
  bars,
  horizontal = false,
  stacked = false,
  height = 250,
}: BarChartProps) {
  const config: ChartConfig = Object.fromEntries(
    bars.map((b, i) => [b.key, { label: b.label, color: CHART_COLORS[i] }])
  )

  const stackId = stacked ? 'stack' : undefined

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RechartsBarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 4, right: 8, bottom: 4, left: horizontal ? 80 : 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey={xKey} type="category" tick={{ fontSize: 11 }} width={75} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
          </>
        )}
        <Tooltip content={<ChartTooltipContent />} />
        {bars.length > 1 && <Legend />}
        {bars.map((bar, i) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            fill={CHART_COLORS[i]}
            stackId={stackId}
            radius={stacked ? undefined : [2, 2, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  )
}
