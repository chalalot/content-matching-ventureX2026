'use client'

import { useState, useEffect } from 'react'
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
import { FileText, CheckCircle2, Search } from 'lucide-react'
import type { KolBriefRequest } from '@/lib/data/types'

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
  onSubmit: (brief: KolBriefRequest) => void
  loading: boolean
  error: string | null
}

export default function KolBriefForm({ onSubmit, loading, error }: KolBriefFormProps) {
  const [provider, setProvider] = useState('deepseek')
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

  function handleSubmit(e: React.FormEvent) {
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

    // The parent (engine page) drives the WebSocket stream and owns loading/error.
    onSubmit(brief)
  }

  const descOk = description.trim().length >= 30
  const budgetK = Math.round(budgetUsd / 1000)

  return (
    <section className="glass-card flex flex-col gap-8 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Campaign Brief</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Two-column brief grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left column — core identity */}
          <div className="flex flex-col gap-6">
            <Field label="Model Provider *">
              <Select value={provider} onValueChange={v => setProvider(v ?? 'deepseek')}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select model provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                  <SelectItem value="xai">xAI Grok</SelectItem>
                  <SelectItem value="openai">OpenAI GPT</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Brand *">
              <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Nike, Vinamilk" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Industry">
                <Select value={industry} onValueChange={v => setIndustry(v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Target Niche">
                <Select value={targetNiche} onValueChange={v => setTargetNiche(v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {/* Right column — audience & format */}
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Platform">
                <Select value={preferredPlatform} onValueChange={v => setPreferredPlatform(v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Age Group">
                <Select value={targetAgeGroup} onValueChange={v => setTargetAgeGroup(v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Content Format">
              <div className="flex flex-wrap gap-2">
                {CONTENT_FORMATS.map(cf => {
                  const selected = contentFormat === cf.value
                  return (
                    <button
                      key={cf.value}
                      type="button"
                      onClick={() => setContentFormat(selected ? '' : cf.value)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        selected
                          ? 'border-primary/50 bg-primary/20 font-semibold text-primary'
                          : 'border-border bg-secondary text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {cf.label}
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label={<>Description * <span className="font-normal lowercase opacity-60">(min 30 chars)</span></>}>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your campaign goals, target audience, key messages..."
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center justify-between px-0.5">
                <span className={`text-[11px] ${descOk ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                  {description.length}/30 chars minimum
                </span>
                {descOk && <CheckCircle2 className="h-3.5 w-3.5 text-good" />}
              </div>
            </Field>
          </div>
        </div>

        {/* Slider controls */}
        <div className="grid grid-cols-1 gap-8 border-t border-border pt-6 lg:grid-cols-3">
          <SliderField label="Budget" display={`$${budgetK}K`}>
            <Slider
              value={[budgetUsd]} min={1000} max={500000} step={1000}
              onValueChange={v => setBudgetUsd(Array.isArray(v) ? (v as number[])[0] : (v as number))}
            />
            <SliderEnds left="$1K" right="$500K" />
          </SliderField>

          <SliderField label="Timeline" display={`${timelineWeeks} weeks`}>
            <Slider
              value={[timelineWeeks]} min={1} max={12} step={1}
              onValueChange={v => setTimelineWeeks(Array.isArray(v) ? (v as number[])[0] : (v as number))}
            />
            <SliderEnds left="1 week" right="12 weeks" />
          </SliderField>

          <SliderField label="KOL Count" display={`Top ${topN}`}>
            <Slider
              value={[topN]} min={3} max={10} step={1}
              onValueChange={v => setTopN(Array.isArray(v) ? (v as number[])[0] : (v as number))}
            />
            <SliderEnds left="Min 3" right="Max 10" />
          </SliderField>
        </div>

        {/* CTA */}
        <button
          type="submit"
          disabled={!isValid}
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${isValid ? 'pulse-glow' : ''}`}
        >
          {loading ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Matching…
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              Find KOLs
            </>
          )}
        </button>

        {error && (
          <p className="rounded border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}

/** Labeled field — uppercase accent label above its control. */
function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium uppercase tracking-wider text-primary">{label}</label>
      {children}
    </div>
  )
}

/** Slider field — label on the left, live value on the right. */
function SliderField({ label, display, children }: { label: string; display: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-primary">{label}</label>
        <span className="font-mono text-lg font-semibold">{display}</span>
      </div>
      {children}
    </div>
  )
}

function SliderEnds({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  )
}
