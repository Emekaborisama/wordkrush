"""
Validation logic. Pure functions + one orchestrator.

The load-bearing idea: a single LLM answer is an opinion. Two LLM answers on
the SAME pair in BOTH orderings, that agree, is evidence. LLMs have a known
position bias (favouring whichever option is presented first), so asking
A-vs-B and B-vs-A and requiring the verdicts to mirror each other is the
cheapest real check we can run.

None of this makes the LLM a source of truth about search volume. It makes it
a referee whose disagreements are worth a human's attention. See
docs/HOW-IT-WORKS.md Journey 2 and docs/BRAINSTORM.md §11.
"""

from __future__ import annotations

import asyncio

from .llm import Judge
from .schemas import (
    Agreement,
    Confidence,
    PairValidation,
    ValidateRequest,
    Verdict,
)

# Mirrors FAIRNESS_MIN_RATIO in src/game/pairing.ts. Values closer than this
# are never asked in the game, so "too_close" from the LLM is not a problem
# for pairs we would actually show.
FAIRNESS_MIN_RATIO = 1.15


def flip(verdict: Verdict) -> Verdict:
    """The mirror of a verdict, for the reversed-order question."""
    if verdict is Verdict.A_HIGHER:
        return Verdict.B_HIGHER
    if verdict is Verdict.B_HIGHER:
        return Verdict.A_HIGHER
    return Verdict.TOO_CLOSE


def verdict_from_values(value_a: float, value_b: float) -> Verdict:
    """What our own stored data claims, using the same fairness threshold as the game."""
    if value_a <= 0 or value_b <= 0:
        raise ValueError("values must be positive")
    ratio = max(value_a, value_b) / min(value_a, value_b)
    if ratio < FAIRNESS_MIN_RATIO:
        return Verdict.TOO_CLOSE
    return Verdict.A_HIGHER if value_a > value_b else Verdict.B_HIGHER


def compare(llm: Verdict, llm_confidence: Confidence, data: Verdict) -> tuple[Agreement, bool, str | None]:
    """
    Compare the LLM verdict against our data's verdict.

    Returns (agreement, flagged, flag_reason).

    Flagging policy — deliberately narrow. We only flag when the LLM is
    CONFIDENT and CONTRADICTS the data. A low-confidence disagreement is
    noise; flagging on it would bury humans in false positives and train
    them to rubber-stamp the queue.
    """
    if llm is Verdict.TOO_CLOSE or llm_confidence is Confidence.LOW:
        return Agreement.LLM_UNSURE, False, None
    if llm == data:
        return Agreement.AGREES, False, None
    if data is Verdict.TOO_CLOSE:
        # Data says near-tie, LLM picked a side. The game never shows these
        # pairs anyway (fairness guard), so it is not worth a human's time.
        return Agreement.LLM_UNSURE, False, None
    reason = f"LLM says {llm.value} with {llm_confidence.value} confidence; data says {data.value}"
    return Agreement.DISAGREES, True, reason


async def validate_pair(request: ValidateRequest, judge: Judge) -> PairValidation:
    """Judge one pair, optionally cross-checked against our data."""
    forward = await judge.judge(request.term_a, request.term_b)
    samples = 1
    verdict = forward.verdict
    confidence = forward.confidence
    flagged = False
    flag_reason: str | None = None

    if request.check_consistency:
        reverse = await judge.judge(request.term_b, request.term_a)
        samples = 2
        # reverse.verdict is phrased with the terms swapped, so mirror it back
        reverse_in_forward_terms = flip(reverse.verdict)
        if reverse_in_forward_terms != forward.verdict:
            # The model contradicted itself depending on presentation order.
            # Its judgement on this pair is not usable.
            return PairValidation(
                term_a=request.term_a,
                term_b=request.term_b,
                verdict=Verdict.TOO_CLOSE,
                confidence=Confidence.LOW,
                reasoning="Order-dependent contradiction; judgement discarded.",
                data_verdict=(
                    verdict_from_values(request.value_a, request.value_b)
                    if request.value_a is not None and request.value_b is not None
                    else None
                ),
                agreement=Agreement.INCONSISTENT,
                flagged=True,
                flag_reason=(
                    f"LLM said {forward.verdict.value} forward but "
                    f"{reverse.verdict.value} reversed"
                ),
                samples=samples,
            )
        # Both orderings agree. Keep the weaker confidence — be conservative.
        order = {Confidence.LOW: 0, Confidence.MEDIUM: 1, Confidence.HIGH: 2}
        confidence = min(forward.confidence, reverse.confidence, key=lambda c: order[c])

    data_verdict: Verdict | None = None
    agreement: Agreement | None = None
    if request.value_a is not None and request.value_b is not None:
        data_verdict = verdict_from_values(request.value_a, request.value_b)
        agreement, flagged, flag_reason = compare(verdict, confidence, data_verdict)

    return PairValidation(
        term_a=request.term_a,
        term_b=request.term_b,
        verdict=verdict,
        confidence=confidence,
        reasoning=forward.reasoning,
        data_verdict=data_verdict,
        agreement=agreement,
        flagged=flagged,
        flag_reason=flag_reason,
        samples=samples,
    )


async def validate_batch(
    requests: list[ValidateRequest], judge: Judge, concurrency: int = 5
) -> list[PairValidation]:
    """Validate many pairs with bounded concurrency (respects rate limits)."""
    sem = asyncio.Semaphore(concurrency)

    async def one(req: ValidateRequest) -> PairValidation:
        async with sem:
            return await validate_pair(req, judge)

    return await asyncio.gather(*(one(r) for r in requests))
