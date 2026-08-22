# Validator

Offline LLM adjudication for WordKrush comparison content. **Pipeline-time only — the game never calls this at runtime.**

## What it does

Asks an LLM one closed question — *which of these two terms gets more monthly Google searches?* — under a schema so tight the model cannot return anything but the answer. Then it cross-checks that answer against our own stored data and flags contradictions for human review.

## Quick start

```bash
# from repo root
uv sync --project validator --extra dev

# ask one question (reads OPENAI_API_KEY from ../.env)
uv run --project validator python -m app.cli pizza sushi

# cross-check against our data (exit code 1 = flagged for review)
uv run --project validator python -m app.cli pizza sushi --value-a 3200000 --value-b 1100000

# tests — no network, no API key, no spend
npm run test:validator          # from repo root
cd validator && uv run pytest -q   # or directly

# API
cd validator && uv run uvicorn app.api:app --reload
# -> http://127.0.0.1:8000/docs  (interactive Swagger UI)
```

> Run pytest **from `validator/`** (or via `npm run test:validator`). Invoked from the repo root, pytest picks the repo as rootdir, never reads `validator/pyproject.toml`, and loses `asyncio_mode = "auto"` — the async tests then error with "async def functions are not natively supported".

## The restricted schema

`app/schemas.py` is the contract. Every field is an enum or a bounded value:

| Field | Type | Why |
|---|---|---|
| `verdict` | enum: `a_higher` / `b_higher` / `too_close` | Three options. No prose, no "it depends". |
| `confidence` | enum: `low` / `medium` / `high` | Drives the flagging policy. |
| `reasoning` | str, **max 200 chars** | Audit only. **Never used in any decision.** |

`extra="forbid"` + OpenAI strict structured outputs means a chatty or malformed response is a hard error, not something we parse around. `temperature=0` keeps the same pair giving the same verdict across runs, so snapshots stay reproducible.

## How it avoids fooling itself

**Position bias check (on by default).** LLMs favour whichever option is presented first. So every pair is asked twice — A-vs-B and B-vs-A — and the verdicts must mirror each other. If the model says "the first one" both times, it contradicted itself: the judgement is discarded and the pair is flagged `inconsistent`. Costs 2x tokens; catches a real and well-documented failure mode.

**Conservative confidence.** When both orderings agree, we keep the *weaker* of the two confidence levels.

**Narrow flagging policy.** We flag only when the LLM is **confident AND contradicts the data**. Low-confidence disagreement is noise — flagging on it would bury a human in false positives and train them to rubber-stamp the queue. Pairs our data calls a near-tie are ignored entirely, because the game's fairness guard means those are never shown to a player anyway.

## Smoke tests — different from unit tests

```bash
npm run smoke        # from repo root
```

| | Unit tests (`tests/`) | Smoke tests (`smoke/`) |
|---|---|---|
| Judge | Fake, scripted | **Real OpenAI** |
| Network / API key | None | Required |
| Cost | Free | Real money |
| Runs in CI | Yes | **No** |
| Question answered | "Is the logic correct?" | "Does this work against reality?" |

Pairs live in [`smoke/pairs.yaml`](smoke/pairs.yaml) — curated questions with answers a human is confident about, plus measured Wikipedia pageviews as ground truth where we have them. `expect` is a *list* of acceptable verdicts, because for genuinely close pairs `too_close` is the honest answer, not a failure.

Three outcomes:
- **PASS** — verdict was in the acceptable set.
- **WARN** — a `known_divergence` pair where the LLM is documented to disagree with measured data. Kept visible rather than silently loosened to a PASS or left as a permanently-red FAIL that trains people to ignore the suite.
- **FAIL** — an unexpected wrong answer. Exit code 1.

## What this is NOT

**The LLM is a referee, not a source of truth.** It is never asked "how many searches does pizza get" — models hallucinate absolute numbers with total confidence. It is only asked which of two terms is *more* searched, a relative judgement models are genuinely decent at.

Numbers that reach players must come from a real data source (STACK O-2). This service exists to catch bad numbers, not to invent them.

## API

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness + whether the API key is loaded |
| `POST /validate` | One pair. Optional `value_a`/`value_b` to get an agreement verdict. |
| `POST /validate/batch` | Up to 100 pairs, concurrency-bounded to respect rate limits. |

## How the offline game uses it

It doesn't — and that's the design. The flow is:

```
validator runs at pipeline time  ->  flags land in Supabase  ->  clean snapshot exported
   ->  src/data/categories/*.json bundled into the app  ->  player plays offline
```

The app ships static JSON and never opens a socket. This service is part of the content *factory*, on the same side of the line as Supabase (STACK D-007).

## Layout

```
app/schemas.py     the restricted schema (Pydantic)
app/llm.py         OpenAI adapter + the Judge protocol (lets tests swap in a fake)
app/validation.py  pure logic: consistency check, data comparison, flagging policy
app/api.py         FastAPI surface
app/cli.py         hands-on tester
tests/             18 tests, all offline
```
