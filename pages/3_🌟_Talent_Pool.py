import streamlit as st
import plotly.express as px
import pandas as pd
from utils.data_loader import (
    load_director_profiles, load_kol_profiles,
    load_kol_social_metrics, load_portfolios,
)
from utils.formatters import format_vnd, format_number

st.set_page_config(page_title="Talent Pool", page_icon="🌟", layout="wide")
TEMPLATE = "plotly_dark"

st.title("🌟 Talent Pool")
st.markdown("Deep dive into directors and KOLs available on the platform.")

directors = load_director_profiles()
kols = load_kol_profiles()
social = load_kol_social_metrics()
portfolios = load_portfolios()

tab_dir, tab_kol = st.tabs(["🎬 Directors", "📱 KOLs"])

# ==================== DIRECTORS ====================
with tab_dir:
    st.subheader("Director Overview")

    total_dir = len(directors)
    avg_exp = directors["years_of_experience"].mean()
    avg_rate = directors["base_day_rate"].mean()
    avail_rate = directors["availability_status"].sum() / total_dir * 100 if total_dir > 0 else 0

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Total Directors", total_dir)
    k2.metric("Avg Experience", f"{avg_exp:.1f} yrs")
    k3.metric("Avg Day Rate", format_vnd(avg_rate))
    k4.metric("Availability", f"{avail_rate:.0f}%")

    st.divider()
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Experience vs Day Rate")
        st.markdown("Each bubble's size reflects the number of portfolio items.")
        port_count = portfolios.groupby("user_id").size().reset_index(name="portfolio_count")
        dir_scatter = directors.merge(port_count, on="user_id", how="left")
        dir_scatter["portfolio_count"] = dir_scatter["portfolio_count"].fillna(1).astype(int)

        fig_scatter = px.scatter(
            dir_scatter, x="years_of_experience", y="base_day_rate",
            size="portfolio_count", hover_name="full_name",
            template=TEMPLATE, color="primary_location",
            labels={
                "years_of_experience": "Years of Experience",
                "base_day_rate": "Day Rate (VND)",
                "primary_location": "Location",
            },
        )
        st.plotly_chart(fig_scatter, use_container_width=True)

    with col2:
        st.subheader("Directors by Location")
        loc_counts = directors["primary_location"].value_counts().reset_index()
        loc_counts.columns = ["location", "count"]
        fig_loc = px.bar(
            loc_counts, x="count", y="location", orientation="h",
            template=TEMPLATE, color="location",
            color_discrete_sequence=px.colors.qualitative.Pastel,
        )
        fig_loc.update_layout(showlegend=False)
        st.plotly_chart(fig_loc, use_container_width=True)

    st.subheader("Director Profiles")
    show_dir = directors[["full_name", "years_of_experience", "base_day_rate",
                          "primary_location", "availability_status"]].copy()
    show_dir["base_day_rate"] = show_dir["base_day_rate"].apply(format_vnd)
    st.dataframe(show_dir, use_container_width=True, hide_index=True)

# ==================== KOLS ====================
with tab_kol:
    st.subheader("KOL Overview")

    kol_social = kols.merge(
        social.groupby("kol_id").agg(
            total_followers=("follower_count", "sum"),
            avg_engagement=("avg_engagement_rate", "mean"),
        ).reset_index(),
        on="kol_id", how="left",
    )

    total_kol = len(kols)
    avg_followers = kol_social["total_followers"].mean()
    avg_engage = kol_social["avg_engagement"].mean()
    avg_fee = kols["booking_fee_estimate"].mean()

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Total KOLs", total_kol)
    k2.metric("Avg Followers", format_number(avg_followers))
    k3.metric("Avg Engagement", f"{avg_engage:.2f}%")
    k4.metric("Avg Booking Fee", format_vnd(avg_fee))

    st.divider()

    # Value Quadrant
    st.subheader("Value Quadrant — Followers vs Engagement")
    st.markdown(
        "Top-right quadrant = high reach + high engagement — the most valuable KOLs. "
        "Color indicates content niche."
    )
    fig_quad = px.scatter(
        kol_social, x="total_followers", y="avg_engagement",
        color="main_niche", hover_name="stage_name",
        template=TEMPLATE,
        labels={
            "total_followers": "Total Followers",
            "avg_engagement": "Avg Engagement Rate (%)",
            "main_niche": "Niche",
        },
    )
    st.plotly_chart(fig_quad, use_container_width=True)

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("KOLs by Platform")
        st.markdown("Number of KOL presences on each social platform.")
        plat_counts = social["platform"].value_counts().reset_index()
        plat_counts.columns = ["platform", "count"]
        fig_plat = px.bar(
            plat_counts, x="platform", y="count", color="platform",
            template=TEMPLATE,
            color_discrete_sequence=px.colors.qualitative.Bold,
        )
        fig_plat.update_layout(showlegend=False)
        st.plotly_chart(fig_plat, use_container_width=True)

    with col2:
        st.subheader("Niche Distribution")
        niche_counts = kols["main_niche"].value_counts().reset_index()
        niche_counts.columns = ["niche", "count"]
        fig_niche = px.pie(
            niche_counts, values="count", names="niche", hole=0.4,
            template=TEMPLATE,
        )
        st.plotly_chart(fig_niche, use_container_width=True)

    st.subheader("KOL Profiles with Social Metrics")
    show_kol = kol_social[["stage_name", "main_niche", "target_demographic_age",
                           "booking_fee_estimate", "total_followers", "avg_engagement"]].copy()
    show_kol["booking_fee_estimate"] = show_kol["booking_fee_estimate"].apply(format_vnd)
    show_kol["total_followers"] = show_kol["total_followers"].apply(format_number)
    st.dataframe(show_kol, use_container_width=True, hide_index=True)
