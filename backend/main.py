"""
Run: uvicorn main:app --reload  (from inside backend/)
"""
import os
os.environ["ANONYMIZED_TELEMETRY"] = "FALSE"

import asyncio
import json
import time
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from models import BriefRequest, MatchResponse, CandidateResult, ScoreBreakdown
from models import KolBriefRequest, KolMatchResponse, KolCandidateResult
from retrieval import retrieve_candidates
from retrieval_kol import retrieve_kol_candidates, kol_collection_count
from scoring import rank_candidates
from scoring_kol import rank_kol_candidates_full
from explanation import generate_explanation
from explanation_kol import generate_kol_explanation
from pipeline_kol import build_l1_stage, build_l2_stage, build_l3_stage
from agent_l1_kol import run_layer1
from agent_l2_kol import run_layer2


def _l1_method(intent) -> str:
    """Funnel-band text describing what the L1 Brief Interpreter agent did."""
    if intent.related_niches:
        return f"AI hiểu brief & mở rộng niche liên quan: {', '.join(intent.related_niches[:4])}"
    return "AI hiểu brief & dựng truy vấn tìm creator"


def _l2_method(policy) -> str:
    """Funnel-band text describing what the L2 Scoring agent did."""
    return policy.rationale or "AI chấm & xếp hạng theo ưu tiên chiến dịch"

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

        # Layer 1 agent (interpret brief → retrieve) and Layer 2 agent (policy → score).
        # Both fall back to the deterministic path internally if the LLM fails.
        candidates, intent = run_layer1(brief, top_k=RETRIEVAL_TOP_K)
        ranked_full, policy = run_layer2(
            candidates, brief, top_n=brief.top_n,
            intent_related_niches=intent.related_niches, emphasis=intent.emphasis,
        )
        ranked = [c for c in ranked_full if c["shortlisted"]]

        shortlist = []
        for i, c in enumerate(ranked):
            meta = c["metadata"]
            platforms_raw = meta.get("platforms", "")
            platforms = platforms_raw.split(",") if isinstance(platforms_raw, str) else platforms_raw
            explanation = generate_kol_explanation(brief, c)
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

        pipeline = [
            build_l1_stage(candidates, kol_collection_count(), method=_l1_method(intent)),
            build_l2_stage(ranked_full, brief.top_n, method=_l2_method(policy)),
            build_l3_stage(ranked),
        ]

        return KolMatchResponse(
            brief_summary=f"{brief.content_format} for {brief.brand} ({brief.target_niche})",
            shortlist=shortlist,
            pipeline=pipeline,
            total_candidates_considered=len(candidates),
            response_time_ms=int((time.time() - start) * 1000),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.websocket("/ws/match/kol")
async def websocket_match_kol(websocket: WebSocket):
    await websocket.accept()
    try:
        # 1. Receive the brief from the client
        data = await websocket.receive_text()
        brief_dict = json.loads(data)
        brief = KolBriefRequest(**brief_dict)

        start = time.time()

        # 2. Layer 1 agent (interpret brief → retrieve) then Layer 2 agent (policy → score).
        # Run in threads to keep the event loop free; each falls back to the
        # deterministic path internally if its LLM call fails.
        candidates, intent = await asyncio.to_thread(run_layer1, brief, RETRIEVAL_TOP_K)
        ranked_full, policy = await asyncio.to_thread(
            run_layer2, candidates, brief, brief.top_n, intent.related_niches, intent.emphasis
        )
        ranked = [c for c in ranked_full if c["shortlisted"]]

        # 2a. Stream Layer 1 (retrieval ranking) and Layer 2 (scoring) results immediately,
        # so the user sees what each layer did before the slow AI explanations start.
        l1_stage = build_l1_stage(candidates, kol_collection_count(), method=_l1_method(intent))
        l2_stage = build_l2_stage(ranked_full, brief.top_n, method=_l2_method(policy))
        await websocket.send_json({"type": "stage", "data": l1_stage.model_dump()})
        await websocket.send_json({"type": "stage", "data": l2_stage.model_dump()})

        # Let the client know we're starting AI explanations (Layer 3)
        await websocket.send_json({
            "type": "init",
            "total_candidates_considered": len(candidates),
            "top_n": brief.top_n
        })

        shortlist = []
        
        # 3. Generate explanations and stream candidates one by one
        for i, c in enumerate(ranked):
            meta = c["metadata"]
            platforms_raw = meta.get("platforms", "")
            platforms = platforms_raw.split(",") if isinstance(platforms_raw, str) else platforms_raw
            
            # generate_kol_explanation is blocking (LLM call), so run it in a thread.
            # It handles its own errors/timeout and always returns a KolExplanation.
            explanation = await asyncio.to_thread(generate_kol_explanation, brief, c)

            candidate_result = KolCandidateResult(
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
            )
            shortlist.append(candidate_result)

            # Stream the individual candidate as soon as they are ready
            await websocket.send_json({
                "type": "candidate",
                "data": candidate_result.model_dump() if hasattr(candidate_result, "model_dump") else candidate_result.dict()
            })

        # 4. Send the final compiled MatchResponse payload to signify completion
        l3_stage = build_l3_stage(ranked)
        final_response = KolMatchResponse(
            brief_summary=f"{brief.content_format} for {brief.brand} ({brief.target_niche})",
            shortlist=shortlist,
            pipeline=[l1_stage, l2_stage, l3_stage],
            total_candidates_considered=len(candidates),
            response_time_ms=int((time.time() - start) * 1000),
        )
        await websocket.send_json({
            "type": "complete",
            "data": final_response.model_dump() if hasattr(final_response, "model_dump") else final_response.dict()
        })

    except WebSocketDisconnect:
        # Client disconnected early
        print("Client disconnected from KOL WebSocket")
    except Exception as e:
        # Handle formatting/parsing/internal errors gracefully to the client
        await websocket.send_json({"type": "error", "message": str(e)})
        await websocket.close()
