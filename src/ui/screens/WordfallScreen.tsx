import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DICTIONARY, LAST_LEVEL, LEVELS, levelByNumber } from '../../data/wordfall';
import { randomSeed } from '../../game/rng';
import { loadProgress, saveProgress } from '../../games/progress';
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
import type { Level, SpecialKind, WordfallState } from '../../games/wordfall/types';
import { tapCorrect, tapWrong } from '../../native/haptics';
import { HowToPlay } from '../HowToPlay';
import { formatDuration, radius, shadow, space, theme, type } from '../theme';
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
const ACCENT = '#F0A742';

type Props = {
  /** Called once per level cleared, with the score and how long it took. */
  onLevelWon: (score: number, levelNumber: number, elapsedMs: number) => void;
  showHelpInitially?: boolean;
};

export function WordfallScreen({ onLevelWon, showHelpInitially = false }: Props) {
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
        const unlockedNow = Math.min(save.unlocked, LAST_LEVEL);
        setUnlocked(unlockedNow);
        if (save.state && levelByNumber(save.state.levelNumber)) {
          setLevelNumber(save.state.levelNumber);
          setResume(rehydrate(save.state));
        } else {
          // A finished level clears the board but keeps the unlock. Opening at
          // level 1 in that case would send a returning player back to the
          // tutorial with no explanation.
          setLevelNumber(unlockedNow);
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
        onHelp={() => setHelp(true)}
        onPickLevel={() => setPicking(true)}
        // The clock stops while a sheet is open: losing a timed level because
        // you read the instructions would be a bad joke.
        paused={help || picking}
        onWin={(score, elapsedMs) => {
          const next = Math.max(unlocked, Math.min(levelNumber + 1, LAST_LEVEL));
          setUnlocked(next);
          persist(null, next);
          onLevelWon(score, levelNumber, elapsedMs);
        }}
        onNext={() => {
          setResume(null);
          if (levelNumber < LAST_LEVEL) setLevelNumber(levelNumber + 1);
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
        intro="Drag across touching letters to spell a word. What the word is made of decides what it leaves behind."
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

  useEffect(() => {
    if (state.status === 'won' && !reported.current) {
      reported.current = true;
      void tapCorrect();
      onWin(state.score, state.elapsedMs);
    }
  }, [state.status, state.score, state.elapsedMs, onWin]);

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

    if (after.rejection) void tapWrong();
    else if (after.lastPlay) void tapCorrect();
  };

  const over = state.status !== 'playing';

  return (
    <View style={styles.play}>
      <View style={styles.header}>
        <Pressable
          onPress={onPickLevel}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityLabel="Choose a level"
        >
          <Text style={styles.headerBtnText}>☰</Text>
        </Pressable>
        <Text style={styles.title}>Wordfall</Text>
        <Pressable
          onPress={onHelp}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityLabel="How to play"
        >
          <Text style={styles.headerBtnText}>?</Text>
        </Pressable>
      </View>

      <Hud
        levelNumber={level.number}
        levelName={level.name}
        movesLeft={state.movesLeft}
        timeLeftMs={timeLeft}
        timeLimitMs={level.timeLimitMs}
        score={state.score}
        objectives={level.objectives}
        progress={state.progress}
        accent={ACCENT}
      />

      <View style={styles.boardWrap}>
        <BoardView
          board={state.board}
          selection={state.selection}
          accent={ACCENT}
          disabled={over}
          onTrace={(index) => dispatch({ type: 'trace', index })}
          onRelease={submit}
          onCancel={() => dispatch({ type: 'cancel' })}
        />
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
  const finished = won && level.number >= LAST_LEVEL && unlocked >= LAST_LEVEL;

  return (
    <View style={styles.outcomeScrim}>
      <View style={[styles.outcome, { borderColor: won ? ACCENT : theme.border }]}>
        <Text style={[styles.outcomeEyebrow, { color: won ? ACCENT : theme.textDim }]}>
          {finished
            ? 'ALL LEVELS CLEARED'
            : won
              ? 'LEVEL COMPLETE'
              : outOfTime
                ? 'OUT OF TIME'
                : 'OUT OF MOVES'}
        </Text>
        <Text style={styles.outcomeScore}>{state.score.toLocaleString('en-US')}</Text>
        <Text style={styles.outcomeMeta}>
          {state.played.length} {state.played.length === 1 ? 'word' : 'words'}
          {' · '}
          {formatDuration(state.elapsedMs)}
          {/* Only mention spare moves on a level where moves were the limit —
              a timed level always ends with dozens left, which means nothing. */}
          {won && level.timeLimitMs === undefined && state.movesLeft > 0
            ? ` · ${state.movesLeft} moves to spare`
            : ''}
        </Text>

        {!won && (
          // Naming what fell short is the difference between "try again" and
          // knowing what to try differently.
          <View style={styles.missed}>
            {level.objectives.map((objective, i) => {
              const progress = state.progress[i] ?? 0;
              if (progress >= objective.target) return null;
              const { label } = describeObjective(objective);
              return (
                <Text key={i} style={styles.missedRow}>
                  {label}: {progress.toLocaleString('en-US')} of{' '}
                  {objective.target.toLocaleString('en-US')}
                </Text>
              );
            })}
          </View>
        )}

        <View style={styles.outcomeButtons}>
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={onRetry}
          >
            <Text style={styles.secondaryText}>{won ? 'Replay' : 'Try again'}</Text>
          </Pressable>
          {won && !finished && (
            <Pressable
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              onPress={onNext}
            >
              <Text style={styles.primaryText}>Next level</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
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
          <Text style={styles.pickerTitle}>Levels</Text>
          <ScrollView contentContainerStyle={styles.pickerList} showsVerticalScrollIndicator={false}>
            {LEVELS.map((level) => {
              const locked = level.number > unlocked;
              const active = level.number === current;
              return (
                <Pressable
                  key={level.number}
                  disabled={locked}
                  onPress={() => onSelect(level.number)}
                  style={({ pressed }) => [
                    styles.pickerRow,
                    active && { borderColor: ACCENT },
                    locked && styles.pickerRowLocked,
                    pressed && !locked && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: locked, selected: active }}
                  accessibilityLabel={
                    locked ? `Level ${level.number}, locked` : `Play level ${level.number}, ${level.name}`
                  }
                >
                  <Text style={[styles.pickerNumber, active && { color: ACCENT }]}>
                    {locked ? '🔒' : level.number}
                  </Text>
                  <View style={styles.pickerBody}>
                    <Text style={[styles.pickerName, locked && styles.dim]}>{level.name}</Text>
                    <Text style={styles.pickerGoals} numberOfLines={1}>
                      {level.objectives
                        .map((o) => `${describeObjective(o).label} ${o.target.toLocaleString('en-US')}`)
                        .join(' · ')}
                    </Text>
                  </View>
                  <Text style={styles.pickerMoves}>{level.moves}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  play: { flex: 1, paddingHorizontal: space.lg, gap: space.md },

  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { ...type.display, color: theme.text, fontSize: 26, flex: 1, textAlign: 'center' },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: { color: theme.textMuted, fontSize: 14, fontWeight: '800' },

  // The board takes whatever height is left and centres itself, so the HUD and
  // the read-out keep their positions on every screen size.
  boardWrap: { flex: 1, justifyContent: 'center' },

  outcomeScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,10,15,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  outcome: {
    width: '100%',
    backgroundColor: theme.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.xl,
    alignItems: 'center',
    ...shadow.raised,
  },
  outcomeEyebrow: { ...type.overline },
  outcomeScore: { ...type.display, color: theme.text, marginTop: 6, fontVariant: ['tabular-nums'] },
  outcomeMeta: { ...type.caption, color: theme.textMuted, marginTop: 2 },
  missed: { marginTop: space.md, gap: 2, alignItems: 'center' },
  missedRow: { ...type.caption, color: theme.textDim },
  outcomeButtons: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  primary: {
    backgroundColor: ACCENT,
    borderRadius: radius.sm + 2,
    paddingHorizontal: space.xl,
    paddingVertical: 12,
  },
  primaryText: { color: theme.bg, fontSize: 14, fontWeight: '800' },
  secondary: {
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: radius.sm + 2,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
  },
  secondaryText: { color: theme.textMuted, fontSize: 14, fontWeight: '700' },

  pickerRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,10,15,0.7)' },
  picker: {
    backgroundColor: theme.bgElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: theme.edge,
    paddingTop: space.lg,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    maxHeight: '80%',
  },
  pickerTitle: { ...type.title, color: theme.text, marginBottom: space.md },
  pickerList: { gap: space.sm, paddingBottom: space.md },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: space.md,
  },
  pickerRowLocked: { opacity: 0.45 },
  pickerNumber: {
    ...type.title,
    color: theme.textMuted,
    width: 26,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  pickerBody: { flex: 1 },
  pickerName: { ...type.bodyStrong, color: theme.text },
  pickerGoals: { ...type.caption, color: theme.textDim, marginTop: 1 },
  pickerMoves: { ...type.caption, color: theme.textDim, fontVariant: ['tabular-nums'] },
  dim: { color: theme.textDim },

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
    backgroundColor: theme.cardHigh,
  },
  legendGlyphText: { fontSize: 15, fontWeight: '900' },
  legendBody: { flex: 1 },
  legendName: { ...type.bodyStrong, fontSize: 13.5 },
  legendCondition: { color: theme.textMuted, fontWeight: '600' },
  legendEffect: { ...type.caption, color: theme.textDim },

  pressed: { opacity: 0.75 },
});
