'use client'

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { CHART_COLORS } from '@/lib/utils/chart-colors'

interface PieChartProps {
  data: { name: string; value: number }[]
  donut?: boolean
  height?: number
}

export default function PieChart({ data, donut = false, height = 250 }: PieChartProps) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.name, { label: d.name, color: CHART_COLORS[i] }])
  )

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RechartsPieChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <Tooltip content={<ChartTooltipContent />} />
        <Legend />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={donut ? '45%' : 0}
          outerRadius="70%"
          strokeWidth={1}
          stroke="#fff"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
      </RechartsPieChart>
    </ChartContainer>
  )
}
