'use client'

import { useEffect, useRef, useState } from 'react'
import type { KolBriefRequest, KolMatchResponse } from '@/lib/data/types'
import PageHeader from '@/components/layout/PageHeader'
import KolBriefForm from '@/components/match-engine/KolBriefForm'
import KolCandidateCard from '@/components/match-engine/KolCandidateCard'
import KolPipelineCarousel from '@/components/match-engine/KolPipelineCarousel'
import KolAvatar from '@/components/match-engine/KolAvatar'
import { formatNumber } from '@/lib/utils/formatters'
import { useKolMatchStream } from '@/hooks/useKolMatchStream'

export default function KolEnginePage() {
  const { status, stages, candidates, result, error, meta, run } = useKolMatchStream()
  const [restored, setRestored] = useState<KolMatchResponse | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [runKey, setRunKey] = useState(0) // bump per run → remounts carousel so it replays
  const resultsRef = useRef<HTMLDivElement>(null) // carousel scrolls here when done

  // Restore the last result on mount (so a refresh keeps the view).
  useEffect(() => {
    const saved = localStorage.getItem('kol_engine_result')
    if (saved) {
      try {
        setRestored(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse saved KOL engine results:', e)
      }
    }
  }, [])

  // Persist the completed result.
  useEffect(() => {
    if (result) localStorage.setItem('kol_engine_result', JSON.stringify(result))
  }, [result])

  const handleSubmit = (brief: KolBriefRequest) => {
    setActiveIdx(0)
    setRunKey(k => k + 1) // force the carousel to remount and autoplay from Layer 1
    setRestored(null) // drop the old saved view as soon as a new run starts
    run(brief)
  }

  const loading = status === 'connecting' || status === 'streaming'
  const active = result ?? restored

  // Once complete, prefer the full pipeline (it carries Layer 3, which only
  // streams as `candidate` events live). Otherwise show the incremental live
  // stages, falling back to a restored result.
  const stagesToShow = active?.pipeline?.length ? active.pipeline : stages
  const cards = candidates.length ? candidates : active?.shortlist ?? []
  const totalConsidered = meta?.total ?? active?.total_candidates_considered ?? 0
  const briefSummary = result?.brief_summary ?? active?.brief_summary ?? ''
  const responseMs = result?.response_time_ms ?? active?.response_time_ms
  const hasOutput = stagesToShow.length > 0 || cards.length > 0
  const safeIdx = Math.min(activeIdx, Math.max(0, cards.length - 1))

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="KOL Match Engine"
        description="AI-powered KOL matching — fill in your campaign brief to watch each layer work and get a shortlist of best-fit KOLs."
      />

      <div className="flex flex-col gap-8">
        <KolBriefForm onSubmit={handleSubmit} loading={loading} error={error} />

        <div className="flex flex-col gap-6">
          {!hasOutput && !loading && (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Submit a brief to watch the matching pipeline run
            </div>
          )}

          {(hasOutput || loading) && (
            <div className="flex items-end justify-between px-1">
              <div>
                <p className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-l1">
                  <span className="h-2 w-2 rounded-full bg-l1 status-pulse" /> Engine Status
                </p>
                <h2 className="text-2xl font-bold leading-tight">{loading ? 'Matching…' : 'Matched'}</h2>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {totalConsidered.toLocaleString()} candidates considered
                  {responseMs ? ` (${(responseMs / 1000).toFixed(1)}s)` : ''}
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-primary">{cards.length}</span>
                <p className="text-xs text-muted-foreground">Shortlisted KOLs</p>
              </div>
            </div>
          )}

          {/* Pipeline — neon carousel walking through Layer 1 → 2 → 3 */}
          {(loading || stagesToShow.length > 0) && (
            <KolPipelineCarousel
              key={runKey}
              stages={stagesToShow}
              autoplay={loading}
              loading={loading}
              onComplete={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
          )}

          {briefSummary && (
            <p className="border-l-2 border-primary pl-3 text-sm italic text-muted-foreground">{briefSummary}</p>
          )}

          {/* Shortlist: a horizontal gallery to pick from, detail card below */}
          {cards.length > 0 && (
            <div ref={resultsRef} className="flex scroll-mt-6 flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Shortlisted KOLs</h3>
                <span className="text-sm text-muted-foreground">
                  {cards.length} candidates{status === 'streaming' ? ' (streaming…)' : ''}
                </span>
              </div>

              {/* Photo-forward cards — click one to load its full report below */}
              <div className="flex gap-4 overflow-x-auto pb-2">
                {cards.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`group min-w-[240px] overflow-hidden rounded-xl text-left transition-all ${
                      idx === safeIdx
                        ? 'glass-card glow-l3 ring-2 ring-primary'
                        : 'glass-card opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="relative h-44">
                      <KolAvatar name={c.name} rounded="rounded-none" className="h-44 w-full text-4xl" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121314] to-transparent" />
                      <span className="absolute right-2 top-2 rounded bg-primary px-2 py-0.5 text-xs font-black text-white shadow-[0_0_12px_rgba(254,44,85,0.5)]">
                        {c.score.toFixed(0)}
                      </span>
                      <span className="absolute left-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm">
                        #{c.rank}
                      </span>
                    </div>
                    <div className="p-3">
                      <h4 className="truncate font-bold">{c.name}</h4>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.main_niche} • {formatNumber(c.total_followers)} followers
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Full report for the selected candidate */}
              <div
                key={safeIdx}
                className="animate-in fade-in slide-in-from-bottom-2 transition-all duration-300 ease-in-out"
              >
                <KolCandidateCard candidate={cards[safeIdx]} />
              </div>
            </div>
          )}

          {error && (
            <p className="rounded border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
