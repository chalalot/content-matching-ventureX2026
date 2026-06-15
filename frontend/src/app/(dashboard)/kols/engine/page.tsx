'use client'

import { useState, useEffect, useRef } from 'react'
import type { KolBriefRequest, KolCandidateResult, KolMatchResponse } from '@/lib/data/types'
import { streamKolMatch } from '@/lib/api/client'
import PageHeader from '@/components/layout/PageHeader'
import KolBriefForm from '@/components/match-engine/KolBriefForm'
import KolCandidateCard from '@/components/match-engine/KolCandidateCard'
import KolMatchProgress, { type MatchPhase } from '@/components/match-engine/KolMatchProgress'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function KolEnginePage() {
  const [result, setResult] = useState<KolMatchResponse | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  // --- realtime streaming state ---
  const [streaming, setStreaming] = useState(false)
  const [phase, setPhase] = useState<MatchPhase>('searching')
  const [totalConsidered, setTotalConsidered] = useState<number | null>(null)
  const [topN, setTopN] = useState<number | null>(null)
  const [liveCandidates, setLiveCandidates] = useState<KolCandidateResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const cancelRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('kol_engine_result')
    if (saved) {
      try {
        setResult(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse saved KOL engine results:', e)
      }
    }
    // Close the socket if the user navigates away mid-stream.
    return () => cancelRef.current?.()
  }, [])

  function startMatch(brief: KolBriefRequest) {
    cancelRef.current?.() // cancel any in-flight stream

    setStreaming(true)
    setPhase('searching')
    setError(null)
    setResult(null)
    setLiveCandidates([])
    setTotalConsidered(null)
    setTopN(brief.top_n)
    setActiveIdx(0)

    cancelRef.current = streamKolMatch(brief, {
      onInit: (info) => {
        setTotalConsidered(info.total_candidates_considered)
        setTopN(info.top_n)
        setPhase('reasoning')
      },
      onCandidate: (candidate) => {
        setLiveCandidates((prev) => {
          const next = [...prev, candidate]
          setActiveIdx(next.length - 1) // jump to the freshly-arrived KOL
          return next
        })
      },
      onComplete: (final) => {
        setResult(final)
        setLiveCandidates(final.shortlist)
        setPhase('done')
        setStreaming(false)
        setActiveIdx(0)
        localStorage.setItem('kol_engine_result', JSON.stringify(final))
      },
      onError: (message) => {
        setError(message)
        setPhase('done')
        setStreaming(false)
      },
    })
  }

  // The carousel reads from the final result, or from live candidates while streaming.
  const shortlist = result ? result.shortlist : liveCandidates
  const safeIdx = Math.min(activeIdx, Math.max(0, shortlist.length - 1))

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="KOL Match Engine"
        description="AI-powered KOL matching — fill in your campaign brief to get a shortlist of best-fit KOLs."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <KolBriefForm onSubmit={startMatch} loading={streaming} error={error} />
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4">
          {streaming && (
            <KolMatchProgress
              phase={phase}
              totalConsidered={totalConsidered}
              topN={topN}
              analyzed={liveCandidates}
            />
          )}

          {shortlist.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {(result?.total_candidates_considered ?? totalConsidered ?? 0)} candidates considered
                </p>
                <p className="text-xs text-muted-foreground">
                  {result?.response_time_ms ? `${(result.response_time_ms / 1000).toFixed(1)}s` : ''}
                </p>
              </div>

              {result?.brief_summary && (
                <p className="text-sm border-l-2 border-primary pl-3 text-muted-foreground italic">
                  {result.brief_summary}
                </p>
              )}

              <Separator />

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Candidate {safeIdx + 1} of {shortlist.length}
                    {streaming && <span className="ml-2 text-xs text-muted-foreground">(live)</span>}
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
                      onClick={() => setActiveIdx(prev => Math.min(shortlist.length - 1, prev + 1))}
                      disabled={safeIdx === shortlist.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div key={safeIdx} className="transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-right-4">
                  <KolCandidateCard candidate={shortlist[safeIdx]} />
                </div>

                <div className="flex justify-center gap-1.5 mt-2">
                  {shortlist.map((_, idx) => (
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
            </div>
          )}

          {!streaming && shortlist.length === 0 && !error && (
            <div className="flex items-center justify-center h-48 border border-dashed rounded-lg text-muted-foreground text-sm">
              Submit a brief to see matching results
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
