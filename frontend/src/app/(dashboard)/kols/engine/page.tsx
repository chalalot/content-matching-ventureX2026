'use client'

import { useEffect, useState } from 'react'
import type { KolBriefRequest, KolMatchResponse } from '@/lib/data/types'
import PageHeader from '@/components/layout/PageHeader'
import KolBriefForm from '@/components/match-engine/KolBriefForm'
import KolCandidateCard from '@/components/match-engine/KolCandidateCard'
import KolPipelineView from '@/components/match-engine/KolPipelineView'
import { MatchResultsSkeleton } from '@/components/shared/PageSkeleton'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useKolMatchStream } from '@/hooks/useKolMatchStream'

export default function KolEnginePage() {
  const { status, stages, candidates, result, error, meta, run } = useKolMatchStream()
  const [restored, setRestored] = useState<KolMatchResponse | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)

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
    setRestored(null) // drop the old saved view as soon as a new run starts
    run(brief)
  }

  const loading = status === 'connecting' || status === 'streaming'
  const active = result ?? restored

  // Prefer live stream data; fall back to the restored/completed result.
  const stagesToShow = stages.length ? stages : active?.pipeline ?? []
  const cards = candidates.length ? candidates : active?.shortlist ?? []
  const totalConsidered = meta?.total ?? active?.total_candidates_considered ?? 0
  const briefSummary = result?.brief_summary ?? active?.brief_summary ?? ''
  const responseMs = result?.response_time_ms ?? active?.response_time_ms
  const hasOutput = stagesToShow.length > 0 || cards.length > 0
  const safeIdx = Math.min(activeIdx, Math.max(0, cards.length - 1))

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="KOL Match Engine"
        description="AI-powered KOL matching — fill in your campaign brief to watch each layer work and get a shortlist of best-fit KOLs."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <KolBriefForm onSubmit={handleSubmit} loading={loading} error={error} />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-8">
          {!hasOutput && !loading && (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Submit a brief to watch the matching pipeline run
            </div>
          )}

          {(hasOutput || loading) && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {loading ? 'Matching…' : `${totalConsidered} candidates considered`}
              </p>
              {responseMs ? (
                <p className="text-xs text-muted-foreground">{(responseMs / 1000).toFixed(1)}s</p>
              ) : null}
            </div>
          )}

          {/* Pipeline — Layer 1 & 2 fill in live, then Layer 3 */}
          {stagesToShow.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Pipeline</h3>
              <KolPipelineView stages={stagesToShow} />
            </div>
          )}

          {/* Before the first stage arrives */}
          {loading && stagesToShow.length === 0 && <MatchResultsSkeleton />}

          {briefSummary && (
            <p className="border-l-2 border-primary pl-3 text-sm italic text-muted-foreground">{briefSummary}</p>
          )}

          {/* Shortlist carousel */}
          {cards.length > 0 && (
            <div className="flex flex-col gap-4">
              <Separator />
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Candidate {safeIdx + 1} of {cards.length}
                  {status === 'streaming' ? ' (streaming…)' : ''}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full shadow-sm hover:bg-accent"
                    onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
                    disabled={safeIdx === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full shadow-sm hover:bg-accent"
                    onClick={() => setActiveIdx(prev => Math.min(cards.length - 1, prev + 1))}
                    disabled={safeIdx >= cards.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div
                key={safeIdx}
                className="animate-in fade-in slide-in-from-right-4 transition-all duration-300 ease-in-out"
              >
                <KolCandidateCard candidate={cards[safeIdx]} />
              </div>

              <div className="mt-2 flex justify-center gap-1.5">
                {cards.map((_, idx) => (
                  <button
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === safeIdx ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                    }`}
                    onClick={() => setActiveIdx(idx)}
                    title={`Go to candidate ${idx + 1}`}
                  />
                ))}
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
