import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GAMES, type GameDefinition } from '../../games/registry';
import type { ScoreBoard } from '../../scores/types';
import { dayKey, type DailyStreak } from '../../streak/types';
import { Badge, Button, ScreenHeader, StreakBadge, Surface } from '../components';
import { gameAccentTokens, radius, space, theme, type } from '../theme';

type Props = {
  boards: Record<string, ScoreBoard>;
  streak: DailyStreak;
  onPlay: (gameId: string) => void;
  onScores: () => void;
};

export function HubScreen({ boards, streak, onPlay, onScores }: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="WordCrush"
        subtitle="Build cognitive skills and pattern recognition through play"
        trailing={<StreakBadge streak={streak} today={dayKey(new Date())} />}
      />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {GAMES.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            board={boards[game.id]}
            onPress={() => onPlay(game.id)}
          />
        ))}
      </ScrollView>

      <Button title="SCORES" variant="outline" size="md" onPress={onScores} />
    </View>
  );
}

function GameCard({
  game,
  board,
  onPress,
}: {
  game: GameDefinition;
  board?: ScoreBoard;
  onPress: () => void;
}) {
  const locked = game.status === 'coming-soon';
  const best = board?.bestStreak ?? 0;
  const tokens = gameAccentTokens(game.accent);

  return (
    <Surface
      level={2}
      raised
      // A disabled control still needs to explain itself to a screen reader,
      // so even a locked card stays on the Pressable branch rather than
      // falling back to a plain View with no accessibility state.
      onPress={locked ? () => {} : onPress}
      disabled={locked}
      borderColor={locked ? theme.border : tokens.border}
      accessibilityLabel={locked ? `${game.name}, coming soon` : `Play ${game.name}`}
      style={styles.card}
    >
      <View style={[styles.art, { backgroundColor: locked ? theme.bgElevated : tokens.soft }]}>
        <Text style={styles.emoji}>{game.emoji}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cardName, locked && styles.dim]}>{game.name}</Text>
        <Text style={styles.cardTagline} numberOfLines={2}>
          {game.tagline}
        </Text>
        {!locked && (
          <Text style={[styles.cardStat, { color: game.accent }]}>
            {(board?.totalRuns ?? 0) > 0
              ? `Best ${game.scoreNoun}: ${best}`
              : `Not played yet — tap to start`}
          </Text>
        )}
      </View>

      {locked ? <Badge label="SOON" /> : <Text style={styles.chevron}>›</Text>}
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: space.lg, paddingTop: space.md, gap: space.lg },
  list: { gap: space.md, paddingBottom: space.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  art: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.edge,
  },
  emoji: { fontSize: 28 },
  cardBody: { flex: 1, gap: 1 },
  cardName: { ...type.title, color: theme.text, fontSize: 18 },
  dim: { color: theme.textMuted },
  cardTagline: { ...type.caption, color: theme.textDim },
  cardStat: { ...type.caption, fontSize: 11.5, fontWeight: '700', marginTop: 4 },
  chevron: { color: theme.textDim, fontSize: 24, fontWeight: '300', paddingRight: space.xs },
});
