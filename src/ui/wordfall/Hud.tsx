import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { Objective, SpecialKind } from '../../games/wordfall/types';
import { formatDuration, radius, space, theme, type } from '../theme';
import { SPECIAL_VISUALS } from './visuals';

/** One line of player-facing copy per objective kind. */
export function describeObjective(objective: Objective): { icon: string; label: string } {
  switch (objective.kind) {
    case 'score':
      return { icon: '◎', label: 'Score' };
    case 'words':
      return { icon: '✎', label: 'Words' };
    case 'length':
      return { icon: '⟷', label: `${objective.minLength}+ letters` };
    case 'crates':
      return { icon: '▤', label: 'Crates' };
    case 'letter':
      return { icon: objective.letter.toUpperCase(), label: `Clear ${objective.letter.toUpperCase()}` };
  }
}

export function Hud({
  levelNumber,
  levelName,
  movesLeft,
  timeLeftMs,
  timeLimitMs,
  score,
  objectives,
  progress,
  accent,
}: {
  levelNumber: number;
  levelName: string;
  movesLeft: number;
  /** Null on an untimed level, which shows its move budget instead. */
  timeLeftMs: number | null;
  timeLimitMs?: number;
  score: number;
  objectives: Objective[];
  progress: number[];
  accent: string;
}) {
  const timed = timeLeftMs !== null;
  // The last ten seconds, or the last three moves, turn urgent. In both cases
  // the LABEL changes as well as the colour — colour alone is not a signal
  // every player can see.
  const urgent = timed ? timeLeftMs <= 10_000 : movesLeft <= 3;
  const remaining = timed ? Math.max(0, timeLeftMs / (timeLimitMs || 1)) : 1;

  return (
    <View style={styles.hud}>
      <View style={styles.topRow}>
        {/* One slot, two meanings. A timed level is a race and an untimed one
            is a puzzle; showing both counters would leave one of them as
            decoration the player has to learn to ignore. */}
        <View style={styles.stat}>
          <Text style={styles.statLabel}>
            {timed ? (urgent ? 'HURRY' : 'TIME') : urgent ? 'MOVES LEFT' : 'MOVES'}
          </Text>
          <Text style={[styles.statValue, urgent && { color: theme.danger }]}>
            {timed ? formatDuration(timeLeftMs) : movesLeft}
          </Text>
        </View>

        <View style={styles.levelChip}>
          <Text style={[styles.levelNumber, { color: accent }]}>LEVEL {levelNumber}</Text>
          <Text style={styles.levelName} numberOfLines={1}>
            {levelName}
          </Text>
        </View>

        <View style={[styles.stat, styles.statRight]}>
          <Text style={styles.statLabel}>SCORE</Text>
          <Text style={styles.statValue}>{score.toLocaleString('en-US')}</Text>
        </View>
      </View>

      {/* A draining bar reads faster than a number under pressure — you can see
          how much is left without parsing digits. */}
      {timed && (
        <View style={styles.timeTrack} accessibilityElementsHidden importantForAccessibility="no">
          <View
            style={[
              styles.timeFill,
              {
                width: `${remaining * 100}%`,
                backgroundColor: urgent ? theme.danger : accent,
              },
            ]}
          />
        </View>
      )}

      <View style={styles.goals}>
        {objectives.map((objective, i) => (
          <GoalChip
            key={`${objective.kind}-${i}`}
            objective={objective}
            progress={progress[i] ?? 0}
            accent={accent}
          />
        ))}
      </View>
    </View>
  );
}

