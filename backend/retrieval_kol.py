"""
Layer 1 (KOL) — Semantic Retrieval
Input:  KolBriefRequest
Output: list[{"id": str, "metadata": dict}] — top_k candidates from ChromaDB kols collection
"""

import json
from functools import lru_cache

import chromadb
from sentence_transformers import SentenceTransformer

from config import settings
from models import KolBriefRequest

MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME)


@lru_cache(maxsize=1)
def _get_kol_collection():
    from chromadb.config import Settings
    client = chromadb.PersistentClient(
        path=settings.chroma_persist_dir,
        settings=Settings(anonymized_telemetry=False),
    )
    collection = client.get_or_create_collection(settings.kol_collection_name)
    if collection.count() == 0:
        raise RuntimeError(
            f"ChromaDB collection '{settings.kol_collection_name}' is empty. "
            "Run `python ingest_kols.py` first."
        )
    return collection


def _build_kol_query(brief: KolBriefRequest) -> str:
    return (
        f"Brand: {brief.brand}. Industry: {brief.industry}. "
        f"Target niche: {brief.target_niche}. Platform: {brief.preferred_platform}. "
        f"Content format: {brief.content_format}. Description: {brief.description}"
    )


def kol_collection_count() -> int:
    """Total KOLs in the corpus (used as Layer 1's in_count for the pipeline view)."""
    return _get_kol_collection().count()


def _distance_to_similarity(distance) -> float | None:
    """Map a ChromaDB distance (lower = closer) to a 0–1 relevance score for display.

    The collection uses the default space, so this is a normalized closeness, not a
    strict cosine similarity — but it's monotonic with relevance, which is all the
    Layer 1 ranking display needs.
    """
    if distance is None:
        return None
    return round(1.0 / (1.0 + distance), 4)


def retrieve_kol_candidates(brief: KolBriefRequest, top_k: int = 20) -> list[dict]:
    collection = _get_kol_collection()
    model = _get_model()

    query_vec = model.encode([_build_kol_query(brief)]).tolist()
    k = min(top_k, collection.count())

    result = collection.query(query_embeddings=query_vec, n_results=k)
    ids = result["ids"][0]
    metadatas = result["metadatas"][0]
    distances = (result.get("distances") or [[]])[0]

    out = []
    for i, (doc_id, meta) in enumerate(zip(ids, metadatas)):
        dist = distances[i] if i < len(distances) else None
        out.append({
            "id": doc_id,
            "metadata": meta,
            "distance": dist,
            "similarity": _distance_to_similarity(dist),
            "cosine_rank": i,  # 0-based retrieval order (best first)
        })
    return out
