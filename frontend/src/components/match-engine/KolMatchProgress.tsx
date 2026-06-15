'use client'

import type { KolCandidateResult } from '@/lib/data/types'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Brain, CheckCircle2, Loader2 } from 'lucide-react'

export type MatchPhase = 'searching' | 'reasoning' | 'done'

interface KolMatchProgressProps {
  phase: MatchPhase
  totalConsidered: number | null
  topN: number | null
  analyzed: KolCandidateResult[]
}

// One step in the "research" timeline. Mirrors how Claude reveals its progress:
// a checked-off step when done, a spinner while active, dimmed when pending.
function Step({
  state,
  icon,
  title,
  detail,
}: {
  state: 'done' | 'active' | 'pending'
  icon: React.ReactNode
  title: string
  detail?: string
}) {
  return (
    <div className={`flex items-start gap-3 ${state === 'pending' ? 'opacity-40' : ''}`}>
      <div className="mt-0.5 shrink-0">
        {state === 'done' ? (
          <CheckCircle2 className="h-4 w-4 text-[#25F4EE]" />
        ) : state === 'active' ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#FE2C55]" />
        ) : (
          <span className="text-muted-foreground">{icon}</span>
        )}
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${state === 'active' ? 'text-foreground' : ''}`}>{title}</span>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </div>
    </div>
  )
}

export default function KolMatchProgress({ phase, totalConsidered, topN, analyzed }: KolMatchProgressProps) {
  const searchState = phase === 'searching' ? 'active' : 'done'
  const reasonState = phase === 'searching' ? 'pending' : phase === 'reasoning' ? 'active' : 'done'

  return (
    <Card className="border border-border">
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FE2C55] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FE2C55]" />
          </span>
          <span className="text-sm font-semibold">AI is working on your shortlist…</span>
        </div>

        <div className="flex flex-col gap-3 pl-1">
          <Step
            state={searchState}
            icon={<Search className="h-4 w-4" />}
            title="Searching the talent pool"
            detail={
              searchState === 'done'
                ? `${totalConsidered ?? 0} candidates retrieved & ranked`
                : 'Semantic retrieval + scoring…'
            }
          />
          <Step
            state={reasonState}
            icon={<Brain className="h-4 w-4" />}
            title="Reasoning about each KOL"
            detail={
              reasonState === 'pending'
                ? 'Waiting for shortlist…'
                : `${analyzed.length}${topN ? ` / ${topN}` : ''} analyzed`
            }
          />
        </div>

        {analyzed.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            {analyzed.map((c) => (
              <div
                key={c.kol_id}
                className="flex items-center justify-between gap-2 text-sm animate-in fade-in slide-in-from-bottom-1"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#25F4EE]" />
                  <span className="text-muted-foreground shrink-0">#{c.rank}</span>
                  <span className="truncate font-medium">{c.name}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {c.score.toFixed(0)}/100
                </span>
              </div>
            ))}
            {phase === 'reasoning' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Reasoning about the next KOL…</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
