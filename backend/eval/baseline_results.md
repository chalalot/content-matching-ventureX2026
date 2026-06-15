# Eval baseline — Layer 1 & Layer 2

_Generated: 2026-06-14 03:47 UTC_

Retrieval depth top_k=60. Metrics: **L1 recall@60** (did the right candidate reach the shortlist), **L2 precision@k** (k = #expected; fraction of the top-k that are correct), **L2 recall@5** (expected found in the final top-5), **MRR** (1 / rank of the first expected candidate). No Layer 3 / LLM involved.
### Directors

| Brief | L1 recall@60 | L2 precision@k | L2 recall@5 | MRR | expected ranks |
|-------|:-----------:|:--------------:|:-----------:|:---:|----------------|
| D1-fmcg-emotional-tvc | 1.00 | 1.00 | 1.00 | 1.00 | DIR=#1, DIR=#2 |
| D2-luxury-premium-tvc | 1.00 | 1.00 | 1.00 | 1.00 | DIR=#1, DIR=#3, DIR=#2 |
| D3-tech-bold-tvc | 1.00 | 1.00 | 1.00 | 1.00 | DIR=#2, DIR=#1 |
| D4-music-video-emotional | 1.00 | 1.00 | 1.00 | 1.00 | DIR=#1, DIR=#2 |
| D5-documentary-healthcare | 1.00 | 1.00 | 1.00 | 1.00 | DIR=#1, DIR=#2 |
| D6-digital-beauty-lifestyle | 1.00 | 1.00 | 1.00 | 1.00 | DIR=#1, DIR=#2 |
| **MEAN** | **1.00** | **1.00** | **1.00** | **1.00** | |

### Directors (hard)

| Brief | L1 recall@60 | L2 precision@k | L2 recall@5 | MRR | expected ranks |
|-------|:-----------:|:--------------:|:-----------:|:---:|----------------|
| H1-offvocab-campaign-type | 1.00 | 1.00 | 1.00 | 1.00 | DIR=#1 |
| H5-deadline-flexibility | 1.00 | 1.00 | 1.00 | 1.00 | DIR=#1 |
| **MEAN** | **1.00** | **1.00** | **1.00** | **1.00** | |

### KOLs

| Brief | L1 recall@60 | L2 precision@k | L2 recall@5 | MRR | expected ranks |
|-------|:-----------:|:--------------:|:-----------:|:---:|----------------|
| K1-skincare-tiktok-18-24 | 1.00 | 0.33 | 1.00 | 1.00 | 8a03869b=#1, cc79a107=#5, a1b79b4b=#4 |
| K2-tech-unboxing-tiktok-18-34 | 1.00 | 1.00 | 1.00 | 1.00 | 96bd9808=#3, 3e99f8d1=#2, 17d7c5c8=#1 |
| K3-beauty-haul-tiktok-18-24 | 1.00 | 0.50 | 1.00 | 1.00 | b0a1ce6e=#1, 80c3c446=#3 |
| K4-fashion-tiktok-18-34 | 1.00 | 1.00 | 1.00 | 1.00 | a5e59481=#1, f08d50ed=#2 |
| K5-music-influencer-instagram-18-24 | 1.00 | 0.50 | 1.00 | 1.00 | 4958726b=#1, d8da0b21=#3 |
| **MEAN** | **1.00** | **0.67** | **1.00** | **1.00** | |

### KOLs (hard)

| Brief | L1 recall@60 | L2 precision@k | L2 recall@5 | MRR | expected ranks |
|-------|:-----------:|:--------------:|:-----------:|:---:|----------------|
| HK1-wellness-tail-niche | 1.00 | 1.00 | 1.00 | 1.00 | 8f457b69=#1 |
| HK2-homedecor-tail-niche | 1.00 | 1.00 | 1.00 | 1.00 | 64e154a0=#1, 67f03886=#2 |
| HK3-workwear-as-fashion | 1.00 | 1.00 | 1.00 | 1.00 | a876626a=#1 |
| HK4-fitness-age-fit | 1.00 | 0.50 | 1.00 | 1.00 | c3adb816=#1, ca63c9ea=#3 |
| HK5-comedy-influencer-miss | 1.00 | 1.00 | 1.00 | 1.00 | 4d6c3f3a=#1 |
| **MEAN** | **1.00** | **0.90** | **1.00** | **1.00** | |
