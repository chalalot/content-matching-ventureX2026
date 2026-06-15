'use client'

import { Fragment, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { PipelineStage, StageCandidate } from '@/lib/data/types'

// Per-layer accents (literal strings so Tailwind's scanner keeps them).
const LAYER_META: Record<number, { tag: string; text: string; chip: string }> = {
  1: { tag: 'Layer 1', text: 'text-l1', chip: 'bg-l1' },
  2: { tag: 'Layer 2', text: 'text-l2', chip: 'bg-l2' },
  3: { tag: 'Layer 3', text: 'text-l3', chip: 'bg-l3' },
}

const REASON_LABELS: Record<string, string> = {
  wrong_platform: 'wrong platform',
  empty_record: 'empty profile',
  over_budget: 'over budget',
  audience_mismatch: 'audience mismatch',
  low_score: 'below cut',
}

// Layer-2 scoring dimensions (label + max points), matching backend KolScoreBreakdown.
const L2_DIMS: { key: string; label: string; max: number }[] = [
  { key: 'niche_match', label: 'Niche', max: 25 },
  { key: 'platform_match', label: 'Platform', max: 20 },
  { key: 'audience_fit', label: 'Audience', max: 20 },
  { key: 'engagement', label: 'Engagement', max: 15 },
  { key: 'reach', label: 'Reach', max: 10 },
  { key: 'budget_fit', label: 'Budget', max: 5 },
  { key: 'availability', label: 'Available', max: 5 },
]

const ROW_ANIM = 'animate-in fade-in slide-in-from-bottom-1 duration-300'
const rowDelay = (i: number) => ({ animationDelay: `${i * 45}ms`, animationFillMode: 'backwards' as const })

function initials(name: string): string {
  const clean = name.replace(/^@/, '').trim()
  if (!clean) return '?'
  const parts = clean.split(/\s+/)
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : clean.slice(0, 2)).toUpperCase()
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
      {initials(name)}
    </div>
  )
}

