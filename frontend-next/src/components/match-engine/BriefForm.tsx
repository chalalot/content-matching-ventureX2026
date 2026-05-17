'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { matchDirectors } from '@/lib/api/client'
import type { BriefRequest, MatchResponse } from '@/lib/data/types'
import { formatUSD } from '@/lib/utils/formatters'

const INDUSTRIES = [
  'FMCG', 'F&B', 'Fashion', 'Banking', 'Insurance',
  'Healthcare', 'Tech', 'Beauty', 'Automotive', 'Entertainment',
]

const CAMPAIGN_TYPES = [
  { value: 'TVC', label: 'TVC' },
  { value: 'digital_content', label: 'Digital Content' },
  { value: 'social_media_content', label: 'Social Media Content' },
  { value: 'music_video', label: 'Music Video' },
  { value: 'corporate_video', label: 'Corporate Video' },
]

const TONES = [
  { value: 'emotional_storytelling', label: 'Emotional Storytelling' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'comedic', label: 'Comedic' },
  { value: 'bold_graphic', label: 'Bold Graphic' },
  { value: 'documentary_realism', label: 'Documentary Realism' },
  { value: 'premium_brand', label: 'Premium Brand' },
]

interface BriefFormProps {
  onResult: (result: MatchResponse) => void
  onLoading: (loading: boolean) => void
}

export default function BriefForm({ onResult, onLoading }: BriefFormProps) {
  const [brand, setBrand] = useState('')
  const [industry, setIndustry] = useState('')
  const [campaignType, setCampaignType] = useState('')
  const [tone, setTone] = useState('')
  const [budgetUsd, setBudgetUsd] = useState(50000)
  const [timelineWeeks, setTimelineWeeks] = useState(6)
  const [description, setDescription] = useState('')
  const [topN, setTopN] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = brand.trim().length > 0 && description.trim().length >= 30 && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    const brief: BriefRequest = {
      brand: brand.trim(),
      industry,
      campaign_type: campaignType,
      tone,
      budget_usd: budgetUsd,
      timeline_weeks: timelineWeeks,
      description: description.trim(),
      top_n: topN,
    }

    setLoading(true)
    setError(null)
    onLoading(true)

    try {
      const result = await matchDirectors(brief)
      onResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      onLoading(false)
    }
  }

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="text-base">Campaign Brief</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Brand */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Brand *</label>
            <Input
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="e.g. Nike, Vinamilk"
            />
          </div>

          {/* Industry */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Industry</label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(i => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Campaign Type</label>
            <Select value={campaignType} onValueChange={setCampaignType}>
              <SelectTrigger>
                <SelectValue placeholder="Select campaign type" />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TYPES.map(ct => (
                  <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Tone</label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                {TONES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Budget: <span className="font-normal">{formatUSD(budgetUsd)}</span>
            </label>
            <Input
              type="number"
              value={budgetUsd}
              min={1000}
              max={250000}
              step={1000}
              onChange={e => setBudgetUsd(Number(e.target.value))}
              className="mb-2"
            />
            <Slider
              value={[budgetUsd]}
              min={1000}
              max={250000}
              step={1000}
              onValueChange={([v]) => setBudgetUsd(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$1K</span>
              <span>$250K</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Timeline: <span className="font-normal">{timelineWeeks} weeks</span>
            </label>
            <Slider
              value={[timelineWeeks]}
              min={2}
              max={12}
              step={1}
              onValueChange={([v]) => setTimelineWeeks(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2 weeks</span>
              <span>12 weeks</span>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Description * <span className="text-muted-foreground font-normal">(min 30 chars)</span>
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your campaign goals, target audience, key messages..."
              rows={4}
            />
            <p className={`text-xs ${description.length >= 30 ? 'text-muted-foreground' : 'text-gray-400'}`}>
              {description.length}/30 chars minimum
            </p>
          </div>

          {/* Top N */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Top N results: <span className="font-normal">{topN}</span>
            </label>
            <Slider
              value={[topN]}
              min={3}
              max={10}
              step={1}
              onValueChange={([v]) => setTopN(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3</span>
              <span>10</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isValid}
            className="w-full bg-black text-white hover:bg-gray-800"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Matching...
              </span>
            ) : (
              'Find Directors'
            )}
          </Button>

          {error && (
            <p className="text-sm text-red-600 border border-red-200 rounded p-2 bg-red-50">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
