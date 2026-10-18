import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { findWordPath } from '../../games/wordfall/board';
import {
  isWordfallSave,
  persistableWordfallState,
  rehydrate,
  shouldReportOutcome,
  type WordfallSave,
} from '../../games/wordfall/persistence';
import {
  formatDropDay,
  isLevelPlayable,
  isLevelReleased,
  isNewestRelease,
  lastReleasedNumber,
  parseAvailableFrom,
  unlockAfterWin,
} from '../../games/wordfall/schedule';
import type { Level, SpecialKind, WordfallState } from '../../games/wordfall/types';
import { buildShareText } from '../../games/wordfall/share';
import { feedback } from '../../native/feedback';
import { shareResult } from '../../native/share';
import { boostPrice } from '../../rewards/wallet';
import type { BoostKind } from '../../rewards/types';
import { HowToPlay } from '../HowToPlay';
import {
  Button,
  DisplayTitle,
  GameHeader,
  Rays,
  ResultSheet,
  RoundIconButton,
  ScoreWell,
} from '../components';
import { BoostBar, coinShortfall } from '../rewards/BoostBar';
import type { RunReward } from '../rewards/RunReward';
import { RewardCelebration, RewardPanel } from '../rewards/RewardReveal';
import { shouldShowTraceHint } from '../wordfall/coach';
import { elevation, font, formatDuration, palette, radius, screen, space, theme, type } from '../theme';
import { BoardView } from '../wordfall/BoardView';
import { describeObjective, Hud, TracePreview } from '../wordfall/Hud';
import { SPECIAL_VISUALS, specialInk } from '../wordfall/visuals';

const GAME_ID = 'wordfall';
/**
 * One save slot. Wordfall has a campaign rather than a daily puzzle, so there
 * is no date or puzzle number to key on — there is only ever the run you are
 * in the middle of.
 */
const SESSION = 'campaign';
const RIBBON = palette.ribbon;

type LiveWordfall = {
  levelNumber: number;
  seed: number;
  onScore: (score: number, complete: boolean) => void;
};

type WordfallFinish = {
  boosted: boolean;
  movesLeft: number;
  moves: number;
  timeLeftMs: number | null;
  timeLimitMs: number | null;
  weekly: boolean;
};

type Props = {
  /** Called once per level cleared, with the score and how long it took. */
  onLevelWon: (
    score: number,
    levelNumber: number,
    elapsedMs: number,
    detail: WordfallFinish,
  ) => void | Promise<RunReward | void>;
  onLevelLost?: (
    score: number,
    levelNumber: number,
    elapsedMs: number,
    detail: WordfallFinish,
  ) => void | Promise<RunReward | void>;
  onExit: () => void;
  showHelpInitially?: boolean;
  live?: LiveWordfall;
  coins?: number;
  onSpend?: (kind: BoostKind) => boolean;
};

