import streamlit as st
from utils.data_loader import load_users, load_projects, load_matches
from utils.formatters import format_pct

st.set_page_config(
    page_title="ALIEN Platform — Talent Matching Analytics",
    page_icon="👽",
    layout="wide",
    initial_sidebar_state="expanded",
)

CHART_TEMPLATE = "plotly_dark"

st.markdown(
    """
    <style>
    .block-container { padding-top: 1.5rem; }
    div[data-testid="stMetric"] {
        background: rgba(28, 131, 225, 0.08);
        border: 1px solid rgba(28, 131, 225, 0.15);
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("👽 ALIEN Platform — Talent Matching Analytics")
st.markdown(
    "Welcome to the analytics hub for Vietnam's talent-matching marketplace. "
    "Use the sidebar to explore detailed dashboards."
)

st.divider()

users = load_users()
projects = load_projects()
matches = load_matches()

total_users = len(users)
role_counts = users["role"].value_counts()
active_projects = len(projects[projects["status"].isin(["OPEN", "IN_PROGRESS"])])
total_matches = len(matches)
avg_score = matches["match_score"].mean()
hired = len(matches[matches["status"] == "HIRED"])
hire_rate = (hired / total_matches * 100) if total_matches > 0 else 0

st.subheader("Platform Health KPIs")

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Total Users", f"{total_users:,}")
c2.metric("Active Projects", f"{active_projects:,}")
c3.metric("Total Matches", f"{total_matches:,}")
c4.metric("Avg Match Score", f"{avg_score:.2f}")
c5.metric("Hire Rate", format_pct(hire_rate))

st.divider()

st.subheader("Users by Role")
cols = st.columns(len(role_counts))
for i, (role, count) in enumerate(role_counts.items()):
    cols[i].metric(role, f"{count:,}")

st.divider()
st.caption("Navigate to the pages in the sidebar for deeper analysis.")
