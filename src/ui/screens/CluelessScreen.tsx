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
import { warmerWord } from '../../games/clueless/boosts';
import { loadProgressEnvelope, saveProgress } from '../../games/progress';
import { boostPrice } from '../../rewards/wallet';
import type { BoostKind } from '../../rewards/types';
import { feedback } from '../../native/feedback';
import { shareResult } from '../../native/share';
import { GuessRow } from '../GuessRow';
import { ExampleRow, HowToPlay } from '../HowToPlay';
import {
  afterModalClose,
  BlockTile,
  Button,
  CreamBox,
  CreamText,
  EmptyState,
  FeedbackBanner,
  GameHeader,
  GameIcon,
  HudPanel,
  Panel,
  PanelText,
  PausePopup,
  Rays,
  ScoreWell,
  SquareButton,
  TextField,
} from '../components';
import { BoostBar, coinShortfall } from '../rewards/BoostBar';
import type { RunReward } from '../rewards/RunReward';
import { RewardCelebration, RewardPanel } from '../rewards/RewardReveal';
import { cube, font, palette, proximityColor, space, tone, type CubeColor } from '../theme';

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
  onWin: (
    guessesUsed: number,
    assistanceContext: CluelessAssistanceContext,
    detail: { boosted: boolean },
  ) => void | Promise<RunReward | void>;
  onExit: () => void;
  /** Opened automatically the first time someone plays. */
  showHelpInitially?: boolean;
  persist?: boolean;
  coins?: number;
  onSpend?: (kind: BoostKind) => boolean;
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
  coins = 0,
  onSpend,
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
  const [paused, setPaused] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [boosted, setBoosted] = useState(false);
  const [reward, setReward] = useState<RunReward | null>(null);
  const boostedRef = useRef(false);
  boostedRef.current = boosted;
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
    void loadProgressEnvelope(GAME_ID, puzzleNumber, isCluelessState).then((loaded) => {
      if (cancelled) return;
      const saved = loaded?.state;
      if (loaded?.meta?.boosted) setBoosted(true);
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
    void saveProgress(GAME_ID, puzzleNumber, state, { boosted });
  }, [state, puzzleNumber, persist, boosted]);

  function submitWord(word: string) {
    const before = state.status;
    const next = reducer(state, { type: 'guess', word }, index);
    dispatch({ type: 'guess', word });

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
        void Promise.resolve(
          onWin(next.guesses.length, assistanceContextForHintPolicy(next.hintPolicy), {
            boosted: boostedRef.current,
          }),
        ).then((result) => {
          if (result) setReward(result);
        });
      }
    } else if (next.rejection?.kind === 'not-a-word') {
      feedback('wrong');
    }
    if (!next.rejection) {
      onScore?.(next.guesses.length, next.status === 'won');
    }
  }

  function submit() {
    if (!input.trim()) return;
    submitWord(input);
    setInput('');
  }

  const spendBoost = (kind: BoostKind): boolean => {
    if (!persist || !onSpend?.(kind)) return false;
    boostedRef.current = true;
    setBoosted(true);
    return true;
  };

  const warmerPrice = boostPrice('warmer-word');
  const hintPrice = boostPrice('hint-now');
  const warmer = state.status === 'playing' ? warmerWord(state, index) : null;

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
        is_new_best: reward?.isNewBest ?? false,
      });
    }
  }

  const won = state.status === 'won';
  const best = bestRank(state);
  const warmth = closeness(best, puzzle.rankedCount);
  const accent = palette.purple;
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

  const levelLabel = levelName
    ? `LEVEL ${levelNumber ?? puzzle.number} · ${levelName}`
    : `${pathPhase === 'team' ? 'TEAM RACE' : pathPhase === 'daily' ? 'DAILY VAULT' : 'LEVEL'} ${
        levelNumber ?? puzzle.number
      }`;
  const boosts =
    persist && onSpend && state.status === 'playing'
      ? [
          {
            kind: 'warmer-word' as const,
            label: 'Warmer word',
            icon: 'bulb' as const,
            price: warmerPrice,
            disabled: coins < warmerPrice || warmer === null,
            disabledReason:
              coinShortfall(coins, warmerPrice) ?? (warmer === null ? 'No warmer word' : undefined),
            onPress: () => {
              if (!warmer || !spendBoost('warmer-word')) return;
              submitWord(warmer);
            },
          },
          ...(state.hintPolicy === 'guess_threshold'
            ? [
                {
                  kind: 'hint-now' as const,
                  label: 'Hint now',
                  icon: 'magnifier' as const,
                  price: hintPrice,
                  disabled: coins < hintPrice,
                  disabledReason: coinShortfall(coins, hintPrice),
                  onPress: () => {
                    if (!spendBoost('hint-now')) return;
                    dispatch({ type: 'unlockHint' });
                  },
                },
              ]
            : []),
        ]
      : [];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GameHeader title="Clueless" subtitle={levelLabel} onExit={onExit} onHelp={() => setHelp(true)} />

      <View style={styles.hud}>
        <HudPanel label={state.guesses.length === 1 ? 'Guess' : 'Guesses'} value={state.guesses.length} />
        <HudPanel label="Closest" value={best == null ? '—' : `#${best.toLocaleString()}`} />
        <HudPanel label="Level" value={levelNumber ?? puzzle.number} />
      </View>

      {won ? (
        <View style={styles.result}>
          <View style={styles.rays} pointerEvents="none">
            <Rays size={360} />
          </View>
          <Panel
            title="SOLVED!"
            scroll
            style={styles.resultPanel}
            accessibilityLabel="Solved"
            footer={
              <>
                {pathPhase !== 'team' ? (
                  <Button
                    title="Continue"
                    size="lg"
                    tone="green"
                    onPress={onExit}
                    accessibilityHint="Return to the Clueless path"
                  />
                ) : null}
                <View style={styles.squares}>
                  {pathPhase !== 'team' ? (
                    <SquareButton
                      icon={<GameIcon name="home" size={28} color={tone.sky.outline} />}
                      accessibilityLabel="Home"
                      caption="Home"
                      tone="sky"
                      size={50}
                      onPress={onExit}
                    />
                  ) : null}
                  <SquareButton
                    icon={<GameIcon name="share" size={28} color={tone.sky.outline} />}
                    accessibilityLabel="Share result"
                    caption="Share"
                    tone="sky"
                    size={50}
                    onPress={() => void onShare()}
                  />
                </View>
                {shareNote ? <PanelText live>{shareNote}</PanelText> : null}
              </>
            }
          >
            {reward ? <RewardPanel events={reward.events} boosted={reward.boosted} /> : null}
            <SecretWord word={puzzle.secret} />
            <ScoreWell label={state.guesses.length === 1 ? 'GUESS' : 'GUESSES'} value={String(state.guesses.length)} />
            {pathPhase !== 'team' ? <PanelText>{completionCopy}</PanelText> : null}
          </Panel>
          {reward ? <RewardCelebration events={reward.events} /> : null}
        </View>
      ) : (
        <>
          {state.hintPolicy !== 'none' && hint ? (
            <CreamBox style={!hintVisible && styles.hintLocked}>
              <CreamText variant="label">{hintVisible ? 'THEMATIC HINT' : 'HINT LOCKED'}</CreamText>
              <CreamText style={hintVisible ? styles.hintText : styles.hintCountdown}>
                {hintVisible
                  ? hint
                  : `${hintRemaining} valid ${hintRemaining === 1 ? 'guess' : 'guesses'} until the hint`}
              </CreamText>
            </CreamBox>
          ) : null}

          {/* The board: the kit's cyan frame round the guess field and the
              ranked guesses, with the semantic-heat bar on top. */}
          <View style={styles.board}>
            {state.guesses.length > 0 ? (
              <View style={styles.meter} accessible accessibilityLabel={`Closest guess rank ${best ?? 'none'}`}>
                <Text style={styles.meterTitle}>HEAT</Text>
                <View style={styles.meterTrack}>
                  <View
                    style={[
                      styles.meterFill,
                      { width: `${Math.max(2, warmth * 100)}%`, backgroundColor: proximityColor(warmth) },
                    ]}
                  />
                </View>
              </View>
            ) : null}
            <View style={styles.inputRow}>
              <TextField
                accent={palette.teal}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={submit}
                placeholder="Type any word"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                returnKeyType="go"
                blurOnSubmit={false}
                containerStyle={styles.field}
              />
              <Button
                title="Guess"
                onPress={submit}
                tone="green"
                size="md"
                fullWidth={false}
                disabled={!input.trim()}
                accessibilityLabel="Submit guess"
              />
            </View>
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
                  art={<BlockTile size={58} color="purple" letter="?" />}
                  actionLabel="See how it works"
                  onAction={() => setHelp(true)}
                />
              ) : (
                state.guesses.map((g) => (
                  <GuessRow key={g.word} guess={g} rankedCount={puzzle.rankedCount} animate={g.word === state.lastWord} />
                ))
              )}
            </ScrollView>
          </View>

          <BoostBar controls={boosts} onPause={() => setPaused(true)} />
        </>
      )}

      <PausePopup
        visible={paused}
        onResume={() => setPaused(false)}
        onHelp={() => {
          setPaused(false);
          afterModalClose(() => setHelp(true));
        }}
        onLeave={() => {
          setPaused(false);
          onExit();
        }}
        note={persist ? 'Your guesses are saved.' : undefined}
      />

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

