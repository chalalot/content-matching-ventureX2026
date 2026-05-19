'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CHART_COLORS } from '@/lib/utils/chart-colors'

interface FunnelStage {
  stage: string
  count: number
}

interface FunnelChartProps {
  data: FunnelStage[]
  colors?: string[]
}

export default function FunnelChart({ data, colors }: FunnelChartProps) {
  const resolveColor = (i: number) => colors?.[i] ?? CHART_COLORS[i % CHART_COLORS.length]
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.count))

  return (
    <div className="flex flex-col gap-2 py-2">
      {data.map((item, i) => {
        const pct = max > 0 ? (item.count / max) * 100 : 0
        return (
          <div key={item.stage} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-28 shrink-0 text-right">
              {item.stage}
            </span>
            <div className="flex-1 bg-muted rounded-sm h-7 overflow-hidden">
              <div
                className="h-full flex items-center px-2 text-xs font-medium"
                style={{
                  width: `${pct}%`,
                  backgroundColor: resolveColor(i),
                  color: '#fff',
                  minWidth: '2rem',
                  transition: 'width 0.3s ease',
                }}
              >
                {item.count}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