export function WordfallScreen({
  onLevelWon,
  onLevelLost,
  onExit,
  showHelpInitially = false,
  live,
  coins = 0,
  onSpend,
}: Props) {
  const [loaded, setLoaded] = useState(Boolean(live));
  const [unlocked, setUnlocked] = useState(1);
  const [levelNumber, setLevelNumber] = useState(live?.levelNumber ?? 1);
  const [resume, setResume] = useState<WordfallState | null>(null);
  const [runBoosted, setRunBoosted] = useState(false);
  const [coachSeen, setCoachSeen] = useState(false);
  const [help, setHelp] = useState(showHelpInitially);
  const [picking, setPicking] = useState(false);
  /** Bumped to force a fresh board for the same level number. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (live) {
      setLevelNumber(live.levelNumber);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void loadProgress<WordfallSave>(GAME_ID, SESSION, isWordfallSave).then((save) => {
      if (cancelled) return;
      if (save) {
        setUnlocked(save.unlocked);
        if (save.traceCoachSeen) setCoachSeen(true);
        const playable = save.state ? persistableWordfallState(save.state) : null;
        if (playable && levelByNumber(playable.levelNumber)) {
          setLevelNumber(playable.levelNumber);
          setResume(rehydrate(playable));
          setRunBoosted(save.boosted === true);
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
  }, [live]);

  const persist = useCallback(
    (state: WordfallState | null, unlockedNow: number, boostedNow: boolean) => {
      if (live) return;
      // Nothing may be written before the restore completes, or a fresh empty
      // board would overwrite the saved one on launch.
      if (!loaded) return;
      const playable = state ? persistableWordfallState(state) : null;
      const body: WordfallSave = {
        unlocked: unlockedNow,
        state: playable,
        ...(playable && boostedNow ? { boosted: true } : {}),
        ...(coachSeen ? { traceCoachSeen: true } : {}),
      };
      void saveProgress<WordfallSave>(GAME_ID, SESSION, body);
    },
    [loaded, live, coachSeen],
  );

  // Stable identity, so the child's save effect fires on real state changes
  // rather than on every parent render.
  const handleStateChange = useCallback(
    (state: WordfallState) => persist(state, unlocked, runBoosted && state.status === 'playing'),
    [persist, unlocked, runBoosted],
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
        resume={live ? null : resume?.levelNumber === levelNumber ? resume : null}
        seed={live?.seed}
        unlocked={unlocked}
        hidePicker={Boolean(live)}
        onStateChange={handleStateChange}
        onExit={onExit}
        onHelp={() => setHelp(true)}
        onPickLevel={() => setPicking(true)}
        // The clock stops while a sheet is open: losing a timed level because
        // you read the instructions would be a bad joke.
        paused={help || picking}
        onScore={live?.onScore}
        coins={coins}
        onSpend={live ? undefined : onSpend}
        boosted={runBoosted}
        onBoosted={() => setRunBoosted(true)}
        coachSeen={coachSeen}
        onCoachSeen={() => setCoachSeen(true)}
        onWin={(score, elapsedMs, detail) => {
          if (!live) {
            const next = unlockAfterWin(unlocked, levelNumber);
            setUnlocked(next);
            setRunBoosted(false);
            persist(null, next, false);
          }
          return onLevelWon(score, levelNumber, elapsedMs, detail);
        }}
        onLose={(score, elapsedMs, detail) => {
          if (!live) {
            setRunBoosted(false);
            persist(null, unlocked, false);
          }
          return onLevelLost?.(score, levelNumber, elapsedMs, detail);
        }}
        onNext={() => {
          setResume(null);
          setRunBoosted(false);
          const upcoming = levelByNumber(levelNumber + 1);
          if (upcoming && isLevelPlayable(upcoming, unlockAfterWin(unlocked, levelNumber), new Date())) {
            setLevelNumber(upcoming.number);
          }
          setAttempt((a) => a + 1);
        }}
        onRetry={() => {
          setResume(null);
          setRunBoosted(false);
          setAttempt((a) => a + 1);
        }}
      />

      <LevelPicker
        visible={picking && !live}
        unlocked={unlocked}
        current={levelNumber}
        onClose={() => setPicking(false)}
        onSelect={(n) => {
          setPicking(false);
          setResume(null);
          setRunBoosted(false);
          setLevelNumber(n);
          setAttempt((a) => a + 1);
        }}
      />

      <HowToPlay
        visible={help}
        onClose={() => setHelp(false)}
        title="How to play Wordfall"
        intro="Drag across touching letters to spell a word. What the word is made of decides what it leaves behind. New levels drop every Monday."
        accent={RIBBON}
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
            <View style={[styles.legendGlyph, { backgroundColor: visual.color, borderColor: visual.color }]}>
              <Text style={[styles.legendGlyphText, { color: specialInk(visual.color) }]}>{visual.glyph}</Text>
            </View>
            <View style={styles.legendBody}>
              <Text style={styles.legendName}>
                <Text style={styles.legendName}>{trigger.label}</Text>
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
  seed,
  unlocked,
  paused,
  hidePicker,
  onStateChange,
  onScore,
  onWin,
  onLose,
  onNext,
  onRetry,
  onExit,
  onHelp,
  onPickLevel,
  coins,
  onSpend,
  boosted,
  onBoosted,
  coachSeen,
  onCoachSeen,
}: {
  level: Level;
  resume: WordfallState | null;
  seed?: number;
  unlocked: number;
  /** Freezes the clock while a modal is covering the board. */
  paused: boolean;
  hidePicker?: boolean;
  onStateChange: (state: WordfallState) => void;
  onScore?: (score: number, complete: boolean) => void;
  onWin: (
    score: number,
    elapsedMs: number,
    detail: WordfallFinish,
  ) => void | Promise<RunReward | void>;
  onLose: (
    score: number,
    elapsedMs: number,
    detail: WordfallFinish,
  ) => void | Promise<RunReward | void>;
  onNext: () => void;
  onRetry: () => void;
  onExit: () => void;
  onHelp: () => void;
  onPickLevel: () => void;
  coins: number;
  onSpend?: (kind: BoostKind) => boolean;
  boosted: boolean;
  onBoosted: () => void;
  coachSeen: boolean;
  onCoachSeen: () => void;
}) {
  const ctx: WordfallContext = useMemo(() => createContext(level, DICTIONARY), [level]);
  const [state, dispatch] = useReducer(
    (s: WordfallState, a: Action) => reducer(s, a, ctx),
    resume,
    (saved) => saved ?? newGame(ctx, seed ?? randomSeed()),
  );
  /**
   * React batches multiple browser pointer events from one task. Keep the
   * reducer's latest trace result here so release can submit it even before the
   * render that exposes it through `state` has run.
   */
  const pendingTrace = useRef<WordfallState | null>(null);
  const reported = useRef(!shouldReportOutcome(resume?.status ?? 'playing'));
  const [boardBounds, setBoardBounds] = useState({ width: 0, height: 0 });
  const [reward, setReward] = useState<RunReward | null>(null);
  const [paidHint, setPaidHint] = useState<readonly number[] | null>(null);
  const [introDismissed, setIntroDismissed] = useState(false);
  const [adaptiveDismissed, setAdaptiveDismissed] = useState(false);
  const [singleTileReleases, setSingleTileReleases] = useState(0);
  const boostedRef = useRef(boosted);
  boostedRef.current = boosted;

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

  const finishDetail = (current: WordfallState): WordfallFinish => ({
    boosted: boostedRef.current,
    movesLeft: current.movesLeft,
    moves: level.moves,
    timeLeftMs: timeLeftMs(current, ctx),
    timeLimitMs: level.timeLimitMs ?? null,
    weekly: level.availableFrom !== undefined,
  });

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
      void Promise.resolve(onWin(state.score, state.elapsedMs, finishDetail(state))).then((result) => {
        if (result) setReward(result);
      });
      onScore?.(state.score, true);
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
      void Promise.resolve(onLose(state.score, state.elapsedMs, finishDetail(state))).then((result) => {
        if (result) setReward(result);
      });
      onScore?.(state.score, false);
    }
  }, [
    state.status,
    state.score,
    state.elapsedMs,
    state.played.length,
    state.movesLeft,
    level.number,
    onWin,
    onLose,
    onScore,
    ctx,
  ]);

  useEffect(() => {
    if (state.status === 'playing') onScore?.(state.score, false);
  }, [state.score, state.status, onScore]);

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

  const trace = useCallback(
    (index: number) => {
      const next = reducer(pendingTrace.current ?? state, { type: 'trace', index }, ctx);
      pendingTrace.current = next;
      dispatch({ type: 'trace', index });
    },
    [ctx, state],
  );

  const cancelTrace = useCallback(() => {
    pendingTrace.current = null;
    dispatch({ type: 'cancel' });
  }, []);

  const submit = () => {
    const traceState = pendingTrace.current ?? state;
    if (traceState.selection.length === 0) return;
    // Bank the clock to this exact instant before playing, so a level's
    // recorded time is when it was finished rather than up to a tick earlier —
    // and so a word played after the buzzer cannot sneak in.
    const now = startedAtRef.current === null ? traceState.elapsedMs : Date.now() - startedAtRef.current;
    const ticked = reducer(traceState, { type: 'tick', elapsedMs: now }, ctx);
    const after = reducer(ticked, { type: 'submit' }, ctx);

    dispatch({ type: 'tick', elapsedMs: now });
    dispatch({ type: 'submit' });
    pendingTrace.current = null;

    if (traceState.selection.length === 1) {
      setSingleTileReleases((count) => count + 1);
    }
    if (traceState.selection.length >= 2) {
      setIntroDismissed(true);
      setAdaptiveDismissed(true);
      onCoachSeen();
    }

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
  const showCoach =
    !hidePicker &&
    state.status === 'playing' &&
    shouldShowTraceHint({
      seenIntro: coachSeen,
      introDismissed,
      singleTileReleases,
      adaptiveDismissed,
    });
  const coachPath = showCoach ? findWordPath(state.board, ctx.solver, state.played) : null;

  useEffect(() => {
    if (!showCoach || coachSeen || introDismissed) return;
    const timer = setTimeout(() => {
      setIntroDismissed(true);
      onCoachSeen();
    }, 4500);
    return () => clearTimeout(timer);
  }, [showCoach, coachSeen, introDismissed, onCoachSeen]);

  useEffect(() => {
    if (!paidHint) return;
    const timer = setTimeout(() => setPaidHint(null), 3000);
    return () => clearTimeout(timer);
  }, [paidHint]);

  const spendBoost = (kind: BoostKind): boolean => {
    if (!onSpend?.(kind)) return false;
    boostedRef.current = true;
    onBoosted();
    return true;
  };

  const shufflePrice = boostPrice('shuffle');
  const hintPrice = boostPrice('word-hint');
  const extraPrice = boostPrice(level.timeLimitMs === undefined ? 'extra-moves' : 'extra-time');
  const extraKind: BoostKind = level.timeLimitMs === undefined ? 'extra-moves' : 'extra-time';
  const extraUsed =
    extraKind === 'extra-moves' ? state.extraMovesGranted === true : (state.bonusMs ?? 0) > 0;
  const hintTiles = findWordPath(state.board, ctx.solver, state.played);

  return (
    <View style={styles.play}>
      <GameHeader
        title="Wordfall"
        subtitle={`LEVEL ${level.number} · ${level.name.toUpperCase()}`}
        ribbon={RIBBON}
        onExit={onExit}
        sideWidth={hidePicker ? 52 : 108}
        trailing={
          <View style={styles.headerActions}>
            {hidePicker ? null : (
              <RoundIconButton
                icon={<Text style={styles.headerGlyph}>≡</Text>}
                accessibilityLabel="Open level map"
                onPress={onPickLevel}
                tone="blue"
                size={44}
              />
            )}
            <RoundIconButton
              icon={<Text style={styles.headerGlyph}>?</Text>}
              accessibilityLabel="How to play"
              onPress={onHelp}
              tone="purple"
              size={44}
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
        accent={palette.green}
      />

      {onSpend && state.status === 'playing' ? (
        <BoostBar
          controls={[
            {
              kind: 'shuffle',
              label: 'Shuffle',
              glyph: '⟳',
              price: shufflePrice,
              disabled: coins < shufflePrice,
              disabledReason: coinShortfall(coins, shufflePrice),
              onPress: () => {
                if (!spendBoost('shuffle')) return;
                dispatch({ type: 'boost', kind: 'shuffle' });
              },
            },
            {
              kind: 'word-hint',
              label: 'Word hint',
              glyph: '✦',
              price: hintPrice,
              disabled: coins < hintPrice || hintTiles === null,
              disabledReason:
                coinShortfall(coins, hintPrice) ?? (hintTiles === null ? 'No word to show' : undefined),
              onPress: () => {
                const path = findWordPath(state.board, ctx.solver, state.played);
                if (!path || !spendBoost('word-hint')) return;
                setPaidHint(path);
              },
            },
            {
              kind: extraKind,
              label: extraKind === 'extra-moves' ? '+3 moves' : '+10s',
              glyph: extraKind === 'extra-moves' ? '+3' : '+10',
              price: extraPrice,
              disabled: coins < extraPrice || extraUsed,
              disabledReason: extraUsed
                ? 'Already used this level'
                : coinShortfall(coins, extraPrice),
              onPress: () => {
                if (extraUsed || !spendBoost(extraKind)) return;
                dispatch({
                  type: 'boost',
                  kind: extraKind === 'extra-moves' ? 'extraMoves' : 'extraTime',
                });
              },
            },
          ]}
        />
      ) : null}

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
            lastPlay={state.lastPlay}
            accent={RIBBON}
            maxWidth={boardBounds.width}
            maxHeight={boardBounds.height}
            disabled={over}
            hintPath={paidHint ?? coachPath ?? undefined}
            onTrace={trace}
            onRelease={submit}
            onCancel={cancelTrace}
          />
        ) : null}
        {showCoach && coachPath ? (
          <Text style={styles.coach} pointerEvents="none">
            Drag through the glowing letters
          </Text>
        ) : null}
      </View>

      <TracePreview
        word={preview.word}
        valid={preview.valid}
        points={preview.points}
        special={preview.special}
        message={message}
        accent={RIBBON}
      />

      {over && (
        <LevelOutcome
          state={state}
          level={level}
          unlocked={unlocked}
          outOfTime={lostToClock(state, ctx)}
          onExit={onExit}
          onNext={onNext}
          onRetry={onRetry}
          reward={reward}
        />
      )}
    </View>
  );
}

