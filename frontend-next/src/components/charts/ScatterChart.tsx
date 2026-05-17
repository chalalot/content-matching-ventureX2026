'use client'

import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
} from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { CHART_COLORS } from '@/lib/utils/chart-colors'

interface ScatterChartProps {
  data: Record<string, unknown>[]
  xKey: string
  yKey: string
  colorKey?: string
  sizeKey?: string
  nameKey?: string
  height?: number
  xLabel?: string
  yLabel?: string
}

export default function ScatterChart({
  data,
  xKey,
  yKey,
  colorKey,
  sizeKey,
  height = 280,
  xLabel,
  yLabel,
}: ScatterChartProps) {
  // Group by colorKey if provided
  const groups: { label: string; points: Record<string, unknown>[]; color: string }[] = []

  if (colorKey) {
    const seen = new Map<string, Record<string, unknown>[]>()
    for (const row of data) {
      const key = String(row[colorKey] ?? 'Other')
      if (!seen.has(key)) seen.set(key, [])
      seen.get(key)!.push(row)
    }
    let i = 0
    for (const [label, points] of seen.entries()) {
      groups.push({ label, points, color: CHART_COLORS[i % CHART_COLORS.length] })
      i++
    }
  } else {
    groups.push({ label: 'data', points: data, color: CHART_COLORS[0] })
  }

  const config: ChartConfig = Object.fromEntries(
    groups.map(g => [g.label, { label: g.label, color: g.color }])
  )

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RechartsScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis
          dataKey={xKey}
          type="number"
          name={xLabel ?? xKey}
          tick={{ fontSize: 11 }}
          label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -8, fontSize: 11 } : undefined}
        />
        <YAxis
          dataKey={yKey}
          type="number"
          name={yLabel ?? yKey}
          tick={{ fontSize: 11 }}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11 } : undefined}
        />
        {sizeKey && <ZAxis dataKey={sizeKey} range={[30, 300]} />}
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        {groups.map(g => (
          <Scatter
            key={g.label}
            name={g.label}
            data={g.points}
            fill={g.color}
            fillOpacity={0.7}
          />
        ))}
      </RechartsScatterChart>
    </ChartContainer>
  )
}
