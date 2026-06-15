from typing import Optional

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


# ── Pipeline (per-layer) view ────────────────────────────────────────────────
# Mirrors the frontend StageCandidate / PipelineStage types (lib/data/types.ts).
# Lets the UI show what each layer did: L1 retrieval ranking, L2 scoring + cut.

class StageCandidate(BaseModel):
    kol_id: str
    name: str
    status: str                       # passed | filtered | shortlisted | dropped
    metric: Optional[float] = None    # L1: similarity (0–1) · L2: score (0–100)
    rank: Optional[int] = None        # 1-based position within the stage
    reason: Optional[str] = None      # drop/filter reason (StageReason or free text)
    breakdown: Optional[dict] = None  # L2: per-dimension score points (how the score was built)


class PipelineStage(BaseModel):
    id: str                           # retrieval | scoring | explanation
    layer: int                        # 1 | 2 | 3
    name: str
    method: str
    in_count: int
    out_count: int
    agentic: bool = False
    candidates: list[StageCandidate] = []


class KolMatchResponse(BaseModel):
    brief_summary: str
    shortlist: list[KolCandidateResult]
    pipeline: list[PipelineStage] = []   # stage-by-stage funnel (L1, L2, L3)
    total_candidates_considered: int
    response_time_ms: int
