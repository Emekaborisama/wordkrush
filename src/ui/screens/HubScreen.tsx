import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GAMES, type GameDefinition } from '../../games/registry';
import type { ChestStatus } from '../../rewards/chest';
import type { ScoreBoard } from '../../scores/types';
import type { DailyStreak } from '../../streak/types';
import {
  Badge,
  Button,
  CreamBox,
  CreamText,
  GameArtwork,
  GameIcon,
  GoldText,
  Panel,
  PopupModal,
  Gradient,
  Rays,
  SquareButton,
  StrokeText,
  XpBadge,
} from '../components';
import { font, palette, space, tone } from '../theme';

type Props = {
  boards: Record<string, ScoreBoard>;
  streak: DailyStreak;
  chest: ChestStatus;
  /** Day number shown on a ready chest, 1–7. */
  chestDay: number;
  /** The chest just opened, while its pop-up is showing. */
  chestClaim: { day: number; coins: number } | null;
  onOpenChest: () => void;
  onChestClosed: () => void;
  /** Player level from XP, and the 0–1 progress to the next one. */
  level: number;
  levelProgress: number;
  onPlay: (gameId: string) => void;
  /** The gold Play: the game played most recently. */
  onQuickPlay: () => void;
  onScores: () => void;
  onSettings: () => void;
  onTeams: () => void;
  onAccount: () => void;
  labelRoundsPassed?: number;
};

/** Room under the scroll for the dock, so the last card is never covered. */
const DOCK_SPACE = 132;

/**
 * Home, the kit way: a scroll of pop-up cards (the day's chest, then one card
 * per game with its own green Play) over the sky, and the kit's home row
 * fixed at the bottom — square buttons either side of a big gold Play.
 */