/* ── Funnel band: the L1 → L2 → L3 overview ─────────────────────────── */
function FunnelBand({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      {stages.map((s, i) => {
        const m = LAYER_META[s.layer] ?? LAYER_META[1]
        return (
          <Fragment key={s.id}>
            <div
              className={`flex-1 rounded-xl border border-border bg-card p-4 ${ROW_ANIM} duration-500`}
              style={{ animationDelay: `${i * 140}ms`, animationFillMode: 'backwards' }}
            >
              <div className={`text-[10.5px] font-bold uppercase tracking-wider ${m.text}`}>{m.tag}</div>
              <div className="mt-0.5 text-sm font-semibold">{s.name}</div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight">
                {s.out_count}
                <span className="text-sm font-medium text-muted-foreground"> / {s.in_count}</span>
              </div>
              <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{s.method}</div>
            </div>
            {i < stages.length - 1 && (
              <div className="hidden items-center justify-center px-1 text-lg text-muted-foreground/40 sm:flex">→</div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

/* ── Shared section shell ───────────────────────────────────────────── */
function LayerCard({ stage, subtitle, hint, children }: {
  stage: PipelineStage
  subtitle: string
  hint?: string
  children: React.ReactNode
}) {
  const m = LAYER_META[stage.layer] ?? LAYER_META[1]
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-4 ${ROW_ANIM} duration-500`}
      style={{ animationDelay: `${(stage.layer - 1) * 150}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-2.5">
        <div className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white ${m.chip}`}>
          {stage.layer}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold leading-tight">{stage.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
        {hint && <div className="ml-auto hidden text-[10.5px] text-muted-foreground sm:block">{hint}</div>}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

function MoreRow({ count }: { count: number }) {
  return <div className="py-1 text-center text-[11px] text-muted-foreground">+ {count} more</div>
}

/* ── Layer 1: relevance ranking ─────────────────────────────────────── */
function Layer1Rows({ stage }: { stage: PipelineStage }) {
  const shown = stage.candidates.slice(0, 8)
  const more = stage.candidates.length - shown.length
  if (!shown.length) return <div className="py-3 text-center text-[11px] text-muted-foreground">waiting…</div>
  return (
    <>
      {shown.map((c, i) => {
        const pct = Math.round((c.metric ?? 0) * 100)
        return (
          <div
            key={c.kol_id}
            className={`flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 ${ROW_ANIM}`}
            style={rowDelay(i)}
          >
            <span className="w-5 shrink-0 text-center text-[11px] font-bold text-muted-foreground">{c.rank}</span>
            <Avatar name={c.name} />
            <span className="flex-1 truncate text-sm font-medium">{c.name || '—'}</span>
            <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block">
              <div className="h-full rounded-full bg-l1" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
              {c.metric != null ? c.metric.toFixed(2) : ''}
            </span>
          </div>
        )
      })}
      {more > 0 && <MoreRow count={more} />}
    </>
  )
}

/* ── Layer 2: scoring — expandable rows reveal the per-dimension breakdown ── */
function BreakdownBars({ breakdown }: { breakdown: Record<string, number> }) {
  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      {L2_DIMS.filter(d => d.key in breakdown).map(d => {
        const v = breakdown[d.key] ?? 0
        const pct = d.max > 0 ? (v / d.max) * 100 : 0
        return (
          <div key={d.key} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-[11px] text-muted-foreground">{d.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#25F4EE] to-[#FE2C55]"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums">{v}/{d.max}</span>
          </div>
        )
      })}
    </div>
  )
}

function Layer2Row({ c, i }: { c: StageCandidate; i: number }) {
  const [open, setOpen] = useState(false)
  const dropped = c.status === 'dropped' || c.status === 'filtered'
  const canExpand = !!c.breakdown
  return (
    <div className={ROW_ANIM} style={rowDelay(i)}>
      <button
        type="button"
        onClick={() => canExpand && setOpen(o => !o)}
        className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
          dropped ? 'border-dashed border-border bg-muted/40' : 'border-border bg-card hover:bg-accent'
        } ${canExpand ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {c.rank != null ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-l2/15 text-[10px] font-bold text-l2">
            {c.rank}
          </span>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <Avatar name={c.name} />
        <span className={`flex-1 truncate text-sm ${dropped ? 'font-medium text-muted-foreground line-through' : 'font-semibold'}`}>
          {c.name || '—'}
        </span>
        {dropped && c.reason && (
          <span className="shrink-0 rounded-full bg-risk-bg px-1.5 py-0.5 text-[10px] font-medium text-risk">
            {REASON_LABELS[c.reason] ?? c.reason}
          </span>
        )}
        <span className={`shrink-0 font-mono text-xs font-bold ${dropped ? 'text-muted-foreground' : 'text-foreground'}`}>
          {c.metric != null ? Math.round(c.metric) : '–'}
          <span className="text-[10px] font-normal text-muted-foreground"> pts</span>
        </span>
        {canExpand && (
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && c.breakdown && <BreakdownBars breakdown={c.breakdown} />}
    </div>
  )
}

function Layer2Rows({ stage }: { stage: PipelineStage }) {
  const shortlisted = stage.candidates.filter(c => c.status === 'shortlisted')
  const dropped = stage.candidates.filter(c => c.status === 'dropped' || c.status === 'filtered')
  const shownDropped = dropped.slice(0, 3)
  const moreDropped = dropped.length - shownDropped.length
  const rows = [...shortlisted, ...shownDropped]
  if (!rows.length) return <div className="py-3 text-center text-[11px] text-muted-foreground">waiting…</div>
  return (
    <>
      {rows.map((c, i) => <Layer2Row key={c.kol_id} c={c} i={i} />)}
      {moreDropped > 0 && <MoreRow count={moreDropped} />}
    </>
  )
}

/* ── Layer 3: explanation (compact) ─────────────────────────────────── */
function Layer3Rows({ stage }: { stage: PipelineStage }) {
  if (!stage.candidates.length) return <div className="py-3 text-center text-[11px] text-muted-foreground">waiting…</div>
  return (
    <>
      {stage.candidates.map((c, i) => (
        <div
          key={c.kol_id}
          className={`flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 ${ROW_ANIM}`}
          style={rowDelay(i)}
        >
          <Avatar name={c.name} />
          <span className="flex-1 truncate text-sm font-medium">{c.name || '—'}</span>
          <span className="shrink-0 rounded-full bg-l3/15 px-1.5 py-0.5 text-[10px] font-medium text-l3">explained</span>
        </div>
      ))}
    </>
  )
}

/** Per-layer pipeline view: funnel overview + readable, animated stage sections. */
export default function KolPipelineView({ stages }: { stages: PipelineStage[] }) {
  if (!stages.length) return null
  const ordered = [...stages].sort((a, b) => a.layer - b.layer)
  return (
    <div className="flex flex-col gap-4">
      <FunnelBand stages={ordered} />
      {ordered.map(stage => {
        if (stage.layer === 1) {
          return (
            <LayerCard key={stage.id} stage={stage} subtitle={`${stage.out_count} candidates ranked by relevance`}>
              <Layer1Rows stage={stage} />
            </LayerCard>
          )
        }
        if (stage.layer === 2) {
          return (
            <LayerCard
              key={stage.id}
              stage={stage}
              subtitle={`top ${stage.out_count} shortlisted · ${Math.max(0, stage.in_count - stage.out_count)} below cut`}
              hint="tap a row to see how it scored"
            >
              <Layer2Rows stage={stage} />
            </LayerCard>
          )
        }
        return (
          <LayerCard key={stage.id} stage={stage} subtitle={`${stage.out_count} explained by AI`}>
            <Layer3Rows stage={stage} />
          </LayerCard>
        )
      })}
    </div>
  )
}
