import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GAMES, type GameDefinition } from '../../games/registry';
import type { ScoreBoard } from '../../scores/types';
import { dayKey, type DailyStreak } from '../../streak/types';
import { Badge, Button, GameArtwork, StreakBadge, Surface } from '../components';
import { isWideLayout } from '../layout';
import { Mascot } from '../lottie/Mascot';
import { font, gameAccentTokens, radius, space, theme, type, withAlpha } from '../theme';

type Props = {
  boards: Record<string, ScoreBoard>;
  streak: DailyStreak;
  onPlay: (gameId: string) => void;
  onScores: () => void;
};

export function HubScreen({ boards, streak, onPlay, onScores }: Props) {
  const wide = isWideLayout(useWindowDimensions().width);
  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.heroSubtitle}>Pick a challenge. Keep your mind moving.</Text>
        <StreakBadge streak={streak} today={dayKey(new Date())} />
      </View>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={[styles.list, wide && styles.listWide]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[type.overline, styles.sectionLabel, wide && styles.sectionWide]}>
          CHOOSE YOUR GAME
        </Text>
        {GAMES.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            board={boards[game.id]}
            wide={wide}
            onPress={() => onPlay(game.id)}
          />
        ))}
        <View style={[styles.mascotRow, wide && styles.mascotWide]} pointerEvents="none">
          <Mascot size={wide ? 88 : 64} />
        </View>
      </ScrollView>

      <Button title="View your scores" variant="outline" size="md" onPress={onScores} />
    </View>
  );
}

function GameCard({
  game,
  board,
  wide,
  onPress,
}: {
  game: GameDefinition;
  board?: ScoreBoard;
  wide: boolean;
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
      style={[styles.card, wide && styles.cardWide]}
    >
      <View style={[styles.cardGlow, { backgroundColor: locked ? theme.border : tokens.glow }]} />
      <GameArtwork gameId={game.id} accent={game.accent} size={86} raised />

      <View style={styles.cardBody}>
        <View style={styles.nameRow}>
          <Text style={[styles.cardName, locked && styles.dim]}>{game.name}</Text>
          {locked ? <Badge label="SOON" /> : null}
        </View>
        <Text style={styles.cardTagline} numberOfLines={2}>
          {game.tagline}
        </Text>
        {!locked && (
          <View style={styles.cardFooter}>
            <Text style={[styles.cardStat, { color: game.accent }]}>
              {(board?.totalRuns ?? 0) > 0
                ? `Best ${game.scoreNoun}: ${best}`
                : 'Start your first game'}
            </Text>
            <View
              style={[
                styles.playPill,
                {
                  backgroundColor: game.accent,
                  borderBottomColor: withAlpha(game.accent, 0.48),
                },
              ]}
            >
              <Text style={styles.playText}>PLAY</Text>
              <Text style={styles.playArrow}>›</Text>
            </View>
          </View>
        )}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  mascotRow: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    maxHeight: 96,
  },
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    gap: space.md,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  heroSubtitle: { ...type.caption, color: theme.textMuted, flex: 1 },
  // `height: 0` plus `flex: 1` is how a column child actually shrinks on
  // RN-web; `minHeight: 0` alone still sizes to the cards and they paint
  // under the scores button.
  listScroll: { flex: 1, minHeight: 0, height: 0, overflow: 'hidden' },
  list: { gap: space.md, paddingBottom: space.sm },
  listWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' },
  sectionLabel: { color: theme.textDim, marginBottom: -2 },
  sectionWide: { width: '100%', flexBasis: '100%' },
  card: {
    minHeight: 142,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    overflow: 'hidden',
    position: 'relative',
  },
  cardWide: { flexGrow: 1, flexBasis: 280, minWidth: 260 },
  mascotWide: { flexBasis: '100%', width: '100%' },
  cardGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    left: -62,
    top: -62,
    opacity: 0.45,
  },
  cardBody: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: space.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  cardName: { ...type.title, color: theme.text, fontSize: 20 },
  dim: { color: theme.textMuted },
  cardTagline: { ...type.caption, color: theme.textMuted, lineHeight: 17 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginTop: space.xs,
  },
  cardStat: { ...type.caption, flex: 1, fontSize: 11.5, fontWeight: '700' },
  playPill: {
    minWidth: 70,
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderBottomWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  playText: {
    color: theme.bg,
    fontFamily: font.semibold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  playArrow: { color: theme.bg, fontSize: 19, lineHeight: 18, marginTop: -2 },
});
