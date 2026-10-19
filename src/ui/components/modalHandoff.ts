/**
 * How long to wait between closing one pop-up and opening the next. iOS
 * silently drops a Modal presented while another is still animating out.
 */
export const MODAL_HANDOFF_MS = 320;

/** Runs `open` once the pop-up that is closing has finished leaving. */
export function afterModalClose(open: () => void): void {
  setTimeout(open, MODAL_HANDOFF_MS);
}
