import streamlit as st
import plotly.express as px
import pandas as pd
import numpy as np
from utils.data_loader import load_roi_analysis
from utils.formatters import format_vnd, format_pct

st.set_page_config(page_title="ROI Analysis", page_icon="💰", layout="wide")
TEMPLATE = "plotly_dark"

st.title("💰 ROI Analysis")
st.markdown("Evaluate which matching strategies, talent types, and project types deliver the best return.")

st.info(
    "📌 ROI estimates are based on simulated conversion rates for POC purposes. "
    "In production, these will be replaced with actual campaign performance data."
)

roi = load_roi_analysis()

# Cap extreme ROI to prevent chart distortion
ROI_CAP = 5000
roi["roi_capped"] = roi["roi_percent"].clip(-500, ROI_CAP)

# --- Filters ---
st.sidebar.header("ROI Filters")

tt_opts = ["All"] + sorted(roi["talent_type"].dropna().unique().tolist())
sel_tt = st.sidebar.selectbox("Talent Type", tt_opts)

pt_opts = ["All"] + sorted(roi["project_type"].dropna().unique().tolist())
sel_pt = st.sidebar.selectbox("Project Type", pt_opts)

ib_opts = ["All"] + sorted(roi["initiated_by"].dropna().unique().tolist())
sel_ib = st.sidebar.selectbox("Initiated By", ib_opts)

ms_opts = ["All"] + sorted(roi["status"].dropna().unique().tolist())
sel_ms = st.sidebar.selectbox("Match Status", ms_opts)

filtered = roi.copy()
if sel_tt != "All":
    filtered = filtered[filtered["talent_type"] == sel_tt]
if sel_pt != "All":
    filtered = filtered[filtered["project_type"] == sel_pt]
if sel_ib != "All":
    filtered = filtered[filtered["initiated_by"] == sel_ib]
if sel_ms != "All":
    filtered = filtered[filtered["status"] == sel_ms]

valid_roi = filtered["roi_percent"].dropna()

# --- KPIs ---
st.subheader("Key ROI Metrics")
k1, k2, k3, k4 = st.columns(4)
k1.metric("Avg ROI%", format_pct(valid_roi.mean()) if len(valid_roi) > 0 else "N/A")
k2.metric("Median ROI%", format_pct(valid_roi.median()) if len(valid_roi) > 0 else "N/A")

if len(valid_roi) > 0:
    best_idx = filtered["roi_percent"].idxmax()
    worst_idx = filtered["roi_percent"].idxmin()
    best_name = filtered.loc[best_idx, "talent_name"] if pd.notna(filtered.loc[best_idx, "talent_name"]) else "Unknown"
    worst_name = filtered.loc[worst_idx, "talent_name"] if pd.notna(filtered.loc[worst_idx, "talent_name"]) else "Unknown"
    k3.metric("Best ROI", f"{filtered.loc[best_idx, 'roi_percent']:.0f}%", delta=best_name)
    k4.metric("Worst ROI", f"{filtered.loc[worst_idx, 'roi_percent']:.0f}%", delta=worst_name, delta_color="inverse")

st.divider()

# --- ROI by Matching Type (KEY INSIGHT) ---
col1, col2 = st.columns(2)

with col1:
    st.subheader("ROI by Matching Type")
    st.markdown("**Key insight:** Which matching method yields better ROI for brands?")
    by_init = filtered.groupby("initiated_by")["roi_capped"].median().reset_index()
    by_init.columns = ["initiated_by", "median_roi"]
    fig_init = px.bar(
        by_init, x="initiated_by", y="median_roi", color="initiated_by",
        template=TEMPLATE, text_auto=".0f",
        labels={"initiated_by": "Matching Method", "median_roi": "Median ROI%"},
    )
    fig_init.update_layout(showlegend=False)
    st.plotly_chart(fig_init, use_container_width=True)

with col2:
    st.subheader("ROI by Project Type")
    st.markdown("Which project categories generate the highest returns?")
    by_pt = filtered.groupby("project_type")["roi_capped"].median().reset_index()
    by_pt.columns = ["project_type", "median_roi"]
    fig_pt = px.bar(
        by_pt, x="project_type", y="median_roi", color="project_type",
        template=TEMPLATE, text_auto=".0f",
        labels={"project_type": "Project Type", "median_roi": "Median ROI%"},
    )
    fig_pt.update_layout(showlegend=False)
    st.plotly_chart(fig_pt, use_container_width=True)

