import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import { rankBucket } from '../../analytics/events';
import { VOCABULARY, puzzleByNumber } from '../../data/clueless';
import {
  bestRank,
  closeness,
  indexPuzzle,
  isHintVisible,
  newPuzzle,
  reducer,
  STANDARD_HINT_GUESS_THRESHOLD,
  type Action,
} from '../../games/clueless/engine';
import { isCluelessState, rehydrate } from '../../games/clueless/persistence';
import { buildShareText } from '../../games/clueless/share';
import {
  assistanceContextForHintPolicy,
  type CluelessAssistanceContext,
  type CluelessHintPolicy,
  type CluelessState,
} from '../../games/clueless/types';
import { loadProgress, saveProgress } from '../../games/progress';
import { getGame } from '../../games/registry';
import { feedback } from '../../native/feedback';
import { shareResult } from '../../native/share';
import { GuessRow } from '../GuessRow';
import { ExampleRow, HowToPlay } from '../HowToPlay';
import {
  Button,
  EmptyState,
  FeedbackBanner,
  GameHeader,
  ProgressPill,
  Surface,
  TextField,
} from '../components';
import { Mascot } from '../lottie/Mascot';
import { elevation, font, proximityColor, radius, space, theme, type, withAlpha } from '../theme';

const GAME_ID = 'clueless';

type Props = {
  puzzleNumber: number;
  /** Solo path number or a team path number; omitted for a legacy session. */
  levelNumber?: number;
  levelName?: string;
  pathPhase?: 'tutorial' | 'daily' | 'team';
  /** Assigned by reviewed level content, never selected during play. */
  hintPolicy: CluelessHintPolicy;
  hint?: string | null;
  onWin: (guessesUsed: number, assistanceContext: CluelessAssistanceContext) => void;
  onExit: () => void;
  /** Opened automatically the first time someone plays. */
  showHelpInitially?: boolean;
  persist?: boolean;
  onScore?: (guesses: number, complete: boolean) => void;
};

