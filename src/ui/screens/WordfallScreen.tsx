import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import {
  chainLengthBucket,
  scoreDeltaBucket,
  wordLengthBucket,
} from '../../analytics/events';
import { DICTIONARY, LEVELS, levelByNumber } from '../../data/wordfall';
import { loadProgress, saveProgress } from '../../games/progress';
import { randomSeed } from '../../games/rng';
import {
  createContext,
  lostToClock,
  newGame,
  reducer,
  timeLeftMs,
  tracedWord,
  type Action,
  type WordfallContext,
} from '../../games/wordfall/engine';
import { analyze, scoreWord, specialFor, TRIGGERS } from '../../games/wordfall/linguistics';
import {
  isWordfallSave,
  rehydrate,
  type WordfallSave,
} from '../../games/wordfall/persistence';
import {
  formatDropDay,
  isLevelPlayable,
  isLevelReleased,
  isNewestRelease,
  lastReleasedNumber,
  nextDropDate,
  parseAvailableFrom,
  unlockAfterWin,
} from '../../games/wordfall/schedule';
import type { Level, SpecialKind, WordfallState } from '../../games/wordfall/types';
import { getGame } from '../../games/registry';
import { feedback } from '../../native/feedback';
import { HowToPlay } from '../HowToPlay';
import {
  Badge,
  GameArtwork,
  GameHeader,
  IconButton,
  ResultPanel,
  Surface,
} from '../components';
import { Mascot } from '../lottie/Mascot';
import { elevation, font, formatDuration, radius, space, theme, type } from '../theme';
import { BoardView } from '../wordfall/BoardView';
import { describeObjective, Hud, TracePreview } from '../wordfall/Hud';
import { SPECIAL_VISUALS } from '../wordfall/visuals';

const GAME_ID = 'wordfall';
/**
 * One save slot. Wordfall has a campaign rather than a daily puzzle, so there
 * is no date or puzzle number to key on — there is only ever the run you are
 * in the middle of.
 */
const SESSION = 'campaign';
const ACCENT = getGame('wordfall')?.accent ?? theme.warning;

type Props = {
  /** Called once per level cleared, with the score and how long it took. */
  onLevelWon: (score: number, levelNumber: number, elapsedMs: number) => void;
  onExit: () => void;
  showHelpInitially?: boolean;
};

