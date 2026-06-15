"""
Run: uvicorn main:app --reload  (from inside backend/)
"""
import os
os.environ["ANONYMIZED_TELEMETRY"] = "FALSE"

import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import BriefRequest, MatchResponse, CandidateResult, ScoreBreakdown
from models import KolBriefRequest, KolMatchResponse, KolCandidateResult
from retrieval import retrieve_candidates
from retrieval_kol import retrieve_kol_candidates
from scoring import rank_candidates
from scoring_kol import rank_kol_candidates
from explanation import generate_explanation
from explanation_kol import generate_kol_explanation

# Layer 1 retrieval depth. Layer 2 deterministically re-scores everything Layer 1
# returns, so under-fetching can permanently drop a good candidate before scoring
# (measured: KOL retrieval misses fixed by raising this — see backend/eval).
# At the current catalog scale (tens of profiles) this effectively passes the whole
# pool to the scorer; revisit (tune top_k + retrieval quality) once the catalog grows
# to hundreds+.
RETRIEVAL_TOP_K = 60

app = FastAPI(title="AI Matching Engine", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/match", response_model=MatchResponse)
def match(brief: BriefRequest):
    try:
        start = time.time()

        candidates = retrieve_candidates(brief, top_k=RETRIEVAL_TOP_K)
        ranked = rank_candidates(candidates, brief, top_n=brief.top_n)

        shortlist = []
        for i, c in enumerate(ranked):
            try:
                explanation = generate_explanation(brief, c)
            except Exception as e:
                msg = str(e)
                if "RESOURCE_EXHAUSTED" in msg or "429" in msg:
                    explanation = "[AI explanation unavailable — API quota exceeded. Scoring results above are still accurate.]"
                else:
                    explanation = f"[AI explanation unavailable: {msg[:120]}]"
            shortlist.append(CandidateResult(
                rank=i + 1,
                director_id=c["id"],
                name=c["metadata"]["name"],
                score=c["score"],
                score_breakdown=ScoreBreakdown(**c["score_breakdown"]),
                explanation=explanation,
                availability_status=c["metadata"].get("availability", {}).get("status", c["metadata"].get("availability_status", "unknown")),
                available_from=c["metadata"].get("availability", {}).get("available_from", c["metadata"].get("available_from", "")),
                notable_brands=c["metadata"]["notable_brands"] if isinstance(c["metadata"]["notable_brands"], list) else [b.strip() for b in c["metadata"]["notable_brands"].split(",") if b.strip()],
                collaboration_style=c["metadata"]["collaboration_style"],
            ))

        return MatchResponse(
            brief_summary=f"{brief.campaign_type} for {brief.brand} ({brief.industry})",
            shortlist=shortlist,
            total_candidates_considered=len(candidates),
            response_time_ms=int((time.time() - start) * 1000),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/match/kol", response_model=KolMatchResponse)
def match_kol(brief: KolBriefRequest):
    try:
        start = time.time()

        candidates = retrieve_kol_candidates(brief, top_k=RETRIEVAL_TOP_K)
        ranked = rank_kol_candidates(candidates, brief, top_n=brief.top_n)

        shortlist = []
        for i, c in enumerate(ranked):
            meta = c["metadata"]
            platforms_raw = meta.get("platforms", "")
            platforms = platforms_raw.split(",") if isinstance(platforms_raw, str) else platforms_raw
            try:
                explanation = generate_kol_explanation(brief, c)
            except Exception as e:
                msg = str(e)
                if "RESOURCE_EXHAUSTED" in msg or "429" in msg:
                    explanation = "[AI explanation unavailable — API quota exceeded. Scoring results above are still accurate.]"
                else:
                    explanation = f"[AI explanation unavailable: {msg[:120]}]"
            shortlist.append(KolCandidateResult(
                rank=i + 1,
                kol_id=c["id"],
                name=meta["stage_name"],
                score=c["score"],
                score_breakdown=c["score_breakdown"],
                explanation=explanation,
                main_niche=meta["main_niche"],
                primary_platform=meta["primary_platform"],
                platforms=[p.strip() for p in platforms if p.strip()],
                total_followers=int(meta.get("total_followers", 0)),
                avg_engagement_rate=float(meta.get("avg_engagement_rate", 0)),
                booking_fee=float(meta.get("booking_fee_estimate", 0)),
            ))

        return KolMatchResponse(
            brief_summary=f"{brief.content_format} for {brief.brand} ({brief.target_niche})",
            shortlist=shortlist,
            total_candidates_considered=len(candidates),
            response_time_ms=int((time.time() - start) * 1000),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

