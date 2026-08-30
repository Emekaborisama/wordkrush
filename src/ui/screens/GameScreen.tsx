import { useEffect, useReducer, useRef, useState } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import { streakBucket } from '../../analytics/events';
import {
  isCorrect,
  newRun,
  reducer,
  type GameState,
  type Guess,
} from '../../games/more-or-less/engine';
import { isGameState, isResumable, matchesDataset } from '../../games/more-or-less/persistence';
import type { RatioBand } from '../../games/more-or-less/pairing';
import type { Category, Item } from '../../games/more-or-less/types';
import { clearProgress, loadProgress, saveProgress } from '../../games/progress';
import { getGame } from '../../games/registry';
import { feedback } from '../../native/feedback';
import { HowToPlay } from '../HowToPlay';
import { Sparkle } from '../Sparkle';
import { Button, FeedbackBanner, GameHeader, ProgressPill, Surface } from '../components';
import {
  font,
  formatValue,
  gameAccentTokens,
  interaction,
  motion,
  radius,
  space,
  theme,
  type,
} from '../theme';
import { useCountUp } from '../useCountUp';

type Props = {
  category: Category & { provisional?: boolean };
  seed: number;
  bestStreak: number;
  onExit: () => void;
  onGameOver: (state: GameState) => void;
  persist?: boolean;
  band?: RatioBand;
  targetStreak?: number;
  onScore?: (score: number, complete: boolean) => void;
  onDone?: (score: number, complete: boolean) => void;
  labelRound?: {
    seenCount: number;
    total: number;
    preferUnseenIds: readonly string[];
    onSeen: (ids: string[]) => void;
  };
};

