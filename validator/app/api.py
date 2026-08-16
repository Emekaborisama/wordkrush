"""
FastAPI surface for the validator.

IMPORTANT — this is a PIPELINE-TIME service, not a game backend.
The game never calls it. It exists so we (and the TS pipeline) can validate
content before it ships, and so a human can poke at the LLM interactively.
The offline story is unchanged: validation results get baked into a snapshot,
and the app ships bundled JSON. See docs/HOW-IT-WORKS.md.
"""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

# Load the repo-root .env so the service works when started directly
# (uvicorn app.api:app) without the caller exporting variables by hand.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from .llm import DEFAULT_MODEL, OpenAIJudge, openai_key_present
from .schemas import (
    BatchValidateRequest,
    HealthResponse,
    PairValidation,
    ValidateRequest,
)
from .validation import validate_batch, validate_pair

app = FastAPI(
    title="More or Less — Validator",
    version="0.1.0",
    description="Offline LLM adjudication for game content. Not a runtime dependency of the game.",
)


def _judge() -> OpenAIJudge:
    if not openai_key_present():
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not set")
    return OpenAIJudge()


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok", model=DEFAULT_MODEL, openai_key_present=openai_key_present()
    )


@app.post("/validate", response_model=PairValidation)
async def validate(request: ValidateRequest) -> PairValidation:
    """Validate one pair. Returns the consistency-checked verdict and, if
    values were supplied, whether the LLM agrees with our data."""
    return await validate_pair(request, _judge())


@app.post("/validate/batch", response_model=list[PairValidation])
async def validate_many(request: BatchValidateRequest) -> list[PairValidation]:
    """Validate up to 100 pairs with bounded concurrency."""
    return await validate_batch(request.pairs, _judge())
