'use client'

import { useState } from 'react'
import type { MatchResponse } from '@/lib/data/types'
import PageHeader from '@/components/layout/PageHeader'
import BriefForm from '@/components/match-engine/BriefForm'
import CandidateCard from '@/components/match-engine/CandidateCard'
import { MatchResultsSkeleton } from '@/components/shared/PageSkeleton'
import { Separator } from '@/components/ui/separator'

export default function MatchEnginePage() {
  const [result, setResult] = useState<MatchResponse | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Match Engine"
        description="AI-powered director matching — fill in your campaign brief to get a shortlist of best-fit directors."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div>
          <BriefForm
            onResult={data => {
              setResult(data)
              setLoading(false)
            }}
            onLoading={setLoading}
          />
        </div>

        {/* Results */}
        <div>
          {loading && <MatchResultsSkeleton />}

          {!loading && result && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {result.total_candidates_considered} candidates considered
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.response_time_ms?.toFixed(0)}ms
                </p>
              </div>

              {result.brief_summary && (
                <p className="text-sm border-l-2 border-black pl-3 text-muted-foreground italic">
                  {result.brief_summary}
                </p>
              )}

              <Separator />

              {result.shortlist.map(candidate => (
                <CandidateCard key={candidate.rank} candidate={candidate} />
              ))}
            </div>
          )}

          {!loading && !result && (
            <div className="flex items-center justify-center h-48 border border-dashed rounded-lg text-muted-foreground text-sm">
              Submit a brief to see matching results
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
