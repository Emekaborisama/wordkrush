import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { Objective, SpecialKind } from '../../games/wordfall/types';
import { BlockTile, GameIcon, HudPanel, StarBar, StrokeText } from '../components';
import type { IconName } from '../icons/GameIcon';
import { font, formatDuration, palette, space, tone } from '../theme';
import { SPECIAL_VISUALS } from './visuals';

/** One line of player-facing copy per objective kind, and its kit icon. */
export function describeObjective(objective: Objective): { icon: string; art: IconName | null; label: string } {
  switch (objective.kind) {
    case 'score':
      return { icon: '◎', art: 'target', label: 'Score' };
    case 'words':
      return { icon: '✎', art: 'book', label: 'Words' };
    case 'length':
      return { icon: '⟷', art: 'ruler', label: `${objective.minLength}+ letters` };
    case 'crates':
      return { icon: '▤', art: 'crate', label: 'Crates' };
    case 'letter':
      return { icon: objective.letter.toUpperCase(), art: null, label: `Clear ${objective.letter.toUpperCase()}` };
  }
}

/** Mean completion across a level's objectives, 0–1: what the star bar shows. */
export function objectiveCompletion(objectives: readonly Objective[], progress: readonly number[]): number {
  if (objectives.length === 0) return 0;
  const total = objectives.reduce(
    (sum, objective, index) => sum + Math.min(1, (progress[index] ?? 0) / Math.max(1, objective.target)),
    0,
  );
  return total / objectives.length;
}

/**
 * The kit's HUD: Moves (or Time), Goal and Score on cream panels with red
 * tabs, the star bar under them filling as the goals complete, and the level
 * brief in one outlined line.
 */
