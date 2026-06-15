"""
Eval harness for the matching engine (Phase 0).

Measures Layer 1 (retrieval) and Layer 2 (scoring) quality against a small
set of hand-labeled briefs, WITHOUT invoking Layer 3 (the LLM explanations).
It imports the retrieval + scoring functions directly, so it needs no API key
and makes no network calls.

Metrics
-------
Layer 1 (retrieval):
  recall@20 = (# expected candidates that appear in the top-20 retrieved) / (# expected)

Layer 2 (scoring), computed on the candidates that L1 returned:
  precision@5 = (# expected in the final top-5) / 5
  recall@5    = (# expected in the final top-5) / (# expected)
  MRR         = 1 / (rank of the first expected candidate in the full ranked list)

Usage
-----
  python eval/run_eval.py            # both director + KOL sets
  python eval/run_eval.py directors  # one set
  python eval/run_eval.py kols

Writes a Markdown snapshot to eval/baseline_results.md.

Prereq: the ChromaDB collections must be populated first:
  python ingest.py        # directors
  python ingest_kols.py   # kols
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime, timezone

# --- make the backend package importable and resolve its relative paths ---
# config.py uses env_file=".env" and settings like "./chroma_db" / "../data/...",
# all relative to the backend dir, so we run as if cwd == backend.
BACKEND_DIR = Path(__file__).resolve().parent.parent
os.chdir(BACKEND_DIR)
sys.path.insert(0, str(BACKEND_DIR))

# config.Settings marks google_api_key / websearch_api_key as required at import
# time. The eval never uses them, so provide harmless dummies if they are absent
# (backend/.env still supplies any real values it has).
os.environ.setdefault("GOOGLE_API_KEY", "eval-dummy")
os.environ.setdefault("WEBSEARCH_API_KEY", "eval-dummy")
os.environ["ANONYMIZED_TELEMETRY"] = "FALSE"

from models import BriefRequest, KolBriefRequest  # noqa: E402
from retrieval import retrieve_candidates          # noqa: E402
from scoring import rank_candidates                # noqa: E402
from retrieval_kol import retrieve_kol_candidates  # noqa: E402
from scoring_kol import rank_kol_candidates        # noqa: E402

EVAL_DIR = Path(__file__).resolve().parent
# Layer 1 retrieval depth. Default matches main.RETRIEVAL_TOP_K. Override with
# EVAL_TOP_K to experiment (e.g. set 20 to reproduce the pre-fix behaviour).
TOP_K = int(os.environ.get("EVAL_TOP_K", "60"))


def evaluate_brief(brief_obj, expected_ids, retrieve_fn, rank_fn):
    """Run L1 + L2 for one brief and return its metrics."""
    expected = set(expected_ids)
    n_expected = len(expected)

    # Layer 1
    candidates = retrieve_fn(brief_obj, top_k=TOP_K)
    retrieved_ids = [c["id"] for c in candidates]
    l1_hits = expected & set(retrieved_ids)
    l1_recall = len(l1_hits) / n_expected if n_expected else 0.0

    # Layer 2 — rank the full retrieved set so we can read true ranks
    ranked = rank_fn(candidates, brief_obj, top_n=len(candidates))
    ranked_ids = [c["id"] for c in ranked]
    top5 = ranked_ids[:5]
    hits5 = expected & set(top5)

    # precision@k uses k = n_expected (not 5) so a perfect ranking scores 1.00.
    # With fewer than 5 labeled answers per brief, precision@5 would be capped
    # below 1.0 and read like a miss even when ordering is perfect.
    k = max(1, n_expected)
    precisionk = len(expected & set(ranked_ids[:k])) / k
    recall5 = len(hits5) / n_expected if n_expected else 0.0

    mrr = 0.0
    for rank, cid in enumerate(ranked_ids, start=1):
        if cid in expected:
            mrr = 1.0 / rank
            break

    # rank of each expected id in the full ranked list (None if not retrieved)
    expected_ranks = {
        cid: (ranked_ids.index(cid) + 1 if cid in ranked_ids else None)
        for cid in expected_ids
    }

    return {
        "n_expected": n_expected,
        "l1_recall": l1_recall,
        "l1_missed": sorted(expected - l1_hits),
        "precisionk": precisionk,
        "recall5": recall5,
        "mrr": mrr,
        "top5": top5,
        "expected_ranks": expected_ranks,
    }


def evaluate_set(briefs, retrieve_fn, rank_fn, brief_cls):
    rows = []
    for b in briefs:
        brief_obj = brief_cls(**b["brief"])
        m = evaluate_brief(brief_obj, b["expected_ids"], retrieve_fn, rank_fn)
        m["id"] = b["id"]
        rows.append(m)
    return rows


def mean(rows, key):
    return sum(r[key] for r in rows) / len(rows) if rows else 0.0


def format_set(name, rows):
    lines = [f"### {name}", ""]
    lines.append(f"| Brief | L1 recall@{TOP_K} | L2 precision@k | L2 recall@5 | MRR | expected ranks |")
    lines.append("|-------|:-----------:|:--------------:|:-----------:|:---:|----------------|")
    for r in rows:
        ranks = ", ".join(
            f"{cid.split('-')[0] if cid.startswith('DIR') else cid[:8]}=#{pos}" if pos else
            f"{cid.split('-')[0] if cid.startswith('DIR') else cid[:8]}=MISS"
            for cid, pos in r["expected_ranks"].items()
        )
        lines.append(
            f"| {r['id']} | {r['l1_recall']:.2f} | {r['precisionk']:.2f} | "
            f"{r['recall5']:.2f} | {r['mrr']:.2f} | {ranks} |"
        )
    lines.append(
        f"| **MEAN** | **{mean(rows, 'l1_recall'):.2f}** | "
        f"**{mean(rows, 'precisionk'):.2f}** | **{mean(rows, 'recall5'):.2f}** | "
        f"**{mean(rows, 'mrr'):.2f}** | |"
    )
    lines.append("")
    return "\n".join(lines)


# (section name, kind, briefs file, retrieve fn, rank fn, brief class)
DATASETS = [
    ("Directors",        "directors", "briefs_directors.json",      retrieve_candidates,     rank_candidates,     BriefRequest),
    ("Directors (hard)", "directors", "briefs_hard_directors.json", retrieve_candidates,     rank_candidates,     BriefRequest),
    ("KOLs",             "kols",      "briefs_kols.json",           retrieve_kol_candidates, rank_kol_candidates, KolBriefRequest),
    ("KOLs (hard)",      "kols",      "briefs_hard_kols.json",      retrieve_kol_candidates, rank_kol_candidates, KolBriefRequest),
]


def main():
    which = sys.argv[1].lower() if len(sys.argv) > 1 else "both"

    sections = []
    summary = []

    for name, kind, fname, retrieve_fn, rank_fn, brief_cls in DATASETS:
        if which not in ("both", kind):
            continue
        path = EVAL_DIR / fname
        if not path.exists():
            sections.append(f"### {name}\n\n_Skipped: {fname} not found._\n")
            continue
        briefs = json.loads(path.read_text(encoding="utf-8"))
        try:
            rows = evaluate_set(briefs, retrieve_fn, rank_fn, brief_cls)
            sections.append(format_set(name, rows))
            summary.append((name, rows))
        except RuntimeError as e:
            sections.append(f"### {name}\n\n_Skipped: {e}_\n")

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    header = [
        "# Eval baseline — Layer 1 & Layer 2",
        "",
        f"_Generated: {stamp}_",
        "",
        f"Retrieval depth top_k={TOP_K}. "
        f"Metrics: **L1 recall@{TOP_K}** (did the right candidate reach the shortlist), "
        "**L2 precision@k** (k = #expected; fraction of the top-k that are correct), "
        "**L2 recall@5** (expected found in the final top-5), "
        "**MRR** (1 / rank of the first expected candidate). No Layer 3 / LLM involved.",
        "",
    ]
    report = "\n".join(header) + "\n".join(sections)

    out = EVAL_DIR / "baseline_results.md"
    out.write_text(report, encoding="utf-8")

    # console summary
    print(report)
    print("\n" + "=" * 60)
    for name, rows in summary:
        print(
            f"{name:18s}  L1 recall@{TOP_K}={mean(rows, 'l1_recall'):.2f}  "
            f"P@k={mean(rows, 'precisionk'):.2f}  R@5={mean(rows, 'recall5'):.2f}  "
            f"MRR={mean(rows, 'mrr'):.2f}"
        )
    print("=" * 60)
    print(f"Saved: {out}")


if __name__ == "__main__":
    main()
