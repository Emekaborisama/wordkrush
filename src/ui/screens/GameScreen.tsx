import { useEffect, useReducer, useRef, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { newRun, reducer, type GameState } from '../../game/engine';
import { isGameState, isResumable, matchesDataset } from '../../game/persistence';
import { clearProgress, loadProgress, saveProgress } from '../../games/progress';
import type { Category, Item } from '../../game/types';
import { tapCorrect, tapWrong } from '../../native/haptics';
import { HowToPlay } from '../HowToPlay';
import { Sparkle } from '../Sparkle';
import { formatValue, radius, space, theme, type } from '../theme';
import { useCountUp } from '../useCountUp';

type Props = {
  category: Category & { provisional?: boolean };
  seed: number;
  bestStreak: number;
  onGameOver: (state: GameState) => void;
};

export function GameScreen({ category, seed, bestStreak, onGameOver }: Props) {
  const pool: Item[] = category.items;
  const [help, setHelp] = useState(false);
  const [state, dispatch] = useReducer(
    (s: GameState, a: Parameters<typeof reducer>[1]) => reducer(s, a, pool),
    undefined,
    () => newRun(pool, seed, bestStreak),
  );

  // A run is keyed by category, not by seed: resuming has to work when the
  // screen remounts with a brand new seed.
  const restored = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadProgress('more-or-less', category.id, isGameState).then((saved) => {
      if (cancelled) return;
      if (saved && isResumable(saved) && matchesDataset(saved, pool)) {
        dispatch({ type: 'restore', state: saved });
      } else if (saved) {
        // Stale or unresumable — drop it rather than leaving it to be retried.
        void clearProgress('more-or-less');
      }
      restored.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [category.id]);

  useEffect(() => {
    if (!restored.current) return;
    if (state.status === 'over') void clearProgress('more-or-less');
    else void saveProgress('more-or-less', category.id, state);
  }, [state, category.id]);

  const revealed = state.status !== 'playing';
  const counted = useCountUp(state.right.value, 900, revealed);
  // Sparkle only on a correct answer. Firing a celebratory burst over the
  // number that just ended the run would read as mocking the player.
  const sparkling = counted.done && state.lastGuessCorrect === true;

  // Haptics on judgement. No-op on web via the .web.ts twin.
  useEffect(() => {
    if (state.lastGuessCorrect === true) void tapCorrect();
    if (state.lastGuessCorrect === false) void tapWrong();
  }, [state.lastGuessCorrect, state.right.id]);

  // Hold the reveal briefly, then either advance or end the run.
  useEffect(() => {
    if (state.status === 'revealed') {
      const t = setTimeout(() => dispatch({ type: 'next' }), 1250);
      return () => clearTimeout(t);
    }
    if (state.status === 'over') {
      const t = setTimeout(() => onGameOver(state), 1600);
      return () => clearTimeout(t);
    }
  }, [state.status, state.right.id]);

  const correct = state.lastGuessCorrect;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.streak}>{state.streak}</Text>
        <Text style={styles.streakLabel}>STREAK</Text>
        <Text style={styles.best}>best {state.bestStreak}</Text>
        <Pressable
          onPress={() => setHelp(true)}
          style={({ pressed }) => [styles.helpBtn, pressed && styles.helpPressed]}
          hitSlop={10}
          accessibilityLabel="How to play"
        >
          <Text style={styles.helpMark}>?</Text>
        </Pressable>
      </View>

      <View style={styles.arena}>
        <Card item={state.left} metricLabel={category.metricLabel} value={state.left.value} />
        <Card
          item={state.right}
          metricLabel={category.metricLabel}
          value={revealed ? counted.value : null}
          highlight={correct === null ? undefined : correct}
          sparkling={sparkling}
        />
        {/* Floating badge rather than its own row — every pixel it doesn't
            take is a pixel the images get. */}
        <View style={styles.vsBadge} pointerEvents="none">
          <Text style={styles.vsText}>VS</Text>
        </View>
      </View>

      {state.status === 'playing' ? (
        <View style={styles.actions}>
          <Text style={styles.prompt}>
            Does <Text style={styles.promptStrong}>{state.right.label}</Text> have more or less than{' '}
            <Text style={styles.promptStrong}>{state.left.label}</Text>?
          </Text>
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.button, styles.more, pressed && styles.pressed]}
              onPress={() => dispatch({ type: 'guess', choice: 'more' })}
            >
              <Text style={styles.buttonText}>▲  MORE</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.button, styles.less, pressed && styles.pressed]}
              onPress={() => dispatch({ type: 'guess', choice: 'less' })}
            >
              <Text style={styles.buttonText}>▼  LESS</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Text style={[styles.verdict, { color: correct ? theme.accent : theme.danger }]}>
            {correct ? 'Correct' : 'Wrong'}
          </Text>
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
  sparkling = false,
}: {
  item: Item;
  metricLabel: string;
  value: number | null;
  highlight?: boolean;
  sparkling?: boolean;
}) {
  const borderColor =
    highlight === undefined ? theme.border : highlight ? theme.accent : theme.danger;

  // Images are a bonus, never a requirement: 3 of 50 items have no freely
  // licensed image, and a remote fetch can fail offline. Either way the card
  // keeps the same shape and the game plays exactly the same.
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
            <Text style={styles.value}>{formatValue(value)}</Text>
            <Sparkle active={sparkling} />
          </View>
          <Text style={styles.metric}>{metricLabel}</Text>
        </>
      )}
    </View>
  );

  if (!showImage) {
    return <View style={[styles.card, styles.cardPlain, { borderColor }]}>{content}</View>;
  }

  return (
    <ImageBackground
      source={{ uri: item.imageUrl }}
      style={[styles.card, { borderColor }]}
      imageStyle={styles.cardImage}
      resizeMode="cover"
      onError={() => setImageFailed(true)}
      accessibilityLabel={item.label}
    >
      {/* Scrim: photos vary wildly in brightness, and white text on a pale
          image is unreadable. A flat dark wash plus a heavier band behind the
          text keeps every card legible without hiding the picture. */}
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.scrimBottom} pointerEvents="none" />
      {content}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  header: { alignItems: 'center' },
  helpBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
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
  helpPressed: { opacity: 0.7 },
  streak: { color: theme.text, fontSize: 34, fontWeight: '800', lineHeight: 38 },
  streakLabel: { color: theme.textDim, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  best: { color: theme.textDim, fontSize: 11, marginTop: 3 },

  arena: { flex: 1, gap: 12, justifyContent: 'center', position: 'relative' },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    minHeight: 170,
    backgroundColor: theme.card,
  },
  cardImage: { borderRadius: radius.lg - 2 },
  cardPlain: { justifyContent: 'center', backgroundColor: theme.card },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,14,20,0.42)',
  },
  scrimBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    backgroundColor: 'rgba(11,14,20,0.68)',
  },
  cardBody: { paddingHorizontal: 18, paddingVertical: 18, alignItems: 'center' },
  valueWrap: { alignItems: 'center', justifyContent: 'center' },
  cardLabel: {
    color: theme.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  value: {
    color: theme.accent,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  metric: { color: theme.textDim, fontSize: 11, marginTop: 3, textAlign: 'center' },
  hidden: { color: theme.text, fontSize: 34, fontWeight: '900', marginTop: 6, letterSpacing: 6 },

  vsBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.bg,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  vsText: { color: theme.textDim, fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  actions: { gap: 10, minHeight: 110, justifyContent: 'flex-end' },
  prompt: { color: theme.textDim, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  promptStrong: { color: theme.text, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, paddingVertical: 18, borderRadius: radius.md, alignItems: 'center' },
  more: { backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accent },
  less: { backgroundColor: theme.dangerDim, borderWidth: 1, borderColor: theme.danger },
  pressed: { opacity: 0.7 },
  buttonText: { color: theme.text, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  verdict: { fontSize: 26, fontWeight: '800', textAlign: 'center', paddingVertical: 24 },

  provenance: { color: theme.textDim, fontSize: 10, textAlign: 'center', opacity: 0.7 },
  credits: { color: theme.textDim, fontSize: 8, textAlign: 'center', opacity: 0.5, marginTop: 2 },
});
