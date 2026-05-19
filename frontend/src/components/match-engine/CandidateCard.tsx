import type { CandidateResult } from '@/lib/data/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import ScoreBreakdown from './ScoreBreakdown'

interface CandidateCardProps {
  candidate: CandidateResult
}

function ScoreCircle({ score }: { score: number }) {
  const size = score >= 70 ? 'w-14 h-14 text-base border-4' : score >= 50 ? 'w-12 h-12 text-sm border-2' : 'w-10 h-10 text-xs border'
  return (
    <div
      className={`${size} rounded-full border-black flex items-center justify-center font-bold shrink-0`}
    >
      {score.toFixed(0)}
    </div>
  )
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
  const isAvailable = candidate.availability_status === 'available'

  return (
    <Card className="border border-border">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">#{candidate.rank}</p>
            <h3 className="text-lg font-bold">{candidate.name}</h3>
            <Badge
              variant={isAvailable ? 'default' : 'secondary'}
              className={`mt-1 text-xs ${isAvailable ? 'bg-black text-white' : 'bg-muted text-muted-foreground'}`}
            >
              {isAvailable
                ? `Available · từ ${candidate.available_from ?? 'now'}`
                : 'Booked'}
            </Badge>
          </div>
          <ScoreCircle score={candidate.score} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <ScoreBreakdown breakdown={candidate.score_breakdown} />

        <Separator />

        {candidate.explanation && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {candidate.explanation}
          </p>
        )}

        {candidate.collaboration_style && (
          <p className="text-xs text-muted-foreground italic">
            Style: {candidate.collaboration_style}
          </p>
        )}

        {candidate.notable_brands && candidate.notable_brands.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {candidate.notable_brands.map(brand => (
              <Badge key={brand} variant="outline" className="text-xs">
                {brand}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