export function GameScreen({
  category,
  seed,
  bestStreak,
  onExit,
  onGameOver,
  persist = true,
  band,
  targetStreak,
  onScore,
  onDone,
  labelRound,
}: Props) {
  const poolRef = useRef(category.items);
  const pool: Item[] = poolRef.current;
  const preferRef = useRef(labelRound?.preferUnseenIds);
  preferRef.current = labelRound?.preferUnseenIds;
  const onSeenRef = useRef(labelRound?.onSeen);
  onSeenRef.current = labelRound?.onSeen;
  const accent = getGame('more-or-less')?.accent ?? theme.success;
  const [help, setHelp] = useState(false);
  const [state, dispatch] = useReducer(
    (s: GameState, a: Parameters<typeof reducer>[1]) =>
      reducer(s, a, pool, preferRef.current),
    undefined,
    () => newRun(pool, seed, bestStreak, band, preferRef.current),
  );

  // A run is keyed by category, not by seed: resuming has to work when the
  // screen remounts with a brand new seed.
  const restored = useRef(false);

  useEffect(() => {
    if (!persist) {
      restored.current = true;
      captureAnalytics('run_started', {
        game_id: 'more-or-less',
        is_resume: false,
        category_id: category.id,
      });
      return;
    }
    let cancelled = false;
    void loadProgress('more-or-less', category.id, isGameState).then((saved) => {
      if (cancelled) return;
      const canResume = Boolean(saved && isResumable(saved) && matchesDataset(saved, pool));
      if (saved && canResume) {
        dispatch({ type: 'restore', state: saved });
      } else if (saved) {
        // Stale or unresumable — drop it rather than leaving it to be retried.
        void clearProgress('more-or-less');
      }
      restored.current = true;
      captureAnalytics('run_started', {
        game_id: 'more-or-less',
        is_resume: canResume,
        category_id: category.id,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [category.id, persist]);

  useEffect(() => {
    if (!persist || !restored.current) return;
    if (state.status === 'over') void clearProgress('more-or-less');
    else void saveProgress('more-or-less', category.id, state);
  }, [state, category.id, persist]);

  useEffect(() => {
    onScore?.(state.streak, targetStreak != null ? state.streak >= targetStreak : false);
  }, [state.streak, targetStreak, onScore]);

  useEffect(() => {
    const hitTarget = targetStreak != null && state.streak >= targetStreak;
    const shouldSignalDone = state.status === 'over' || (state.status === 'revealed' && hitTarget);
    if (shouldSignalDone) {
      onDone?.(state.streak, hitTarget);
    }
  }, [state.status, state.streak, targetStreak, onDone]);

  useEffect(() => {
    onSeenRef.current?.([state.left.id, state.right.id]);
  }, [state.left.id, state.right.id]);

  const revealed = state.status !== 'playing';
  const counted = useCountUp(state.right.value, motion.countMs, revealed);
  // Sparkle only on a correct answer. Firing a celebratory burst over the
  // number that just ended the run would read as mocking the player.
  const sparkling = counted.done && state.lastGuessCorrect === true;

  // Sound + haptics on judgement, paired in native/feedback.ts. Haptics are a
  // no-op on web via the .native twin; the clip still plays there.
  useEffect(() => {
    if (state.lastGuessCorrect === true) feedback('correct');
    if (state.lastGuessCorrect === false) feedback('wrong');
  }, [state.lastGuessCorrect, state.right.id]);

  // Hold the reveal briefly, then either advance or end the run.
  useEffect(() => {
    if (state.status === 'revealed') {
      // In team races with a target, hitting the target completes the game
      const hitTarget = targetStreak != null && state.streak >= targetStreak;
      if (hitTarget) {
        if (!persist) return; // Live runs stay here and wait for teammates; LivePlayShell manages the transition
        const t = setTimeout(() => onGameOver(state), 1600);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => dispatch({ type: 'next' }), 1250);
      return () => clearTimeout(t);
    }
    if (state.status === 'over') {
      if (!persist) return; // Live runs stay here and wait for teammates
      const t = setTimeout(() => onGameOver(state), 1600);
      return () => clearTimeout(t);
    }
  }, [state.status, state.right.id, state.streak, targetStreak, onGameOver, persist]);

  const correct = state.lastGuessCorrect;

  const submitGuess = (choice: Guess) => {
    // A double tap can arrive in the same frame before React replaces the
    // controls. Ignore it here as well as visually removing the buttons.
    if (state.status !== 'playing') return;
    const guessedCorrectly = isCorrect(state.left, state.right, choice);
    captureAnalytics('guess_submitted', {
      game_id: 'more-or-less',
      guess_index: state.streak + 1,
      choice,
      result_kind: guessedCorrectly ? 'correct' : 'incorrect',
    });
    captureAnalytics('round_resolved', {
      game_id: 'more-or-less',
      correct: guessedCorrectly,
      round_index: state.streak + 1,
      streak_bucket: streakBucket(guessedCorrectly ? state.streak + 1 : state.streak),
    });
    dispatch({ type: 'guess', choice });
  };

  return (
    <View style={styles.root}>
      <GameHeader
        title="More or Less"
        subtitle={category.name}
        accent={accent}
        onExit={onExit}
        onHelp={() => setHelp(true)}
      />

      <View style={styles.statsRow}>
        <ProgressPill label="STREAK" value={state.streak} color={accent} />
        <ProgressPill label="BEST" value={state.bestStreak} color={theme.accentSecondary} />
        {labelRound ? (
          <ProgressPill
            label="SEEN"
            value={`${labelRound.seenCount}/${labelRound.total}`}
            color={theme.accent}
          />
        ) : null}
      </View>

      <View style={styles.arena}>
        <Card
          item={state.left}
          metricLabel={category.metricLabel}
          value={state.left.value}
          accent={accent}
        />
        <Card
          item={state.right}
          metricLabel={category.metricLabel}
          value={revealed ? counted.value : null}
          highlight={correct === null ? undefined : correct}
          accent={accent}
          sparkling={sparkling}
          onImageError={() =>
            captureAnalytics('card_image_load_failed', {
              game_id: 'more-or-less',
              has_image_url: true,
            })
          }
        />
        {/* Floating badge rather than its own row — every pixel it doesn't
            take is a pixel the images get. */}
        <Surface
          level={0}
          padded={false}
          radius={radius.pill}
          style={styles.vsBadge}
          accessibilityRole="text"
          accessibilityLabel="versus"
        >
          <Text style={styles.vsText}>VS</Text>
        </Surface>
      </View>

      {state.status === 'playing' ? (
        <View style={styles.actions}>
          <Text style={styles.prompt}>
            Does <Text style={styles.promptStrong}>{state.right.label}</Text> have more or less than{' '}
            <Text style={styles.promptStrong}>{state.left.label}</Text>?
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title="More"
              size="lg"
              color={accent}
              onPress={() => submitGuess('more')}
              accessibilityHint={`${state.right.label} has more ${category.metricLabel}`}
              leading={<Text style={[styles.choiceArrow, { color: theme.bg }]}>↑</Text>}
              style={styles.choiceButton}
            />
            <Button
              title="Less"
              size="lg"
              variant="tonal"
              color={theme.accentSecondary}
              onPress={() => submitGuess('less')}
              accessibilityHint={`${state.right.label} has fewer ${category.metricLabel}`}
              leading={<Text style={styles.choiceArrow}>↓</Text>}
              style={styles.choiceButton}
            />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <FeedbackBanner
            tone={correct ? 'success' : 'danger'}
            title={
              correct
                ? targetStreak != null && state.streak >= targetStreak
                  ? 'Target reached!'
                  : 'Nice call!'
                : 'Not this time'
            }
            body={
              correct
                ? targetStreak != null && state.streak >= targetStreak
                  ? 'Race complete. Waiting for teammates…'
                  : 'Streak saved. Next matchup incoming…'
                : 'The final values are revealed above.'
            }
          />
        </View>
      )}

      {/* Provenance: the claim on screen must match what the data supports.
          Image credits are not decoration — CC BY / CC BY-SA require them. */}
      <View>
        <Text style={styles.provenance}>
          {category.metricLabel} ·{' '}
          {state.left.source?.startsWith('wikipedia') ? 'Wikipedia' : state.left.source} ·{' '}
          {state.left.updatedAt}
          {category.provisional ? ' · provisional' : ''}
        </Text>
        <Text style={styles.credits} numberOfLines={2}>
          {imageCredits([state.left, state.right])}
        </Text>
      </View>

      <HowToPlay
        visible={help}
        onClose={() => setHelp(false)}
        title="How to play More or Less"
        accent={accent}
        intro="Two things, one revealed number. Guess whether the hidden one is bigger or smaller."
        steps={[
          {
            n: 1,
            title: 'Read the left card',
            body: 'It shows its real monthly Wikipedia pageviews.',
          },
          {
            n: 2,
            title: 'Judge the right card',
            body: 'Tap MORE if you think it gets more views than the left one, LESS if fewer.',
          },
          {
            n: 3,
            title: 'Keep the streak alive',
            body: 'Get it right and the winner slides left to face a new challenger. One wrong answer ends the run.',
          },
          {
            n: 4,
            title: 'Clear the set',
            body: 'See every name in this set to unlock the next. The names will not change until you do.',
          },
        ]}
      />
    </View>
  );
}

/** Credit line for whichever images are on screen. Required by CC BY / CC BY-SA. */
export function imageCredits(items: Item[]): string {
  const credits = items
    .filter((i) => i.imageUrl && i.imageAttribution)
    .map((i) => `${i.label}: ${i.imageAttribution} (${i.imageLicense})`);
  return credits.length ? `Images — ${credits.join(' · ')}` : '';
}

function Card({
  item,
  metricLabel,
  value,
  highlight,
  accent,
  sparkling = false,
  onImageError,
}: {
  item: Item;
  metricLabel: string;
  value: number | null;
  highlight?: boolean;
  accent: string;
  sparkling?: boolean;
  onImageError?: () => void;
}) {
  const tokens = gameAccentTokens(accent);
  const borderColor = highlight === undefined ? undefined : highlight ? accent : theme.danger;

  // Images are a bonus, never a requirement: a remote fetch can fail offline,
  // and a rare item may still lack a freely-licensed file. Either way the
  // card keeps the same shape and the game plays exactly the same.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.imageUrl) && !imageFailed;

  const content = (
    <View style={styles.cardBody}>
      <Text style={styles.cardLabel} numberOfLines={2} adjustsFontSizeToFit>
        {item.label}
      </Text>
      {value === null ? (
        <Text style={styles.hidden}>? ? ?</Text>
      ) : (
        <>
          {/* Wrapper is the anchor the burst radiates from, so particles
              originate at the number rather than the card centre. */}
          <View style={styles.valueWrap}>
            <Text style={[styles.value, { color: accent }]}>{formatValue(value)}</Text>
            <Sparkle active={sparkling} />
          </View>
          <Text style={styles.metric}>{metricLabel}</Text>
        </>
      )}
    </View>
  );

  return (
    <Surface
      level={2}
      padded={false}
      raised
      radius={radius.xl}
      borderColor={borderColor}
      style={styles.card}
      accessibilityLabel={item.label}
    >
      {showImage ? (
        <ImageBackground
          source={{ uri: item.imageUrl }}
          style={styles.cardFill}
          imageStyle={styles.cardImage}
          resizeMode="cover"
          onError={() => {
            setImageFailed(true);
            onImageError?.();
          }}
        >
          {/* Scrim: photos vary wildly in brightness, and white text on a pale
              image is unreadable. A flat dark wash plus a heavier band behind the
              text keeps every card legible without hiding the picture. */}
          <View style={styles.scrim} pointerEvents="none" />
          <View style={styles.scrimBottom} pointerEvents="none" />
          {content}
        </ImageBackground>
      ) : (
        <View style={[styles.cardFill, styles.cardPlain, { backgroundColor: tokens.soft }]}>
          {content}
        </View>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.sm,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },

  arena: { flex: 1, gap: space.sm, justifyContent: 'center', position: 'relative' },
  card: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 145,
  },
  cardFill: { flex: 1, justifyContent: 'flex-end' },
  cardImage: { borderRadius: radius.xl - 1 },
  cardPlain: { justifyContent: 'center' },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,6,20,0.34)',
  },
  scrimBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    backgroundColor: 'rgba(8,6,20,0.76)',
  },
  cardBody: { paddingHorizontal: space.lg, paddingVertical: space.lg, alignItems: 'center' },
  valueWrap: { alignItems: 'center', justifyContent: 'center' },
  cardLabel: {
    ...type.title,
    color: theme.text,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  value: {
    ...type.display,
    fontVariant: ['tabular-nums'],
    marginTop: space.xs,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  metric: { ...type.caption, color: theme.textMuted, marginTop: 1, textAlign: 'center' },
  hidden: {
    ...type.display,
    color: theme.text,
    marginTop: space.xs,
    letterSpacing: 5,
  },

  vsBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -interaction.minTouch / 2,
    width: interaction.minTouch,
    height: interaction.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  vsText: { ...type.overline, color: theme.textMuted },

  actions: { gap: space.sm, minHeight: 112, justifyContent: 'flex-end' },
  prompt: { ...type.caption, color: theme.textMuted, textAlign: 'center', lineHeight: 18 },
  promptStrong: { color: theme.text, fontFamily: font.bold, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: space.sm },
  choiceButton: { flex: 1 },
  choiceArrow: {
    color: theme.text,
    fontFamily: font.bold,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 22,
  },

  provenance: { ...type.overline, color: theme.textDim, textAlign: 'center' },
  credits: { ...type.overline, color: theme.textDim, textAlign: 'center', marginTop: 2 },
});
