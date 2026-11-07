import { describe, expect, it } from 'vitest';
// The share-card renderer, so the app and the cards are held to one drawing.
import { layerShows as serverLayerShows, mascotSvgDocument } from '../../../server/mascot.mjs';
import raw from './cat-art.json';
import { CAT_ART, CAT_MOODS, layerShows, layersFor, parseCatArt } from './art';

describe('the cat drawing', () => {
  it('loads and checks out', () => {
    expect(CAT_ART.width).toBe(240);
    expect(CAT_ART.layers.length).toBeGreaterThan(40);
    expect(layersFor(CAT_ART, 'tail', 'idle', false).length).toBeGreaterThan(0);
    expect(layersFor(CAT_ART, 'shadow', 'idle', false)).toHaveLength(1);
  });

  it('draws a different face for each mood, and blinks only with eyes that can close', () => {
    const faces = CAT_MOODS.map((mood) => layersFor(CAT_ART, 'body', mood, false).length);
    expect(new Set(faces).size).toBeGreaterThan(1);
    const open = layersFor(CAT_ART, 'body', 'idle', false);
    const shut = layersFor(CAT_ART, 'body', 'idle', true);
    expect(open).not.toEqual(shut);
  });

  it('picks the same layers as the share cards for every mood and blink', () => {
    for (const mood of CAT_MOODS) {
      for (const blink of [false, true]) {
        const app = CAT_ART.layers.map((layer) => layerShows(layer, mood, blink));
        const server = raw.layers.map((layer) => serverLayerShows(layer, mood, blink));
        expect(app).toEqual(server);
      }
    }
    expect(mascotSvgDocument({ mood: 'cheer' })).toContain('<svg');
  });

  it('refuses a layer it could not draw', () => {
    const broken = { ...raw, layers: [{ el: 'polygon', fill: '#000' }] };
    expect(() => parseCatArt(broken)).toThrow(/el must be/);
    const unknownGradient = { ...raw, layers: [{ el: 'circle', cx: 1, cy: 1, r: 1, fill: 'url(#nope)' }] };
    expect(() => parseCatArt(unknownGradient)).toThrow(/gradient/);
    const badMood = { ...raw, layers: [{ el: 'circle', cx: 1, cy: 1, r: 1, fill: '#000', moods: ['angry'] }] };
    expect(() => parseCatArt(badMood)).toThrow(/moods/);
  });
});
