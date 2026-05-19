"""
Owner: Mạnh — Layer 1 unit tests.
Run: uv run pytest test_retrieval.py -v -s
"""

import time

import pytest

from models import BriefRequest
from retrieval import retrieve_candidates

REQUIRED_METADATA_FIELDS = {
    "name",
    "primary_genre",
    "primary_style",
    "specialties",
    "notable_brands",
    "availability_status",
    "available_from",
    "budget_min_usd",
    "budget_max_usd",
    "years_experience",
    "avg_views",
    "satisfaction",
    "collaboration_style",
    "bio",
}

LATENCY_BUDGET_S = 5.0


SAMPLE_BRIEFS = [
    BriefRequest(
        brand="Vinamilk",
        industry="FMCG",
        campaign_type="TVC",
        tone="emotional_storytelling",
        budget_usd=60000,
        timeline_weeks=8,
        description=(
            "Chiến dịch TVC tôn vinh tình cảm gia đình Việt qua câu chuyện "
            "ba thế hệ chia sẻ ly sữa buổi sáng. Cần đạo diễn giỏi dẫn dắt "
            "diễn xuất tự nhiên của trẻ em và người lớn tuổi."
        ),
    ),
    BriefRequest(
        brand="VinFast",
        industry="Automotive",
        campaign_type="digital_content",
        tone="bold_graphic",
        budget_usd=40000,
        timeline_weeks=6,
        description=(
            "Series digital content giới thiệu mẫu xe điện mới cho Gen Z. "
            "Cần motion graphic mạnh, tempo nhanh, highlight thông số kỹ thuật."
        ),
    ),
    BriefRequest(
        brand="Dior Vietnam",
        industry="Luxury",
        campaign_type="TVC",
        tone="cinematic",
        budget_usd=90000,
        timeline_weeks=10,
        description=(
            "TVC ra mắt dòng nước hoa cao cấp tại thị trường Việt Nam. "
            "Phong cách điện ảnh, ánh sáng sang trọng, hợp tác với KOL fashion."
        ),
    ),
]


@pytest.mark.parametrize("brief", SAMPLE_BRIEFS, ids=lambda b: b.brand)
def test_returns_requested_top_k(brief):
    candidates = retrieve_candidates(brief, top_k=20)
    assert 1 <= len(candidates) <= 20
    assert len(candidates) == len({c["id"] for c in candidates}), "duplicate ids"


@pytest.mark.parametrize("brief", SAMPLE_BRIEFS, ids=lambda b: b.brand)
def test_metadata_contract(brief):
    candidates = retrieve_candidates(brief, top_k=5)
    for c in candidates:
        assert isinstance(c["id"], str) and c["id"]
        missing = REQUIRED_METADATA_FIELDS - set(c["metadata"].keys())
        assert not missing, f"{c['id']} missing fields: {missing}"


@pytest.mark.parametrize("brief", SAMPLE_BRIEFS, ids=lambda b: b.brand)
def test_response_time_under_budget(brief):
    retrieve_candidates(brief, top_k=20)
    start = time.perf_counter()
    retrieve_candidates(brief, top_k=20)
    elapsed = time.perf_counter() - start
    print(f"\n[latency] {brief.brand}: {elapsed*1000:.1f} ms")
    assert elapsed < LATENCY_BUDGET_S, f"too slow: {elapsed:.2f}s"


def test_relevance_smoke():
    """Sanity: a luxury fashion brief should surface someone with Luxury or Fashion specialty in top 5."""
    brief = SAMPLE_BRIEFS[2]
    candidates = retrieve_candidates(brief, top_k=5)
    matched = [
        c for c in candidates
        if "Luxury" in c["metadata"]["specialties"]
        or "Fashion" in c["metadata"]["specialties"]
        or "Beauty" in c["metadata"]["specialties"]
    ]
    assert matched, f"no luxury/fashion directors in top 5: {[c['metadata']['name'] for c in candidates]}"