# --- ROI by Talent Type ---
st.subheader("ROI by Talent Type")
st.markdown("Side-by-side comparison of Director vs KOL return on investment.")
by_talent = filtered.groupby("talent_type")["roi_capped"].agg(["median", "mean", "count"]).reset_index()
by_talent.columns = ["talent_type", "median_roi", "mean_roi", "count"]
fig_talent = px.bar(
    by_talent, x="talent_type", y="median_roi", color="talent_type",
    template=TEMPLATE, text_auto=".0f",
    labels={"talent_type": "Talent Type", "median_roi": "Median ROI%"},
)
fig_talent.update_layout(showlegend=False)
c1, c2, c3 = st.columns([2, 1, 1])
with c1:
    st.plotly_chart(fig_talent, use_container_width=True)
with c2:
    for _, row in by_talent.iterrows():
        st.metric(f"{row['talent_type']} Median ROI", format_pct(row["median_roi"]))
with c3:
    for _, row in by_talent.iterrows():
        st.metric(f"{row['talent_type']} Matches", f"{int(row['count']):,}")

st.divider()

# --- Cost Efficiency Scatter ---
col3, col4 = st.columns(2)

with col3:
    st.subheader("Cost Efficiency — Fee vs ROI")
    st.markdown("Find the sweet spot: good ROI without overpaying. Bubble size = match score.")
    scatter_df = filtered.dropna(subset=["proposed_fee", "roi_capped", "match_score"])
    if len(scatter_df) > 0:
        fig_cost = px.scatter(
            scatter_df, x="proposed_fee", y="roi_capped",
            color="talent_type", size="match_score",
            hover_name="talent_name", template=TEMPLATE,
            labels={
                "proposed_fee": "Proposed Fee (VND)",
                "roi_capped": f"ROI% (capped at {ROI_CAP}%)",
                "talent_type": "Talent Type",
            },
        )
        st.plotly_chart(fig_cost, use_container_width=True)

with col4:
    st.subheader("Quality vs ROI")
    st.markdown("Does higher quality work translate to higher returns?")
    q_df = filtered.dropna(subset=["quality_score", "roi_capped"])
    if len(q_df) > 0:
        fig_quality = px.scatter(
            q_df, x="quality_score", y="roi_capped",
            color="talent_type", hover_name="talent_name",
            template=TEMPLATE, trendline="ols",
            labels={
                "quality_score": "Quality Score",
                "roi_capped": f"ROI% (capped at {ROI_CAP}%)",
            },
        )
        st.plotly_chart(fig_quality, use_container_width=True)

# --- Top / Bottom Tables ---
st.divider()
col5, col6 = st.columns(2)

display_cols = ["talent_name", "title", "project_type", "talent_type",
                "initiated_by", "proposed_fee", "match_score",
                "quality_score", "roi_percent"]
avail_cols = [c for c in display_cols if c in filtered.columns]

with col5:
    st.subheader("🏆 Top 10 ROI Matches")
    top10 = filtered.nlargest(10, "roi_percent")[avail_cols].copy()
    if "proposed_fee" in top10.columns:
        top10["proposed_fee"] = top10["proposed_fee"].apply(format_vnd)
    top10["roi_percent"] = top10["roi_percent"].apply(lambda x: format_pct(x, 0))
    st.dataframe(top10, use_container_width=True, hide_index=True)

with col6:
    st.subheader("⚠️ Bottom 10 ROI Matches")
    bottom10 = filtered.nsmallest(10, "roi_percent")[avail_cols].copy()
    if "proposed_fee" in bottom10.columns:
        bottom10["proposed_fee"] = bottom10["proposed_fee"].apply(format_vnd)
    bottom10["roi_percent"] = bottom10["roi_percent"].apply(lambda x: format_pct(x, 0))
    st.dataframe(bottom10, use_container_width=True, hide_index=True)

# --- Outlier Callouts ---
neg_roi = filtered[filtered["roi_percent"] < 0]
extreme_roi = filtered[filtered["roi_percent"] > ROI_CAP]

if len(neg_roi) > 0:
    st.warning(
        f"⚠️ **{len(neg_roi)} matches have negative ROI** — "
        "the proposed fee exceeded the estimated revenue. "
        "These may reflect overpriced talent or low-conversion projects."
    )

if len(extreme_roi) > 0:
    st.info(
        f"ℹ️ **{len(extreme_roi)} matches have ROI > {ROI_CAP}%** — "
        "likely driven by low fees combined with high estimated reach. "
        "Charts cap these values to keep scales readable."
    )
