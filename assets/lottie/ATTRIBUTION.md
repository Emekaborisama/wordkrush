# Lottie assets

Clip CDN URLs live in `src/ui/lottie/sources.ts` (`LOTTIE_CLIPS`). Paste a **file** URL (`https://lottie.host/…/file.lottie`), never `/embed/`.

| Slot | CDN | Bundled fallback | Where |
|---|---|---|---|
| `deer-idle` | https://lottie.host/35f01f32-2f23-42a1-b228-6d7b5b86d50a/RrWseXVzN1.lottie | `deer.lottie` | Hub hero |
| `deer-pleased` | same deer until a distinct pose is pasted | `deer.lottie` | (in-run, not wired yet) |
| `deer-celebrate` | same deer until a distinct pose is pasted | `deer.lottie` | Wordfall / Clueless / More or Less win |
| `deer-wince` | same deer until a distinct pose is pasted | `deer.lottie` | Wordfall / More or Less miss |
| `deer-risk` | same deer until a distinct pose is pasted | `deer.lottie` | (streak at-risk, not wired yet) |
| `flame-idle` / `flame-risk` / `flame-extend` | *empty — paste file URL* | — | Streak badge |
| `crush-hit` / `crush-best` | *empty — paste file URL* | — | Count-up land / level complete burst |

Deer composition 1600×1200, 10s. Owner-supplied. Do not point flame or burst slots at the deer.
