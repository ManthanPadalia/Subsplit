def rupees_to_paise(rupees: float) -> int:
    """Convert rupees to paise so all stored monetary values remain integer paise."""
    return int(round(rupees * 100))


def paise_to_rupees(paise: int) -> float:
    """Convert stored integer paise values back to rupees for API and UI display."""
    return round(paise / 100, 2)
