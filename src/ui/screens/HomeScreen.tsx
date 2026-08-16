import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Category } from '../../game/types';
import type { ScoreBoard } from '../../scores/types';
import { radius, theme } from '../theme';

type Props = {
  category: Category & { provisional?: boolean };
  board: ScoreBoard;
  onPlay: () => void;
  onScores: () => void;
};

export function HomeScreen({ category, board, onPlay, onScores }: Props) {
  const { bestStreak, totalRuns } = board;
  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.title}>More{' '}or{' '}Less</Text>
        <Text style={styles.subtitle}>Which one is more popular?</Text>
      </View>

      <View style={styles.middle}>
        {bestStreak > 0 && (
          <View style={styles.bestBox}>
            <Text style={styles.bestValue}>{bestStreak}</Text>
            <Text style={styles.bestLabel}>BEST STREAK</Text>
            <Text style={styles.runsLabel}>
              {totalRuns} {totalRuns === 1 ? 'run' : 'runs'} played
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.play, pressed && styles.pressed]}
          onPress={onPlay}
        >
          <Text style={styles.playText}>PLAY</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.scores, pressed && styles.pressed]}
          onPress={onScores}
        >
          <Text style={styles.scoresText}>SCORES</Text>
        </Pressable>

        <View style={styles.categoryBox}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryMeta}>
            {category.items.length} items · {category.metricLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.footer}>
        Data: Wikipedia pageviews{category.provisional ? ' · provisional' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, padding: 24, justifyContent: 'space-between' },
  hero: { alignItems: 'center', paddingTop: 60 },
  title: { color: theme.text, fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: theme.textDim, fontSize: 15, marginTop: 8 },

  middle: { alignItems: 'center', gap: 28 },
  bestBox: { alignItems: 'center' },
  bestValue: { color: theme.accent, fontSize: 40, fontWeight: '800' },
  bestLabel: { color: theme.textDim, fontSize: 11, letterSpacing: 2, fontWeight: '700' },

  play: {
    backgroundColor: theme.accent,
    paddingVertical: 20,
    paddingHorizontal: 72,
    borderRadius: radius.lg,
  },
  playText: { color: theme.bg, fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  scores: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  scoresText: { color: theme.textDim, fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  runsLabel: { color: theme.textDim, fontSize: 11, marginTop: 6 },
  pressed: { opacity: 0.75 },

  categoryBox: {
    alignItems: 'center',
    backgroundColor: theme.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  categoryName: { color: theme.text, fontSize: 15, fontWeight: '700' },
  categoryMeta: { color: theme.textDim, fontSize: 11, marginTop: 3 },

  footer: { color: theme.textDim, fontSize: 10, textAlign: 'center', opacity: 0.6 },
});
