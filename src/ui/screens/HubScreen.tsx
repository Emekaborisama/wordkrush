import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GAMES, type GameDefinition } from '../../games/registry';
import type { ScoreBoard } from '../../scores/types';
import { dayKey, type DailyStreak } from '../../streak/types';
import type { ChestStatus } from '../../rewards/chest';
import { Badge, Button, DisplayTitle, Rays, StreakBadge } from '../components';
import { isWideLayout } from '../layout';
import { Mascot } from '../lottie/Mascot';
import { palette, screen, space, theme, type, type PillTone } from '../theme';

type Props = {
  boards: Record<string, ScoreBoard>;
  streak: DailyStreak;
  chest: ChestStatus;
  /** Day number shown on a ready chest, 1–7. */
  chestDay: number;
  chestOpen: boolean;
  onOpenChest: () => void;
  onChestClosed: () => void;
  onPlay: (gameId: string) => void;
  onScores: () => void;
  labelRoundsPassed?: number;
};

export function HubScreen({
  boards,
  streak,
  chest,
  chestDay,
  chestOpen,
  onOpenChest,
  onChestClosed,
  onPlay,
  onScores,
  labelRoundsPassed,
}: Props) {
  const wide = isWideLayout(useWindowDimensions().width);
  const featuredId = GAMES.find((game) => game.status === 'available')?.id;
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
        <ChestCard
          status={chest}
          day={chestDay}
          wide={wide}
          onOpen={onOpenChest}
        />
        {GAMES.map((game) => (
          <GameButton
            key={game.id}
            game={game}
            board={boards[game.id]}
            wide={wide}
            featured={game.id === featuredId}
            labelRoundsPassed={game.id === 'more-or-less' ? labelRoundsPassed : undefined}
            onPress={() => onPlay(game.id)}
          />
        ))}
        <View style={[styles.mascotRow, wide && styles.mascotWide]} pointerEvents="none">
          <Mascot size={wide ? 88 : 64} />
        </View>
      </ScrollView>

      <Button title="View your scores" tone="blue" size="md" onPress={onScores} />
      {chestOpen ? (
        <View style={styles.celebration} accessibilityViewIsModal>
          <View style={styles.rays} pointerEvents="none">
            <Rays />
          </View>
          <DisplayTitle>{`DAY ${chestDay}`}</DisplayTitle>
          <Button title="Continue" tone="green" size="lg" onPress={onChestClosed} />
        </View>
      ) : null}
    </View>
  );
}

function ChestCard({
  status,
  day,
  wide,
  onOpen,
}: {
  status: ChestStatus;
  day: number;
  wide: boolean;
  onOpen: () => void;
}) {
  const copy =
    status === 'ready'
      ? `Open — Day ${day}/7`
      : status === 'claimed'
        ? 'Back tomorrow'
        : "Finish any run to open today's chest";
  return (
    <View style={[styles.chest, wide && styles.sectionWide]}>
      <Text style={styles.chestLabel}>TODAY’S CHEST</Text>
      {status === 'ready' ? (
        <Button title={copy} tone="green" size="lg" onPress={onOpen} />
      ) : (
        <Text style={styles.chestCopy}>{copy}</Text>
      )}
    </View>
  );
}

function hubTone(gameId: string): PillTone {
  if (gameId === 'clueless') return 'purple';
  if (gameId === 'wordfall') return 'ribbon';
  return 'ribbon';
}

function GameButton({
  game,
  board,
  wide,
  featured,
  onPress,
  labelRoundsPassed,
}: {
  game: GameDefinition;
  board?: ScoreBoard;
  wide: boolean;
  featured: boolean;
  onPress: () => void;
  labelRoundsPassed?: number;
}) {
  const locked = game.status === 'coming-soon';
  const best = board?.bestStreak ?? 0;
  const played = (board?.totalRuns ?? 0) > 0;
  const stat = locked
    ? 'Coming soon'
    : played
      ? labelRoundsPassed !== undefined
        ? `Best ${game.scoreNoun}: ${best} · ${labelRoundsPassed} ${labelRoundsPassed === 1 ? 'round' : 'rounds'}`
        : `Best ${game.scoreNoun}: ${best}`
      : 'Start your first game';

  return (
    <View style={[styles.game, wide && styles.gameWide]}>
      <View style={styles.nameRow}>
        <Text style={[styles.gameName, locked && styles.dim]}>{game.name}</Text>
        {locked ? <Badge label="SOON" /> : null}
      </View>
      <Text style={styles.tagline} numberOfLines={2}>
        {game.tagline}
      </Text>
      <Text style={styles.stat}>{stat}</Text>
      <Button
        title={featured && !locked ? 'Play' : game.name}
        size={featured && !locked ? 'xl' : 'lg'}
        tone={featured && !locked ? 'green' : hubTone(game.id)}
        disabled={locked}
        onPress={locked ? () => {} : onPress}
        accessibilityLabel={locked ? `${game.name}, coming soon` : `Play ${game.name}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...screen.page,
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
  listScroll: { flex: 1, minHeight: 0, height: 0, overflow: 'hidden' },
  list: { gap: space.lg, paddingBottom: space.sm },
  listWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' },
  sectionLabel: { color: theme.textDim, marginBottom: -2 },
  sectionWide: { width: '100%', flexBasis: '100%' },
  game: { gap: space.xs },
  gameWide: { flexGrow: 1, flexBasis: 280, minWidth: 260 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  gameName: { ...type.title, color: theme.text, fontSize: 22 },
  dim: { color: theme.textMuted },
  tagline: { ...type.caption, color: theme.textMuted, lineHeight: 17 },
  stat: { ...type.caption, color: palette.brownMuted, fontWeight: '700', marginBottom: space.xs },
  mascotRow: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    maxHeight: 96,
  },
  mascotWide: { flexBasis: '100%', width: '100%' },
  chest: { gap: space.xs },
  chestLabel: { ...type.overline, color: theme.textDim },
  chestCopy: { ...type.caption, color: theme.text, fontWeight: '700' },
  celebration: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: 'rgba(58, 36, 21, 0.45)',
    padding: space.lg,
    zIndex: 4,
  },
  rays: { position: 'absolute', top: 24 },
});
