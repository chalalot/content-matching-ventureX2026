import type { CandidateResult } from '@/lib/data/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import ScoreBreakdown from './ScoreBreakdown'
import { isAvailableStatus } from '@/lib/data/status'

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

function parseBoldText(text: string) {
  const parts = text.split('**')
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part}
        </strong>
      )
    }
    return part
  })
}

function renderMarkdown(content: string) {
  if (!content) return null

  const lines = content.split('\n')
  return (
    <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return null

        // Headings (##, ###)
        if (trimmed.startsWith('## ')) {
          return (
            <h4 key={i} className="text-sm font-bold text-foreground mt-4 mb-2">
              {parseBoldText(trimmed.slice(3))}
            </h4>
          )
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h5 key={i} className="text-xs font-bold text-foreground mt-3 mb-1">
              {parseBoldText(trimmed.slice(4))}
            </h5>
          )
        }

        // List item (- or *)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <ul key={i} className="list-disc pl-4 my-1">
              <li className="text-sm">
                {parseBoldText(trimmed.slice(2))}
              </li>
            </ul>
          )
        }

        // Regular paragraph
        return (
          <p key={i} className="my-1">
            {parseBoldText(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
  const isAvailable = isAvailableStatus(candidate.availability_status)

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

        {candidate.explanation && renderMarkdown(candidate.explanation)}

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
