"""
Diagnostic: show the FULL-collection cosine rank of each expected candidate,
independent of the top-20 cutoff. Helps see how far a Layer-1 retrieval miss is
(e.g. just outside the top-20 vs. buried deep), which informs whether a query
reshape can rescue it.

Run from anywhere:  python eval/diagnose_retrieval.py [directors|kols|both]
"""
import os
import sys
import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
os.chdir(BACKEND_DIR)
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("GOOGLE_API_KEY", "eval-dummy")
os.environ.setdefault("WEBSEARCH_API_KEY", "eval-dummy")
os.environ["ANONYMIZED_TELEMETRY"] = "FALSE"

from models import BriefRequest, KolBriefRequest          # noqa: E402
from retrieval import retrieve_candidates                 # noqa: E402
from retrieval_kol import retrieve_kol_candidates         # noqa: E402

EVAL_DIR = Path(__file__).resolve().parent


def full_ranks(briefs, retrieve_fn, cls):
    for b in briefs:
        brief = cls(**b["brief"])
        cands = retrieve_fn(brief, top_k=10000)  # internally capped to collection size
        ids = [c["id"] for c in cands]
        n = len(ids)
        print(f"\n{b['id']}  (collection={n})")
        for eid in b["expected_ids"]:
            if eid in ids:
                pos = ids.index(eid) + 1
                flag = "" if pos <= 20 else "   <-- OUTSIDE top-20"
                print(f"   {eid[:12]:14s} cosine rank #{pos}{flag}")
            else:
                print(f"   {eid[:12]:14s} NOT in collection")


def main():
    which = sys.argv[1].lower() if len(sys.argv) > 1 else "both"
    if which in ("both", "directors"):
        for f in ["briefs_directors.json", "briefs_hard_directors.json"]:
            p = EVAL_DIR / f
            if p.exists():
                print(f"\n=== {f} ===")
                full_ranks(json.loads(p.read_text(encoding="utf-8")), retrieve_candidates, BriefRequest)
    if which in ("both", "kols"):
        for f in ["briefs_kols.json", "briefs_hard_kols.json"]:
            p = EVAL_DIR / f
            if p.exists():
                print(f"\n=== {f} ===")
                full_ranks(json.loads(p.read_text(encoding="utf-8")), retrieve_kol_candidates, KolBriefRequest)


if __name__ == "__main__":
    main()
