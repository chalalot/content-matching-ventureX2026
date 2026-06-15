import type { KolCandidateResult, KolScoreBreakdown } from '@/lib/data/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatNumber } from '@/lib/utils/formatters'

interface KolCandidateCardProps {
  candidate: KolCandidateResult
}

const SCORE_LABELS: Record<keyof KolScoreBreakdown, [string, number]> = {
  niche_match:    ['Niche',      25],
  platform_match: ['Platform',   20],
  audience_fit:   ['Audience',   20],
  engagement:     ['Engagement', 15],
  reach:          ['Reach',      10],
  budget_fit:     ['Budget',      5],
  availability:   ['Available',   5],
}

const PLATFORM_ICONS: Record<string, string> = {
  YOUTUBE: 'YT',
  INSTAGRAM: 'IG',
  TIKTOK: 'TK',
  FACEBOOK: 'FB',
}

function ScoreCircle({ score }: { score: number }) {
  const size = score >= 70 ? 'w-14 h-14 text-base border-4' : score >= 50 ? 'w-12 h-12 text-sm border-2' : 'w-10 h-10 text-xs border'
  return (
    <div className={`${size} rounded-full border-primary flex items-center justify-center font-bold shrink-0`}>
      {score.toFixed(0)}
    </div>
  )
}

function KolScoreBreakdownBars({ breakdown }: { breakdown: KolScoreBreakdown }) {
  return (
    <div className="flex flex-col gap-2 mt-3">
      {(Object.entries(SCORE_LABELS) as [keyof KolScoreBreakdown, [string, number]][]).map(
        ([key, [label, max]]) => {
          const value = breakdown[key] ?? 0
          const pct = max > 0 ? (value / max) * 100 : 0
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all bg-gradient-to-r from-[#25F4EE] to-[#FE2C55]" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <span className="text-xs tabular-nums w-12 text-right">{value}/{max}</span>
            </div>
          )
        }
      )}
    </div>
  )
}

function parseBoldText(text: string) {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : part
  )
}

function renderMarkdown(content: string) {
  if (!content) return null
  return (
    <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
      {content.split('\n').map((line, i) => {
        const t = line.trim()
        if (!t) return null
        if (t.startsWith('## ')) return <h4 key={i} className="text-sm font-bold text-foreground mt-4 mb-2">{parseBoldText(t.slice(3))}</h4>
        if (t.startsWith('### ')) return <h5 key={i} className="text-xs font-bold text-foreground mt-3 mb-1">{parseBoldText(t.slice(4))}</h5>
        if (t.startsWith('- ') || t.startsWith('* ')) return <ul key={i} className="list-disc pl-4 my-1"><li className="text-sm">{parseBoldText(t.slice(2))}</li></ul>
        return <p key={i} className="my-1">{parseBoldText(t)}</p>
      })}
    </div>
  )
}

export default function KolCandidateCard({ candidate }: KolCandidateCardProps) {
  return (
    <Card className="border border-border">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">#{candidate.rank}</p>
            <h3 className="text-lg font-bold">{candidate.name}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <Badge variant="outline" className="text-xs">{candidate.main_niche}</Badge>
              {candidate.platforms.map(p => (
                <Badge key={p} variant="secondary" className={`text-xs ${p === candidate.primary_platform ? 'bg-primary text-primary-foreground' : ''}`}>
                  {PLATFORM_ICONS[p] ?? p}
                </Badge>
              ))}
            </div>
          </div>
          <ScoreCircle score={candidate.score} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Followers</p>
            <p className="font-semibold">{formatNumber(candidate.total_followers)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Engagement</p>
            <p className="font-semibold">{candidate.avg_engagement_rate.toFixed(2)}%</p>
          </div>
        </div>

        <KolScoreBreakdownBars breakdown={candidate.score_breakdown} />

        <Separator />

        {/* explanation arrives as a markdown string (websocket / backend) or, in v2,
            a structured object with full_report_md — handle both. */}
        {(() => {
          const exp = candidate.explanation as unknown
          const md = typeof exp === 'string' ? exp : (exp as { full_report_md?: string } | null)?.full_report_md
          return md ? renderMarkdown(md) : null
        })()}
      </CardContent>
    </Card>
  )
}
