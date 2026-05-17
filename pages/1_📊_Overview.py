import streamlit as st
import plotly.express as px
import pandas as pd
from utils.data_loader import (
    load_users, load_projects, load_matches, load_reviews,
    load_director_profiles, load_kol_profiles,
)

st.set_page_config(page_title="Overview", page_icon="📊", layout="wide")
TEMPLATE = "plotly_dark"

st.title("📊 Platform Overview")
st.markdown("High-level view of user growth, distribution, and platform health.")

users = load_users()
projects = load_projects()
matches = load_matches()
reviews = load_reviews()
directors = load_director_profiles()
kols = load_kol_profiles()

# --- User Growth ---
st.subheader("User Growth Over Time")
st.markdown("Monthly registrations stacked by role — shows platform adoption trajectory.")

growth = users.copy()
growth["month"] = growth["created_at"].dt.to_period("M").astype(str)
growth_agg = growth.groupby(["month", "role"]).size().reset_index(name="count")

fig_growth = px.line(
    growth_agg, x="month", y="count", color="role",
    markers=True, template=TEMPLATE,
    labels={"month": "Month", "count": "Registrations", "role": "Role"},
)
fig_growth.update_layout(xaxis_tickangle=-45, legend_title_text="Role")
st.plotly_chart(fig_growth, use_container_width=True)

# --- Status & Role distributions ---
col1, col2 = st.columns(2)

with col1:
    st.subheader("User Status Distribution")
    st.markdown("Proportion of active vs pending vs suspended accounts.")
    status_counts = users["status"].value_counts().reset_index()
    status_counts.columns = ["status", "count"]
    fig_status = px.pie(
        status_counts, values="count", names="status", hole=0.45,
        template=TEMPLATE, color_discrete_sequence=px.colors.qualitative.Set2,
    )
    st.plotly_chart(fig_status, use_container_width=True)

with col2:
    st.subheader("Users by Role")
    st.markdown("Breakdown of platform participants by role type.")
    role_counts = users["role"].value_counts().reset_index()
    role_counts.columns = ["role", "count"]
    fig_role = px.bar(
        role_counts, y="role", x="count", orientation="h",
        template=TEMPLATE, color="role",
        color_discrete_sequence=px.colors.qualitative.Pastel,
    )
    fig_role.update_layout(showlegend=False)
    st.plotly_chart(fig_role, use_container_width=True)

# --- Geographic Distribution ---
st.subheader("Talent Geographic Distribution")
st.markdown("Where directors and KOLs are based across Vietnam.")

dir_loc = directors[["primary_location"]].rename(columns={"primary_location": "location"})
dir_loc["type"] = "Director"
kol_loc = pd.DataFrame({"location": ["Hồ Chí Minh"] * len(kols), "type": "KOL"})
geo = pd.concat([dir_loc, kol_loc], ignore_index=True)
geo_agg = geo.groupby(["location", "type"]).size().reset_index(name="count")

fig_geo = px.bar(
    geo_agg, x="count", y="location", color="type", orientation="h",
    template=TEMPLATE, barmode="stack",
    labels={"count": "Talent Count", "location": "Location"},
)
st.plotly_chart(fig_geo, use_container_width=True)

# --- Platform Health Table ---
st.subheader("Platform Health Summary")
health = pd.DataFrame({
    "Metric": ["Total Users", "Total Projects", "Total Matches", "Total Reviews",
               "Directors", "KOLs"],
    "Value": [len(users), len(projects), len(matches), len(reviews),
              len(directors), len(kols)],
})
st.dataframe(health, use_container_width=True, hide_index=True)