const WORD_CUBES: readonly CubeColor[] = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];

/** The answer spelled in the kit's cubes, one colour per letter. */
function SecretWord({ word }: { word: string }) {
  const letters = [...word.toUpperCase()];
  const size = letters.length > 8 ? 30 : 38;
  return (
    <View style={styles.secret} accessible accessibilityLabel={`The word was ${word}`}>
      {letters.map((letter, i) => (
        <BlockTile key={`${letter}-${i}`} size={size} color={cube[WORD_CUBES[i % WORD_CUBES.length]!]} letter={letter} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.md, paddingTop: space.xs, paddingBottom: space.xs, gap: space.sm },
  hud: { flexDirection: 'row', gap: space.sm },
  result: { flex: 1, minHeight: 0, justifyContent: 'center' },
  rays: { position: 'absolute', top: -20, left: 0, right: 0, alignItems: 'center' },
  resultPanel: { flexShrink: 1 },
  squares: { flexDirection: 'row', justifyContent: 'center', gap: space.lg },
  secret: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  hintLocked: { opacity: 0.85 },
  hintText: { fontFamily: font.heavy, fontSize: 15, lineHeight: 21 },
  hintCountdown: { fontSize: 13, lineHeight: 18, color: palette.inkSoft },
  board: {
    flex: 1,
    minHeight: 0,
    gap: space.sm,
    padding: space.sm,
    borderRadius: 22,
    backgroundColor: palette.frame,
    borderWidth: 3,
    borderColor: palette.frameDeep,
    borderTopColor: '#7FE0F6',
  },
  meter: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: 2 },
  meterTitle: {
    fontFamily: font.black,
    fontSize: 12,
    color: palette.white,
    textShadowColor: palette.frameDeep,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  meterTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.navyDeep,
    borderWidth: 2,
    borderColor: palette.white,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', borderRadius: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  field: { flex: 1 },
  list: { flex: 1, minHeight: 0 },
  listContent: { gap: 6, paddingBottom: space.sm },
  exampleCaption: { fontFamily: font.heavy, fontSize: 13, color: palette.inkSoft, marginBottom: 4 },
});