export function CluelessScreen({
  puzzleNumber,
  levelNumber,
  levelName,
  pathPhase,
  hintPolicy,
  hint,
  onWin,
  onExit,
  showHelpInitially = false,
  persist = true,
  onScore,
}: Props) {
  const puzzle = puzzleByNumber(puzzleNumber)!;
  // Indexing builds a 5k-entry Map; it must not rerun on every keystroke.
  const index = useMemo(() => indexPuzzle(puzzle, VOCABULARY), [puzzle]);

  const [state, dispatch] = useReducer(
    (s: CluelessState, a: Action) => reducer(s, a, index),
    { puzzleNumber, hintPolicy },
    ({ puzzleNumber: number, hintPolicy: policy }) => newPuzzle(number, policy),
  );
  const [input, setInput] = useState('');
  const [help, setHelp] = useState(showHelpInitially);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const reported = useRef(false);
  const shareNoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Nothing may be written until the restore attempt finishes, or the empty
  // initial state would overwrite the saved session before it loads.
  const restored = useRef(false);

  useEffect(() => {
    if (!persist) {
      restored.current = true;
      captureAnalytics('run_started', {
        game_id: 'clueless',
        is_resume: false,
        puzzle_number: puzzleNumber,
        level_number: levelNumber,
        path_phase: pathPhase,
        assistance_context: assistanceContextForHintPolicy(hintPolicy),
        hint_source: hintPolicy,
      });
      return;
    }
    let cancelled = false;
    void loadProgress(GAME_ID, puzzleNumber, isCluelessState).then((saved) => {
      if (cancelled) return;
      const restoredState = saved
        ? rehydrate(saved, hintPolicy)
        : newPuzzle(puzzleNumber, hintPolicy);
      const restoredHintPolicy = restoredState.hintPolicy;
      if (saved) {
        dispatch({ type: 'restore', state: restoredState });
        // A session restored in the won state was already scored; re-reporting
        // it would add a duplicate entry to the score table on every visit.
        if (saved.status === 'won') reported.current = true;
      }
      restored.current = true;
      captureAnalytics('run_started', {
        game_id: 'clueless',
        is_resume: Boolean(saved && saved.status !== 'won'),
        puzzle_number: puzzleNumber,
        level_number: levelNumber,
        path_phase: pathPhase,
        assistance_context: assistanceContextForHintPolicy(restoredHintPolicy),
        hint_source: restoredHintPolicy,
      });
      captureAnalytics('daily_puzzle_viewed', {
        game_id: 'clueless',
        puzzle_number: puzzleNumber,
        level_number: levelNumber,
        already_completed: saved?.status === 'won',
        path_phase: pathPhase,
        assistance_context: assistanceContextForHintPolicy(restoredHintPolicy),
        hint_source: restoredHintPolicy,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [puzzleNumber, hintPolicy, levelNumber, pathPhase, persist]);

  // Persist after every change, once restore has run.
  useEffect(() => {
    if (!persist || !restored.current) return;
    void saveProgress(GAME_ID, puzzleNumber, state);
  }, [state, puzzleNumber, persist]);

  function submit() {
    if (!input.trim()) return;
    const before = state.status;
    const next = reducer(state, { type: 'guess', word: input }, index);
    dispatch({ type: 'guess', word: input });
    setInput('');

    const rejectionKind =
      next.rejection?.kind === 'not-a-word'
        ? 'not_a_word'
        : next.rejection?.kind === 'already-guessed'
          ? 'already_guessed'
          : undefined;
    captureAnalytics('guess_submitted', {
      game_id: 'clueless',
      guess_index: next.guesses.length || state.guesses.length + 1,
      result_kind:
        next.status === 'won' ? 'correct' : rejectionKind ?? 'valid',
      rank_bucket: next.rejection ? undefined : rankBucket(bestRank(next)),
      puzzle_number: puzzleNumber,
      level_number: levelNumber,
      path_phase: pathPhase,
      assistance_context: assistanceContextForHintPolicy(next.hintPolicy),
      hint_source: next.hintPolicy,
    });

    if (next.status === 'won' && before !== 'won') {
      // Solving the word ends the run, so this is the celebration, not a
      // routine 'correct'.
      feedback('win');
      if (!reported.current) {
        reported.current = true;
        onWin(next.guesses.length, assistanceContextForHintPolicy(next.hintPolicy));
      }
    } else if (next.rejection?.kind === 'not-a-word') {
      feedback('wrong');
    }
    if (!next.rejection) {
      onScore?.(next.guesses.length, next.status === 'won');
    }
  }

  useEffect(() => {
    return () => {
      if (shareNoteTimer.current !== null) clearTimeout(shareNoteTimer.current);
    };
  }, []);

  async function onShare() {
    const outcome = await shareResult(
      buildShareText({
        puzzleNumber,
        levelName,
        guesses: state.guesses.map((guess) => ({ rank: guess.rank })),
      }),
    );
    if (outcome === 'copied') {
      setShareNote('Copied to clipboard');
      if (shareNoteTimer.current !== null) clearTimeout(shareNoteTimer.current);
      shareNoteTimer.current = setTimeout(() => setShareNote(null), 2000);
    }
    if (outcome === 'shared' || outcome === 'copied') {
      captureAnalytics('result_shared', {
        game_id: 'clueless',
        outcome: 'win',
        score_kind: 'guesses_used',
        method: outcome === 'shared' ? 'share_sheet' : 'clipboard',
        is_new_best: false,
      });
    }
  }

  const won = state.status === 'won';
  const best = bestRank(state);
  const warmth = closeness(best, puzzle.rankedCount);
  const accent = getGame(GAME_ID)?.accent ?? theme.violet;
  const hintVisible = isHintVisible(state);
  const hintRemaining = Math.max(0, STANDARD_HINT_GUESS_THRESHOLD - state.guesses.length);
  const hasNextTutorial =
    pathPhase === 'tutorial' && levelNumber !== undefined && levelNumber < 3;
  const completionCopy =
    pathPhase === 'daily'
      ? 'You’ve cracked today’s Daily Vault. Come back tomorrow for the next one.'
      : pathPhase === 'tutorial' && levelNumber === 3
        ? 'You cleared the Spark path. Your first Daily Vault opens tomorrow.'
        : hasNextTutorial
          ? 'Next level unlocked. Keep following the path.'
          : 'Puzzle complete. Head back to see what’s next.';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <GameHeader
        title="Clueless"
        subtitle={
          levelName ??
          `${pathPhase === 'team' ? 'TEAM RACE' : pathPhase === 'daily' ? 'DAILY VAULT' : 'LEVEL'} ${
            levelNumber ?? puzzle.number
          }`
        }
        accent={accent}
        onExit={onExit}
        onHelp={() => setHelp(true)}
      />

      <View style={styles.statsRow}>
        <ProgressPill
          label={state.guesses.length === 1 ? 'GUESS' : 'GUESSES'}
          value={state.guesses.length}
          color={accent}
        />
      </View>

      {!won && state.hintPolicy !== 'none' && hint ? (
        <Surface
          level={hintVisible ? 2 : 1}
          borderColor={hintVisible ? withAlpha(accent, 0.45) : undefined}
          radius={radius.md}
          style={styles.hintCard}
        >
          <Text style={[styles.hintLabel, hintVisible && { color: accent }]}>
            {hintVisible ? 'THEMATIC HINT' : 'HINT LOCKED'}
          </Text>
          <Text style={hintVisible ? styles.hintText : styles.hintCountdown}>
            {hintVisible
              ? hint
              : `${hintRemaining} valid ${hintRemaining === 1 ? 'guess' : 'guesses'} until the hint`}
          </Text>
        </Surface>
      ) : null}

      {/* Warmth meter: turns the abstract best-rank number into something you
          can read at a glance, and gives the screen a focal point. */}
      {!won && state.guesses.length > 0 ? (
        <Surface
          level={1}
          borderColor={withAlpha(proximityColor(warmth), 0.35)}
          radius={radius.md}
          style={styles.meter}
        >
          <View style={styles.meterCopy}>
            <Text style={styles.meterTitle}>SEMANTIC HEAT</Text>
            <Text style={styles.meterLabel}>
              Closest <Text style={styles.meterValue}>#{best?.toLocaleString() ?? '—'}</Text>
            </Text>
          </View>
          <View style={styles.meterTrack}>
            <View
              style={[
                styles.meterFill,
                { width: `${Math.max(2, warmth * 100)}%`, backgroundColor: proximityColor(warmth) },
              ]}
            />
          </View>
        </Surface>
      ) : null}

      {won ? (
        <Surface
          level={3}
          raised
          borderColor={theme.success}
          radius={radius.lg}
          style={styles.wonCard}
        >
          <View style={styles.wonSummary}>
            <Mascot size={52} pose="celebrate" />
            <View style={styles.wonCopy}>
              <Text style={styles.wonEyebrow}>PUZZLE SOLVED</Text>
              <Text style={styles.wonWord}>{puzzle.secret}</Text>
              <Text style={styles.wonMeta}>
                Found in {state.guesses.length} {state.guesses.length === 1 ? 'guess' : 'guesses'}
              </Text>
            </View>
          </View>
          <View style={styles.completion}>
            <Button
              title="Share result"
              onPress={() => void onShare()}
              variant="tonal"
              color={accent}
              accessibilityHint="Copies a spoiler-free result you can paste anywhere"
            />
            {shareNote ? (
              <Text style={styles.shareNote} accessibilityLiveRegion="polite">
                {shareNote}
              </Text>
            ) : null}
            {pathPhase !== 'team' ? (
              <>
                <Text style={styles.completionCopy}>{completionCopy}</Text>
                <Button
                  title={hasNextTutorial ? 'Continue path' : 'Back to Clueless'}
                  onPress={onExit}
                  color={accent}
                  accessibilityHint="Return to the Clueless path"
                />
              </>
            ) : null}
          </View>
        </Surface>
      ) : (
        <TextField
          accent={accent}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={submit}
          placeholder="Type any word"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="go"
          // Keeps focus so guesses can be typed back to back.
          blurOnSubmit={false}
          trailing={
            <Button
              title="Guess"
              onPress={submit}
              color={accent}
              size="sm"
              fullWidth={false}
              disabled={!input.trim()}
              accessibilityLabel="Submit guess"
            />
          }
        />
      )}

      {state.rejection ? (
        <FeedbackBanner
          tone={state.rejection.kind === 'already-guessed' ? 'warning' : 'danger'}
          title={state.rejection.kind === 'already-guessed' ? 'Already on your board' : 'Try another word'}
          body={
            state.rejection.kind === 'not-a-word'
              ? `“${state.rejection.word}” isn’t in this word list.`
              : state.rejection.kind === 'already-guessed'
                ? `You already tried “${state.rejection.word}”.`
                : 'Type a word first.'
          }
        />
      ) : null}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {state.guesses.length === 0 ? (
          <EmptyState
            title="Find the secret word"
            body="Every guess is ranked by meaning, not spelling. Start broad, then follow the heat."
            accent={accent}
            art={<Text style={[styles.emptyGlyphText, { color: accent }]}>?</Text>}
            actionLabel="See how it works"
            onAction={() => setHelp(true)}
          />
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
        intro="There’s a secret word. Every guess is scored by meaning, not spelling. Each level decides whether a thematic hint appears."
        accent={accent}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  hintCard: { gap: space.xs },
  hintLabel: { ...type.overline, color: theme.textDim },
  hintText: { ...type.bodyStrong, color: theme.text },
  hintCountdown: { ...type.caption, color: theme.textMuted },
  meter: { gap: space.sm },
  meterCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meterTitle: { ...type.overline, color: theme.textDim },
  meterTrack: {
    width: '100%',
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: elevation(1).backgroundColor,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', borderRadius: radius.pill },
  meterLabel: { ...type.caption, color: theme.textMuted },
  meterValue: { color: theme.text, fontFamily: font.bold, fontWeight: '700', fontVariant: ['tabular-nums'] },

  wonCard: {
    gap: space.md,
  },
  wonSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  wonCopy: { flex: 1 },
  wonEyebrow: { ...type.overline, color: theme.success },
  wonWord: { ...type.title, color: theme.text, marginTop: 1 },
  wonMeta: { ...type.caption, color: theme.textMuted, marginTop: 1 },
  completion: {
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  completionCopy: { ...type.body, color: theme.textMuted },
  shareNote: { ...type.caption, color: theme.textMuted },

  list: { flex: 1 },
  listContent: { gap: 6, paddingBottom: space.lg },
  emptyGlyphText: { ...type.display },
  exampleCaption: { ...type.caption, color: theme.textDim, marginBottom: 4 },
});