export function Hud({
  levelDescription,
  movesLeft,
  timeLeftMs,
  timeLimitMs,
  score,
  objectives,
  progress,
}: {
  levelDescription: string;
  movesLeft: number;
  /** Null on an untimed level, which shows its move budget instead. */
  timeLeftMs: number | null;
  timeLimitMs?: number;
  score: number;
  objectives: Objective[];
  progress: number[];
  /** Kept so call sites compile; the kit HUD is one colour. */
  accent?: string;
}) {
  const timed = timeLeftMs !== null;
  // The last ten seconds, or the last three moves, turn urgent. The LABEL
  // changes as well as the colour — colour alone is not a signal every
  // player can see.
  const urgent = timed ? timeLeftMs <= 10_000 : movesLeft <= 3;
  const remaining = timed ? Math.max(0, timeLeftMs / (timeLimitMs || 1)) : 1;

  return (
    <View style={styles.hud}>
      <View style={styles.row}>
        <HudPanel
          label={timed ? (urgent ? 'Hurry!' : 'Time') : urgent ? 'Last moves' : 'Moves'}
          value={timed ? formatDuration(timeLeftMs) : movesLeft}
          urgent={urgent}
          style={styles.moves}
        />
        <HudPanel label="Goal" style={styles.goalPanel} accessibilityLabel={goalLabel(objectives, progress)}>
          <View style={styles.goals}>
            {objectives.map((objective, i) => (
              <GoalChip key={`${objective.kind}-${i}`} objective={objective} progress={progress[i] ?? 0} />
            ))}
          </View>
        </HudPanel>
        <HudPanel label="Score" value={score} style={styles.score} />
      </View>

      {/* A draining bar reads faster than a number under pressure. */}
      {timed ? (
        <View style={styles.timeTrack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View
            style={[
              styles.timeFill,
              { width: `${remaining * 100}%`, backgroundColor: urgent ? palette.red : palette.lime },
            ]}
          />
        </View>
      ) : null}
      <StarBar progress={objectiveCompletion(objectives, progress)} />

      <StrokeText size={13} stroke={palette.navyDeep} strokeWidth={1.3} depth={0} numberOfLines={2} lineHeight={17}>
        {levelDescription}
      </StrokeText>
    </View>
  );
}

function goalLabel(objectives: readonly Objective[], progress: readonly number[]): string {
  return `Goal: ${objectives
    .map((objective, i) => `${describeObjective(objective).label} ${Math.min(progress[i] ?? 0, objective.target)} of ${objective.target}`)
    .join(', ')}`;
}

function GoalChip({ objective, progress }: { objective: Objective; progress: number }) {
  const { art, icon } = describeObjective(objective);
  const done = progress >= objective.target;
  return (
    <View style={styles.goal}>
      {done ? (
        <GameIcon name="check" size={26} color={tone.green.outline} />
      ) : art ? (
        <GameIcon name={art} size={26} />
      ) : (
        <BlockTile size={24} color="cream" letter={icon} />
      )}
      <Text style={[styles.goalCount, done && styles.goalDone]}>
        {/* Capped so a score objective does not read "4210/2800". */}
        {Math.min(progress, objective.target).toLocaleString('en-US')}
        <Text style={styles.goalTarget}>/{objective.target.toLocaleString('en-US')}</Text>
      </Text>
    </View>
  );
}

/**
 * The live read-out under the board, in a cream pill.
 *
 * This is where the game teaches its own rules. Showing the special a word is
 * about to earn WHILE it is being traced is what turns "make long words" into
 * "make this kind of word" — the player learns the mapping by watching it
 * happen, not by reading a legend.
 */
export function TracePreview({
  word,
  valid,
  points,
  special,
  message,
}: {
  word: string;
  valid: boolean;
  points: number;
  special: SpecialKind | null;
  /** Shown when nothing is being traced — the last result or an error. */
  message: { text: string; tone: 'good' | 'bad' | 'quiet' } | null;
  /** Kept so call sites compile. */
  accent?: string;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pulse, {
      toValue: valid ? 1 : 0,
      damping: 15,
      stiffness: 260,
      mass: 0.6,
      useNativeDriver: true,
    }).start();
  }, [valid, word, pulse]);

  if (word.length === 0) {
    return (
      <View style={styles.preview}>
        <Text
          style={[
            styles.previewIdle,
            message?.tone === 'good' && styles.idleGood,
            message?.tone === 'bad' && styles.idleBad,
          ]}
          numberOfLines={1}
        >
          {message?.text ?? 'Drag across letters to spell a word'}
        </Text>
      </View>
    );
  }

  const visual = special ? SPECIAL_VISUALS[special] : null;

  return (
    <Animated.View
      style={[
        styles.preview,
        valid && styles.previewValid,
        { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] },
      ]}
    >
      <Text style={[styles.previewWord, !valid && styles.previewWordDim]} numberOfLines={1}>
        {word.toUpperCase()}
      </Text>
      {valid && (
        <>
          <Text style={styles.previewPoints}>+{points.toLocaleString('en-US')}</Text>
          {visual && (
            <View style={styles.previewBadge}>
              <BlockTile size={22} color={visual.cube} letter={visual.glyph} />
              <Text style={styles.previewBadgeText}>{special!.toUpperCase()}</Text>
            </View>
          )}
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hud: { gap: 6 },
  row: { flexDirection: 'row', gap: space.xs },
  moves: { flex: 0.8 },
  goalPanel: { flex: 1.7 },
  score: { flex: 1 },
  goals: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 8, rowGap: 2 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  goalCount: { fontFamily: font.black, fontSize: 20, lineHeight: 24, color: palette.ink, fontVariant: ['tabular-nums'] },
  goalDone: { color: tone.green.lip },
  goalTarget: { fontFamily: font.heavy, fontSize: 15, color: palette.inkSoft },
  timeTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.navyDeep,
    overflow: 'hidden',
  },
  timeFill: { height: '100%', borderRadius: 3 },

  preview: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: palette.creamFill,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: palette.creamEdge,
    borderBottomColor: palette.white,
    paddingHorizontal: space.md,
  },
  previewValid: { borderColor: tone.green.bottom },
  previewIdle: { fontFamily: font.heavy, fontSize: 14, lineHeight: 18, color: palette.inkSoft, textAlign: 'center' },
  idleGood: { color: tone.green.lip },
  idleBad: { color: palette.redDeep },
  previewWord: { fontFamily: font.black, fontSize: 22, lineHeight: 27, letterSpacing: 1.5, color: palette.ink },
  previewWordDim: { color: palette.inkSoft },
  previewPoints: { fontFamily: font.black, fontSize: 18, color: tone.green.lip, fontVariant: ['tabular-nums'] },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  previewBadgeText: { fontFamily: font.black, fontSize: 12, letterSpacing: 0.8, color: palette.ink },
});
