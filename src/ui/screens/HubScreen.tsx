import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GAMES, type GameDefinition } from '../../games/registry';
import type { ScoreBoard } from '../../scores/types';
import { radius, shadow, space, theme, type } from '../theme';

type Props = {
  boards: Record<string, ScoreBoard>;
  onPlay: (gameId: string) => void;
  onScores: () => void;
};

export function HubScreen({ boards, onPlay, onScores }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Best Games</Text>
        <Text style={styles.subtitle}>Pick something to play</Text>
      </View>

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

      <Pressable style={({ pressed }) => [styles.scores, pressed && styles.pressed]} onPress={onScores}>
        <Text style={styles.scoresText}>SCORES</Text>
      </Pressable>
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

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { borderColor: locked ? theme.border : game.accent },
        locked && styles.cardLocked,
        pressed && !locked && styles.pressed,
      ]}
      onPress={locked ? undefined : onPress}
      // A disabled control still needs to explain itself, so the card stays
      // readable and announces why it cannot be opened.
      disabled={locked}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      accessibilityLabel={locked ? `${game.name}, coming soon` : `Play ${game.name}`}
    >
      <View style={[styles.art, { backgroundColor: locked ? theme.bgElevated : game.accent + '22' }]}>
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

      {locked ? <Text style={styles.soon}>SOON</Text> : <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: space.lg, gap: space.lg },
  header: { paddingTop: space.md, gap: 3 },
  title: { ...type.display, color: theme.text },
  subtitle: { ...type.body, color: theme.textDim },

  list: { gap: space.md, paddingBottom: space.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: theme.card,
    borderRadius: radius.lg,
    // A hairline border, not a 2px one: heavy outlines read as unfinished
    // wireframe. Depth comes from the shadow and the top edge highlight.
    borderWidth: 1,
    borderColor: theme.border,
    borderTopColor: theme.edge,
    padding: space.md,
    ...shadow.card,
  },
  cardLocked: { opacity: 0.5, ...({ shadowOpacity: 0 } as object) },
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
  soon: {
    ...type.overline,
    color: theme.textDim,
    fontSize: 8.5,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
  },

  scores: {
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgElevated,
    marginBottom: space.sm,
  },
  scoresText: { ...type.overline, color: theme.textMuted, fontSize: 11 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
