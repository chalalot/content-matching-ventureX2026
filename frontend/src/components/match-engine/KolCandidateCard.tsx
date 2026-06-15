'use client'

import { useState } from 'react'
import type { KolCandidateResult, KolScoreBreakdown, KolExplanation } from '@/lib/data/types'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatNumber } from '@/lib/utils/formatters'
import { Check, AlertTriangle, ShieldAlert, ShieldCheck, Lightbulb, ChevronDown, ExternalLink } from 'lucide-react'

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

// fit_label → semantic color tokens (defined in globals.css)
const FIT_TIER: Record<string, { text: string; bg: string; border: string }> = {
  'Strong fit':  { text: 'text-good', bg: 'bg-good-bg', border: 'border-good-border' },
  'Partial fit': { text: 'text-warn', bg: 'bg-warn-bg', border: 'border-warn-border' },
  'Weak fit':    { text: 'text-risk', bg: 'bg-risk-bg', border: 'border-risk-border' },
}
function fitTier(label: string) {
  return FIT_TIER[label] ?? { text: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' }
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
  // Normalize each dimension to % of its own max so the polygon shape reflects
  // how well-matched each dimension is (a full heptagon = perfect on all 7).
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
      <p className="text-center text-[11px] text-muted-foreground">Fit by dimension (% of each max)</p>
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

function BulletBox({ title, items, icon, tone }: {
  title: string
  items: string[]
  icon: React.ReactNode
  tone: { text: string; bg: string; border: string }
}) {
  if (!items?.length) return null
  return (
    <div className={`rounded-lg border ${tone.border} ${tone.bg} p-3`}>
      <div className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold ${tone.text}`}>
        {icon} {title}
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((x, i) => (
          <li key={i} className="text-xs leading-snug text-foreground/90">{x}</li>
        ))}
      </ul>
    </div>
  )
}

const GOOD = { text: 'text-good', bg: 'bg-good-bg', border: 'border-good-border' }
const WARN = { text: 'text-warn', bg: 'bg-warn-bg', border: 'border-warn-border' }
const RISK = { text: 'text-risk', bg: 'bg-risk-bg', border: 'border-risk-border' }
const INFO = { text: 'text-info', bg: 'bg-info-bg', border: 'border-info-border' }

function ExplanationView({ ex }: { ex: KolExplanation }) {
  const [open, setOpen] = useState(false)
  const tier = fitTier(ex.fit_label)
  const dramas = ex.recent_dramas ?? []
  const sources = ex.sources ?? []
  const hasDetail = !!ex.full_report_md || sources.length > 0 || !!ex.reasoning_log

  return (
    <div className="flex flex-col gap-3">
      {/* Verdict */}
      <div className={`rounded-lg border ${tier.border} ${tier.bg} p-3`}>
        <div className="flex items-center gap-2">
          <span className={`rounded-full bg-background/40 px-2 py-0.5 text-xs font-bold ${tier.text}`}>{ex.fit_label}</span>
          {ex.fit_score > 0 && <span className={`font-mono text-sm font-bold ${tier.text}`}>{ex.fit_score.toFixed(1)}/10</span>}
        </div>
        {ex.headline && <p className="mt-1.5 text-sm font-medium">{ex.headline}</p>}
        {ex.brief_recap && <p className="mt-0.5 text-[11px] text-muted-foreground">{ex.brief_recap}</p>}
      </div>

      {/* Why it fits / Watch-outs */}
      {(ex.why_good?.length || ex.why_not_good?.length) ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BulletBox title="Why it fits" items={ex.why_good ?? []} icon={<Check className="h-3.5 w-3.5" />} tone={GOOD} />
          <BulletBox title="Watch-outs" items={ex.why_not_good ?? []} icon={<AlertTriangle className="h-3.5 w-3.5" />} tone={WARN} />
        </div>
      ) : null}

      {/* Red flags */}
      {dramas.length > 0 ? (
        <BulletBox title="Recent red flags" items={dramas} icon={<ShieldAlert className="h-3.5 w-3.5" />} tone={RISK} />
      ) : (
        <div className="flex items-center gap-1.5 rounded-lg border border-good-border bg-good-bg p-2.5 text-xs font-medium text-good">
          <ShieldCheck className="h-3.5 w-3.5" /> No recent red flags found
        </div>
      )}

      {/* Recommendations */}
      <BulletBox title="Recommendations" items={ex.recommendations ?? []} icon={<Lightbulb className="h-3.5 w-3.5" />} tone={INFO} />

      {/* Expandable: full report + sources + research log */}
      {hasDetail && (
        <div>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            {open ? 'Hide' : 'Show'} full report &amp; sources
          </button>
          {open && (
            <div className="mt-2 flex flex-col gap-3">
              {ex.full_report_md && renderMarkdown(ex.full_report_md)}
              {sources.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold">Sources</p>
                  <ul className="flex flex-col gap-1">
                    {sources.map((s, i) => (
                      <li key={i}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-info hover:underline"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.title || s.url}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ex.reasoning_log && (
                <div>
                  <p className="mb-1 text-xs font-semibold">AI research log</p>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {ex.reasoning_log}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function KolCandidateCard({ candidate }: KolCandidateCardProps) {
  // explanation is a structured KolExplanation; tolerate a legacy string (old cached results).
  const ex = candidate.explanation as KolExplanation | string | undefined

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

        <KolScoreRadar breakdown={candidate.score_breakdown} />

        <Separator />

        {ex && (typeof ex === 'string' ? renderMarkdown(ex) : <ExplanationView ex={ex} />)}
      </CardContent>
    </Card>
  )
}