function LevelOutcome({
  state,
  level,
  outOfTime,
  onExit,
  onNext,
  onRetry,
  reward,
}: {
  state: WordfallState;
  level: Level;
  unlocked: number;
  outOfTime: boolean;
  onExit: () => void;
  onNext: () => void;
  onRetry: () => void;
  reward: RunReward | null;
}) {
  const won = state.status === 'won';
  const latest = lastReleasedNumber(LEVELS, new Date());
  const finished = won && level.number >= latest;
  const [shareNote, setShareNote] = useState<string | null>(null);
  const shareNoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shareNoteTimer.current !== null) clearTimeout(shareNoteTimer.current);
    };
  }, []);

  async function onShare() {
    const outcome = await shareResult(
      buildShareText({
        levelNumber: level.number,
        levelName: level.name,
        score: state.score,
        wordLengths: state.played.map((word) => word.length),
        elapsedMs: state.elapsedMs,
        won,
      }),
    );
    if (outcome === 'copied') {
      setShareNote('Copied to clipboard');
      if (shareNoteTimer.current !== null) clearTimeout(shareNoteTimer.current);
      shareNoteTimer.current = setTimeout(() => setShareNote(null), 2000);
    }
    if (outcome === 'shared' || outcome === 'copied') {
      captureAnalytics('result_shared', {
        game_id: 'wordfall',
        outcome: won ? 'win' : 'loss',
        score_kind: 'points',
        method: outcome === 'shared' ? 'share_sheet' : 'clipboard',
        is_new_best: reward?.isNewBest ?? false,
      });
    }
  }

  const primaryLabel = won && !finished ? 'Continue' : 'Try again';
  const summary = `${state.played.length} ${state.played.length === 1 ? 'word' : 'words'} · ${formatDuration(
    state.elapsedMs,
  )}${
    won && level.timeLimitMs === undefined && state.movesLeft > 0
      ? ` · ${state.movesLeft} moves spare`
      : ''
  }${finished ? ' · All levels cleared' : ''}${outOfTime && !won ? ' · Out of time' : ''}`;

  return (
    <View style={styles.outcomeScrim}>
      {won ? (
        <View style={styles.rays} pointerEvents="none">
          <Rays />
        </View>
      ) : null}
      <View style={styles.stars}>
        {reward ? <RewardPanel events={reward.events} boosted={reward.boosted} /> : null}
      </View>
      <ResultSheet
        accessibilityLabel={won ? 'You win' : 'Game over'}
        footer={
          <View style={styles.outcomeFooter}>
            <Button
              title={primaryLabel}
              size="xl"
              tone="green"
              onPress={won && !finished ? onNext : onRetry}
            />
            <View style={styles.roundRow}>
              <RoundIconButton
                icon={<Text style={styles.roundGlyph}>⌂</Text>}
                accessibilityLabel="Back to Wordfall"
                onPress={onExit}
                tone="blue"
                size={52}
              />
              <RoundIconButton
                icon={<Text style={styles.roundGlyph}>↻</Text>}
                accessibilityLabel="Replay"
                onPress={onRetry}
                tone="purple"
                size={52}
              />
            </View>
            <Button
              title="Share result"
              tone="blue"
              size="md"
              onPress={() => void onShare()}
              accessibilityHint="Copies a spoiler-free result you can paste anywhere"
            />
            {shareNote ? (
              <Text style={styles.shareNote} accessibilityLiveRegion="polite">
                {shareNote}
              </Text>
            ) : null}
          </View>
        }
      >
        <DisplayTitle>{won ? 'YOU WIN' : 'GAME OVER'}</DisplayTitle>
        <ScoreWell label="POINTS" value={state.score.toLocaleString('en-US')} />
        <Text style={styles.outcomeBody}>{summary}</Text>
        {!won ? (
          <View style={styles.missed}>
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
          </View>
        ) : null}
      </ResultSheet>
      {reward ? <RewardCelebration events={reward.events} /> : null}
    </View>
  );
}

