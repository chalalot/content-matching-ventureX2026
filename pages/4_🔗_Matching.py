import streamlit as st
import plotly.express as px
import pandas as pd
from utils.data_loader import (
    load_matches, load_projects, load_users,
    load_director_profiles, load_kol_profiles,
)
from utils.formatters import format_vnd, format_pct

st.set_page_config(page_title="Matching", page_icon="🔗", layout="wide")
TEMPLATE = "plotly_dark"

st.title("🔗 Matching Analytics")
st.markdown("How talent and brands connect — funnel conversion, scoring, and fee analysis.")

matches = load_matches()
projects = load_projects()
users = load_users()
directors = load_director_profiles()
kols = load_kol_profiles()

# Enrich matches with project info and talent names
df = matches.merge(
    projects[["project_id", "title", "project_type"]],
    on="project_id", how="left",
)
talent_role = users[["user_id", "role"]].rename(columns={"user_id": "talent_user_id"})
df = df.merge(talent_role, on="talent_user_id", how="left")

dir_names = directors[["user_id", "full_name"]].rename(
    columns={"user_id": "talent_user_id", "full_name": "talent_name"}
)
kol_names = kols[["user_id", "stage_name"]].rename(
    columns={"user_id": "talent_user_id", "stage_name": "talent_name"}
)
names = pd.concat([dir_names, kol_names])
df = df.merge(names, on="talent_user_id", how="left")

# --- Filters ---
st.sidebar.header("Match Filters")

init_opts = ["All"] + sorted(df["initiated_by"].dropna().unique().tolist())
sel_init = st.sidebar.selectbox("Initiated By", init_opts)

mstatus_opts = ["All"] + sorted(df["status"].dropna().unique().tolist())
sel_mstatus = st.sidebar.selectbox("Match Status", mstatus_opts)

role_opts = ["All"] + sorted(df["role"].dropna().unique().tolist())
sel_role = st.sidebar.selectbox("Talent Type", role_opts)

ptype_opts = ["All"] + sorted(df["project_type"].dropna().unique().tolist())
sel_ptype = st.sidebar.selectbox("Project Type", ptype_opts)

filtered = df.copy()
if sel_init != "All":
    filtered = filtered[filtered["initiated_by"] == sel_init]
if sel_mstatus != "All":
    filtered = filtered[filtered["status"] == sel_mstatus]
if sel_role != "All":
    filtered = filtered[filtered["role"] == sel_role]
if sel_ptype != "All":
    filtered = filtered[filtered["project_type"] == sel_ptype]

# --- KPIs ---
st.subheader("Key Metrics")
total = len(filtered)
hired = len(filtered[filtered["status"] == "HIRED"])
hire_rate = (hired / total * 100) if total > 0 else 0
avg_score = filtered["match_score"].mean()
avg_fee = filtered["proposed_fee"].mean()

k1, k2, k3, k4 = st.columns(4)
k1.metric("Total Matches", f"{total:,}")
k2.metric("Hire Rate", format_pct(hire_rate))
k3.metric("Avg Match Score", f"{avg_score:.2f}" if pd.notna(avg_score) else "N/A")
k4.metric("Avg Proposed Fee", format_vnd(avg_fee))

st.divider()

# --- Match Funnel ---
col1, col2 = st.columns(2)

with col1:
    st.subheader("Match Funnel")
    st.markdown("Conversion through the matching pipeline stages.")
    funnel_order = ["PENDING", "SHORTLISTED", "PITCHING", "HIRED"]
    funnel_counts = filtered["status"].value_counts()
    funnel_data = pd.DataFrame({
        "stage": funnel_order + ["REJECTED"],
        "count": [funnel_counts.get(s, 0) for s in funnel_order + ["REJECTED"]],
    })
    fig_funnel = px.funnel(
        funnel_data[funnel_data["stage"] != "REJECTED"],
        x="count", y="stage", template=TEMPLATE,
        color_discrete_sequence=["#636EFA"],
    )
    rejected = funnel_counts.get("REJECTED", 0)
    if rejected > 0:
        st.caption(f"⚠️ {rejected} matches were REJECTED")
    st.plotly_chart(fig_funnel, use_container_width=True)

with col2:
    st.subheader("Matching Source Comparison")
    st.markdown("Which initiation method leads to the most hires and highest scores?")
    source_agg = filtered.groupby("initiated_by").agg(
        count=("match_id", "count"),
        avg_score=("match_score", "mean"),
        hired=("status", lambda x: (x == "HIRED").sum()),
    ).reset_index()
    source_agg["hire_rate"] = (source_agg["hired"] / source_agg["count"] * 100).round(1)

    fig_source = px.bar(
        source_agg.melt(id_vars="initiated_by", value_vars=["count", "avg_score", "hire_rate"]),
        x="initiated_by", y="value", color="variable", barmode="group",
        template=TEMPLATE, facet_row="variable",
        labels={"initiated_by": "Source", "value": ""},
    )
    fig_source.update_yaxes(matches=None)
    fig_source.for_each_annotation(lambda a: a.update(text=a.text.split("=")[-1]))
    st.plotly_chart(fig_source, use_container_width=True)

# --- Score Distribution ---
col3, col4 = st.columns(2)

with col3:
    st.subheader("Match Score Distribution")
    st.markdown("How match scores spread across different outcomes.")
    fig_hist = px.histogram(
        filtered, x="match_score", color="status", nbins=20,
        template=TEMPLATE, barmode="overlay", opacity=0.7,
        labels={"match_score": "Match Score", "status": "Status"},
    )
    st.plotly_chart(fig_hist, use_container_width=True)

with col4:
    st.subheader("Fee vs Match Score")
    st.markdown("Higher fees don't always mean higher scores — look for the sweet spot.")
    fig_fee = px.scatter(
        filtered, x="proposed_fee", y="match_score", color="status",
        template=TEMPLATE, opacity=0.7,
        labels={"proposed_fee": "Proposed Fee (VND)", "match_score": "Match Score"},
    )
    st.plotly_chart(fig_fee, use_container_width=True)

# --- Table ---
st.subheader("Match Details")
show_cols = ["talent_name", "title", "project_type", "initiated_by",
             "match_score", "proposed_fee", "status"]
show = filtered[[c for c in show_cols if c in filtered.columns]].copy()
if "proposed_fee" in show.columns:
    show["proposed_fee"] = show["proposed_fee"].apply(format_vnd)
st.dataframe(show.sort_values("match_score", ascending=False), use_container_width=True, hide_index=True)
