// ============================================================
// CSV Dataset Types — column names match CSV headers exactly
// ============================================================

export interface User {
  user_id: number
  email: string
  password_hash: string
  role: string
  created_at: string
  last_login: string
  status: string
}

export interface CompanyProfile {
  company_id: number
  user_id: number
  company_name: string
  industry: string
  website: string
  contact_name: string
  contact_phone: string
}

export interface DirectorProfile {
  director_id: number
  user_id: number
  full_name: string
  bio: string
  years_of_experience: number
  base_day_rate: number
  primary_location: string
  availability_status: string
}

export interface KolProfile {
  kol_id: number
  user_id: number
  stage_name: string
  bio: string
  main_niche: string
  target_demographic_age: string
  booking_fee_estimate: number
}

export interface SocialMetric {
  metric_id: number
  kol_id: number
  platform: string
  follower_count: number
  avg_engagement_rate: number
  last_updated: string
}

export interface Portfolio {
  portfolio_id: number
  user_id: number
  project_title: string
  video_url: string
  role_played: string
  thumbnail_url: string
}

export interface Category {
  category_id: number
  name: string
  type: string
}

export interface UserCategory {
  user_id: number
  category_id: number
}

export interface Project {
  project_id: number
  company_id: number
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
  requirement_id: number
  project_id: number
  talent_type: string
  required_category_id: number
  min_followers: number
}

export interface Match {
  match_id: number
  project_id: number
  talent_user_id: number
  initiated_by: string
  status: string
  proposed_fee: number
  match_score: number
  created_at: string
}

export interface Review {
  review_id: number
  project_id: number
  reviewer_id: number
  reviewee_id: number
  rating: number
  feedback: string
  punctuality_score: number
  creativity_score: number
}

export interface RoiRow {
  match_id: number
  project_id: number
  talent_user_id: number
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

export interface BriefRequest {
  brand: string
  industry: string
  campaign_type: string
  tone: string
  budget_usd: number
  timeline_weeks: number
  description: string
  top_n: number
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
  director_id: number
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
