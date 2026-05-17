"""
Owner: Đức — Layer 1
Input:  BriefRequest
Output: list of dicts (director metadata from ChromaDB), top 20
"""

from .models import BriefRequest


def retrieve_candidates(brief: BriefRequest, top_k: int = 20) -> list[dict]:
    # TODO (Đức):
    # 1. Build query text:
    #    f"Campaign for {brief.brand} in {brief.industry}. Type: {brief.campaign_type}. Tone: {brief.tone}. {brief.description}"
    # 2. Embed with SentenceTransformer("all-MiniLM-L6-v2")
    # 3. collection.query(query_embeddings=[vec], n_results=top_k)
    # 4. Return list of {"id": ..., "metadata": ...} dicts
    raise NotImplementedError
