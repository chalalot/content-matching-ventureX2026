"""One-time script to generate roi_analysis.csv from existing datasets."""
import os
import numpy as np
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), "dataset")

matches = pd.read_csv(os.path.join(DATA_DIR, "11_matches_applications.csv"))
projects = pd.read_csv(os.path.join(DATA_DIR, "09_projects.csv"))
users = pd.read_csv(os.path.join(DATA_DIR, "01_users.csv"))
directors = pd.read_csv(os.path.join(DATA_DIR, "03_director_profiles.csv"))
kols = pd.read_csv(os.path.join(DATA_DIR, "04_kol_profiles.csv"))
social = pd.read_csv(os.path.join(DATA_DIR, "05_kol_social_metrics.csv"))
reviews = pd.read_csv(os.path.join(DATA_DIR, "12_reviews.csv"))
companies = pd.read_csv(os.path.join(DATA_DIR, "02_company_profiles.csv"))

roi = matches.merge(projects, on="project_id", how="left", suffixes=("", "_proj"))
roi = roi.merge(companies[["company_id", "company_name"]], on="company_id", how="left")

talent_role = users[["user_id", "role"]].rename(columns={"user_id": "talent_user_id"})
roi = roi.merge(talent_role, on="talent_user_id", how="left")
roi.rename(columns={"role": "talent_type"}, inplace=True)

dir_map = directors[["user_id", "full_name"]].rename(columns={"user_id": "talent_user_id", "full_name": "talent_name"})
kol_map = kols[["user_id", "stage_name"]].rename(columns={"user_id": "talent_user_id", "stage_name": "talent_name"})
talent_names = pd.concat([dir_map, kol_map])
roi = roi.merge(talent_names, on="talent_user_id", how="left")

kol_social_agg = social.groupby("kol_id").agg(
    total_followers=("follower_count", "sum"),
    avg_engagement=("avg_engagement_rate", "mean"),
).reset_index()
kol_user_map = kols[["kol_id", "user_id"]].rename(columns={"user_id": "talent_user_id"})
kol_social_agg = kol_social_agg.merge(kol_user_map, on="kol_id", how="left")
roi = roi.merge(
    kol_social_agg[["talent_user_id", "total_followers", "avg_engagement"]],
    on="talent_user_id", how="left",
)

review_agg = reviews.groupby("reviewee_id").agg(
    avg_rating=("rating", "mean"),
    avg_punctuality=("punctuality_score", "mean"),
    avg_creativity=("creativity_score", "mean"),
).reset_index().rename(columns={"reviewee_id": "talent_user_id"})
roi = roi.merge(review_agg, on="talent_user_id", how="left")

rng = np.random.default_rng(42)
n = len(roi)

base_followers = roi["total_followers"].fillna(50000)
roi["estimated_reach"] = (base_followers * rng.uniform(0.05, 0.30, n)).astype(int)
roi["est_impressions"] = (roi["estimated_reach"] * rng.uniform(1.5, 4.0, n)).astype(int)
roi["est_conversions"] = (roi["est_impressions"] * rng.uniform(0.005, 0.03, n)).astype(int)
roi["est_revenue_vnd"] = (roi["est_conversions"] * rng.uniform(50_000, 500_000, n)).astype(int)

fee = roi["proposed_fee"].fillna(0).replace(0, np.nan)
roi["cost_efficiency_score"] = np.where(
    fee.notna() & (fee > 0),
    (roi["est_revenue_vnd"] / fee).clip(0, 20).round(2),
    np.nan,
)
roi["quality_score"] = roi[["avg_rating", "avg_punctuality", "avg_creativity"]].mean(axis=1).round(2)
mask = roi["quality_score"].isna()
roi.loc[mask, "quality_score"] = rng.uniform(2.5, 4.8, mask.sum()).round(2)

roi["roi_percent"] = np.where(
    fee.notna() & (fee > 0),
    (((roi["est_revenue_vnd"] - fee) / fee) * 100).round(1),
    np.nan,
)

keep_cols = [
    "match_id", "project_id", "talent_user_id", "talent_name", "talent_type",
    "company_name", "title", "project_type", "initiated_by", "status",
    "proposed_fee", "match_score", "created_at",
    "budget_min", "budget_max",
    "total_followers", "avg_engagement",
    "estimated_reach", "est_impressions", "est_conversions", "est_revenue_vnd",
    "cost_efficiency_score", "quality_score", "roi_percent",
]
roi = roi[[c for c in keep_cols if c in roi.columns]]
roi.to_csv(os.path.join(DATA_DIR, "roi_analysis.csv"), index=False, encoding="utf-8")
print(f"Generated roi_analysis.csv with {len(roi)} rows")
print(roi.head())
