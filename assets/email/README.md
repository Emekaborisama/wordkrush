Live captures and in-app key art used by the Tuesday player email.

| File | Source |
|---|---|
| `hub.png` | Screenshot of the web hub on wordkrush.com |
| `more-or-less.png`, `clueless.png`, `wordfall.png` | Copied from `assets/games/` at web build into `dist/email/` |

`scripts/patch-web-head.mjs` publishes them at `https://wordkrush.com/email/<file>`. The mailer picks one from this week’s changelog + Wordfall drop. Do not put the lockup here — that stays in `assets/logo/`.
