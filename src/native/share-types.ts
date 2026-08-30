/**
 * Result of offering a share, shared by the web and native twins so the UI
 * never branches on platform — it just reacts to what happened.
 *
 * `shared` — the system share sheet took the text (or Web Share resolved).
 * `copied` — no share sheet, so the text went to the clipboard instead.
 * `dismissed` — the player closed the sheet; not a share.
 * `failed` — nothing left the app; stay quiet rather than blocking the run.
 */
export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'failed';
