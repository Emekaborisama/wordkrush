# Stack

**Project:** Best Games — a collection of casual games for iOS. First title: *More or Less*.
**Status:** Pre-scaffold. No application code exists yet.
**Last updated:** 2026-08-16

This is a living document. Every stack change gets a row in the Decision Log at the bottom — including reversals. Do not silently rewrite a past decision; supersede it with a new entry so the reasoning trail survives.

---

## Current stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript | Strict mode. Non-negotiable for the game logic layer. |
| App framework | Expo (React Native) | Chosen over Capacitor — see D-002. |
| UI | React Native core components | No UI kit until a real need appears. |
| State | React state + a pure reducer | Game engine is a pure function; see `docs/BRAINSTORM.md`. |
| Data (v1) | Static JSON bundled with the app | No backend. See D-004. |
| Unit tests | Vitest | Targets the pure logic layer only. |
| Build & signing | EAS Build (Expo cloud) | Removes manual cert/provisioning work. |
| Submission | EAS Submit → App Store Connect | |
| Distribution | TestFlight → App Store | |

## Local environment

| Tool | State as of 2026-08-16 |
|---|---|
| macOS | Darwin 25.6.0 |
| Node | v25.2.1 |
| npm | 11.6.2 |
| Xcode | **Downloading** — not yet installed. `xcodebuild` absent, no simulator runtimes registered. |
| Apple Developer Program | Not yet purchased. $99/yr, required to submit. |

### Post-install steps for Xcode

```bash
sudo xcode-select --switch /Applications/Xcode.app
sudo xcodebuild -license accept
xcodebuild -runFirstLaunch
```

Then open Xcode once and download a simulator runtime via Settings → Components. The App Store download does not reliably include one, and it is a separate multi-GB fetch.

## Testing strategy

Four rungs, cheapest and fastest first. Most work happens on rungs 1–2.

1. **Vitest on pure game logic** — pairing, scoring, streak, difficulty. No React, no native, no I/O. Runs in milliseconds. This is where real coverage lives.
2. **Expo Go on a physical iPhone** — `npx expo start`, scan QR, hot reload. The daily feel-it loop. No Xcode required.
3. **iOS Simulator** — screen sizes we don't own, safe-area/notch behavior. Requires Xcode.
4. **TestFlight** — real testers, real builds, real devices.

Xcode is deliberately *not* on the critical path: EAS builds run in Expo's cloud, and day-to-day testing runs through Expo Go.

## Constraints that shape the stack

- **App Store Guideline 4.2 (minimum functionality).** Apple rejects apps that are a website in a wrapper. This is the single biggest reason we are not using Capacitor. To stay clearly on the right side of it, v1 should ship at least: offline play, haptic feedback, and a native leaderboard (Game Center).
- **No backend in v1.** Bundled data means zero hosting cost, zero latency, offline play, and deterministic tests. It also means content updates require an app release — accepted for now, revisit at D-004.
- **The logic layer must never import React or React Native.** It is plain TypeScript so it stays testable in Node and portable if the UI layer ever changes.

## Open decisions

| # | Question | Blocking? |
|---|---|---|
| O-1 | Which categories ship in v1, and what is the comparable metric for each? | Yes — blocks data schema |
| O-2 | Where does the data come from, and what is its licensing status? | Yes — blocks content |
| O-3 | Lives (3 hearts) vs. single-life endless streak? | No — engine supports both |
| O-4 | Does the app need a web build too, or iOS only? | No |
| O-5 | Monetization: ads, IAP, or free? | No — out of scope for v1 |

## Decision log

| ID | Date | Decision | Rationale | Status |
|---|---|---|---|---|
| D-001 | 2026-08-16 | TypeScript everywhere | Shared language across logic, UI, and tooling; the logic layer needs static types to stay refactorable. | Active |
| D-002 | 2026-08-16 | Expo (React Native) over Capacitor, Swift, and Phaser | Capacitor renders a WebView → real Guideline 4.2 rejection risk, plus manual signing. Swift means learning a new language mid-project. Phaser is a canvas engine and would need a WebView anyway. Expo gives real native UI, automated signing via EAS, and instant device testing. | Active |
| D-003 | 2026-08-16 | EAS Build + EAS Submit for the release pipeline | Code signing and provisioning are the hardest part of shipping to the App Store, and EAS automates both. Cloud builds also keep Xcode off the critical path. | Active |
| D-004 | 2026-08-16 | v1 data is static JSON bundled in the app | No backend to run or pay for; enables offline play (helps the 4.2 case) and makes tests deterministic. Cost: content updates need an app release. | Active — revisit when content churn becomes painful |
| D-005 | 2026-08-16 | Vitest over Jest | Faster, native ESM and TypeScript, and we only test the pure layer so React Native's Jest preset buys us nothing. | Active |

## How to update this document

1. Add a new row to the Decision Log. Never edit an old row's rationale — if a decision is reversed, mark the old row `Superseded by D-0NN` and add the new one.
2. Update the **Current stack** table to match.
3. Update **Last updated** at the top.
4. If the change affects the game design, mirror it in `docs/BRAINSTORM.md`.