/** Grass, dirt and stone from the level-map reference. This screen is a map, not a form. */
const MAP = {
  grass: '#6FAF45',
  grassDeep: '#4E8C32',
  path: '#E2C48A',
  pathEdge: '#C49A62',
  stone: '#F7F1E4',
  locked: '#A3A39A',
} as const;

const MAP_NODE = 74;
const MAP_STEP = 128;

function moveLabel(level: Level): { value: string; unit: string } {
  if (level.timeLimitMs !== undefined) {
    return { value: formatDuration(level.timeLimitMs), unit: 'TIME' };
  }
  return { value: String(level.moves), unit: 'MOVES' };
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
  const { width } = useWindowDimensions();
  const boardWidth = Math.min(width, 480);
  const left = boardWidth * 0.28;
  const right = boardWidth * 0.72;
  const now = new Date();
  const nodes = LEVELS.map((level, index) => {
    const released = isLevelReleased(level, now);
    const playable = isLevelPlayable(level, unlocked, now);
    const upcoming = !released && level.availableFrom ? parseAvailableFrom(level.availableFrom) : null;
    return {
      level,
      index,
      locked: !playable,
      cleared: playable && level.number < unlocked,
      active: level.number === current,
      fresh: isNewestRelease(level, now),
      upcoming,
      x: index % 2 === 0 ? right : left,
      y: 36 + index * MAP_STEP,
    };
  });
  const height = 36 + LEVELS.length * MAP_STEP + 24;
  const here = nodes.find((node) => node.active) ?? nodes[0];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.mapRoot}>
        <View style={styles.mapSignRow}>
          <RoundIconButton
            icon={<Text style={styles.roundGlyph}>‹</Text>}
            accessibilityLabel="Close level map"
            onPress={onClose}
            tone="blue"
            size={44}
          />
          <View style={styles.mapSign}>
            <Text style={styles.mapSignTitle}>LEVEL MAP</Text>
            <Text style={styles.mapSignMeta} numberOfLines={1}>
              {here ? `${here.level.number} · ${here.level.name}` : 'Choose a level'}
            </Text>
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mapScroll}>
          <View style={[styles.mapBoard, { width: boardWidth, height }]}>
            {nodes.slice(0, -1).map((node, index) => {
              const next = nodes[index + 1];
              if (!next) return null;
              const dx = next.x - node.x;
              const dy = next.y - node.y;
              const length = Math.hypot(dx, dy);
              return (
                <View
                  key={`path-${node.level.number}`}
                  pointerEvents="none"
                  style={[
                    styles.mapPath,
                    {
                      width: length,
                      left: (node.x + next.x) / 2 - length / 2,
                      top: (node.y + next.y) / 2 - 9,
                      transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                    },
                  ]}
                />
              );
            })}
            {nodes.map((node) => {
              const budget = moveLabel(node.level);
              const label = node.upcoming
                ? `Level ${node.level.number}, ${node.level.name}, ${budget.value} ${budget.unit.toLowerCase()}, drops ${formatDropDay(node.upcoming)}`
                : node.locked
                  ? `Level ${node.level.number}, ${node.level.name}, locked, ${budget.value} ${budget.unit.toLowerCase()}`
                  : `Play level ${node.level.number}, ${node.level.name}, ${budget.value} ${budget.unit.toLowerCase()}`;
              return (
                <Pressable
                  key={node.level.number}
                  disabled={node.locked}
                  onPress={() => onSelect(node.level.number)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  style={[
                    styles.mapNode,
                    { left: node.x - MAP_NODE / 2, top: node.y - MAP_NODE / 2 },
                  ]}
                >
                  <View
                    style={[
                      styles.mapStone,
                      {
                        backgroundColor: node.locked ? MAP.locked : node.active ? palette.ribbon : MAP.stone,
                        borderColor: node.active ? palette.brown : MAP.pathEdge,
                      },
                    ]}
                  >
                    {node.locked ? (
                      <LockMark />
                    ) : (
                      <Text style={styles.mapNumber}>{node.level.number}</Text>
                    )}
                    {node.cleared ? <Text style={styles.mapStar}>★</Text> : null}
                  </View>
                  <Text style={styles.mapMoves}>
                    {node.fresh ? 'New' : `${budget.value} ${budget.unit.toLowerCase()}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
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
  root: screen.playfield,
  play: { flex: 1, paddingHorizontal: space.md, paddingBottom: space.sm, gap: space.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerGlyph: { color: theme.onPill, fontSize: 18, lineHeight: 20, fontWeight: '700' },
  rays: { position: 'absolute', top: 24, left: 0, right: 0, alignItems: 'center' },
  stars: { alignItems: 'center', marginBottom: -16, zIndex: 2 },
  outcomeFooter: { gap: space.sm },
  roundRow: { flexDirection: 'row', justifyContent: 'center', gap: space.lg },
  roundGlyph: { color: theme.onPill, fontSize: 22, lineHeight: 26 },
  shareNote: { ...type.caption, color: theme.textMuted, textAlign: 'center' },
  outcomeBody: { ...type.caption, color: theme.textMuted, textAlign: 'center', marginTop: space.md },

  // The board takes whatever height is left and centres itself, so the HUD and
  // the read-out keep their positions on every screen size.
  boardWrap: { flex: 1, justifyContent: 'center' },
  coach: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    textAlign: 'center',
    color: palette.brown,
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },

  outcomeScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.overlay,
    padding: space.md,
  },
  missed: {
    width: '100%',
    marginTop: space.lg,
    gap: 3,
    alignItems: 'center',
  },
  missedTitle: { ...type.overline, color: theme.danger, marginBottom: 2 },
  missedRow: { ...type.caption, color: theme.textMuted },

  mapRoot: { flex: 1, backgroundColor: MAP.grass },
  mapSignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  mapSign: {
    flex: 1,
    backgroundColor: palette.wood,
    borderRadius: radius.md,
    borderBottomWidth: 6,
    borderBottomColor: MAP.grassDeep,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  mapSignTitle: {
    color: palette.ribbon,
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 1,
  },
  mapSignMeta: { color: palette.paper, fontFamily: font.semibold, fontWeight: '600', fontSize: 13, marginTop: 2 },
  mapScroll: { alignItems: 'center', paddingBottom: space.xl },
  mapBoard: { position: 'relative' },
  mapPath: {
    position: 'absolute',
    height: 18,
    borderRadius: 9,
    backgroundColor: MAP.path,
    borderWidth: 2,
    borderColor: MAP.pathEdge,
  },
  mapNode: {
    position: 'absolute',
    width: MAP_NODE,
    alignItems: 'center',
  },
  mapStone: {
    width: MAP_NODE,
    height: MAP_NODE,
    borderRadius: MAP_NODE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapNumber: {
    color: palette.brown,
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize: 26,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
  },
  mapMoves: {
    marginTop: 4,
    color: palette.brown,
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'center',
  },
  mapStar: {
    position: 'absolute',
    top: 2,
    right: 6,
    color: palette.starEdge,
    fontSize: 14,
    lineHeight: 16,
  },
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
  legendGlyphText: { color: theme.onPill, fontSize: 15, fontWeight: '900' },
  legendBody: { flex: 1 },
  legendName: { ...type.bodyStrong },
  legendCondition: { color: theme.textMuted, fontFamily: font.semibold, fontWeight: '600' },
  legendEffect: { ...type.caption, color: theme.textDim },

});
