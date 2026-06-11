from pydantic import BaseModel


class BriefRequest(BaseModel):
    brand: str
    industry: str        # FMCG | F&B | Fashion | Tech | Banking | Healthcare | Entertainment | Telco | Automotive | Luxury
    campaign_type: str   # TVC | digital_content | social_media_content | music_video | corporate_video
    tone: str            # emotional_storytelling | comedic | cinematic | bold_graphic | documentary_realism | premium_brand | lifestyle
    budget_usd: float
    timeline_weeks: int
    description: str
    top_n: int = 5
    provider: str = "google"


class ScoreBreakdown(BaseModel):
    genre_match: float      # 0–25 pts
    style_match: float      # 0–20 pts
    specialty_match: float  # 0–20 pts
    performance: float      # 0–15 pts
    availability: float     # 0–10 pts
    experience: float       # 0–5 pts
    budget_fit: float       # 0–5 pts


class CandidateResult(BaseModel):
    rank: int
    director_id: str
    name: str
    score: float
    score_breakdown: ScoreBreakdown
    explanation: str
    availability_status: str   # "available" | "booked"
    available_from: str        # ISO date e.g. "2026-05-20"
    notable_brands: list[str]
    collaboration_style: str


class MatchResponse(BaseModel):
    brief_summary: str
    shortlist: list[CandidateResult]
    total_candidates_considered: int
    response_time_ms: int


# ── KOL Match Engine ────────────────────────────────────────────────────────

class KolBriefRequest(BaseModel):
    brand: str
    industry: str
    target_niche: str       # Beauty | Music | Gaming | Lifestyle | Fashion | Food | Travel | etc.
    preferred_platform: str # YOUTUBE | INSTAGRAM | TIKTOK | FACEBOOK
    target_age_group: str   # 13-17 | 18-24 | 25-34 | 18-34 | 25-44
    content_format: str     # product_review | tutorial | vlog | sponsored_post | live_stream | unboxing
    budget_usd: float
    timeline_weeks: int
    description: str
    top_n: int = 5
    provider: str = "google"


class KolScoreBreakdown(BaseModel):
    niche_match: float      # 0–25 pts
    platform_match: float   # 0–20 pts
    audience_fit: float     # 0–20 pts
    engagement: float       # 0–15 pts
    reach: float            # 0–10 pts
    budget_fit: float       # 0–5 pts
    availability: float     # 0–5 pts


class KolCandidateResult(BaseModel):
    rank: int
    kol_id: str
    name: str
    score: float
    score_breakdown: KolScoreBreakdown
    explanation: str
    main_niche: str
    primary_platform: str
    platforms: list[str]
    total_followers: int
    avg_engagement_rate: float
    booking_fee: float


class KolMatchResponse(BaseModel):
    brief_summary: str
    shortlist: list[KolCandidateResult]
    total_candidates_considered: int
    response_time_ms: int
