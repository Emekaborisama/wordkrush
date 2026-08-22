import { StyleSheet, Text, View } from 'react-native';
import type { Category } from '../../games/more-or-less/types';
import { getGame } from '../../games/registry';
import type { ScoreBoard } from '../../scores/types';
import { Badge, Button, GameArtwork, Stat, Surface } from '../components';
import { font, radius, space, theme, type, withAlpha } from '../theme';

type Props = {
  category: Category & { provisional?: boolean };
  board: ScoreBoard;
  onPlay: () => void;
  onScores: () => void;
};

export function HomeScreen({ category, board, onPlay, onScores }: Props) {
  const { bestStreak, totalRuns } = board;
  const game = getGame('more-or-less');
  const accent = game?.accent ?? theme.success;
  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <GameArtwork gameId="more-or-less" accent={accent} size={136} raised />
        <Badge label="QUICK THINKING" color={accent} />
        <Text style={styles.title}>More or Less</Text>
        <Text style={styles.subtitle}>
          Decide which one is bigger. Every correct answer keeps your streak alive.
        </Text>
      </View>

      <View style={styles.bottom}>
        <Surface
          level={2}
          borderColor={withAlpha(accent, 0.38)}
          radius={radius.lg}
          style={styles.stats}
        >
          <Stat value={bestStreak} label="BEST STREAK" size="lg" color={accent} />
          <View style={styles.divider} />
          <Stat value={totalRuns} label={totalRuns === 1 ? 'RUN' : 'RUNS'} size="lg" />
        </Surface>

        <View style={styles.actions}>
          <Button title="Play now" size="lg" onPress={onPlay} color={accent} />
          <Button title="View scores" variant="tonal" size="md" onPress={onScores} color={accent} />
        </View>

        <Surface level={1} radius={radius.md} style={styles.categoryBox}>
          <View style={styles.categoryDot} />
          <View style={styles.categoryCopy}>
            <Text style={styles.categoryLabel}>TODAY’S CATEGORY</Text>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryMeta}>
              {category.items.length} matchups · {category.metricLabel}
            </Text>
          </View>
        </Surface>
      </View>

      <Text style={styles.footer}>
        Wikipedia pageviews{category.provisional ? ' · preview data' : ''} · Works offline
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  hero: { alignItems: 'center', paddingTop: space.md, paddingHorizontal: space.md },
  title: { ...type.hero, color: theme.text, fontSize: 40, lineHeight: 44, marginTop: space.sm },
  subtitle: {
    ...type.body,
    color: theme.textMuted,
    textAlign: 'center',
    maxWidth: 340,
    marginTop: space.xs,
  },
  bottom: { flex: 1, justifyContent: 'flex-end', gap: space.md, paddingTop: space.lg },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: space.md,
  },
  divider: { width: 1, height: 48, backgroundColor: theme.border },
  actions: { gap: space.sm },
  categoryBox: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: theme.success,
    shadowColor: theme.success,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  categoryCopy: { flex: 1 },
  categoryLabel: { ...type.overline, color: theme.textDim },
  categoryName: { ...type.subtitle, color: theme.text, fontSize: 16, marginTop: 1 },
  categoryMeta: { ...type.caption, color: theme.textMuted, marginTop: 1, fontSize: 11.5 },
  footer: { color: theme.textDim, fontFamily: font.medium, fontSize: 10.5, textAlign: 'center', marginTop: space.sm },
});