export function HubScreen({
  boards,
  chest,
  chestDay,
  chestClaim,
  onOpenChest,
  onChestClosed,
  level,
  levelProgress,
  onPlay,
  onQuickPlay,
  onScores,
  onSettings,
  onTeams,
  onAccount,
  labelRoundsPassed,
}: Props) {
  // Four squares and the gold Play must fit a 360px phone.
  const narrow = useWindowDimensions().width < 380;
  const square = narrow ? 46 : 52;
  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <CreamBox style={styles.levelStrip}>
          <View style={styles.levelRow} accessible accessibilityLabel={`Level ${level}, ${Math.round(levelProgress * 100)} percent to the next`}>
            <XpBadge level={level} progress={levelProgress} showBar={false} />
            <View style={styles.flex}>
              <CreamText variant="title">{`Level ${level}`}</CreamText>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${Math.max(0, Math.min(1, levelProgress)) * 100}%` }]} />
              </View>
            </View>
          </View>
        </CreamBox>
        <ChestCard status={chest} day={chestDay} onOpen={onOpenChest} />
        {/* The kit's list pop-up: every game a cream row with its own Play,
            so the three fit above the home row and the gold Play stays the
            one big button on screen. */}
        <Panel title="Pick a game" contentStyle={styles.gameList}>
          {GAMES.map((game) => (
            <GameRow
              key={game.id}
              game={game}
              board={boards[game.id]}
              labelRoundsPassed={game.id === 'more-or-less' ? labelRoundsPassed : undefined}
              onPress={() => onPlay(game.id)}
            />
          ))}
        </Panel>
      </ScrollView>

      <View style={styles.dockFade} pointerEvents="none">
        <Gradient colors={['rgba(255,255,255,0)', 'rgba(232,248,255,0.92)', '#FFFFFF']} locations={[0, 0.55, 1]} />
      </View>
      <View style={styles.dock} pointerEvents="box-none">
        <View style={styles.dockSide}>
          <SquareButton
            icon={<GameIcon name="gear" size={34} />}
            accessibilityLabel="Settings"
            caption="Settings"
            tone="sky"
            size={square}
            onPress={onSettings}
          />
          <SquareButton
            icon={<GameIcon name="trophy" size={34} />}
            accessibilityLabel="Scores"
            caption="Scores"
            tone="sky"
            size={square}
            onPress={onScores}
          />
        </View>
        <Button
          title="Play"
          tone="gold"
          size="xl"
          fullWidth={false}
          accessibilityLabel="Quick play"
          accessibilityHint="Opens the game you played last"
          onPress={onQuickPlay}
          style={{ width: narrow ? 112 : 128 }}
        />
        <View style={styles.dockSide}>
          <SquareButton
            icon={<GameIcon name="people" size={30} color={tone.sky.outline} />}
            accessibilityLabel="Teams"
            caption="Teams"
            tone="sky"
            size={square}
            onPress={onTeams}
          />
          <SquareButton
            icon={<GameIcon name="user" size={30} color={tone.sky.outline} />}
            accessibilityLabel="Account"
            caption="Account"
            tone="sky"
            size={square}
            onPress={onAccount}
          />
        </View>
      </View>

      <PopupModal
        visible={chestClaim !== null}
        onClose={onChestClosed}
        dismissable={false}
        hideClose
        title={`DAY ${chestClaim?.day ?? chestDay}`}
        ribbon="banner"
        ribbonColor={palette.goldDeep}
        footer={<Button title="Continue" tone="green" size="lg" onPress={onChestClosed} />}
      >
        <View style={styles.chestReveal}>
          <View style={styles.rays} pointerEvents="none">
            <Rays size={260} />
          </View>
          <GameIcon name="chest" size={112} />
          <GoldText text={`+${chestClaim?.coins ?? 0}`} size={44} accessibilityLabel={`${chestClaim?.coins ?? 0} coins`} />
          <StrokeText size={18} stroke={palette.coralEdge} strokeWidth={2} depth={1.5}>
            coins in your pocket
          </StrokeText>
        </View>
      </PopupModal>
    </View>
  );
}

/** The kit's "Claim" scroll: today's chest, ready, locked, or opened. */
function ChestCard({ status, day, onOpen }: { status: ChestStatus; day: number; onOpen: () => void }) {
  const ready = status === 'ready';
  return (
    <CreamBox tint={ready ? '#FFF3B8' : undefined} style={[styles.chest, ready && styles.chestReady]}>
      <View style={styles.chestRow}>
        <View style={!ready && status !== 'claimed' ? styles.dimmed : undefined}>
          <GameIcon name="chest" size={58} />
        </View>
        <View style={styles.flex}>
          <CreamText variant="teal">Daily chest</CreamText>
          <CreamText style={styles.chestCopy}>
            {ready
              ? `Day ${day} of 7 — ready to open`
              : status === 'claimed'
                ? 'Opened. Back tomorrow'
                : 'Finish any run to unlock it'}
          </CreamText>
        </View>
        {ready ? (
          <Button title="Claim" tone="green" size="sm" fullWidth={false} onPress={onOpen} />
        ) : status === 'claimed' ? (
          <GameIcon name="check" size={30} color={tone.green.outline} />
        ) : (
          <GameIcon name="lock" size={30} color={palette.inkSoft} />
        )}
      </View>
    </CreamBox>
  );
}

function GameRow({
  game,
  board,
  onPress,
  labelRoundsPassed,
}: {
  game: GameDefinition;
  board?: ScoreBoard;
  onPress: () => void;
  labelRoundsPassed?: number;
}) {
  const locked = game.status === 'coming-soon';
  const best = board?.bestStreak ?? 0;
  const played = (board?.totalRuns ?? 0) > 0;
  const bestLabel = `${game.scoreDirection === 'lower' ? 'Fewest' : 'Best'} ${game.scoreNoun}`;
  return (
    <CreamBox style={styles.gameRow}>
      <View style={styles.gameInner}>
        <GameArtwork gameId={game.id} accent={game.accent} size={64} />
        <View style={styles.flex}>
          <Text style={styles.gameName} numberOfLines={1}>
            {game.name}
          </Text>
          <Text style={styles.tagline} numberOfLines={2}>
            {game.tagline}
          </Text>
          <View style={styles.chips}>
            {locked ? <Badge label="SOON" /> : null}
            <Text style={styles.chip}>{played ? `${bestLabel} ${best}` : 'New!'}</Text>
            {labelRoundsPassed ? <Text style={styles.chip}>{`Sets ${labelRoundsPassed}`}</Text> : null}
          </View>
        </View>
        <Button
          title={locked ? 'Soon' : 'Play'}
          tone="green"
          size="sm"
          fullWidth={false}
          disabled={locked}
          onPress={locked ? () => {} : onPress}
          accessibilityLabel={locked ? `${game.name}, coming soon` : `Play ${game.name}`}
        />
      </View>
    </CreamBox>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1, minHeight: 0 },
  list: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: DOCK_SPACE + space.md, gap: space.lg },
  flex: { flex: 1, minWidth: 0 },
  levelStrip: { paddingVertical: space.xs },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  xpTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.navyDeep,
    borderWidth: 1.5,
    borderColor: palette.white,
    overflow: 'hidden',
    marginTop: 3,
  },
  xpFill: { height: '100%', borderRadius: 4, backgroundColor: palette.purple },
  chest: { paddingVertical: space.sm },
  chestReady: { borderColor: palette.goldDeep },
  chestRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chestCopy: { fontSize: 13, lineHeight: 18 },
  dimmed: { opacity: 0.6 },
  gameList: { gap: space.sm },
  gameRow: { paddingVertical: space.sm, paddingHorizontal: space.sm },
  gameInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  gameName: { fontFamily: font.black, fontSize: 18, lineHeight: 22, color: palette.ink },
  tagline: { fontFamily: font.body, fontSize: 12, lineHeight: 16, color: palette.inkSoft, marginTop: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: 4 },
  chip: {
    fontFamily: font.heavy,
    fontSize: 12,
    lineHeight: 15,
    color: palette.white,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: palette.coralEdge,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingBottom: space.md,
    paddingTop: space.sm,
  },
  dockSide: { flexDirection: 'row', gap: space.xs },
  dockFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: DOCK_SPACE + 24 },
  chestReveal: { alignItems: 'center', justifyContent: 'center', gap: space.xs, minHeight: 210 },
  rays: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
