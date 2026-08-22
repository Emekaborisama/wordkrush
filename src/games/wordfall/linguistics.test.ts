import { describe, expect, it } from 'vitest';
import { DICTIONARY } from '../../data/wordfall';
import { analyze, letterValues, scoreWord, specialFor, TRIGGERS } from './linguistics';

const props = (word: string, rarity = 0) => analyze(word, rarity);

describe('analyze', () => {
  it('reads the properties a special tile depends on', () => {
    const p = props('letter');
    expect(p.length).toBe(6);
    expect(p.hasDoubleLetter).toBe(true);
    expect(p.distinctLetters).toBe(4);
    expect(p.vowels).toBe(2);
    expect(p.rareLetters).toEqual([]);
  });

  it('finds rare letters in order', () => {
    expect(props('jazz').rareLetters).toEqual(['j', 'z', 'z']);
    expect(props('quiz').rareLetters).toEqual(['q', 'z']);
  });

  it('only counts adjacent repeats as a double letter', () => {
    expect(props('book').hasDoubleLetter).toBe(true);
    // Two Ss, but not next to each other.
    expect(props('sense').hasDoubleLetter).toBe(false);
  });

  it('detects palindromes', () => {
    expect(props('level').isPalindrome).toBe(true);
    expect(props('stone').isPalindrome).toBe(false);
  });
});

describe('specialFor', () => {
  it('awards an ember for a rare letter', () => {
    expect(specialFor(props('jazz'))).toBe('ember');
    expect(specialFor(props('box'))).toBe('ember');
  });

  it('awards a nova at seven letters', () => {
    expect(specialFor(props('crystal'))).toBe('nova');
  });

  it('awards a beam at five and six', () => {
    expect(specialFor(props('stone'))).toBe('beam');
    expect(specialFor(props('braves'))).toBe('beam');
  });

  it('awards a flare for a double letter', () => {
    expect(specialFor(props('book'))).toBe('flare');
  });

  it('awards nothing to a plain short word', () => {
    expect(specialFor(props('cat'))).toBe(null);
    expect(specialFor(props('bird'))).toBe(null);
  });

  it('resolves competing triggers by priority, rarest condition first', () => {
    // "quizzed" is 7 letters (nova), has a rare letter (ember) and a double
    // letter (flare). The player must be able to predict which one they get.
    expect(specialFor(props('quizzed'))).toBe('ember');
    // 7 letters and a double letter, no rare letter -> the length wins.
    expect(specialFor(props('village'))).toBe('nova');
    // 5 letters and a double letter -> length beats the double.
    expect(specialFor(props('grass'))).toBe('beam');
  });

  it('does not award a flare to a three-letter repeat', () => {
    // "eel" and "add" are doubles, but rewarding them would make the cheapest
    // possible word also a special-generating one.
    expect(specialFor(props('eel'))).toBe(null);
    expect(specialFor(props('add'))).toBe(null);
  });

  it('keeps the legend and the rules in step', () => {
    // The UI renders TRIGGERS directly, so every entry must be reachable.
    const kinds = TRIGGERS.map((t) => t.kind);
    expect(kinds).toEqual(['ember', 'nova', 'beam', 'flare']);
    for (const trigger of TRIGGERS) {
      expect(trigger.label.length).toBeGreaterThan(0);
      expect(trigger.condition.length).toBeGreaterThan(0);
      expect(trigger.effect.length).toBeGreaterThan(0);
    }
  });
});

describe('letterValues', () => {
  const values = letterValues(DICTIONARY.letterWeights);

  it('prices every letter it was given', () => {
    expect(values.size).toBe(26);
    for (const [, v] of values) expect(v).toBeGreaterThanOrEqual(1);
  });

  it('prices scarce letters above common ones', () => {
    expect(values.get('q')!).toBeGreaterThan(values.get('e')!);
    expect(values.get('z')!).toBeGreaterThan(values.get('a')!);
    expect(values.get('k')!).toBeGreaterThan(values.get('s')!);
  });

  it('keeps the spread narrow enough that letters still matter less than words', () => {
    const all = [...values.values()];
    // A fifty-to-one spread would turn the game into a hunt for a single tile.
    expect(Math.max(...all) / Math.min(...all)).toBeLessThan(15);
  });
});

describe('scoreWord', () => {
  const value = (l: string) => letterValues(DICTIONARY.letterWeights).get(l) ?? 1;

  it('pays more for longer words', () => {
    expect(scoreWord(props('stone'), value)).toBeGreaterThan(scoreWord(props('ton'), value));
  });

  it('pays more for rarer words of the same shape', () => {
    const common = scoreWord(analyze('house', 0), value);
    const rare = scoreWord(analyze('house', 1), value);
    expect(rare).toBeGreaterThan(common * 2.5);
  });

  it('scales super-linearly with length, so a big word feels big', () => {
    const three = scoreWord(props('cat'), value);
    const seven = scoreWord(props('cistern'), value);
    expect(seven).toBeGreaterThan(three * 6);
  });

  it('never returns a negative or fractional score', () => {
    for (const word of ['cat', 'stone', 'quizzed', 'the']) {
      const s = scoreWord(props(word), value);
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThan(0);
    }
  });
});
