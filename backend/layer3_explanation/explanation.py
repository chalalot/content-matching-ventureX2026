"""
Layer 3 — Explanation Generator
Owner: Trung (Founder)

Goal: For each scored candidate, generate 2–3 human-readable sentences
      explaining WHY they were recommended.

For the POC, use template-based generation (no LLM needed).
The template picks the top-2 strongest signals from the feature_breakdown
and formats them into natural Vietnamese text.

Optional upgrade: replace _build_from_template() with an LLM call
when we want richer explanations.
"""

from backend.layer2_scoring.scoring import ScoredCandidate

TEMPLATES = {
    "genre_match":        "Đã có kinh nghiệm trong thể loại {genres} — phù hợp trực tiếp với brief.",
    "style_match":        "Phong cách {styles} trùng khớp với yêu cầu sáng tạo của dự án.",
    "experience_score":   "Với {years} năm kinh nghiệm, đủ để xử lý quy mô và áp lực sản xuất.",
    "availability_bonus": "Hiện đang rảnh lịch — có thể bắt đầu ngay.",
    "outcome_score":      "{pct}% dự án trước đây đạt kết quả tốt (rating cao / đúng tiến độ / giải thưởng).",
}

def generate_explanation(scored: ScoredCandidate) -> str:
    """
    Returns a 2–3 sentence explanation string in Vietnamese.
    """
    c = scored.candidate
    top_signals = sorted(scored.feature_breakdown.items(), key=lambda x: x[1], reverse=True)[:2]

    sentences = []
    for signal, value in top_signals:
        if signal == "genre_match":
            sentences.append(TEMPLATES["genre_match"].format(genres=", ".join(c["genres"])))
        elif signal == "style_match":
            sentences.append(TEMPLATES["style_match"].format(styles=", ".join(c["style_tags"])))
        elif signal == "experience_score":
            sentences.append(TEMPLATES["experience_score"].format(years=c["experience_years"]))
        elif signal == "availability_bonus" and value > 0:
            sentences.append(TEMPLATES["availability_bonus"])
        elif signal == "outcome_score":
            pct = round(value * 100)
            sentences.append(TEMPLATES["outcome_score"].format(pct=pct))

    return " ".join(sentences)
