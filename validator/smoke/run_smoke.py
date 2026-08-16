"""
Smoke test — the real thing, end to end.

    npm run smoke                 # from repo root
    cd validator && uv run python -m smoke.run_smoke

Unlike the unit tests, this:
  - calls the REAL OpenAI API (costs money, needs OPENAI_API_KEY)
  - needs the network
  - is NOT run in CI
  - answers "does this system actually work against reality?" rather than
    "is the logic correct given fake inputs?"

Exit code 0 = all pairs answered acceptably, 1 = at least one failure.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import yaml
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env")

from app.llm import DEFAULT_MODEL, OpenAIJudge, openai_key_present  # noqa: E402
from app.schemas import ValidateRequest  # noqa: E402
from app.validation import validate_pair  # noqa: E402

PAIRS_FILE = Path(__file__).parent / "pairs.yaml"

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"


async def main() -> int:
    if not openai_key_present():
        print(f"{RED}OPENAI_API_KEY not set (expected in {REPO_ROOT / '.env'}){RESET}")
        return 2

    spec = yaml.safe_load(PAIRS_FILE.read_text())
    pairs = spec["pairs"]
    judge = OpenAIJudge()

    print(f"\nSmoke test — model={DEFAULT_MODEL}, {len(pairs)} pairs, live API\n")

    failures: list[str] = []
    for i, p in enumerate(pairs, 1):
        expect = set(p["expect"])
        result = await validate_pair(
            ValidateRequest(term_a=p["term_a"], term_b=p["term_b"]), judge
        )
        got = result.verdict.value
        ok = got in expect

        label = f"{p['term_a']} vs {p['term_b']}"
        if ok:
            mark, colour = "PASS", GREEN
        elif p.get("known_divergence"):
            # A documented case where the LLM is known to disagree with measured
            # data. Kept visible as a WARN rather than silently loosened to a
            # PASS or left as a permanently-red FAIL that trains people to
            # ignore the suite.
            mark, colour = "WARN", YELLOW
        else:
            mark, colour = "FAIL", RED
            failures.append(f"{label}: got {got}, expected one of {sorted(expect)}")

        print(f"{colour}{mark}{RESET}  {i:>2}. {label:<42} {got:<11} ({result.confidence.value})")

        if wiki := p.get("wiki"):
            a, b = wiki["a"], wiki["b"]
            ratio = max(a, b) / min(a, b)
            side = "a_higher" if a > b else "b_higher"
            agree = "matches" if got == side else ("under guard" if ratio < 1.15 else "DIFFERS from")
            tint = DIM if agree == "matches" else YELLOW
            print(f"      {tint}wiki: {a:,} vs {b:,} = {ratio:.2f}x ({side}) — LLM {agree}{RESET}")
        if not ok:
            print(f"      {DIM}why: {p['why']}{RESET}")

    print()
    if failures:
        print(f"{RED}{len(failures)} failure(s):{RESET}")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"{GREEN}All {len(pairs)} pairs answered acceptably.{RESET}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
