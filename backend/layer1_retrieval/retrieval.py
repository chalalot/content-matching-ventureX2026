"""
Layer 1 — Semantic Retrieval
Owner: Mạnh (Backend Developer)

Goal: Given a brief (text), return the top-K most semantically relevant
      candidates from the vector index.

Steps to implement:
  1. Load candidate profiles from data/mockup/director_profiles.json
  2. Encode each profile's `bio` + `style_tags` + `genres` into a vector
     using a sentence-transformer model (e.g. 'paraphrase-multilingual-MiniLM-L12-v2')
  3. Store vectors in a FAISS index
  4. On query: encode the brief text → search FAISS → return top-K candidate IDs + scores

Keep it simple for now — no persistence needed, rebuild index on startup.
"""

import json
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
import faiss

DATA_PATH = Path(__file__).parents[2] / "data" / "mockup" / "director_profiles.json"
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

class CandidateRetriever:
    def __init__(self, top_k: int = 20):
        self.top_k = top_k
        self.model = None
        self.index = None
        self.candidates = []

    def build_index(self):
        """Load profiles, encode bios, build FAISS index."""
        with open(DATA_PATH) as f:
            self.candidates = json.load(f)

        self.model = SentenceTransformer(MODEL_NAME)
        texts = [
            f"{p['bio']} {' '.join(p['style_tags'])} {' '.join(p['genres'])}"
            for p in self.candidates
        ]
        embeddings = self.model.encode(texts, normalize_embeddings=True)
        embeddings = np.array(embeddings, dtype="float32")

        self.index = faiss.IndexFlatIP(embeddings.shape[1])
        self.index.add(embeddings)

    def search(self, brief: str) -> list[dict]:
        """
        Args:
            brief: free-text project brief
        Returns:
            List of candidate dicts, sorted by relevance desc
        """
        query = self.model.encode([brief], normalize_embeddings=True)
        query = np.array(query, dtype="float32")

        k = min(self.top_k, len(self.candidates))
        _, indices = self.index.search(query, k)

        return [self.candidates[i] for i in indices[0]]


# Singleton — built once on import
retriever = CandidateRetriever(top_k=20)
