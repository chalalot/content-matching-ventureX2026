'use client'

import { useState, useEffect } from 'react'
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
import { matchKols } from '@/lib/api/client'
import type { KolBriefRequest, KolMatchResponse } from '@/lib/data/types'
import { formatUSD } from '@/lib/utils/formatters'

const INDUSTRIES = [
  'FMCG', 'F&B', 'Fashion', 'Banking', 'Insurance',
  'Healthcare', 'Tech', 'Beauty', 'Automotive', 'Entertainment',
]

const NICHES = [
  'Beauty', 'Skincare', 'Fashion', 'Lifestyle', 'Food', 'Travel',
  'Gaming', 'Music', 'Fitness', 'Wellness', 'Comedy', 'Education',
  'Tech', 'Home Decor', 'Pet', 'Baby & Kids', 'Workwear', 'Travel Tech',
]

const PLATFORMS = [
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'FACEBOOK', label: 'Facebook' },
]

const AGE_GROUPS = [
  { value: '13-17', label: '13–17' },
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '18-34', label: '18–34 (broad)' },
  { value: '25-44', label: '25–44 (broad)' },
]

const CONTENT_FORMATS = [
  { value: 'product_review', label: 'Product Review' },
  { value: 'tutorial', label: 'Tutorial / How-To' },
  { value: 'vlog', label: 'Vlog' },
  { value: 'sponsored_post', label: 'Sponsored Post' },
  { value: 'live_stream', label: 'Live Stream' },
  { value: 'unboxing', label: 'Unboxing' },
]

interface KolBriefFormProps {
  onResult: (result: KolMatchResponse) => void
  onLoading: (loading: boolean) => void
}

export default function KolBriefForm({ onResult, onLoading }: KolBriefFormProps) {
  const [provider, setProvider] = useState('google')
  const [brand, setBrand] = useState('')
  const [industry, setIndustry] = useState('')
  const [targetNiche, setTargetNiche] = useState('')
  const [preferredPlatform, setPreferredPlatform] = useState('')
  const [targetAgeGroup, setTargetAgeGroup] = useState('')
  const [contentFormat, setContentFormat] = useState('')
  const [budgetUsd, setBudgetUsd] = useState(10000)
  const [timelineWeeks, setTimelineWeeks] = useState(4)
  const [description, setDescription] = useState('')
  const [topN, setTopN] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('kol_engine_form')
    if (saved) {
      try {
        const p = JSON.parse(saved)
        if (p.provider) setProvider(p.provider)
        if (p.brand) setBrand(p.brand)
        if (p.industry) setIndustry(p.industry)
        if (p.targetNiche) setTargetNiche(p.targetNiche)
        if (p.preferredPlatform) setPreferredPlatform(p.preferredPlatform)
        if (p.targetAgeGroup) setTargetAgeGroup(p.targetAgeGroup)
        if (p.contentFormat) setContentFormat(p.contentFormat)
        if (p.budgetUsd !== undefined) setBudgetUsd(p.budgetUsd)
        if (p.timelineWeeks !== undefined) setTimelineWeeks(p.timelineWeeks)
        if (p.description) setDescription(p.description)
        if (p.topN !== undefined) setTopN(p.topN)
      } catch (e) {
        console.error('Failed to parse saved KOL form draft:', e)
      }
    }
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    localStorage.setItem('kol_engine_form', JSON.stringify({
      provider, brand, industry, targetNiche, preferredPlatform,
      targetAgeGroup, contentFormat, budgetUsd, timelineWeeks, description, topN,
    }))
  }, [provider, brand, industry, targetNiche, preferredPlatform, targetAgeGroup, contentFormat, budgetUsd, timelineWeeks, description, topN, isMounted])

  const isValid = brand.trim().length > 0 && description.trim().length >= 30 && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    const brief: KolBriefRequest = {
      brand: brand.trim(),
      industry,
      target_niche: targetNiche,
      preferred_platform: preferredPlatform,
      target_age_group: targetAgeGroup,
      content_format: contentFormat,
      budget_usd: budgetUsd,
      timeline_weeks: timelineWeeks,
      description: description.trim(),
      top_n: topN,
      provider,
    }

    setLoading(true)
    setError(null)
    onLoading(true)

    try {
      const result = await matchKols(brief)
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Model Provider *</label>
            <Select value={provider} onValueChange={v => setProvider(v ?? 'google')}>
              <SelectTrigger><SelectValue placeholder="Select model provider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google Gemini</SelectItem>
                <SelectItem value="xai">xAI Grok</SelectItem>
                <SelectItem value="openai">OpenAI GPT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Brand *</label>
            <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Nike, Vinamilk" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Industry</label>
            <Select value={industry} onValueChange={v => setIndustry(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Target Niche</label>
            <Select value={targetNiche} onValueChange={v => setTargetNiche(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Select niche" /></SelectTrigger>
              <SelectContent>
                {NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Preferred Platform</label>
            <Select value={preferredPlatform} onValueChange={v => setPreferredPlatform(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Target Age Group</label>
            <Select value={targetAgeGroup} onValueChange={v => setTargetAgeGroup(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Select age group" /></SelectTrigger>
              <SelectContent>
                {AGE_GROUPS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Content Format</label>
            <Select value={contentFormat} onValueChange={v => setContentFormat(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Select content format" /></SelectTrigger>
              <SelectContent>
                {CONTENT_FORMATS.map(cf => <SelectItem key={cf.value} value={cf.value}>{cf.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Budget: <span className="font-normal">{formatUSD(budgetUsd)}</span>
            </label>
            <Input
              type="number"
              value={budgetUsd}
              min={1000}
              max={500000}
              step={1000}
              onChange={e => setBudgetUsd(Number(e.target.value))}
              className="mb-2"
            />
            <Slider
              value={[budgetUsd]}
              min={1000}
              max={500000}
              step={1000}
              onValueChange={v => setBudgetUsd(Array.isArray(v) ? (v as number[])[0] : (v as number))}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$1K</span>
              <span>$500K</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Timeline: <span className="font-normal">{timelineWeeks} weeks</span>
            </label>
            <Slider
              value={[timelineWeeks]}
              min={1}
              max={12}
              step={1}
              onValueChange={v => setTimelineWeeks(Array.isArray(v) ? (v as number[])[0] : (v as number))}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 week</span>
              <span>12 weeks</span>
            </div>
          </div>

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

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Top N results: <span className="font-normal">{topN}</span>
            </label>
            <Slider
              value={[topN]}
              min={3}
              max={10}
              step={1}
              onValueChange={v => setTopN(Array.isArray(v) ? (v as number[])[0] : (v as number))}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3</span>
              <span>10</span>
            </div>
          </div>

          <Button type="submit" disabled={!isValid} className="w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Matching...
              </span>
            ) : (
              'Find KOLs'
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