export function WordfallScreen({ onLevelWon, onExit, showHelpInitially = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [unlocked, setUnlocked] = useState(1);
  const [levelNumber, setLevelNumber] = useState(1);
  const [resume, setResume] = useState<WordfallState | null>(null);
  const [help, setHelp] = useState(showHelpInitially);
  const [picking, setPicking] = useState(false);
  /** Bumped to force a fresh board for the same level number. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void loadProgress<WordfallSave>(GAME_ID, SESSION, isWordfallSave).then((save) => {
      if (cancelled) return;
      if (save) {
        setUnlocked(save.unlocked);
        if (save.state && levelByNumber(save.state.levelNumber)) {
          setLevelNumber(save.state.levelNumber);
          setResume(rehydrate(save.state));
        } else {
          // A finished level clears the board but keeps the unlock. Opening at
          // level 1 in that case would send a returning player back to the
          // tutorial with no explanation. Prefer the newest released level
          // they are allowed to open — a future weekly drop may sit above
          // LAST_LEVEL in the saved unlock without existing yet.
          const now = new Date();
          const latest = lastReleasedNumber(LEVELS, now);
          setLevelNumber(Math.min(save.unlocked, latest));
        }
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    (state: WordfallState | null, unlockedNow: number) => {
      // Nothing may be written before the restore completes, or a fresh empty
      // board would overwrite the saved one on launch.
      if (!loaded) return;
      void saveProgress<WordfallSave>(GAME_ID, SESSION, { unlocked: unlockedNow, state });
    },
    [loaded],
  );

  // Stable identity, so the child's save effect fires on real state changes
  // rather than on every parent render.
  const handleStateChange = useCallback(
    (state: WordfallState) => persist(state, unlocked),
    [persist, unlocked],
  );

  const level = levelByNumber(levelNumber)!;

  if (!loaded) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <LevelPlay
        // Remounting per level and per attempt guarantees a clean engine rather
        // than relying on a reset action threading through every field.
        key={`${levelNumber}-${attempt}`}
        level={level}
        resume={resume?.levelNumber === levelNumber ? resume : null}
        unlocked={unlocked}
        onStateChange={handleStateChange}
        onExit={onExit}
        onHelp={() => setHelp(true)}
        onPickLevel={() => setPicking(true)}
        // The clock stops while a sheet is open: losing a timed level because
        // you read the instructions would be a bad joke.
        paused={help || picking}
        onWin={(score, elapsedMs) => {
          const next = unlockAfterWin(unlocked, levelNumber);
          setUnlocked(next);
          persist(null, next);
          onLevelWon(score, levelNumber, elapsedMs);
        }}
        onNext={() => {
          setResume(null);
          const upcoming = levelByNumber(levelNumber + 1);
          if (upcoming && isLevelPlayable(upcoming, unlockAfterWin(unlocked, levelNumber), new Date())) {
            setLevelNumber(upcoming.number);
          }
          setAttempt((a) => a + 1);
        }}
        onRetry={() => {
          setResume(null);
          setAttempt((a) => a + 1);
        }}
      />

      <LevelPicker
        visible={picking}
        unlocked={unlocked}
        current={levelNumber}
        onClose={() => setPicking(false)}
        onSelect={(n) => {
          setPicking(false);
          setResume(null);
          setLevelNumber(n);
          setAttempt((a) => a + 1);
        }}
      />

      <HowToPlay
        visible={help}
        onClose={() => setHelp(false)}
        title="How to play Wordfall"
        intro="Drag across touching letters to spell a word. What the word is made of decides what it leaves behind. New levels drop every Monday."
        accent={ACCENT}
        steps={[
          {
            n: 1,
            title: 'Trace a word',
            body: 'Letters connect in any direction, including diagonally. Three letters or more.',
          },
          {
            n: 2,
            title: 'Earn a special tile',
            body: 'The word’s own properties decide which one. It stays on the last letter you traced.',
          },
          {
            n: 3,
            title: 'Set it off',
            body: 'Spell a new word through a special tile and it fires — and can set off others.',
          },
        ]}
        example={<TriggerLegend />}
      />
    </View>
  );
}

/** The rules table, rendered from the same data the engine matches on. */
function TriggerLegend() {
  return (
    <View style={styles.legend}>
      <Text style={styles.legendCaption}>
        Only the first rule that matches applies, so you always know what you are about to get:
      </Text>
      {TRIGGERS.map((trigger) => {
        const visual = SPECIAL_VISUALS[trigger.kind];
        return (
          <View key={trigger.kind} style={styles.legendRow}>
            <View style={[styles.legendGlyph, { borderColor: visual.color }]}>
              <Text style={[styles.legendGlyphText, { color: visual.color }]}>{visual.glyph}</Text>
            </View>
            <View style={styles.legendBody}>
              <Text style={styles.legendName}>
                <Text style={{ color: visual.color }}>{trigger.label}</Text>
                <Text style={styles.legendCondition}> — {trigger.condition}</Text>
              </Text>
              <Text style={styles.legendEffect}>{trigger.effect}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function LevelPlay({
  level,
  resume,
  unlocked,
  paused,
  onStateChange,
  onWin,
  onNext,
  onRetry,
  onExit,
  onHelp,
  onPickLevel,
}: {
  level: Level;
  resume: WordfallState | null;
  unlocked: number;
  /** Freezes the clock while a modal is covering the board. */
  paused: boolean;
  onStateChange: (state: WordfallState) => void;
  onWin: (score: number, elapsedMs: number) => void;
  onNext: () => void;
  onRetry: () => void;
  onExit: () => void;
  onHelp: () => void;
  onPickLevel: () => void;
}) {
  const ctx: WordfallContext = useMemo(() => createContext(level, DICTIONARY), [level]);
  const [state, dispatch] = useReducer(
    (s: WordfallState, a: Action) => reducer(s, a, ctx),
    resume,
    (saved) => saved ?? newGame(ctx, randomSeed()),
  );
  const reported = useRef(false);
  const [boardBounds, setBoardBounds] = useState({ width: 0, height: 0 });

  useEffect(() => {
    captureAnalytics('run_started', {
      game_id: 'wordfall',
      is_resume: resume !== null,
      level_number: level.number,
    });
  }, [level.number]);

  // The clock. The engine never reads it — the wall clock is anchored to the
  // time already banked in state, so pausing, leaving the screen, or resuming
  // a saved level all continue from where they stopped rather than charging
  // the player for the gap.
  const elapsedRef = useRef(state.elapsedMs);
  elapsedRef.current = state.elapsedMs;
  const startedAtRef = useRef<number | null>(null);
  const timeLeft = timeLeftMs(state, ctx);

  useEffect(() => {
    if (state.status !== 'playing' || paused) {
      startedAtRef.current = null;
      return;
    }
    const startedAt = Date.now() - elapsedRef.current;
    startedAtRef.current = startedAt;
    // A countdown needs to look smooth; an untimed level only records a total,
    // so it does not need to wake up five times a second to do it.
    const period = level.timeLimitMs === undefined ? 1000 : 200;
    const id = setInterval(() => {
      dispatch({ type: 'tick', elapsedMs: Date.now() - startedAt });
    }, period);
    return () => clearInterval(id);
  }, [state.status, paused, level.timeLimitMs]);

  // Persist after every change. The parent decides where it goes.
  useEffect(() => {
    onStateChange(state);
  }, [state, onStateChange]);

  // A tick per letter as the trace grows. Driven off the selection length
  // rather than off `onTrace`, which fires on every pointer move that lands on
  // a tile — including the one already under the finger. The reducer is what
  // decides a letter was actually added, so it is the honest signal.
  const tracedCount = useRef(0);
  useEffect(() => {
    if (state.selection.length > tracedCount.current) feedback('select');
    tracedCount.current = state.selection.length;
  }, [state.selection.length]);

  useEffect(() => {
    if (state.status === 'won' && !reported.current) {
      reported.current = true;
      feedback('levelUp');
      captureAnalytics('level_completed', {
        game_id: 'wordfall',
        level_number: level.number,
        score: state.score,
        duration_ms: state.elapsedMs,
        words_played: state.played.length,
        moves_left_bucket:
          state.movesLeft >= 5 ? '5_plus' : state.movesLeft >= 1 ? '1_4' : '0',
      });
      onWin(state.score, state.elapsedMs);
    } else if (state.status === 'lost' && !reported.current) {
      reported.current = true;
      const failureMode = lostToClock(state, ctx) ? 'time' : 'moves';
      captureAnalytics('level_failed', {
        game_id: 'wordfall',
        level_number: level.number,
        score: state.score,
        duration_ms: state.elapsedMs,
        failure_mode: failureMode,
      });
      captureAnalytics('run_completed', {
        game_id: 'wordfall',
        outcome: 'loss',
        score: state.score,
        score_kind: 'points',
        duration_ms: state.elapsedMs,
        is_new_best: false,
        level_number: level.number,
      });
    }
  }, [
    state.status,
    state.score,
    state.elapsedMs,
    state.played.length,
    state.movesLeft,
    level.number,
    onWin,
    ctx,
  ]);

  /**
   * What the traced word is worth, recomputed as the finger moves.
   *
   * The engine deliberately does not carry this: it is a projection of state,
   * not part of it, and storing it would mean keeping it in step on every
   * trace action for no gain.
   */
  const preview = useMemo(() => {
    const word = tracedWord(state);
    if (word.length < DICTIONARY.minLength) {
      return { word, valid: false, points: 0, special: null as SpecialKind | null };
    }
    const known = DICTIONARY.isWord(word);
    const fresh = !state.played.includes(word);
    if (!known || !fresh) return { word, valid: false, points: 0, special: null };
    const props = analyze(word, DICTIONARY.rarityOf(word));
    return {
      word,
      valid: true,
      points: scoreWord(props, ctx.letterValue),
      special: specialFor(props),
    };
  }, [state, ctx]);

  const message = useMemo(() => {
    if (state.rejection) {
      const r = state.rejection;
      const text =
        r.kind === 'not-a-word'
          ? `“${r.word.toUpperCase()}” isn’t a word`
          : r.kind === 'already-played'
            ? `You’ve already played “${r.word.toUpperCase()}”`
            : `Words need ${r.minLength} letters or more`;
      return { text, tone: 'bad' as const };
    }
    if (state.lastPlay) {
      const play = state.lastPlay;
      const chain = play.chain > 1 ? ` · ${play.chain}× chain` : '';
      return {
        text: `${play.word.toUpperCase()} +${play.points.toLocaleString('en-US')}${chain}`,
        tone: 'good' as const,
      };
    }
    return null;
  }, [state.rejection, state.lastPlay]);

  const submit = () => {
    if (state.selection.length === 0) return;
    // Bank the clock to this exact instant before playing, so a level's
    // recorded time is when it was finished rather than up to a tick earlier —
    // and so a word played after the buzzer cannot sneak in.
    const now = startedAtRef.current === null ? state.elapsedMs : Date.now() - startedAtRef.current;
    const ticked = reducer(state, { type: 'tick', elapsedMs: now }, ctx);
    const after = reducer(ticked, { type: 'submit' }, ctx);

    dispatch({ type: 'tick', elapsedMs: now });
    dispatch({ type: 'submit' });

    const rejectionKind =
      after.rejection?.kind === 'too-short'
        ? 'too_short'
        : after.rejection?.kind === 'not-a-word'
          ? 'not_a_word'
          : after.rejection?.kind === 'already-played'
            ? 'already_played'
            : undefined;
    const play = after.lastPlay;
    captureAnalytics('word_submitted', {
      game_id: 'wordfall',
      level_number: level.number,
      word_length_bucket: wordLengthBucket(preview.word.length),
      valid: Boolean(play),
      rejection_kind: rejectionKind,
      score_delta_bucket: scoreDeltaBucket(play?.points ?? 0),
      chain_length_bucket: chainLengthBucket(play?.chain ?? 0),
    });

    if (after.rejection) feedback('wrong');
    else if (after.lastPlay) feedback('correct');
  };

  const over = state.status !== 'playing';

  return (
    <View style={styles.play}>
      <GameHeader
        title="Wordfall"
        subtitle={`LEVEL ${level.number} · ${level.name.toUpperCase()}`}
        accent={ACCENT}
        onExit={onExit}
        sideWidth={92}
        trailing={
          <View style={styles.headerActions}>
            <IconButton
              icon={<Text style={styles.levelListMark}>≡</Text>}
              accessibilityLabel="Choose a level"
              onPress={onPickLevel}
              color={ACCENT}
            />
            <IconButton
              icon={<Text style={styles.helpMark}>?</Text>}
              accessibilityLabel="How to play"
              onPress={onHelp}
              color={ACCENT}
            />
          </View>
        }
      />

      <Hud
        levelDescription={level.description}
        movesLeft={state.movesLeft}
        timeLeftMs={timeLeft}
        timeLimitMs={level.timeLimitMs}
        score={state.score}
        objectives={level.objectives}
        progress={state.progress}
        accent={ACCENT}
      />

      <View
        style={styles.boardWrap}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setBoardBounds((current) =>
            current.width === width && current.height === height ? current : { width, height },
          );
        }}
      >
        {boardBounds.width > 0 && boardBounds.height > 0 ? (
          <BoardView
            board={state.board}
            selection={state.selection}
            accent={ACCENT}
            maxWidth={boardBounds.width}
            maxHeight={boardBounds.height}
            disabled={over}
            onTrace={(index) => dispatch({ type: 'trace', index })}
            onRelease={submit}
            onCancel={() => dispatch({ type: 'cancel' })}
          />
        ) : null}
      </View>

      <TracePreview
        word={preview.word}
        valid={preview.valid}
        points={preview.points}
        special={preview.special}
        message={message}
        accent={ACCENT}
      />

      {over && (
        <LevelOutcome
          state={state}
          level={level}
          unlocked={unlocked}
          outOfTime={lostToClock(state, ctx)}
          onNext={onNext}
          onRetry={onRetry}
        />
      )}
    </View>
  );
}

function LevelOutcome({
  state,
  level,
  unlocked,
  outOfTime,
  onNext,
  onRetry,
}: {
  state: WordfallState;
  level: Level;
  unlocked: number;
  outOfTime: boolean;
  onNext: () => void;
  onRetry: () => void;
}) {
  const won = state.status === 'won';
  const latest = lastReleasedNumber(LEVELS, new Date());
  const finished = won && level.number >= latest;

  return (
    <View style={styles.outcomeScrim}>
      <ResultPanel
        eyebrow={
          finished
            ? 'ALL LEVELS CLEARED'
            : won
              ? 'LEVEL COMPLETE'
              : outOfTime
                ? 'OUT OF TIME'
                : 'OUT OF MOVES'
        }
        title={finished ? 'Wordfall master!' : won ? 'Board crushed!' : 'Almost there.'}
        value={state.score.toLocaleString('en-US')}
        valueLabel="POINTS"
        body={`${state.played.length} ${state.played.length === 1 ? 'word' : 'words'} · ${formatDuration(
          state.elapsedMs,
        )}${
          won && level.timeLimitMs === undefined && state.movesLeft > 0
            ? ` · ${state.movesLeft} moves spare`
            : ''
        }`}
        accent={won ? ACCENT : theme.danger}
        art={<Mascot size={64} pose={won ? 'celebrate' : 'wince'} />}
        primary={{
          label: won && !finished ? 'Next level' : won ? 'Replay level' : 'Try again',
          onPress: won && !finished ? onNext : onRetry,
        }}
        secondary={won && !finished ? { label: 'Replay level', onPress: onRetry } : undefined}
      >
        {!won ? (
          // Naming what fell short is the difference between "try again" and
          // knowing what to try differently.
          <Surface level={1} radius={radius.md} borderColor={theme.danger} style={styles.missed}>
            <Text style={styles.missedTitle}>STILL TO DO</Text>
            {level.objectives.map((objective, index) => {
              const progress = state.progress[index] ?? 0;
              if (progress >= objective.target) return null;
              const { label } = describeObjective(objective);
              return (
                <Text key={index} style={styles.missedRow}>
                  {label}: {progress.toLocaleString('en-US')} of{' '}
                  {objective.target.toLocaleString('en-US')}
                </Text>
              );
            })}
          </Surface>
        ) : null}
      </ResultPanel>
    </View>
  );
}

function pickerIntro(now: Date): string {
  const upcoming = nextDropDate(LEVELS, now);
  if (upcoming) return `A new level drops every Monday. Next: ${formatDropDay(upcoming)}.`;
  return 'A new level drops every Monday. Beat the campaign and come back next week.';
}

function LevelPicker({
  visible,
  unlocked,
  current,
  onClose,
  onSelect,
}: {
  visible: boolean;
  unlocked: number;
  current: number;
  onClose: () => void;
  onSelect: (levelNumber: number) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.pickerRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.picker}>
          <View style={styles.pickerHandle} />
          <View style={styles.pickerHeader}>
            <GameArtwork gameId={GAME_ID} accent={ACCENT} size={54} raised />
            <View style={styles.pickerHeaderCopy}>
              <Text style={styles.pickerTitle}>Choose a level</Text>
              <Text style={styles.pickerIntro}>
                {pickerIntro(new Date())}
              </Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.pickerList} showsVerticalScrollIndicator={false}>
            {LEVELS.map((level) => {
              const now = new Date();
              const released = isLevelReleased(level, now);
              const playable = isLevelPlayable(level, unlocked, now);
              const upcoming = !released && level.availableFrom
                ? parseAvailableFrom(level.availableFrom)
                : null;
              const locked = !playable;
              const active = level.number === current;
              const fresh = isNewestRelease(level, now);
              return (
                <Surface
                  key={level.number}
                  level={active ? 3 : 2}
                  radius={radius.md}
                  disabled={locked}
                  onPress={() => onSelect(level.number)}
                  borderColor={active ? ACCENT : undefined}
                  style={styles.pickerRow}
                  accessibilityRole="button"
                  accessibilityLabel={
                    !released && upcoming
                      ? `Level ${level.number}, ${level.name}, drops ${formatDropDay(upcoming)}. ${level.description}`
                      : locked
                        ? `Level ${level.number}, ${level.name}, locked. ${level.description}`
                        : `Play level ${level.number}, ${level.name}. ${level.description}`
                  }
                >
                  <View
                    style={[
                      styles.pickerNumber,
                      active && { backgroundColor: ACCENT, borderColor: ACCENT },
                    ]}
                  >
                    {locked ? (
                      <LockMark />
                    ) : (
                      <Text style={[styles.pickerNumberText, active && { color: theme.bg }]}>
                        {level.number}
                      </Text>
                    )}
                  </View>
                  <View style={styles.pickerBody}>
                    <View style={styles.pickerNameRow}>
                      <Text style={[styles.pickerName, locked && styles.dim]}>{level.name}</Text>
                      {fresh ? <Badge label="THIS WEEK" color={ACCENT} /> : null}
                      {upcoming ? <Badge label={`DROPS ${formatDropDay(upcoming).toUpperCase()}`} /> : null}
                      {active ? <Badge label="CURRENT" color={ACCENT} /> : null}
                    </View>
                    <Text style={styles.pickerDescription} numberOfLines={2}>
                      {level.description}
                    </Text>
                    <Text style={styles.pickerGoals} numberOfLines={2}>
                      {level.objectives
                        .map((o) => `${describeObjective(o).label} ${o.target.toLocaleString('en-US')}`)
                        .join(' · ')}
                    </Text>
                  </View>
                  <View style={styles.pickerBudget}>
                    <Text style={styles.pickerBudgetValue}>
                      {level.timeLimitMs === undefined
                        ? level.moves
                        : formatDuration(level.timeLimitMs)}
                    </Text>
                    <Text style={styles.pickerBudgetLabel}>
                      {level.timeLimitMs === undefined ? 'MOVES' : 'TIME'}
                    </Text>
                  </View>
                </Surface>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function LockMark() {
  return (
    <View style={styles.lock}>
      <View style={styles.lockShackle} />
      <View style={styles.lockBody} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  play: { flex: 1, paddingHorizontal: space.md, paddingBottom: space.sm, gap: space.sm },
  levelListMark: {
    color: theme.text,
    fontFamily: font.semibold,
    fontSize: 21,
    fontWeight: '600',
    lineHeight: 22,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  helpMark: {
    color: theme.text,
    fontFamily: font.semibold,
    fontSize: 16,
    fontWeight: '600',
  },

  // The board takes whatever height is left and centres itself, so the HUD and
  // the read-out keep their positions on every screen size.
  boardWrap: { flex: 1, justifyContent: 'center' },

  outcomeScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  missed: {
    width: '100%',
    marginTop: space.lg,
    gap: 3,
    alignItems: 'center',
  },
  missedTitle: { ...type.overline, color: theme.danger, marginBottom: 2 },
  missedRow: { ...type.caption, color: theme.textMuted },

  pickerRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay },
  picker: {
    ...elevation(1),
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    maxHeight: '88%',
  },
  pickerHandle: {
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: theme.borderStrong,
    alignSelf: 'center',
    marginVertical: space.md,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.lg,
  },
  pickerHeaderCopy: { flex: 1 },
  pickerTitle: { ...type.title, color: theme.text },
  pickerIntro: { ...type.caption, color: theme.textMuted, marginTop: 2 },
  pickerList: { gap: space.sm, paddingBottom: space.md },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  pickerNumber: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: elevation(1).backgroundColor,
    borderWidth: 1,
    borderColor: elevation(1).borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerNumberText: {
    color: theme.textMuted,
    fontFamily: font.bold,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  pickerBody: { flex: 1 },
  pickerNameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pickerName: { ...type.subtitle, color: theme.text },
  pickerDescription: { ...type.caption, color: theme.textMuted, marginTop: 3, lineHeight: 16 },
  pickerGoals: { ...type.caption, color: ACCENT, marginTop: 4 },
  pickerBudget: { width: 48, alignItems: 'flex-end' },
  pickerBudgetValue: {
    ...type.caption,
    color: theme.text,
    fontFamily: font.semibold,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  pickerBudgetLabel: { ...type.overline, color: theme.textDim, marginTop: 1 },
  dim: { color: theme.textDim },
  lock: { width: 18, height: 21, alignItems: 'center', justifyContent: 'flex-end' },
  lockShackle: {
    position: 'absolute',
    top: 0,
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: theme.textDim,
    borderRadius: 7,
  },
  lockBody: {
    width: 17,
    height: 13,
    borderRadius: 4,
    backgroundColor: theme.textDim,
  },

  legend: { gap: space.sm },
  legendCaption: { ...type.caption, color: theme.textDim, marginBottom: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  legendGlyph: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation(3).backgroundColor,
  },
  legendGlyphText: { fontSize: 15, fontWeight: '900' },
  legendBody: { flex: 1 },
  legendName: { ...type.bodyStrong },
  legendCondition: { color: theme.textMuted, fontFamily: font.semibold, fontWeight: '600' },
  legendEffect: { ...type.caption, color: theme.textDim },

});
