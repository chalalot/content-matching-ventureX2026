# Benchmark: Before vs. After (Layer 1 & Layer 2 fixes)

**Date:** 2026-06-14
**How measured:** [backend/eval/](../../backend/eval/) — 18 hand-labeled test briefs (directors + KOLs), each with a known "right answer". No LLM involved; pure retrieval + scoring.

---

## At a glance

> We ran the engine on 18 example briefs. **3 of them** had the right creator missed or buried.
> After two small fixes, **all 3 are fixed — and nothing else got worse for the user.**

| | Before | After |
|---|:---:|:---:|
| Briefs where the right creator was **missed or buried** | **3** | **0** ✅ |
| Briefs where the #1 pick is correct | 15 / 18 | **18 / 18** ✅ |

---

## What the scores mean (plain English)

| Metric | Question it answers | Best |
|--------|---------------------|:----:|
| **L1 recall** | Did the right creator even make it onto the consideration list? | 1.00 |
| **Recall@5** | Is the right creator in the final top-5 shown to the user? | 1.00 |
| **MRR** | Is our **#1 pick** correct? (1.00 = always #1) | 1.00 |
| Precision@k | Of the top spots, how many are "exact" matches? (stricter) | 1.00 |

*(Scores run 0.00 = worst to 1.00 = perfect.)*

---

## The scoreboard

### Directors — already perfect, stayed perfect ✅

| | Recall@5 | MRR |
|---|:---:|:---:|
| Before | 1.00 | 1.00 |
| After | 1.00 | 1.00 |

*No change made to directors — the engine was already correct on every director brief.*

### KOLs — this is where the wins are 🎯

| | L1 recall | Recall@5 | MRR |
|---|:---:|:---:|:---:|
| Before (easy briefs) | 0.90 | 0.90 | 1.00 |
| **After (easy briefs)** | **1.00** | **1.00** | **1.00** |
| Before (hard briefs) | 0.80 | 0.80 | 0.64 |
| **After (hard briefs)** | **1.00** | **1.00** | **1.00** |

---

## The 3 real cases we fixed (concrete)

| Creator | Brief | Before | After |
|---------|-------|:------:|:-----:|
| **Sơn Tùng M-TP (Premium)** | Music influencer, Instagram | ❌ never shown (missed) | ✅ **#1** |
| **Phương Ly** | Comedy creator, Facebook | ❌ never shown (missed) | ✅ **#1** |
| **@WorkwearWendy** | Workwear for a "Fashion" brief | ⚠️ buried at #8 | ✅ **#1** |

**In words:**
- The first two were genuinely *good* matches that the engine threw away before it ever scored them.
- The third was scored unfairly low because her label said "Workwear" and the brief said "Fashion" — even though workwear *is* fashion.

---

## What we changed (just two small things)

1. **Look at more candidates before deciding** (Fix #1)
   The engine was only scoring the closest 20 of 53 creators, so good ones got dropped before scoring. We now let the scorer see the whole pool.
   → Fixed **Sơn Tùng** and **Phương Ly**.

2. **Teach it that similar niche words mean similar things** (Fix #2)
   Added a small list so related niches (Workwear↔Fashion, Skincare↔Beauty, Fitness↔Wellness) get partial credit instead of a near-zero score.
   → Fixed **@WorkwearWendy**.

Both changes are tiny, deterministic (same input → same output), and use **no AI / no API key / no extra cost**.

---

## The one honest trade-off

On the "easy" KOL briefs, **Precision@k dropped 0.83 → 0.67.** Why: related-niche creators (e.g. a *Beauty* creator on a *Skincare* brief) now legitimately show up in the top spots, nudging the exact-match picks down a slot.

**But it never hurt the user-facing result** — the right creators still appear in the top-5 every time (Recall@5 stayed 1.00) and the #1 pick is still correct every time (MRR 1.00). This behavior is a dial we can tune (`RELATED_NICHE_SCORE`, currently 0.6).

---

## Important context (don't over-read these numbers)

- The catalog is **small** (25 directors, 53 KOLs). Fix #1 works partly *because* it's small enough to "score everyone." When the catalog grows to hundreds+, that fix becomes a real filter again and retrieval quality will need real work.
- The test set is **hand-labeled and small (18 briefs)**. It's enough to catch the obvious failures we found, not enough to claim a precise percentage. Treat this as "we fixed the 3 known holes," not "the engine is X% better overall."

---

## Reproduce it yourself

```powershell
cd backend
python ingest.py ; python ingest_kols.py   # once, builds the search index
python eval/run_eval.py                     # prints the scoreboard + writes baseline_results.md
```

To partially reproduce the "before" numbers, run with the old retrieval depth:

```powershell
$env:EVAL_TOP_K = "20"; python eval/run_eval.py   # reverts Fix #1 only
```

> Note: this reverts **only Fix #1** (retrieval depth). Fix #2 (the niche synonym map in
> `scoring_kol.py`) is still active, so this won't perfectly reproduce the original numbers —
> to fully revert you'd also remove `_NICHE_GROUPS`. The "before" column in the tables above
> is the true original (top_k=20 + binary niche matching).

Full results: [backend/eval/baseline_results.md](../../backend/eval/baseline_results.md).
