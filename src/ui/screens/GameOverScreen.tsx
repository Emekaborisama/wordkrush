import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameState } from '../../games/more-or-less/engine';
import type { Category } from '../../games/more-or-less/types';
import { rankOf, type ScoreBoard } from '../../scores/types';
import { formatValue, radius, theme } from '../theme';

type Props = {
  state: GameState;
  category: Category;
  board: ScoreBoard;
  onPlayAgain: () => void;
  onHome: () => void;
  onScores: () => void;
};

export function GameOverScreen({
  state,
  category,
  board,
  onPlayAgain,
  onHome,
  onScores,
}: Props) {
  const isBest = state.streak > 0 && state.streak >= board.bestStreak;
  // rankOf counts strictly-better runs, and this run is already saved, so its
  // own entry never inflates the rank.
  const rank = rankOf(board, state.streak);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.over}>Game Over</Text>
        <Text style={styles.streak}>{state.streak}</Text>
        <Text style={styles.streakLabel}>{state.streak === 1 ? 'ROUND' : 'ROUNDS'}</Text>
        {isBest ? (
          <Text style={styles.newBest}>NEW BEST</Text>
        ) : (
          <Text style={styles.best}>
            best {board.bestStreak} · #{rank} of your runs
          </Text>
        )}
      </View>

      {/* Show the pair that ended the run — players want to know what beat them. */}
      <View style={styles.pairBox}>
        <Text style={styles.pairTitle}>The one that got you</Text>
        <View style={styles.pairRow}>
          <View style={styles.pairItem}>
            <Text style={styles.pairLabel} numberOfLines={2}>
              {state.left.label}
            </Text>
            <Text style={styles.pairValue}>{formatValue(state.left.value)}</Text>
          </View>
          <Text style={styles.pairVs}>vs</Text>
          <View style={styles.pairItem}>
            <Text style={styles.pairLabel} numberOfLines={2}>
              {state.right.label}
            </Text>
            <Text style={[styles.pairValue, { color: theme.danger }]}>
              {formatValue(state.right.value)}
            </Text>
          </View>
        </View>
        <Text style={styles.pairMetric}>{category.metricLabel}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          onPress={onPlayAgain}
        >
          <Text style={styles.primaryText}>PLAY AGAIN</Text>
        </Pressable>
        <View style={styles.secondaryRow}>
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={onScores}
          >
            <Text style={styles.secondaryText}>Scores</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={onHome}
          >
            <Text style={styles.secondaryText}>Home</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, padding: 24, justifyContent: 'space-between' },
  top: { alignItems: 'center', paddingTop: 56 },
  over: { color: theme.textDim, fontSize: 15, letterSpacing: 3, fontWeight: '700' },
  streak: { color: theme.text, fontSize: 76, fontWeight: '900', lineHeight: 84, marginTop: 8 },
  streakLabel: { color: theme.textDim, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  newBest: { color: theme.accent, fontSize: 13, fontWeight: '800', letterSpacing: 2, marginTop: 12 },
  best: { color: theme.textDim, fontSize: 13, marginTop: 12 },

  pairBox: {
    backgroundColor: theme.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
  },
  pairTitle: { color: theme.textDim, fontSize: 11, letterSpacing: 1.5, fontWeight: '700', textAlign: 'center' },
  pairRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 },
  pairItem: { flex: 1, alignItems: 'center' },
  pairLabel: { color: theme.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  pairValue: { color: theme.accent, fontSize: 18, fontWeight: '800', marginTop: 4 },
  pairVs: { color: theme.textDim, fontSize: 12, fontWeight: '700' },
  pairMetric: { color: theme.textDim, fontSize: 10, textAlign: 'center', marginTop: 12 },

  actions: { gap: 12 },
  primary: { backgroundColor: theme.accent, paddingVertical: 18, borderRadius: radius.md, alignItems: 'center' },
  primaryText: { color: theme.bg, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  secondaryRow: { flexDirection: 'row', gap: 12 },
  secondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  secondaryText: { color: theme.textDim, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
