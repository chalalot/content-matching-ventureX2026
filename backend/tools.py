import requests
from langchain.tools import tool

from config import settings


def format_results_to_string(search_data) -> str:
    output = []
    output.append("=" * 80)
    output.append("SEARCH SUMMARY")
    output.append("=" * 80)

    results = search_data.get("results", [])

    if not results:
        return "No results found."

    for index, article in enumerate(results, 1):
        title = article.get("title", "No Title Available")
        url = article.get("url", "No URL Available")
        date = article.get("publishedDate", "Unknown Date")
        author = article.get("author", "Unknown Author")
        highlights = article.get("highlights", [])

        clean_date = date.split("T")[0] if "T" in date else date

        output.append(f"\n[{index}] {title}")
        output.append(f"Author: {author}|Date: {clean_date}")
        output.append(f"URL:    {url}")
        output.append("Key Highlights:")

        for hl in highlights:
            clean_hl = " ".join(hl.split())
            output.append(f"      • {clean_hl}")

        output.append("-" * 80)

    return "\n".join(output)


@tool(description="Search the web for information on query.")
def search_web(query: str) -> str:
    print(query)

    headers = {
        "content-type": "application/json",
        "x-api-key": settings.websearch_api_key,
    }

    payload = {
        "query": query,
        "numResults": 20,
        "type": "auto",
        "contents": {"highlights": True},
    }

    response = requests.post(settings.websearch_url, headers=headers, json=payload)

    if response.status_code != 200:
        return f"Error {response.status_code}: {response.text}"

    search_data = response.json()
    return format_results_to_string(search_data)
