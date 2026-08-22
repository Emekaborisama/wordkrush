import { StyleSheet, Text, View } from 'react-native';
import type { Category } from '../../games/more-or-less/types';
import type { ScoreBoard } from '../../scores/types';
import { Button, ScreenHeader, Stat, Surface } from '../components';
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
      <ScreenHeader
        title="WordCrush"
        subtitle="Guess correctly, keep the streak alive, and beat your best score"
        align="center"
      />

      <View style={styles.middle}>
        {bestStreak > 0 && (
          <View style={styles.bestBox}>
            <Stat value={bestStreak} label="BEST STREAK" size="lg" color={theme.accent} />
            <Text style={styles.runsLabel}>
              {totalRuns} {totalRuns === 1 ? 'run' : 'runs'} played
            </Text>
          </View>
        )}

        <Button title="PLAY" size="lg" onPress={onPlay} fullWidth={false} />
        <Button title="SCORES" variant="outline" size="md" onPress={onScores} fullWidth={false} />

        <Surface level={1} radius={radius.md} style={styles.categoryBox}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryMeta}>
            {category.items.length} items · {category.metricLabel}
          </Text>
        </Surface>
      </View>

      <Text style={styles.footer}>
        Data: Wikipedia pageviews{category.provisional ? ' · provisional' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, padding: 24, justifyContent: 'space-between' },
  middle: { alignItems: 'center', gap: 28 },
  bestBox: { alignItems: 'center' },
  runsLabel: { color: theme.textDim, fontSize: 11, marginTop: 6 },
  categoryBox: { alignItems: 'center' },
  categoryName: { color: theme.text, fontSize: 15, fontWeight: '700' },
  categoryMeta: { color: theme.textDim, fontSize: 11, marginTop: 3 },
  footer: { color: theme.textDim, fontSize: 10, textAlign: 'center', opacity: 0.6 },
});
