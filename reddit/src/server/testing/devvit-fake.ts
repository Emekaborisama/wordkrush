/**
 * An in-memory stand-in for `@devvit/web/server`.
 *
 * The root Vitest config aliases the real package to this file, which is what
 * lets the server routes be tested from the Expo repo without installing the
 * Devvit dependency tree — `npm test` in CI must not depend on
 * `reddit/node_modules` existing.
 *
 * Only the surface these routes actually use is implemented, and it is
 * implemented honestly: `zRange` really sorts, `zRank` really counts from the
 * bottom. A fake that returned plausible-looking values would test nothing.
 */

type ZMember = { member: string; score: number };
type ZRangeOptions = { by: 'score' | 'lex' | 'rank'; reverse?: boolean };

const strings = new Map<string, string>();
const hashes = new Map<string, Map<string, string>>();
const zsets = new Map<string, Map<string, number>>();

/** Highest score first; ties broken by member name, as a real sorted set does. */
function sorted(key: string): ZMember[] {
  const set = zsets.get(key);
  if (!set) return [];
  return [...set.entries()]
    .map(([member, score]) => ({ member, score }))
    .sort((a, b) => (a.score === b.score ? a.member.localeCompare(b.member) : a.score - b.score));
}

export const redis = {
  async get(key: string): Promise<string | undefined> {
    return strings.get(key);
  },
  async set(key: string, value: string): Promise<string> {
    strings.set(key, value);
    return 'OK';
  },
  async del(...keys: string[]): Promise<void> {
    for (const key of keys) strings.delete(key);
  },
  async expire(): Promise<void> {
    // Expiry is not simulated; nothing under test depends on a key vanishing.
  },
  async hGetAll(key: string): Promise<Record<string, string>> {
    return Object.fromEntries(hashes.get(key) ?? new Map());
  },
  async hSet(key: string, fieldValues: Record<string, string>): Promise<number> {
    const hash = hashes.get(key) ?? new Map<string, string>();
    for (const [field, value] of Object.entries(fieldValues)) hash.set(field, value);
    hashes.set(key, hash);
    return Object.keys(fieldValues).length;
  },
  async zAdd(key: string, ...members: ZMember[]): Promise<number> {
    const set = zsets.get(key) ?? new Map<string, number>();
    for (const { member, score } of members) set.set(member, score);
    zsets.set(key, set);
    return members.length;
  },
  async zCard(key: string): Promise<number> {
    return zsets.get(key)?.size ?? 0;
  },
  async zScore(key: string, member: string): Promise<number | undefined> {
    return zsets.get(key)?.get(member);
  },
  async zRank(key: string, member: string): Promise<number | undefined> {
    const index = sorted(key).findIndex((entry) => entry.member === member);
    return index === -1 ? undefined : index;
  },
  async zRange(
    key: string,
    start: number,
    stop: number,
    options?: ZRangeOptions,
  ): Promise<ZMember[]> {
    const rows = options?.reverse ? sorted(key).reverse() : sorted(key);
    return rows.slice(start, stop === -1 ? undefined : stop + 1);
  },
};

export type FakeContext = {
  postId: string | undefined;
  userId: string | undefined;
  loid: string | undefined;
  username: string | undefined;
  subredditName: string;
};

export const context: FakeContext = {
  postId: 't3_test',
  userId: 't2_alice',
  loid: 'loid_alice',
  username: 'alice',
  subredditName: 'wordkrushtest',
};

export const submitted: { title: string; postData: unknown }[] = [];

/**
 * What the Reddit API would answer, tracked separately from `context.username`.
 *
 * The two are the same in practice, but the routes fall back from the context
 * to the API precisely because the context field is experimental — so a test
 * has to be able to blank one without blanking the other.
 */
let currentHandle: string | undefined = 'alice';

export const reddit = {
  async submitCustomPost(opts: { title: string; postData?: unknown }) {
    submitted.push({ title: opts.title, postData: opts.postData });
    return { id: `t3_${submitted.length}` };
  },
  async getCurrentUsername(): Promise<string | undefined> {
    return currentHandle;
  },
};

/** Wipe every store and put the context back to a signed-in player. */
export function resetDevvitFake(): void {
  strings.clear();
  hashes.clear();
  zsets.clear();
  submitted.length = 0;
  context.postId = 't3_test';
  context.userId = 't2_alice';
  context.loid = 'loid_alice';
  context.username = 'alice';
  context.subredditName = 'wordkrushtest';
  currentHandle = 'alice';
}

/** Sign in as somebody else, so a second player can be put on the board. */
export function signInAs(name: string | null): void {
  if (name === null) {
    context.userId = undefined;
    context.username = undefined;
    context.loid = 'loid_anonymous';
    currentHandle = undefined;
    return;
  }
  context.userId = `t2_${name}`;
  context.username = name;
  context.loid = `loid_${name}`;
  currentHandle = name;
}
