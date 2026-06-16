'use client'

import type { KolCandidateResult, KolExplanation, KolScoreBreakdown } from '@/lib/data/types'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatNumber } from '@/lib/utils/formatters'
import { Terminal, ThumbsUp, ThumbsDown, ShieldAlert, ShieldCheck, Gavel, ArrowRight } from 'lucide-react'

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

// Verdict badge derived from the match score (≥70 strong · 50–69 consider · <50 mismatch).
function getVerdict(score: number) {
  if (score >= 70) return { label: 'STRONG FIT', sub: 'NÊN HỢP TÁC', cls: 'bg-[#25F4EE] text-black' }
  if (score >= 50) return { label: 'CONSIDER', sub: 'CÂN NHẮC', cls: 'bg-amber-400 text-black' }
  return { label: 'MISMATCH', sub: 'KHÔNG NÊN', cls: 'bg-[#FE2C55] text-white' }
}

// Stale localStorage may still hold a plain-string explanation — normalize either way.
function normalizeExplanation(exp: unknown): KolExplanation {
  if (exp && typeof exp === 'object') {
    const e = exp as Partial<KolExplanation>
    return {
      brief_summary: e.brief_summary ?? '',
      why_good: e.why_good ?? [],
      why_not_good: e.why_not_good ?? [],
      recent_dramas: e.recent_dramas ?? [],
      recommendations: e.recommendations ?? [],
    }
  }
  return { brief_summary: typeof exp === 'string' ? exp : '', why_good: [], why_not_good: [], recent_dramas: [], recommendations: [] }
}

function ScoreCircle({ score }: { score: number }) {
  const size = score >= 70 ? 'w-14 h-14 text-base border-4' : score >= 50 ? 'w-12 h-12 text-sm border-2' : 'w-10 h-10 text-xs border'
  return (
    <div className={`${size} rounded-full border-primary flex items-center justify-center font-bold shrink-0`}>
      {score.toFixed(0)}
    </div>
  )
}

function KolScoreRadar({ breakdown }: { breakdown: KolScoreBreakdown }) {
  const data = (Object.entries(SCORE_LABELS) as [keyof KolScoreBreakdown, [string, number]][]).map(
    ([key, [label, max]]) => ({
      dim: label,
      pct: max > 0 ? Math.round(((breakdown[key] ?? 0) / max) * 100) : 0,
    })
  )
  return (
    <div className="mt-1">
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="dim" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
          <Radar dataKey="pct" stroke="#FE2C55" fill="#FE2C55" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-center text-[11px] text-muted-foreground">Độ phù hợp theo từng tiêu chí (% của điểm tối đa)</p>
    </div>
  )
}

// A titled section that renders a list of one-line bullets.
function BulletSection({
  title,
  icon,
  accent,
  items,
}: {
  title: string
  icon: React.ReactNode
  accent: string
  items: string[]
}) {
  if (!items.length) return null
  return (
    <div className="flex flex-col gap-2">
      <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <span className={accent}>{icon}</span>
        {title}
      </h4>
      <ul className="flex flex-col gap-1.5 pl-1">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${accent.replace('text-', 'bg-')}`} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function KolCandidateCard({ candidate }: KolCandidateCardProps) {
  const verdict = getVerdict(candidate.score)
  const exp = normalizeExplanation(candidate.explanation)

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
          <div className="flex flex-col items-end gap-2">
            <ScoreCircle score={candidate.score} />
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${verdict.cls}`}>
              {verdict.label}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
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

        <KolScoreRadar breakdown={candidate.score_breakdown} />

        <Separator />

        {/* Exec summary — "terminal" style block */}
        {exp.brief_summary && (
          <div className="rounded-lg border border-border border-l-4 border-l-[#25F4EE] bg-muted/40 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground">
              <Terminal className="h-3.5 w-3.5 text-[#25F4EE]" />
              TÓM TẮT ĐÁNH GIÁ
            </p>
            <p className="text-sm leading-relaxed text-foreground">{exp.brief_summary}</p>
          </div>
        )}

        <BulletSection
          title="Điểm mạnh & phù hợp"
          icon={<ThumbsUp className="h-4 w-4" />}
          accent="text-[#25F4EE]"
          items={exp.why_good}
        />

        <BulletSection
          title="Rủi ro & hạn chế"
          icon={<ThumbsDown className="h-4 w-4" />}
          accent="text-amber-500"
          items={exp.why_not_good}
        />

        {/* Background check / risk radar */}
        <div className="flex flex-col gap-2">
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShieldAlert className="h-4 w-4 text-[#FE2C55]" />
            Kiểm tra rủi ro (scandal/lùm xùm)
          </h4>
          {exp.recent_dramas.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-lg border border-[#FE2C55]/30 bg-[#FE2C55]/5 p-3">
              {exp.recent_dramas.map((d, i) => (
                <p key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#FE2C55]" />
                  <span>{d}</span>
                </p>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-600">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Không phát hiện red flag đáng kể.
            </p>
          )}
        </div>

        {/* Strategic verdict + recommendations */}
        {exp.recommendations.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className={`flex items-center justify-between px-3 py-2 ${verdict.cls}`}>
              <span className="flex items-center gap-1.5 text-sm font-black tracking-tight">
                <Gavel className="h-4 w-4" />
                ĐỀ XUẤT CHIẾN LƯỢC
              </span>
              <span className="rounded bg-black/20 px-2 py-0.5 text-[10px] font-bold">{verdict.sub}</span>
            </div>
            <ul className="flex flex-col gap-2 p-3">
              {exp.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#25F4EE]" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