function GoalChip({
  objective,
  progress,
  accent,
}: {
  objective: Objective;
  progress: number;
  accent: string;
}) {
  const { icon, label } = describeObjective(objective);
  const done = progress >= objective.target;
  const fraction = Math.min(1, progress / objective.target);

  return (
    <View style={[styles.goal, done && { borderColor: accent }]}>
      <Text style={[styles.goalIcon, done && { color: accent }]}>{done ? '✓' : icon}</Text>
      <View style={styles.goalBody}>
        <Text style={styles.goalLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.goalCount}>
          {/* Capped so a score objective does not read "4210/2800". */}
          {Math.min(progress, objective.target).toLocaleString('en-US')}
          <Text style={styles.goalTarget}>/{objective.target.toLocaleString('en-US')}</Text>
        </Text>
      </View>
      <View style={styles.goalTrack}>
        <View
          style={[styles.goalFill, { width: `${fraction * 100}%`, backgroundColor: accent }]}
        />
      </View>
    </View>
  );
}

/**
 * The live read-out under the board.
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
  accent,
}: {
  word: string;
  valid: boolean;
  points: number;
  special: SpecialKind | null;
  /** Shown when nothing is being traced — the last result or an error. */
  message: { text: string; tone: 'good' | 'bad' | 'quiet' } | null;
  accent: string;
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
    const tone =
      message?.tone === 'good'
        ? theme.accent
        : message?.tone === 'bad'
          ? theme.danger
          : theme.textDim;
    return (
      <View style={styles.preview}>
        <Text style={[styles.previewIdle, { color: tone }]} numberOfLines={1}>
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
        valid && { borderColor: accent },
        { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] },
      ]}
    >
      <Text style={[styles.previewWord, !valid && styles.previewWordDim]} numberOfLines={1}>
        {word.toUpperCase()}
      </Text>

      {valid && (
        <>
          <Text style={[styles.previewPoints, { color: accent }]}>
            +{points.toLocaleString('en-US')}
          </Text>
          {visual && (
            <View style={[styles.previewBadge, { borderColor: visual.color }]}>
              <Text style={[styles.previewGlyph, { color: visual.color }]}>{visual.glyph}</Text>
              <Text style={[styles.previewBadgeText, { color: visual.color }]}>
                {special!.toUpperCase()}
              </Text>
            </View>
          )}
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hud: { gap: space.sm },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stat: { minWidth: 62 },
  statRight: { alignItems: 'flex-end' },
  statLabel: { ...type.overline, color: theme.textDim, fontSize: 9 },
  statValue: { ...type.title, color: theme.text, fontVariant: ['tabular-nums'], marginTop: 1 },

  levelChip: { flex: 1, alignItems: 'center' },
  levelNumber: { ...type.overline, fontSize: 9 },
  levelName: { ...type.bodyStrong, color: theme.textMuted, marginTop: 1 },

  timeTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.bgElevated,
    overflow: 'hidden',
    marginTop: -2,
  },
  timeFill: { height: '100%', borderRadius: 2 },

  goals: { flexDirection: 'row', gap: space.sm },
  goal: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: space.sm,
    paddingTop: 6,
    paddingBottom: 5,
    gap: 4,
  },
  goalIcon: {
    position: 'absolute',
    top: 6,
    right: 7,
    color: theme.textDim,
    fontSize: 12,
    fontWeight: '800',
  },
  goalBody: { gap: 1 },
  goalLabel: { ...type.overline, color: theme.textDim, fontSize: 8.5 },
  goalCount: { ...type.bodyStrong, color: theme.text, fontSize: 13, fontVariant: ['tabular-nums'] },
  goalTarget: { color: theme.textDim, fontWeight: '600' },
  goalTrack: { height: 3, borderRadius: 2, backgroundColor: theme.bgElevated, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: 2 },

  preview: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: space.md,
  },
  previewIdle: { ...type.caption, textAlign: 'center' },
  previewWord: { ...type.title, color: theme.text, letterSpacing: 1.5 },
  previewWordDim: { color: theme.textDim },
  previewPoints: { ...type.bodyStrong, fontVariant: ['tabular-nums'] },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  previewGlyph: { fontSize: 11, fontWeight: '900' },
  previewBadgeText: { ...type.overline, fontSize: 8.5 },
});
