import { describe, expect, it } from 'vitest';
import { GAMES, getGame, playableGames } from './registry';
import { storageKey } from '../scores/storage';

describe('registry', () => {
  it('has unique ids', () => {
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length);
  });

  it('gives every game the fields the hub card renders', () => {
    for (const g of GAMES) {
      expect(g.name, g.id).toBeTruthy();
      expect(g.tagline, g.id).toBeTruthy();
      expect(g.emoji, g.id).toBeTruthy();
      expect(g.scoreNoun, g.id).toBeTruthy();
      expect(g.accent, g.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('uses url-safe ids, since they key persistent storage', () => {
    for (const g of GAMES) {
      expect(g.id, g.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('finds a game by id and returns undefined otherwise', () => {
    expect(getGame('more-or-less')?.name).toBe('More or Less');
    expect(getGame('nope')).toBeUndefined();
  });

  it('lists only available games as playable', () => {
    expect(playableGames().every((g) => g.status === 'available')).toBe(true);
    expect(playableGames().length).toBeGreaterThan(0);
  });
});

describe('score namespacing', () => {
  it('gives each game a distinct storage key', () => {
    const keys = GAMES.map((g) => storageKey(g.id));
    expect(new Set(keys).size).toBe(GAMES.length);
  });

  it('does not collide with the pre-namespacing key', () => {
    // The legacy key was 'bestgames.scores.v1'. If a game id ever produced
    // that exact string, migration would overwrite live data.
    for (const g of GAMES) {
      expect(storageKey(g.id)).not.toBe('bestgames.scores.v1');
    }
  });

  it('keeps a game id inside its own key', () => {
    expect(storageKey('more-or-less')).toContain('more-or-less');
    expect(storageKey('clueless')).not.toContain('more-or-less');
  });
});
