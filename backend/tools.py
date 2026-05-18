import requests
from langchain.tools import tool

from config import settings


@tool(description="Search the web for information on query.")
def search_web(query: str) -> str:
    # Update the endpoint to Brave's LLM Context API
    context_url = "https://api.search.brave.com/res/v1/llm/context"

    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": settings.websearch_api_key,
    }

    params = {
        "q": query,
        "maximum_number_of_tokens": 8192,  # Optional: Controls the maximum text budget returned
    }

    response = requests.get(context_url, headers=headers, params=params)
    results = response.json()

    formatted_results = []

    # The LLM Context API organizes text chunks inside 'grounding' -> 'generic'
    grounding = results.get("grounding", {})
    generic_results = grounding.get("generic", [])

    if generic_results:
        for index, item in enumerate(generic_results, start=1):
            title = item.get("title", "No Title")
            url = item.get("url", "No source URL available")

            # 'snippets' here contains the actual full text blocks parsed from the page's HTML
            text_chunks = item.get("snippets", [])
            actual_content = (
                "\n".join(text_chunks) if text_chunks else "No text extracted."
            )

            # Format the output with the raw text content
            result_string = (
                f"[{index}] {title}\nSource: {url}\nActual Content:\n{actual_content}\n"
            )
            formatted_results.append(result_string)

        return "\n---\n\n".join(formatted_results)

    return "No results found."
