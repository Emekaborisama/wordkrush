"""
Hands-on tester. Ask the LLM one question and see exactly what comes back.

    uv run --project validator python -m app.cli pizza sushi
    uv run --project validator python -m app.cli pizza sushi --value-a 3200000 --value-b 1100000
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

from .llm import OpenAIJudge, openai_key_present
from .schemas import ValidateRequest
from .validation import validate_pair


async def _main() -> int:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")

    parser = argparse.ArgumentParser(description="Ask the LLM which term is searched more.")
    parser.add_argument("term_a")
    parser.add_argument("term_b")
    parser.add_argument("--value-a", type=float, default=None, help="our stored value for term_a")
    parser.add_argument("--value-b", type=float, default=None, help="our stored value for term_b")
    parser.add_argument(
        "--no-consistency",
        action="store_true",
        help="single call instead of both orderings (cheaper, weaker)",
    )
    args = parser.parse_args()

    if not openai_key_present():
        print("OPENAI_API_KEY not set (expected in .env at repo root)", file=sys.stderr)
        return 2

    request = ValidateRequest(
        term_a=args.term_a,
        term_b=args.term_b,
        value_a=args.value_a,
        value_b=args.value_b,
        check_consistency=not args.no_consistency,
    )
    result = await validate_pair(request, OpenAIJudge())
    print(json.dumps(result.model_dump(mode="json"), indent=2))
    return 1 if result.flagged else 0


def main() -> None:
    raise SystemExit(asyncio.run(_main()))


if __name__ == "__main__":
    main()
