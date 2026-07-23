// ============================================================
// CSV Dataset Types — column names match CSV headers exactly
// ============================================================

export interface User {
  user_id: string
  email: string
  password_hash: string
  role: string
  created_at: string
  last_login: string
  status: string
}

export interface CompanyProfile {
  company_id: string
  user_id: string
  company_name: string
  industry: string
  website: string
  contact_name: string
  contact_phone: string
}

export interface DirectorProfile {
  director_id: string
  user_id: string
  full_name: string
  bio: string
  years_of_experience: number
  base_day_rate: number
  primary_location: string
  availability_status: string
}

export interface KolProfile {
  kol_id: string
  user_id: string
  stage_name: string
  bio: string
  main_niche: string
  target_demographic_age: string
  booking_fee_estimate: number
}

export interface SocialMetric {
  metric_id: string
  kol_id: string
  platform: string
  follower_count: number
  avg_engagement_rate: number
  last_updated: string
}

export interface Portfolio {
  portfolio_id: string
  user_id: string
  project_title: string
  video_url: string
  role_played: string
  thumbnail_url: string
}

export interface Category {
  category_id: string
  name: string
  type: string
}

export interface UserCategory {
  user_id: string
  category_id: string
}

export interface Project {
  project_id: string
  company_id: string
  title: string
  description: string
  project_type: string
  budget_min: number
  budget_max: number
  shooting_location: string
  timeline_start: string
  timeline_end: string
  status: string
}

export interface ProjectWithCompany extends Project {
  company_name: string
  industry: string
}

export interface ProjectRequirement {
  requirement_id: string
  project_id: string
  talent_type: string
  required_category_id: string
  min_followers: number
}

export interface Match {
  match_id: string
  project_id: string
  talent_user_id: string
  initiated_by: string
  status: string
  proposed_fee: number
  match_score: number
  created_at: string
}

export interface Review {
  review_id: string
  project_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  feedback: string
  punctuality_score: number
  creativity_score: number
}

export interface RoiRow {
  match_id: string
  project_id: string
  talent_user_id: string
  talent_name: string
  talent_type: string
  company_name: string
  title: string
  project_type: string
  initiated_by: string
  status: string
  proposed_fee: number
  match_score: number
  created_at: string
  budget_min: number
  budget_max: number
  total_followers: number
  avg_engagement: number
  estimated_reach: number
  est_impressions: number
  est_conversions: number
  est_revenue_vnd: number
  cost_efficiency_score: number
  quality_score: number
  roi_percent: number
}

// ============================================================
// Match Engine Types — mirrors backend/models.py
// ============================================================

// Director engine

export interface BriefRequest {
  brand: string
  industry: string
  campaign_type: string
  tone: string
  budget_usd: number
  timeline_weeks: number
  description: string
  top_n: number
  provider: string
}

export interface ScoreBreakdown {
  genre_match: number
  style_match: number
  specialty_match: number
  performance: number
  availability: number
  experience: number
  budget_fit: number
}

export interface CandidateResult {
  rank: number
  director_id: string
  name: string
  score: number
  score_breakdown: ScoreBreakdown
  explanation: string
  availability_status: string
  available_from: string
  notable_brands: string[]
  collaboration_style: string
}

export interface MatchResponse {
  brief_summary: string
  shortlist: CandidateResult[]
  total_candidates_considered: number
  response_time_ms: number
}

// KOL engine

export interface KolBriefRequest {
  brand: string
  industry: string
  target_niche: string
  preferred_platform: string
  target_age_group: string
  content_format: string
  budget_usd: number
  timeline_weeks: number
  description: string
  top_n: number
  provider: string
}

export interface KolScoreBreakdown {
  niche_match: number
  platform_match: number
  audience_fit: number
  engagement: number
  reach: number
  budget_fit: number
  availability: number
}

// Layer 3 structured explanation (v2) — mirrors backend KolExplanation

export interface Source {
  title: string
  url: string
}

export interface KolExplanation {
  fit_score: number              // 0–10, LLM-judged (distinct from score 0–100)
  fit_label: string              // "Strong fit" | "Partial fit" | "Weak fit"
  headline: string               // 1-line verdict
  brief_recap: string            // 1-line brief context
  why_good: string[]             // 2–5 bullets, each ≤ 1 sentence
  why_not_good: string[]         // 2–5 bullets
  recent_dramas: string[]        // [] when no real risk → FE shows "no red flag"
  recommendations: string[]      // 1–3 concrete actions
  full_report_md: string         // long markdown report (expand)
  reasoning_log: string          // agent process log: queries + sources (expand)
  sources: Source[]              // citations from web search
}

export interface KolCandidateResult {
  rank: number
  kol_id: string
  name: string
  score: number
  score_breakdown: KolScoreBreakdown
  explanation: KolExplanation    // structured Layer-3 report (Vietnamese)
  main_niche: string
  primary_platform: string
  platforms: string[]
  total_followers: number
  avg_engagement_rate: number
  booking_fee: number
}

// Pipeline stages (v2 A★) — mirrors backend StageCandidate / PipelineStage

export type StageCandidateStatus = 'passed' | 'filtered' | 'shortlisted' | 'dropped'

// reason enum from backend — FE maps to Vietnamese labels
export type StageReason =
  | 'wrong_platform'
  | 'empty_record'
  | 'over_budget'
  | 'audience_mismatch'
  | 'low_score'

export interface StageCandidate {
  kol_id: string
  name: string
  status: StageCandidateStatus
  metric?: number | null   // L1: similarity (cosine) · L2: score 0–100
  rank?: number | null     // L2: rank if shortlisted
  reason?: StageReason | string | null  // filter/drop reason
  breakdown?: Record<string, number> | null  // L2: per-dimension score points
}

export interface PipelineStage {
  id: string               // "retrieval" | "scoring" | "explanation"
  layer: number            // 1 | 2 | 3
  name: string             // "Semantic Retrieval" ...
  method: string           // "ChromaDB + all-MiniLM-L6-v2" ...
  in_count: number         // candidates in (corpus / prev stage)
  out_count: number        // candidates passing through
  agentic?: boolean        // true for Layer 3
  candidates: StageCandidate[]
}

export interface KolMatchResponse {
  brief_summary: string
  shortlist: KolCandidateResult[]
  pipeline?: PipelineStage[]   // ← v2: stage-by-stage funnel (optional for back-compat)
  total_candidates_considered: number
  response_time_ms: number
}
