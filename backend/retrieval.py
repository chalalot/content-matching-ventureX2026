"""
Owner: Đức — Layer 1
Input:  BriefRequest
Output: list of dicts (director metadata from ChromaDB), top 20
"""

import json
from pathlib import Path

from models import BriefRequest

_DATA_PATH = Path(__file__).parent.parent / "data" / "directors_mockup.json"


def retrieve_candidates(brief: BriefRequest, top_k: int = 20) -> list[dict]:
    directors = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    return [{"id": d["id"], "metadata": d} for d in directors[:top_k]]
