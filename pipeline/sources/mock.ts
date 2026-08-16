import type { VolumeSource } from './types';

/**
 * Deterministic fake volumes so the entire pipeline (ingest → validate →
 * store → export → bundle) can be exercised end-to-end before we commit
 * to a paid data source. Same term always yields the same number.
 */
export const mockSource: VolumeSource = {
  name: 'mock',
  async fetchVolumes(terms) {
    const out = new Map<string, number>();
    for (const term of terms) {
      // FNV-1a hash → stable pseudo-random volume between ~10K and ~10M
      let h = 0x811c9dc5;
      for (let i = 0; i < term.length; i++) {
        h ^= term.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      const magnitude = 4 + (h % 3000) / 1000; // 4.0 .. 7.0
      out.set(term, Math.round(10 ** magnitude));
    }
    return out;
  },
};
