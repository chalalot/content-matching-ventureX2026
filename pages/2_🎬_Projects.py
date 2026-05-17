import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from utils.data_loader import load_projects, load_company_profiles
from utils.formatters import format_vnd

st.set_page_config(page_title="Projects", page_icon="🎬", layout="wide")
TEMPLATE = "plotly_dark"

st.title("🎬 Project Analytics")
st.markdown("Explore project pipeline, budgets, timelines, and status breakdown.")

projects = load_projects()
companies = load_company_profiles()
df = projects.merge(companies[["company_id", "company_name"]], on="company_id", how="left")

# --- Filters ---
st.sidebar.header("Project Filters")
type_opts = ["All"] + sorted(df["project_type"].dropna().unique().tolist())
sel_type = st.sidebar.selectbox("Project Type", type_opts)

status_opts = ["All"] + sorted(df["status"].dropna().unique().tolist())
sel_status = st.sidebar.selectbox("Status", status_opts)

loc_opts = ["All"] + sorted(df["shooting_location"].dropna().unique().tolist())
sel_loc = st.sidebar.selectbox("Location", loc_opts)

filtered = df.copy()
if sel_type != "All":
    filtered = filtered[filtered["project_type"] == sel_type]
if sel_status != "All":
    filtered = filtered[filtered["status"] == sel_status]
if sel_loc != "All":
    filtered = filtered[filtered["shooting_location"] == sel_loc]

# --- KPIs ---
st.subheader("Key Metrics")
k1, k2, k3, k4 = st.columns(4)
k1.metric("Total Projects", len(filtered))
avg_min = filtered["budget_min"].mean()
avg_max = filtered["budget_max"].mean()
k2.metric("Avg Budget Range", f"{format_vnd(avg_min)} – {format_vnd(avg_max)}")
for s in ["OPEN", "IN_PROGRESS"]:
    count = len(filtered[filtered["status"] == s])
    if s == "OPEN":
        k3.metric("Open", count)
    else:
        k4.metric("In Progress", count)

st.divider()

# --- Budget Distribution ---
col1, col2 = st.columns(2)

with col1:
    st.subheader("Budget Distribution by Type")
    st.markdown("Spread of maximum budgets across project categories.")
    if len(filtered) > 0:
        fig_budget = px.box(
            filtered, x="project_type", y="budget_max",
            template=TEMPLATE, color="project_type",
            labels={"budget_max": "Max Budget (VND)", "project_type": "Type"},
        )
        fig_budget.update_layout(showlegend=False)
        st.plotly_chart(fig_budget, use_container_width=True)

with col2:
    st.subheader("Project Status Funnel")
    st.markdown("How projects flow through the pipeline stages.")
    status_order = ["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
    status_counts = filtered["status"].value_counts().reindex(status_order, fill_value=0)
    fig_funnel = px.bar(
        x=status_counts.values, y=status_counts.index, orientation="h",
        template=TEMPLATE, color=status_counts.index,
        labels={"x": "Count", "y": "Status"},
        color_discrete_sequence=px.colors.qualitative.Safe,
    )
    fig_funnel.update_layout(showlegend=False)
    st.plotly_chart(fig_funnel, use_container_width=True)

# --- Timeline ---
st.subheader("Project Timelines")
st.markdown("Duration of each project from start to end date.")
timeline_df = filtered.dropna(subset=["timeline_start", "timeline_end"]).copy()
if len(timeline_df) > 0:
    fig_gantt = px.timeline(
        timeline_df, x_start="timeline_start", x_end="timeline_end",
        y="title", color="project_type", template=TEMPLATE,
        labels={"title": "Project", "project_type": "Type"},
    )
    fig_gantt.update_yaxes(autorange="reversed")
    fig_gantt.update_layout(height=max(400, len(timeline_df) * 35))
    st.plotly_chart(fig_gantt, use_container_width=True)

# --- Data Table ---
st.subheader("Projects Table")
display_cols = ["title", "company_name", "project_type", "budget_min", "budget_max",
                "status", "shooting_location", "timeline_start", "timeline_end"]
show = filtered[display_cols].copy()
show["budget_min"] = show["budget_min"].apply(format_vnd)
show["budget_max"] = show["budget_max"].apply(format_vnd)
st.dataframe(show, use_container_width=True, hide_index=True)
