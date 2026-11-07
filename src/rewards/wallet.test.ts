import { describe, expect, it } from 'vitest';
import { BOOST_PRICES } from './config';
import { EMPTY_REWARDS, type RewardsState } from './types';
import { boostPrice, spend } from './wallet';

describe('spend', () => {
  it('charges the published price and stops at zero', () => {
    expect(boostPrice('second-chance')).toBe(50);
    expect(BOOST_PRICES).toEqual({
      'skip-pair': 15,
      'second-chance': 50,
      'warmer-word': 25,
      'hint-now': 40,
      shuffle: 15,
      'word-hint': 20,
      'extra-moves': 40,
      'extra-time': 40,
    });

    const wallet: RewardsState = { ...EMPTY_REWARDS, coins: 15 };
    const paid = spend(wallet, 'skip-pair');
    expect(paid).toEqual({ ok: true, state: { ...wallet, coins: 0 } });
    if (!paid.ok) return;
    const again = spend(paid.state, 'skip-pair');
    expect(again).toEqual({ ok: false, reason: 'insufficient' });
    expect(paid.state.coins).toBe(0);
  });

  it('refuses a spend that would go negative and leaves the wallet untouched', () => {
    const wallet: RewardsState = { ...EMPTY_REWARDS, coins: 14 };
    const result = spend(wallet, 'skip-pair');
    expect(result).toEqual({ ok: false, reason: 'insufficient' });
    expect(wallet.coins).toBe(14);
  });
});
