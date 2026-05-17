import os
import pandas as pd
import streamlit as st

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dataset")


def _load(filename: str) -> pd.DataFrame:
    return pd.read_csv(os.path.join(DATA_DIR, filename), encoding="utf-8")


@st.cache_data
def load_users() -> pd.DataFrame:
    df = _load("01_users.csv")
    df["created_at"] = pd.to_datetime(df["created_at"])
    df["last_login"] = pd.to_datetime(df["last_login"])
    return df


@st.cache_data
def load_company_profiles() -> pd.DataFrame:
    return _load("02_company_profiles.csv")


@st.cache_data
def load_director_profiles() -> pd.DataFrame:
    return _load("03_director_profiles.csv")


@st.cache_data
def load_kol_profiles() -> pd.DataFrame:
    return _load("04_kol_profiles.csv")


@st.cache_data
def load_kol_social_metrics() -> pd.DataFrame:
    return _load("05_kol_social_metrics.csv")


@st.cache_data
def load_portfolios() -> pd.DataFrame:
    return _load("06_portfolios.csv")


@st.cache_data
def load_categories() -> pd.DataFrame:
    return _load("07_categories.csv")


@st.cache_data
def load_user_categories() -> pd.DataFrame:
    return _load("08_user_categories.csv")


@st.cache_data
def load_projects() -> pd.DataFrame:
    df = _load("09_projects.csv")
    df["timeline_start"] = pd.to_datetime(df["timeline_start"])
    df["timeline_end"] = pd.to_datetime(df["timeline_end"])
    return df


@st.cache_data
def load_project_requirements() -> pd.DataFrame:
    return _load("10_project_requirements.csv")


@st.cache_data
def load_matches() -> pd.DataFrame:
    df = _load("11_matches_applications.csv")
    df["created_at"] = pd.to_datetime(df["created_at"])
    return df


@st.cache_data
def load_reviews() -> pd.DataFrame:
    return _load("12_reviews.csv")


@st.cache_data
def load_roi_analysis() -> pd.DataFrame:
    return _load("roi_analysis.csv")
