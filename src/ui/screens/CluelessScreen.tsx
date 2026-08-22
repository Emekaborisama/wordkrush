import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { VOCABULARY, puzzleByNumber } from '../../data/clueless';
import { bestRank, closeness, indexPuzzle, newPuzzle, reducer, type Action } from '../../games/clueless/engine';
import { isCluelessState, rehydrate } from '../../games/clueless/persistence';
import type { CluelessState } from '../../games/clueless/types';
import { loadProgress, saveProgress } from '../../games/progress';
import { tapCorrect, tapWrong } from '../../native/haptics';
import { GuessRow } from '../GuessRow';
import { ExampleRow, HowToPlay } from '../HowToPlay';
import { proximityColor, radius, shadow, space, theme, type } from '../theme';

const GAME_ID = 'clueless';

type Props = {
  puzzleNumber: number;
  onWin: (guessesUsed: number) => void;
  /** Opened automatically the first time someone plays. */
  showHelpInitially?: boolean;
};

export function CluelessScreen({ puzzleNumber, onWin, showHelpInitially = false }: Props) {
  const puzzle = puzzleByNumber(puzzleNumber)!;
  // Indexing builds a 5k-entry Map; it must not rerun on every keystroke.
  const index = useMemo(() => indexPuzzle(puzzle, VOCABULARY), [puzzle]);

  const [state, dispatch] = useReducer(
    (s: CluelessState, a: Action) => reducer(s, a, index),
    puzzleNumber,
    newPuzzle,
  );
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [help, setHelp] = useState(showHelpInitially);
  const reported = useRef(false);
  // Nothing may be written until the restore attempt finishes, or the empty
  // initial state would overwrite the saved session before it loads.
  const restored = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadProgress(GAME_ID, puzzleNumber, isCluelessState).then((saved) => {
      if (cancelled) return;
      if (saved) {
        dispatch({ type: 'restore', state: rehydrate(saved) });
        // A session restored in the won state was already scored; re-reporting
        // it would add a duplicate entry to the score table on every visit.
        if (saved.status === 'won') reported.current = true;
      }
      restored.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [puzzleNumber]);

  // Persist after every change, once restore has run.
  useEffect(() => {
    if (!restored.current) return;
    void saveProgress(GAME_ID, puzzleNumber, state);
  }, [state, puzzleNumber]);

  function submit() {
    if (!input.trim()) return;
    const before = state.status;
    const next = reducer(state, { type: 'guess', word: input }, index);
    dispatch({ type: 'guess', word: input });
    setInput('');

    if (next.status === 'won' && before !== 'won') {
      void tapCorrect();
      if (!reported.current) {
        reported.current = true;
        onWin(next.guesses.length);
      }
    } else if (next.rejection?.kind === 'not-a-word') {
      void tapWrong();
    }
  }

  const won = state.status === 'won';
  const best = bestRank(state);
  const warmth = closeness(best, puzzle.rankedCount);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Clueless</Text>
          {/* Guess count lives in the input now, so the header does not
              repeat it — one home per piece of information. */}
          <Text style={styles.meta}>Puzzle #{puzzle.number}</Text>
        </View>
        <Pressable
          onPress={() => setHelp(true)}
          style={({ pressed }) => [styles.helpBtn, pressed && styles.pressed]}
          hitSlop={10}
          accessibilityLabel="How to play"
        >
          <Text style={styles.helpMark}>?</Text>
        </Pressable>
      </View>

      {/* Warmth meter: turns the abstract best-rank number into something you
          can read at a glance, and gives the screen a focal point. */}
      {!won && state.guesses.length > 0 && (
        <View style={styles.meter}>
          <View style={styles.meterTrack}>
            <View
              style={[
                styles.meterFill,
                { width: `${Math.max(2, warmth * 100)}%`, backgroundColor: proximityColor(warmth) },
              ]}
            />
          </View>
          <Text style={styles.meterLabel}>
            closest <Text style={styles.meterValue}>{best?.toLocaleString() ?? '—'}</Text>
          </Text>
        </View>
      )}

      {won ? (
        <View style={styles.wonCard}>
          <Text style={styles.wonEyebrow}>SOLVED</Text>
          <Text style={styles.wonWord}>{puzzle.secret}</Text>
          <Text style={styles.wonMeta}>
            {state.guesses.length} {state.guesses.length === 1 ? 'guess' : 'guesses'}
          </Text>
        </View>
      ) : (
        <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={submit}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Type a word"
            placeholderTextColor={theme.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="go"
            // Keeps focus so guesses can be typed back to back.
            blurOnSubmit={false}
          />

          {/* Guess counter, in the field where the player's attention already
              is. Hidden at zero: a "0" before the first guess is clutter, not
              information. */}
          {state.guesses.length > 0 && (
            <View style={styles.counter}>
              <Text
                style={styles.counterText}
                accessibilityLabel={`${state.guesses.length} guesses so far`}
              >
                {state.guesses.length}
              </Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.go, pressed && styles.goPressed]}
            onPress={submit}
            accessibilityLabel="Submit guess"
          >
            <Text style={styles.goText}>Guess</Text>
          </Pressable>
        </View>
      )}

      {state.rejection && (
        <Text style={styles.rejection}>
          {state.rejection.kind === 'not-a-word'
            ? `“${state.rejection.word}” isn’t in the word list`
            : state.rejection.kind === 'already-guessed'
              ? `You’ve already tried “${state.rejection.word}”`
              : 'Type a word first'}
        </Text>
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {state.guesses.length === 0 ? (
          <EmptyState onHelp={() => setHelp(true)} />
        ) : (
          state.guesses.map((g) => (
            <GuessRow
              key={g.word}
              guess={g}
              rankedCount={puzzle.rankedCount}
              animate={g.word === state.lastWord}
            />
          ))
        )}
      </ScrollView>

      <HowToPlay
        visible={help}
        onClose={() => setHelp(false)}
        title="How to play Clueless"
        intro="There’s a secret word. Every guess is scored by how close it is in meaning — not spelling."
        accent={theme.violet}
        steps={[
          { n: 1, title: 'Guess any word', body: 'Anything at all. Start broad and follow the heat.' },
          { n: 2, title: 'Read the number', body: 'It’s the rank by closeness in meaning. Lower is warmer.' },
          { n: 3, title: 'Reach number 1', body: 'Rank 1 is the secret word. Fewer guesses is a better score.' },
        ]}
        example={
          <>
            <Text style={styles.exampleCaption}>If the secret word were “apple”:</Text>
            <ExampleRow word="apple" fraction={1} win />
            <ExampleRow word="red" rank={9} fraction={0.86} />
            <ExampleRow word="fruit" rank={35} fraction={0.72} />
            <ExampleRow word="food" rank={128} fraction={0.52} />
            <ExampleRow word="water" rank={1521} fraction={0.16} />
          </>
        }
      />
    </KeyboardAvoidingView>
  );
}

/**
 * Empty state.
 *
 * A blank list is the worst first impression an app can make. This one teaches
 * the mechanic in one line and gives a concrete starting move, because "type a
 * word" is paralysing when any word is legal.
 */
function EmptyState({ onHelp }: { onHelp: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyGlyph}>
        <Text style={styles.emptyGlyphText}>?</Text>
      </View>
      <Text style={styles.emptyTitle}>Find the secret word</Text>
      <Text style={styles.emptyBody}>
        Every guess is ranked by how close it is in meaning. Rank 1 wins.
      </Text>
      <Text style={styles.emptyHint}>Try something broad to start — “time”, “water”, “music”.</Text>
      <Pressable onPress={onHelp} style={({ pressed }) => [styles.emptyLink, pressed && styles.pressed]}>
        <Text style={styles.emptyLinkText}>See how it works</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: space.lg, gap: space.md },

  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerText: { flex: 1 },
  title: { ...type.display, color: theme.text, fontSize: 30 },
  meta: { ...type.caption, color: theme.textDim, marginTop: 1 },
  helpBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpMark: { color: theme.textMuted, fontSize: 15, fontWeight: '800' },

  meter: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meterTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: theme.card,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', borderRadius: radius.pill },
  meterLabel: { ...type.caption, color: theme.textDim, fontSize: 11 },
  meterValue: { color: theme.textMuted, fontWeight: '700', fontVariant: ['tabular-nums'] },

  inputRow: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 5,
    ...shadow.card,
  },
  // Focus ring rather than a colour swap: it signals state without the field
  // appearing to change identity.
  inputRowFocused: { borderColor: theme.violet },
  input: {
    flex: 1,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    color: theme.text,
    ...type.body,
    fontSize: 16,
  },
  counter: {
    justifyContent: 'center',
    paddingRight: space.sm,
    // Hairline rule separates the count from the button so it reads as field
    // content rather than part of the control.
    borderRightWidth: 1,
    borderRightColor: theme.border,
    marginRight: space.sm,
    minWidth: 26,
    alignItems: 'flex-end',
  },
  counterText: {
    ...type.caption,
    color: theme.textDim,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  go: {
    backgroundColor: theme.violet,
    borderRadius: radius.sm + 2,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },
  goPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  goText: { color: theme.bg, fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },

  rejection: { ...type.caption, color: theme.danger, textAlign: 'center' },

  wonCard: {
    backgroundColor: theme.accentSoft,
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
    ...shadow.card,
  },
  wonEyebrow: { ...type.overline, color: theme.accent },
  wonWord: { ...type.display, color: theme.text, marginTop: 4 },
  wonMeta: { ...type.caption, color: theme.textMuted, marginTop: 2 },

  list: { flex: 1 },
  listContent: { gap: 6, paddingBottom: space.lg },

  empty: { alignItems: 'center', paddingTop: space.xxl, paddingHorizontal: space.lg },
  emptyGlyph: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: theme.violetSoft,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGlyphText: { color: theme.violet, fontSize: 26, fontWeight: '800' },
  emptyTitle: { ...type.title, color: theme.text, marginTop: space.lg },
  emptyBody: { ...type.body, color: theme.textMuted, textAlign: 'center', marginTop: 6 },
  emptyHint: { ...type.caption, color: theme.textDim, textAlign: 'center', marginTop: space.md },
  emptyLink: { marginTop: space.lg, paddingVertical: 8, paddingHorizontal: space.md },
  emptyLinkText: { ...type.caption, color: theme.violet, fontWeight: '700' },

  exampleCaption: { ...type.caption, color: theme.textDim, marginBottom: 4 },
  pressed: { opacity: 0.7 },
});
