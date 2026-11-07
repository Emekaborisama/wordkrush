import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { chime, feedback } from '../../native/feedback';
import { shareResult } from '../../native/share';
import { boostPrice } from '../../rewards/wallet';
import type { BoostKind } from '../../rewards/types';
import { GAME_ANIMAL } from '../fluent';
import { HowToPlay } from '../HowToPlay';
import type { Stone } from '../levelTrail';
import { MeadowMap } from '../MeadowMap';
import { MeadowRide, type MeadowHop } from '../MeadowRide';
import { useHeightClass } from '../useHeightClass';
import {
  afterModalClose,
  BlockTile,
  Button,
  ComboBanner,
  CreamBox,
  CreamText,
  DisplayTitle,
  GameHeader,
  GameIcon,
  LevelTrail,
  Panel,
  PanelText,
  PausePopup,
  Rays,
  ScoreWell,
  SquareButton,
} from '../components';
import { BoostBar, coinShortfall } from '../rewards/BoostBar';
import type { RunReward } from '../rewards/RunReward';
import { RewardCelebration, RewardPanel } from '../rewards/RewardReveal';
import { shouldShowTraceHint } from '../wordfall/coach';
import { font, formatDuration, palette, space, tone } from '../theme';
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
const RIBBON = palette.gold;

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
  // The fox's hop to the next level, after a win.
  const [hop, setHop] = useState<(MeadowHop & { board: () => void }) | null>(null);
  const hopCount = useRef(0);
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
  const [gearPaused, setGearPaused] = useState(false);
  // True between the pause pop-up closing and How to play opening, so the
  // clock never runs in the gap between the two.
  const [helpPending, setHelpPending] = useState(false);

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
        trail={live ? undefined : wordfallStones(unlocked, levelNumber, new Date())}
        onStateChange={handleStateChange}
        onExit={onExit}
        onHelp={() => setHelp(true)}
        onPickLevel={() => setPicking(true)}
        // The clock stops while a sheet is open: losing a timed level because
        // you read the instructions would be a bad joke.
        paused={help || picking || gearPaused || helpPending}
        onPause={() => setGearPaused(true)}
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
          const goNext = () => {
            setResume(null);
            setRunBoosted(false);
            const upcoming = levelByNumber(levelNumber + 1);
            if (upcoming && isLevelPlayable(upcoming, unlockAfterWin(unlocked, levelNumber), new Date())) {
              setLevelNumber(upcoming.number);
            }
            setAttempt((a) => a + 1);
          };
          // The fox hops to the next stone when there is one to hop to.
          const unlockedAfter = unlockAfterWin(unlocked, levelNumber);
          const stones = wordfallStones(unlockedAfter, levelNumber + 1, new Date());
          const from = stones.find((stone) => stone.number === levelNumber);
          const to = stones.find((stone) => stone.number === levelNumber + 1);
          if (live || !from || !to || to.state === 'soon' || hop) {
            goNext();
            return;
          }
          hopCount.current += 1;
          setHop({ key: hopCount.current, from, to, animal: GAME_ANIMAL.wordfall, board: goNext });
        }}
        onRetry={() => {
          setResume(null);
          setRunBoosted(false);
          setAttempt((a) => a + 1);
        }}
      />

      <MeadowRide ride={hop} onCovered={() => hop?.board()} onDone={() => setHop(null)} />

      <MeadowMap
        visible={picking && !live}
        title="LEVELS"
        stones={wordfallStones(unlocked, levelNumber, new Date())}
        current={levelNumber}
        animal={GAME_ANIMAL.wordfall}
        onClose={() => setPicking(false)}
        onSelect={(n) => {
          setPicking(false);
          setResume(null);
          setRunBoosted(false);
          setLevelNumber(n);
          setAttempt((a) => a + 1);
        }}
      />

      <PausePopup
        visible={gearPaused}
        onResume={() => setGearPaused(false)}
        onHelp={() => {
          setHelpPending(true);
          setGearPaused(false);
          afterModalClose(() => {
            setHelp(true);
            setHelpPending(false);
          });
        }}
        onLeave={() => {
          setGearPaused(false);
          onExit();
        }}
        note={live ? undefined : 'Your level is saved.'}
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
      <CreamText style={styles.legendCaption}>
        Only the first rule that matches applies, so you always know what you are about to get:
      </CreamText>
      {TRIGGERS.map((trigger) => {
        const visual = SPECIAL_VISUALS[trigger.kind];
        return (
          <View key={trigger.kind} style={styles.legendRow}>
            <BlockTile size={34} color={visual.cube} letter={visual.glyph} />
            <View style={styles.legendBody}>
              <Text style={styles.legendName}>
                {trigger.label}
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
  trail,
  onPause,
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
  /** The level path for the trail under the header; absent in a live race. */
  trail?: Stone[];
  /** The gold gear: freezes the clock and opens the pause pop-up. */
  onPause: () => void;
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
  // The trail only where there is height to spare; short phones keep the board.
  const short = useHeightClass() !== 'regular';
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
    if (state.selection.length > tracedCount.current) {
      feedback('select');
      // Each letter traced plays the next note up; a new trace starts at the bottom.
      chime(state.selection.length);
    }
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

  // The kit's celebration word over the board when a word sets off a chain.
  const [combo, setCombo] = useState<string | null>(null);
  const lastPlay = state.lastPlay;
  useEffect(() => {
    if (!lastPlay) return;
    if (lastPlay.chain >= 3) setCombo('KRUSH!');
    else if (lastPlay.chain === 2) setCombo('CASCADE!');
    else if (lastPlay.word.length >= 7) setCombo('AMAZING!');
  }, [lastPlay]);

  const boosts =
    onSpend && state.status === 'playing'
      ? [
          {
            kind: 'shuffle' as const,
            label: 'Shuffle',
            icon: 'shuffle' as const,
            price: shufflePrice,
            disabled: coins < shufflePrice,
            disabledReason: coinShortfall(coins, shufflePrice),
            onPress: () => {
              if (!spendBoost('shuffle')) return;
              dispatch({ type: 'boost', kind: 'shuffle' });
            },
          },
          {
            kind: 'word-hint' as const,
            label: 'Word hint',
            icon: 'bulb' as const,
            price: hintPrice,
            disabled: coins < hintPrice || hintTiles === null,
            disabledReason: coinShortfall(coins, hintPrice) ?? (hintTiles === null ? 'No word to show' : undefined),
            onPress: () => {
              const path = findWordPath(state.board, ctx.solver, state.played);
              if (!path || !spendBoost('word-hint')) return;
              setPaidHint(path);
            },
          },
          {
            kind: extraKind,
            label: extraKind === 'extra-moves' ? '+3 moves' : '+10s',
            icon: extraKind === 'extra-moves' ? ('plus' as const) : ('clock' as const),
            price: extraPrice,
            disabled: coins < extraPrice || extraUsed,
            disabledReason: extraUsed ? 'Already used this level' : coinShortfall(coins, extraPrice),
            onPress: () => {
              if (extraUsed || !spendBoost(extraKind)) return;
              dispatch({
                type: 'boost',
                kind: extraKind === 'extra-moves' ? 'extraMoves' : 'extraTime',
              });
            },
          },
        ]
      : [];

  return (
    <View style={styles.play}>
      <GameHeader
        title="Wordfall"
        subtitle={`LEVEL ${level.number}`}
        onExit={onExit}
        sideWidth={hidePicker ? 52 : 100}
        trailing={
          <View style={styles.headerActions}>
            {hidePicker ? null : (
              <SquareButton
                icon={<GameIcon name="flag" size={24} color={tone.sky.outline} />}
                accessibilityLabel="Open level map"
                onPress={onPickLevel}
                tone="sky"
                size={44}
              />
            )}
            <SquareButton
              icon={<GameIcon name="help" size={24} color={tone.sky.outline} />}
              accessibilityLabel="How to play"
              onPress={onHelp}
              tone="sky"
              size={44}
            />
          </View>
        }
      />

      {trail && !short ? (
        <LevelTrail
          stones={trail}
          current={level.number}
          animal={GAME_ANIMAL.wordfall}
          // The fox cheers every word played; the score rises with each one.
          reaction={state.lastPlay ? { key: state.score, mood: 'cheer' } : null}
          onPress={onPickLevel}
        />
      ) : null}

      <Hud
        levelDescription={`${level.name} — ${level.description}`}
        movesLeft={state.movesLeft}
        timeLeftMs={timeLeft}
        timeLimitMs={level.timeLimitMs}
        score={state.score}
        objectives={level.objectives}
        progress={state.progress}
        accent={palette.green}
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
            lastPlay={state.lastPlay}
            maxWidth={boardBounds.width}
            maxHeight={boardBounds.height}
            disabled={over}
            hintPath={paidHint ?? coachPath ?? undefined}
            traceValid={preview.valid}
            onTrace={trace}
            onRelease={submit}
            onCancel={cancelTrace}
          />
        ) : null}
        {combo ? (
          <View style={styles.comboLayer} pointerEvents="none">
            <ComboBanner key={`${combo}-${state.played.length}`} text={combo} onDone={() => setCombo(null)} />
          </View>
        ) : null}
      </View>

      {/* The first-visit coach takes the read-out's place, under the board,
          so it never covers the letters it points at. */}
      {showCoach && coachPath && preview.word.length === 0 && message === null ? (
        <View style={styles.coach}>
          <GameIcon name="hand" size={34} />
          <Text style={styles.coachText}>Drag through the glowing letters</Text>
        </View>
      ) : (
        <TracePreview
          word={preview.word}
          valid={preview.valid}
          points={preview.points}
          special={preview.special}
          message={message}
          accent={RIBBON}
        />
      )}

      <BoostBar controls={boosts} onPause={onPause} />

      {over && (
        <LevelOutcome
          state={state}
          level={level}
          unlocked={unlocked}
          outOfTime={lostToClock(state, ctx)}
          onExit={onExit}
          onNext={onNext}
          onRetry={onRetry}
          onPickLevel={hidePicker ? undefined : onPickLevel}
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
  onPickLevel,
  reward,
}: {
  state: WordfallState;
  level: Level;
  unlocked: number;
  outOfTime: boolean;
  onExit: () => void;
  onNext: () => void;
  onRetry: () => void;
  onPickLevel?: () => void;
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

  const unmet = level.objectives
    .map((objective, index) => ({ objective, progress: state.progress[index] ?? 0 }))
    .filter(({ objective, progress }) => progress < objective.target);

  // The kit's result pop-up over the dimmed board: the level on the tab and
  // LEVEL COMPLETED on a win, a red banner when the moves or the clock ran out.
  return (
    <View style={styles.outcomeScrim}>
      {won ? (
        <View style={styles.rays} pointerEvents="none">
          <Rays size={360} />
        </View>
      ) : null}
      <Panel
        title={won ? `LEVEL ${level.number}` : outOfTime ? "TIME'S UP" : 'OUT OF MOVES'}
        ribbon={won ? 'tab' : 'banner'}
        scroll
        style={styles.outcomePanel}
        accessibilityLabel={won ? 'You win' : 'Game over'}
        footer={
          <>
            <Button
              title={primaryLabel}
              size="lg"
              tone="green"
              onPress={won && !finished ? onNext : onRetry}
              leading={
                <GameIcon name={won && !finished ? 'play' : 'retry'} size={26} color={tone.green.outline} />
              }
            />
            <View style={styles.squares}>
              {onPickLevel ? (
                <SquareButton
                  icon={<GameIcon name="flag" size={26} color={tone.sky.outline} />}
                  accessibilityLabel="Levels"
                  caption="Levels"
                  tone="sky"
                  size={48}
                  onPress={onPickLevel}
                />
              ) : null}
              <SquareButton
                icon={<GameIcon name="retry" size={26} color={tone.sky.outline} />}
                accessibilityLabel="Replay"
                caption="Replay"
                tone="sky"
                size={48}
                onPress={onRetry}
              />
              <SquareButton
                icon={<GameIcon name="share" size={26} color={tone.sky.outline} />}
                accessibilityLabel="Share result"
                caption="Share"
                tone="sky"
                size={48}
                onPress={() => void onShare()}
              />
              <SquareButton
                icon={<GameIcon name="home" size={26} color={tone.sky.outline} />}
                accessibilityLabel="Back to Wordfall"
                caption="Home"
                tone="sky"
                size={48}
                onPress={onExit}
              />
            </View>
            {shareNote ? <PanelText live>{shareNote}</PanelText> : null}
          </>
        }
      >
        {reward ? <RewardPanel events={reward.events} boosted={reward.boosted} /> : null}
        <DisplayTitle size={30}>{won ? 'LEVEL COMPLETED' : 'GAME OVER'}</DisplayTitle>
        <ScoreWell label="POINTS" value={state.score.toLocaleString('en-US')} />
        <PanelText>{summary}</PanelText>
        {!won && unmet.length > 0 ? (
          <CreamBox>
            <CreamText variant="label" style={styles.center}>
              STILL TO DO
            </CreamText>
            {unmet.map(({ objective, progress }, index) => {
              const { label } = describeObjective(objective);
              return (
                <CreamText key={index} style={styles.center}>
                  {`${label}: ${progress.toLocaleString('en-US')} of ${objective.target.toLocaleString('en-US')}`}
                </CreamText>
              );
            })}
          </CreamBox>
        ) : null}
      </Panel>
      {reward ? <RewardCelebration events={reward.events} /> : null}
    </View>
  );
}


/** Wordfall's levels as stones for the trail and the meadow map. */
function wordfallStones(unlocked: number, current: number, now: Date): Stone[] {
  return LEVELS.map((level) => {
    const released = isLevelReleased(level, now);
    const playable = isLevelPlayable(level, unlocked, now);
    const upcoming = !released && level.availableFrom ? parseAvailableFrom(level.availableFrom) : null;
    return {
      number: level.number,
      // The map's tag keeps what the old list said: when a level drops, and which is new.
      name: upcoming ? `Drops ${formatDropDay(upcoming)}` : isNewestRelease(level, now) ? `NEW · ${level.name}` : level.name,
      state:
        level.number === current
          ? 'current'
          : !released
            ? 'soon'
            : !playable
              ? 'locked'
              : level.number < unlocked
                ? 'cleared'
                : 'open',
    };
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  play: { flex: 1, paddingHorizontal: space.md, paddingTop: space.xs, paddingBottom: space.xs, gap: space.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rays: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  center: { textAlign: 'center' },
  flex: { flex: 1, minWidth: 0 },
  squares: { flexDirection: 'row', justifyContent: 'center', gap: space.md },

  // The board takes whatever height is left and centres itself, so the HUD and
  // the read-out keep their positions on every screen size.
  boardWrap: { flex: 1, minHeight: 0, justifyContent: 'center' },
  coach: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    borderRadius: 24,
    backgroundColor: palette.creamFill,
    borderWidth: 2.5,
    borderColor: palette.goldDeep,
  },
  coachText: { fontFamily: font.heavy, fontSize: 14, lineHeight: 18, color: palette.ink },
  comboLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },

  outcomeScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 38, 84, 0.55)',
    paddingHorizontal: space.md,
    paddingTop: space.xl,
    paddingBottom: space.md,
  },
  outcomePanel: { flexShrink: 1 },

  legend: { gap: space.sm },
  legendCaption: { fontSize: 13, lineHeight: 18, color: palette.inkSoft },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  legendBody: { flex: 1 },
  legendName: { fontFamily: font.black, fontSize: 15, lineHeight: 20, color: palette.ink },
  legendCondition: { fontFamily: font.body, color: palette.inkSoft },
  legendEffect: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: palette.inkSoft },
});
