"""Shared helper for the Layer 1 / Layer 2 agents: get a structured-output LLM
for the brief's chosen provider. Mirrors the provider handling in explanation_kol.py."""

from llm import xai_llm, openai_llm, deepseek_llm

_LLMS = {"openai": openai_llm, "xai": xai_llm, "deepseek": deepseek_llm}


def structured_llm(provider: str, schema):
    """Return an LLM bound to `schema` (a pydantic model) for the given provider.
    Falls back to deepseek if the requested provider isn't configured."""
    base = _LLMS.get(provider) or deepseek_llm
    # OpenAI-compatible endpoints reject the default json_schema response_format;
    # force function-calling like explanation_kol does.
    if provider in ("deepseek", "openai", "xai"):
        return base.with_structured_output(schema, method="function_calling")
    return base.with_structured_output(schema)
