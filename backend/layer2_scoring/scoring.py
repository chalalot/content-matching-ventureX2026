"""
Layer 2 — Multi-Signal Scoring
Owner: Đồng Đức (Backend Developer)

Goal: Take the top-K candidates from Layer 1 and re-rank them using
      a richer feature set. Return a scored shortlist (top 5 by default).

For the POC, a rule-based weighted scorer is fine.
Replace with LightGBM later when we have enough labeled data.

Scoring signals to combine (weights are tunable):
  - genre_match:        does candidate's genre list overlap with brief's genre? (0 or 1)
  - style_match:        how many style_tags overlap with brief's required style? (0–1)
  - experience_score:   normalized experience_years (0–1)
  - availability_bonus: +0.1 if available now
  - outcome_score:      ratio of positive outcomes in past_projects (0–1)
"""

from dataclasses import dataclass

WEIGHTS = {
    "genre_match":        0.35,
    "style_match":        0.25,
    "experience_score":   0.15,
    "availability_bonus": 0.10,
    "outcome_score":      0.15,
}

POSITIVE_OUTCOMES = {"high_rating", "award_won", "on_time"}

@dataclass
class ScoredCandidate:
    candidate: dict
    score: float          # 0–100
    feature_breakdown: dict

def score_candidates(
    candidates: list[dict],
    brief_genres: list[str],
    brief_styles: list[str],
    top_n: int = 5,
) -> list[ScoredCandidate]:
    """
    Args:
        candidates:    list of candidate dicts from Layer 1
        brief_genres:  genres extracted from the brief (e.g. ['reality_tv'])
        brief_styles:  style tags from the brief (e.g. ['fast_paced', 'comedic'])
        top_n:         number of candidates to return
    Returns:
        Sorted list of ScoredCandidate, highest score first
    """
    scored = []
    max_experience = max((c["experience_years"] for c in candidates), default=1)

    for c in candidates:
        genre_match = min(len(set(c["genres"]) & set(brief_genres)) / max(len(brief_genres), 1), 1.0)
        style_match = min(len(set(c["style_tags"]) & set(brief_styles)) / max(len(brief_styles), 1), 1.0)
        experience_score = c["experience_years"] / max_experience
        availability_bonus = 0.1 if c.get("availability") else 0.0
        positives = sum(1 for p in c["past_projects"] if p["outcome"] in POSITIVE_OUTCOMES)
        outcome_score = positives / max(len(c["past_projects"]), 1)

        features = {
            "genre_match": genre_match,
            "style_match": style_match,
            "experience_score": experience_score,
            "availability_bonus": availability_bonus,
            "outcome_score": outcome_score,
        }
        raw = sum(WEIGHTS[k] * v for k, v in features.items())
        scored.append(ScoredCandidate(candidate=c, score=round(raw * 100, 1), feature_breakdown=features))

    scored.sort(key=lambda x: x.score, reverse=True)
    return scored[:top_n]
