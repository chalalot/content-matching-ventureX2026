def format_vnd(amount) -> str:
    if amount is None or amount != amount:
        return "N/A"
    amount = float(amount)
    if abs(amount) >= 1_000_000_000:
        return f"{amount / 1_000_000_000:,.1f}B ₫"
    if abs(amount) >= 1_000_000:
        return f"{amount / 1_000_000:,.0f}M ₫"
    if abs(amount) >= 1_000:
        return f"{amount / 1_000:,.0f}K ₫"
    return f"{amount:,.0f} ₫"


def format_number(n) -> str:
    if n is None or n != n:
        return "N/A"
    n = float(n)
    if abs(n) >= 1_000_000:
        return f"{n / 1_000_000:,.1f}M"
    if abs(n) >= 1_000:
        return f"{n / 1_000:,.1f}K"
    return f"{n:,.0f}"


def format_pct(value, decimals=1) -> str:
    if value is None or value != value:
        return "N/A"
    return f"{value:.{decimals}f}%"
