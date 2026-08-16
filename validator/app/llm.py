"""
The OpenAI adapter. Everything that touches the model lives here so the
validation logic stays pure and testable without a network or an API key.
"""

from __future__ import annotations

import os
from typing import Protocol

from openai import AsyncOpenAI

from .schemas import PairJudgement

DEFAULT_MODEL = os.getenv("VALIDATOR_MODEL", "gpt-4o-2024-08-06")

# Constrained on purpose. The model is a referee answering one closed question,
# not an assistant. No greetings, no hedging, no units, no invented numbers.
SYSTEM_PROMPT = """You are a search-volume referee. You answer exactly one closed question.

Given two search terms, decide which gets more monthly Google searches worldwide.

Rules:
- Judge RELATIVE popularity only. Never estimate absolute search counts.
- Use "too_close" when the two terms are within roughly 20% of each other.
- confidence "high" only when one term is clearly and obviously searched more.
- reasoning: ONE short sentence, under 200 characters. No preamble, no caveats.

You output only the structured fields. Nothing else."""


class Judge(Protocol):
    """Anything that can judge a pair. Lets tests swap in a fake with no network."""

    async def judge(self, term_a: str, term_b: str) -> PairJudgement: ...


class OpenAIJudge:
    """Real judge, backed by OpenAI structured outputs (strict schema)."""

    def __init__(self, client: AsyncOpenAI | None = None, model: str = DEFAULT_MODEL):
        self._client = client or AsyncOpenAI()
        self.model = model

    async def judge(self, term_a: str, term_b: str) -> PairJudgement:
        completion = await self._client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f'Term A: "{term_a}"\nTerm B: "{term_b}"',
                },
            ],
            response_format=PairJudgement,
            # Deterministic-ish: we want the same pair to give the same verdict
            # across runs so snapshots are reproducible.
            temperature=0,
        )
        parsed = completion.choices[0].message.parsed
        if parsed is None:
            raise ValueError(
                f"Model returned no parsable output for ({term_a!r}, {term_b!r}); "
                f"refusal={completion.choices[0].message.refusal!r}"
            )
        return parsed


def openai_key_present() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))
