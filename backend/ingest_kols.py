"""
Run once (or re-run to refresh): python ingest_kols.py
Loads kols_mockup.json -> embeds -> stores in ChromaDB kols collection.
"""
import os
os.environ["ANONYMIZED_TELEMETRY"] = "FALSE"

import json
from pathlib import Path
from sentence_transformers import SentenceTransformer
import chromadb
from config import settings

MODEL_NAME = "all-MiniLM-L6-v2"


def build_text(k: dict) -> str:
    platforms = k["platforms"] if isinstance(k["platforms"], list) else k["platforms"].split(",")
    return (
        f"{k['stage_name']}. Niche: {k['main_niche']}. "
        f"Platforms: {', '.join(platforms)}. "
        f"Target demographic: {k['target_demographic_age']}. "
        f"Bio: {k.get('bio', '')}"
    )


def flatten_metadata(k: dict) -> dict:
    platforms = k["platforms"] if isinstance(k["platforms"], list) else k["platforms"].split(",")
    return {
        "stage_name":              k["stage_name"],
        "bio":                     k.get("bio", ""),
        "main_niche":              k["main_niche"],
        "target_demographic_age":  k["target_demographic_age"],
        "booking_fee_estimate":    float(k["booking_fee_estimate"]),
        "primary_platform":        k["primary_platform"],
        "platforms":               ",".join(platforms),
        "total_followers":         int(k["total_followers"]),
        "avg_engagement_rate":     float(k["avg_engagement_rate"]),
    }


def main():
    data_path = Path(settings.kol_data_path)
    kols = json.loads(data_path.read_text(encoding="utf-8"))

    model = SentenceTransformer(MODEL_NAME)
    texts = [build_text(k) for k in kols]
    embeddings = model.encode(texts).tolist()

    from chromadb.config import Settings
    client = chromadb.PersistentClient(
        path=settings.chroma_persist_dir,
        settings=Settings(anonymized_telemetry=False),
    )
    collection = client.get_or_create_collection(settings.kol_collection_name)

    collection.upsert(
        ids=[k["id"] for k in kols],
        embeddings=embeddings,
        metadatas=[flatten_metadata(k) for k in kols],
        documents=texts,
    )
    print(f"Ingested {len(kols)} KOLs into '{settings.kol_collection_name}'")


if __name__ == "__main__":
    main()
