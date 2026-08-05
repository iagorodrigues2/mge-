"""
Agente de Qualificação — motor de lead score.

Implementa a régua de pontuação da seção 6.3 do prompt-mestre:

  product fit             0-20
  marketplace gap         0-20
  business structure      0-15
  catalog quality         0-15
  investment signals      0-10
  contactability          0-10
  problem clarity         0-10
  ---------------------------------
  total                   0-100

Classificação:
  80-100  -> A  (prioridade alta, candidato à Implantação Marketplace 90)
  65-79   -> B  (prioridade média, candidato à Mentoria ou diagnóstico)
  50-64   -> NUTRIR
  <50     -> NAO_ABORDAR

Este módulo não inventa dados: cada sinal de entrada deve vir de uma fonte
real (site, CNPJ público, marketplace, informação fornecida pelo usuário).
Quando um sinal está ausente, ele é tratado como "desconhecido" e reduz a
confiança do score, nunca é assumido como positivo ou negativo.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ScoreInput:
    has_physical_product: Optional[bool] = None
    catalog_size: Optional[int] = None  # número estimado de SKUs
    has_own_brand_or_manufacturer: Optional[bool] = None
    years_active: Optional[int] = None
    has_website: Optional[bool] = None
    has_active_instagram: Optional[bool] = None

    marketplace_presence: dict = field(default_factory=dict)  # {"mercado_livre": bool, "amazon": bool, "shopee": bool}
    marketplace_listing_quality: Optional[str] = None  # "boa" | "fraca" | "ausente" | None
    price_alignment: Optional[str] = None  # "alinhado" | "desalinhado" | None

    public_contact_available: Optional[bool] = None
    decision_maker_identified: Optional[bool] = None

    investment_capacity_signal: Optional[str] = None  # "alto" | "medio" | "baixo" | None
    problem_clarity_signal: Optional[str] = None  # "alto" | "medio" | "baixo" | None


@dataclass
class ScoreResult:
    product_fit: int
    marketplace_gap: int
    business_structure: int
    catalog_quality: int
    investment_signals: int
    contactability: int
    problem_clarity: int
    total: int
    potential: str
    confidence: str
    rationale: str


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def compute_score(data: ScoreInput) -> ScoreResult:
    unknowns = 0
    notes: list[str] = []

    # --- product fit (0-20) ---
    product_fit = 0
    if data.has_physical_product is True:
        product_fit += 8
        notes.append("produto físico confirmado")
    elif data.has_physical_product is None:
        unknowns += 1
    else:
        notes.append("sem produto físico identificado")

    if data.catalog_size is not None:
        if 20 <= data.catalog_size <= 500:
            product_fit += 8
            notes.append(f"catálogo de {data.catalog_size} SKUs dentro da faixa ideal")
        elif data.catalog_size > 0:
            product_fit += 3
    else:
        unknowns += 1

    if data.has_own_brand_or_manufacturer is True:
        product_fit += 4
        notes.append("marca própria ou fabricação/distribuição")
    elif data.has_own_brand_or_manufacturer is None:
        unknowns += 1
    product_fit = _clamp(product_fit, 0, 20)

    # --- marketplace gap (0-20): quanto maior a lacuna, maior a pontuação ---
    marketplace_gap = 0
    presence = data.marketplace_presence or {}
    channels_checked = [k for k in ("mercado_livre", "amazon", "shopee") if k in presence]
    if channels_checked:
        present_count = sum(1 for k in channels_checked if presence.get(k))
        absent_count = len(channels_checked) - present_count
        marketplace_gap += absent_count * 5
        notes.append(f"ausente em {absent_count}/{len(channels_checked)} marketplaces verificados")
    else:
        unknowns += 1

    if data.marketplace_listing_quality == "ausente":
        marketplace_gap += 5
    elif data.marketplace_listing_quality == "fraca":
        marketplace_gap += 3
        notes.append("catálogo presente mas com execução fraca")
    elif data.marketplace_listing_quality is None:
        unknowns += 1

    if data.price_alignment == "desalinhado":
        marketplace_gap += 2
    marketplace_gap = _clamp(marketplace_gap, 0, 20)

    # --- business structure (0-15) ---
    business_structure = 0
    if data.years_active is not None:
        if data.years_active >= 3:
            business_structure += 6
            notes.append(f"{data.years_active} anos de operação")
        elif data.years_active > 0:
            business_structure += 2
    else:
        unknowns += 1

    if data.has_website:
        business_structure += 5
    elif data.has_website is None:
        unknowns += 1

    if data.decision_maker_identified:
        business_structure += 4
    business_structure = _clamp(business_structure, 0, 15)

    # --- catalog quality (0-15) ---
    catalog_quality = 0
    if data.catalog_size is not None:
        if 20 <= data.catalog_size <= 500:
            catalog_quality += 8
        elif data.catalog_size > 0:
            catalog_quality += 3
    else:
        unknowns += 1

    if data.has_active_instagram:
        catalog_quality += 4
    elif data.has_active_instagram is None:
        unknowns += 1

    if data.marketplace_listing_quality == "boa":
        catalog_quality += 3
    catalog_quality = _clamp(catalog_quality, 0, 15)

    # --- investment signals (0-10) ---
    investment_signals = {"alto": 10, "medio": 6, "baixo": 2}.get(data.investment_capacity_signal or "", 0)
    if data.investment_capacity_signal is None:
        unknowns += 1

    # --- contactability (0-10) ---
    contactability = 0
    if data.public_contact_available:
        contactability += 6
        notes.append("contato empresarial público disponível")
    elif data.public_contact_available is None:
        unknowns += 1
    if data.decision_maker_identified:
        contactability += 4
    contactability = _clamp(contactability, 0, 10)

    # --- problem clarity (0-10) ---
    problem_clarity = {"alto": 10, "medio": 6, "baixo": 2}.get(data.problem_clarity_signal or "", 0)
    if data.problem_clarity_signal is None:
        unknowns += 1

    total = (
        product_fit
        + marketplace_gap
        + business_structure
        + catalog_quality
        + investment_signals
        + contactability
        + problem_clarity
    )
    total = _clamp(total, 0, 100)

    if total >= 80:
        potential = "A"
    elif total >= 65:
        potential = "B"
    elif total >= 50:
        potential = "NUTRIR"
    else:
        potential = "NAO_ABORDAR"

    if unknowns == 0:
        confidence = "alto"
    elif unknowns <= 3:
        confidence = "medio"
    else:
        confidence = "baixo"

    rationale = "; ".join(notes) if notes else "Poucos sinais confirmados; score conservador."
    if unknowns:
        rationale += f" ({unknowns} sinais desconhecidos não pontuados)."

    return ScoreResult(
        product_fit=product_fit,
        marketplace_gap=marketplace_gap,
        business_structure=business_structure,
        catalog_quality=catalog_quality,
        investment_signals=investment_signals,
        contactability=contactability,
        problem_clarity=problem_clarity,
        total=total,
        potential=potential,
        confidence=confidence,
        rationale=rationale,
    )
