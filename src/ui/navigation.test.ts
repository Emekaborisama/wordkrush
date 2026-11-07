import { describe, expect, it } from 'vitest';
import { parentOf } from './navigation';

describe('parentOf', () => {
  it('treats the hub as the root', () => {
    expect(parentOf({ name: 'hub' })).toBeNull();
  });

  it('sends a start screen back to the hub', () => {
    expect(parentOf({ name: 'home', gameId: 'clueless' })).toEqual({ name: 'hub' });
  });

  it('sends an in-progress run back to that game’s start screen', () => {
    expect(parentOf({ name: 'game', gameId: 'wordfall' })).toEqual({
      name: 'home',
      gameId: 'wordfall',
    });
  });

  it('sends a live run back to teams, matching the header back', () => {
    expect(parentOf({ name: 'game', gameId: 'more-or-less', live: { matchId: 'm' } })).toEqual({
      name: 'teams',
    });
  });

  it('sends scores, results, and a finished run back to the hub', () => {
    expect(parentOf({ name: 'scores' })).toEqual({ name: 'hub' });
    expect(parentOf({ name: 'over', gameId: 'more-or-less' })).toEqual({ name: 'hub' });
  });

  it('sends a race sign-in back to the game the player came from', () => {
    expect(parentOf({ name: 'auth', returnTo: 'teams', returnGameId: 'clueless' })).toEqual({
      name: 'home',
      gameId: 'clueless',
    });
    expect(parentOf({ name: 'auth' })).toEqual({ name: 'hub' });
  });

  it('leaves a 1v1 for the hub', () => {
    expect(parentOf({ name: 'duel' })).toEqual({ name: 'hub' });
  });

  it('roots I Sabi Lagos at the hub and sends its runs back to the route', () => {
    expect(parentOf({ name: 'lagos' })).toEqual({ name: 'hub' });
    expect(parentOf({ name: 'game', gameId: 'more-or-less', molLevel: { path: 'lagos' } })).toEqual({ name: 'lagos' });
    expect(parentOf({ name: 'over', gameId: 'more-or-less', molLevel: { path: 'lagos' } })).toEqual({ name: 'lagos' });
    expect(parentOf({ name: 'game', gameId: 'more-or-less', molLevel: { path: 'world' } })).toEqual({
      name: 'home',
      gameId: 'more-or-less',
    });
  });

  it('sends the lobby and the race result back to teams', () => {
    expect(parentOf({ name: 'live-lobby' })).toEqual({ name: 'teams' });
    expect(parentOf({ name: 'live-results' })).toEqual({ name: 'teams' });
  });
});
