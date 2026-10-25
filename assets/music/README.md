# Music

| File | Use | Length |
|---|---|---|
| `danfo-groove-menu.mp4` | Home, menus and pop-ups | 112.8 s loop |
| `danfo-groove-play.mp4` | In a game | 113.0 s loop |

Both are original instrumentals made for WordKrush on 2026-10-24 with Suno v6
through EvoLink (task `task-unified-1792850554-3mxe8bbs`, two takes of one
request). The prompt asked for upbeat Lagos afrobeats with log drum, shaker,
talking drum, highlife guitar and marimba at 104 bpm, with no vocals. The
owner approved the generation. Usage rights follow the EvoLink and Suno terms
for that account (STACK D-069).

Processing: the ~6 s fade-out at the end of each take is trimmed, with a
0.15 s fade-in and a 1.2 s fade-out so the loop restarts without a click. The
files are AAC at 96 kbps (`afconvert -f m4af -d aac -b 96000`).

The loops are `.mp4` rather than `.m4a` on purpose. The container is the same,
but Cloudflare caches `.mp4` at the edge by default and sends `.m4a` straight
to the Railway server; `serve.mjs` serves both as `audio/mp4`.
