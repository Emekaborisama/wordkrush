/**
 * What leaves the app when a player shares: the card image and its link,
 * with one line of caption.
 *
 * Shares used to be a Wordle-style paste, an emoji grid above a link. The
 * owner judged that "trash": the card the server draws for every share is
 * what a friend should see. So a share carries the card itself
 * (`imageUrl`), the page it lives on (`url`, which unfurls to the same card
 * where an image cannot be attached), and a caption that dares the reader.
 * No grid, no standing block.
 *
 * Pure. `src/native/share.ts` decides how a platform sends it.
 */

export type SharePayload = {
  /** One line that rides with the card: the dare, never a result grid. */
  caption: string;
  /** The page a friend opens. Every chat app unfurls it to the card. */
  url: string;
  /** The card as a 1200×630 PNG, for share sheets that take a file. */
  imageUrl: string;
  /** Name for the attached file. */
  fileName: string;
};

/** The caption and the link as one paste, for the clipboard and for targets that take only text. */
export function captionWithLink(payload: Pick<SharePayload, 'caption' | 'url'>): string {
  return `${payload.caption}\n${payload.url}`;
}
