"""
The restricted schema. This is the contract the LLM is forced into.

Design rule: every field is either an enum or a bounded value. There is no
free-form field the model can fill with prose, hedging, disclaimers, or
"as an AI language model" filler. The only text field is `reasoning`, and it
is length-capped and never used for any decision — it exists for human audit.

`extra="forbid"` + OpenAI strict structured outputs means a malformed or
chatty response is a hard error, not something we have to parse around.
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Verdict(str, Enum):
    """Which term gets more monthly Google searches."""

    A_HIGHER = "a_higher"
    B_HIGHER = "b_higher"
    TOO_CLOSE = "too_close"


class Confidence(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class PairJudgement(BaseModel):
    """A single LLM verdict on one ordered pair. This is the LLM's ONLY output shape."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    verdict: Verdict
    confidence: Confidence
    reasoning: str = Field(
        max_length=200,
        description="One short sentence. Audit only — never used in any decision.",
    )


class PairQuery(BaseModel):
    """Two terms to compare. Base for anything that takes a pair."""

    model_config = ConfigDict(extra="forbid")

    term_a: str = Field(min_length=1, max_length=100)
    term_b: str = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def _distinct(self) -> PairQuery:
        if self.term_a.strip().lower() == self.term_b.strip().lower():
            raise ValueError("term_a and term_b must be different")
        return self


class Agreement(str, Enum):
    """Result of comparing the LLM verdict against our stored data."""

    AGREES = "agrees"
    DISAGREES = "disagrees"
    LLM_UNSURE = "llm_unsure"  # LLM said too_close / low confidence
    INCONSISTENT = "inconsistent"  # LLM contradicted itself across orderings


class PairValidation(BaseModel):
    """
    Output of the full validation: the LLM's consistency-checked judgement,
    plus how it compares to the value ordering in our own data.
    """

    model_config = ConfigDict(extra="forbid")

    term_a: str
    term_b: str
    verdict: Verdict
    confidence: Confidence
    reasoning: str
    # Set only when the caller supplied our own values to check against.
    data_verdict: Verdict | None = None
    agreement: Agreement | None = None
    # True when this pair should be held back from shipping pending human review.
    flagged: bool = False
    flag_reason: str | None = None
    # How many LLM calls backed this result (2 = both orderings checked).
    samples: int = Field(default=1, ge=1)


class ValidateRequest(PairQuery):
    """Inherits the term constraints and the distinct-terms rule from PairQuery."""

    # Optional: our stored values. When present, the response includes agreement.
    value_a: float | None = Field(default=None, gt=0)
    value_b: float | None = Field(default=None, gt=0)
    # Ask both orderings (A vs B and B vs A) and require agreement.
    # Costs 2x tokens, catches position bias. Default on — correctness over spend.
    check_consistency: bool = True


class BatchValidateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pairs: list[ValidateRequest] = Field(min_length=1, max_length=100)


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"]
    model: str
    openai_key_present: bool
