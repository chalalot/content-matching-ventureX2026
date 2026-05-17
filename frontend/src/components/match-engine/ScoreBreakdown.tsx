import type { ScoreBreakdown } from '@/lib/data/types'

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdown
}

const LABELS: Record<keyof ScoreBreakdown, [string, number]> = {
  genre_match:     ['Thể loại',     25],
  style_match:     ['Phong cách',   20],
  specialty_match: ['Chuyên ngành', 20],
  performance:     ['Hiệu suất',    15],
  availability:    ['Sẵn sàng',     10],
  experience:      ['Kinh nghiệm',   5],
  budget_fit:      ['Ngân sách',     5],
}

export default function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  return (
    <div className="flex flex-col gap-2 mt-3">
      {(Object.entries(LABELS) as [keyof ScoreBreakdown, [string, number]][]).map(
        ([key, [label, max]]) => {
          const value = breakdown[key] ?? 0
          const pct = max > 0 ? (value / max) * 100 : 0
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-black rounded-full transition-all"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span className="text-xs tabular-nums w-12 text-right">
                {value}/{max}
              </span>
            </div>
          )
        }
      )}
    </div>
  )
}
