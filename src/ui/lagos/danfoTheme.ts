/**
 * I Sabi Lagos colours: the danfo's yellow and black, the asphalt it drives
 * on, and the green of a Lagos road sign. They sit on top of the Block Blast
 * tokens — buttons, panels and HUD are still the kit's — and only paint the
 * Lagos pieces (bus, road, stop signs, stripes).
 */

export const danfo = {
  yellow: '#FFC21A',
  yellowTop: '#FFE36B',
  yellowDeep: '#E09A00',
  black: '#1D1A16',
  road: '#3B4048',
  roadEdge: '#2A2E34',
  lane: '#F4F1E8',
  sign: '#0E7A43',
  signDeep: '#07592F',
  signText: '#EAF7EE',
} as const;

/** Pidgin lines the conductor shouts. Kept here so copy never drifts per screen. */
export const lagosCopy = {
  title: 'I Sabi Lagos',
  question: 'How much you sabi Lagos?',
  enter: 'Oya, enter!',
  right: 'You sabi!',
  wrong: 'Wahala!',
  cleared: 'You sabi Lagos die!',
} as const;
