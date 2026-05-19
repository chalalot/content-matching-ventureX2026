"""
Owner: Mạnh — Layer 1 (Semantic Retrieval)
Input:  BriefRequest
Output: list[{"id": str, "metadata": dict}] — top_k candidates from ChromaDB

Pipeline: Brief → compose query text → embed (all-MiniLM-L6-v2)
         → ChromaDB cosine search → unpack raw_json → return.

Prereq: run `python ingest.py` once to populate the collection.
"""

import json
from functools import lru_cache

import chromadb
from sentence_transformers import SentenceTransformer

from config import settings
from models import BriefRequest

MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME)


@lru_cache(maxsize=1)
def _get_collection():
    client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    collection = client.get_or_create_collection(settings.collection_name)
    if collection.count() == 0:
        raise RuntimeError(
            f"ChromaDB collection '{settings.collection_name}' is empty. "
            "Run `python ingest.py` first."
        )
    return collection


def _build_query_text(brief: BriefRequest) -> str:
    return (
        f"Brand: {brief.brand}. Industry: {brief.industry}. "
        f"Campaign type: {brief.campaign_type}. Tone: {brief.tone}. "
        f"Description: {brief.description}"
    )


def _hydrate_metadata(meta: dict) -> dict:
    raw = meta.get("raw_json")
    if not raw:
        return meta
    profile = json.loads(raw)
    return {**meta, "bio": profile.get("bio", "")}


def retrieve_candidates(brief: BriefRequest, top_k: int = 20) -> list[dict]:
    collection = _get_collection()
    model = _get_model()

    query_vec = model.encode([_build_query_text(brief)]).tolist()
    k = min(top_k, collection.count())

    result = collection.query(query_embeddings=query_vec, n_results=k)
    ids = result["ids"][0]
    metadatas = result["metadatas"][0]

    return [
        {"id": doc_id, "metadata": _hydrate_metadata(meta)}
        for doc_id, meta in zip(ids, metadatas)
    ]
