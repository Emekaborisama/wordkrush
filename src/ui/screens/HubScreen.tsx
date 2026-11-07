import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { DAILY_PAIRS, type DailyResult } from '../../games/more-or-less/daily';
import { GAMES, type GameDefinition } from '../../games/registry';
import type { ChestStatus } from '../../rewards/chest';
import type { ScoreBoard } from '../../scores/types';
import type { DailyStreak } from '../../streak/types';
import type { DuelPlayer } from '../../duel/rules';
import {
  Badge,
  Button,
  CountryFlag,
  CreamBox,
  GameArtwork,
  GameIcon,
  GoldText,
  PopupModal,
  PressableScale,
  Rays,
  SquareButton,
  StrokeText,
  XpBadge,
} from '../components';
import { FLUENT } from '../fluent';
import { DanfoBus } from '../lagos/DanfoBus';
import { lagosCopy } from '../lagos/danfoTheme';
import { heightClass, isWideLayout } from '../layout';
import { ModeTile } from '../ModeTile';
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
  /** Written under the gold Play, so it says what it will open. */
  quickPlayName: string;
  onScores: () => void;
  onSettings: () => void;
  onTeams: () => void;
  onAccount: () => void;
  /** Opens I Sabi Lagos. */
  onLagos: () => void;
  /** The player and the 1v1 tile, once their name and flag are known. */
  duel?: { player: DuelPlayer; onPress: () => void };
  /** True until the player has opened I Sabi Lagos once: it wears a NEW tag. */
  lagosFresh: boolean;
  /** Today's Daily 10: its number, today's result if played, and its two actions. */
  daily?: { number: number; result: DailyResult | null; onPlay: () => void; onShare: () => void };
};

/**
 * Home answers three questions in order. Who am I (the player strip), what can
 * I play (the games), and what else is on (the Higher or Lower modes). The
 * gold Play is the one button with that word on it; every card and tile is
 * its own button. All of it fits above the dock on an iPhone SE. On a laptop
 * the games and modes sit side by side.
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
  quickPlayName,
  onScores,
  onSettings,
  onTeams,
  onAccount,
  onLagos,
  duel,
  lagosFresh,
  daily,
}: Props) {
  const { width, height } = useWindowDimensions();
  const wide = isWideLayout(width);
  // An SE inside Safari: the games lose their taglines so the modes stay in view.
  const tight = heightClass(height) === 'tight';
  // Four squares and the gold Play must fit a 360px phone.
  const narrow = width < 380;
  const square = narrow ? 46 : 52;
  // Under 340 the captions are wider than the squares, so the gold Play gives way.
  const tiny = width < 340;
  const dailyPlayed = daily?.result ?? null;
  const dailyScore = dailyPlayed ? Math.min(dailyPlayed.streak, DAILY_PAIRS) : 0;
  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.list, wide && styles.listWide]} showsVerticalScrollIndicator={false}>
        <PlayerStrip
          wide={wide}
          player={duel?.player ?? null}
          level={level}
          levelProgress={levelProgress}
          chest={chest}
          chestDay={chestDay}
          onOpenChest={onOpenChest}
        />
        <View style={styles.section}>
          <SectionLabel wide={wide}>Pick a game</SectionLabel>
          <View style={[styles.games, wide && styles.side]}>
            {GAMES.map((game) => (
              <GameCard key={game.id} game={game} board={boards[game.id]} wide={wide} tight={tight} onPress={() => onPlay(game.id)} />
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <SectionLabel wide={wide}>Higher or Lower modes</SectionLabel>
          <View style={[styles.side, styles.modes]}>
            {duel ? (
              <ModeTile
                look="rival"
                art={<Image source={FLUENT.swords} style={wide ? styles.modeArtWide : styles.modeArt} />}
                title="1v1 live"
                subtitle="Beat a rival"
                wide={wide}
                compact={narrow}
                onPress={duel.onPress}
                accessibilityLabel="1v1 live. Play someone right now"
              />
            ) : null}
            {daily ? (
              <ModeTile
                look="daily"
                art={<Image source={FLUENT.calendar} style={wide ? styles.modeArtWide : styles.modeArt} />}
                title={dailyPlayed ? `${dailyScore}/${DAILY_PAIRS} today` : "Today's 10"}
                subtitle={dailyPlayed ? 'Tap to share' : 'One try a day'}
                wide={wide}
                compact={narrow}
                onPress={dailyPlayed ? daily.onShare : daily.onPlay}
                accessibilityLabel={
                  dailyPlayed
                    ? `Daily 10 number ${daily.number}: ${dailyScore} of ${DAILY_PAIRS} today. Share it`
                    : `Daily 10 number ${daily.number}. Play today's ten pairs`
                }
              />
            ) : null}
            <ModeTile
              look="danfo"
              art={<DanfoBus width={wide ? 96 : 84} destination="ISABI LAGOS" driving />}
              title={lagosCopy.title}
              subtitle={lagosCopy.enter}
              tag={lagosFresh ? 'NEW' : undefined}
              wide={wide}
              compact={narrow}
              onPress={onLagos}
              accessibilityLabel={`${lagosFresh ? 'New. ' : ''}${lagosCopy.title}. ${lagosCopy.question}`}
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.dock, tiny && styles.dockTiny]}>
        <View style={[styles.dockSide, tiny && styles.dockSideTiny]}>
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
        <View style={[styles.gold, { width: tiny ? 92 : narrow ? 112 : 128 }]}>
          <Button
            title="Play"
            tone="gold"
            size="xl"
            accessibilityLabel={`Quick play: ${quickPlayName}`}
            accessibilityHint="Opens the game you played last"
            onPress={onQuickPlay}
          />
          <StrokeText size={12} strokeWidth={1.6} depth={1} numberOfLines={1}>
            {quickPlayName}
          </StrokeText>
        </View>
        <View style={[styles.dockSide, tiny && styles.dockSideTiny]}>
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

function SectionLabel({ children, wide }: { children: string; wide: boolean }) {
  return (
    <StrokeText size={wide ? 20 : 16} stroke={palette.navyDeep} strokeWidth={1.8} depth={1} align="left" accessibilityRole="header" numberOfLines={1}>
      {children}
    </StrokeText>
  );
}

/** You: your name and flag, your level, and today's chest when it can be opened. */
function PlayerStrip({
  wide,
  player,
  level,
  levelProgress,
  chest,
  chestDay,
  onOpenChest,
}: {
  wide: boolean;
  player: DuelPlayer | null;
  level: number;
  levelProgress: number;
  chest: ChestStatus;
  chestDay: number;
  onOpenChest: () => void;
}) {
  const ready = chest === 'ready';
  return (
    <CreamBox style={styles.strip}>
      <View style={styles.stripRow}>
        <View
          style={styles.stripMain}
          accessible
          accessibilityLabel={`${player ? `${player.name}, ` : ''}level ${level}, ${Math.round(levelProgress * 100)} percent to the next`}
        >
          <XpBadge level={level} progress={levelProgress} showBar={false} />
          <View style={[styles.flex, wide && styles.stripBodyWide]}>
            <View style={[styles.stripTop, wide && styles.flex]}>
              <View style={styles.stripWho}>
                {player ? (
                  <>
                    <CountryFlag code={player.country} size={15} />
                    <Text style={styles.stripName} numberOfLines={1}>
                      {player.name}
                    </Text>
                  </>
                ) : null}
              </View>
              {/* Beside Claim the name needs the room, and the star has the number. */}
              {ready && !wide ? null : <Text style={styles.stripLevel}>{`Level ${level}`}</Text>}
            </View>
            <View style={[styles.xpTrack, wide && styles.xpTrackWide]}>
              <View style={[styles.xpFill, { width: `${Math.max(0, Math.min(1, levelProgress)) * 100}%` }]} />
            </View>
          </View>
        </View>
        {ready ? (
          <Button
            title="Claim"
            tone="green"
            size="sm"
            fullWidth={false}
            leading={<GameIcon name="chest" size={22} />}
            accessibilityLabel={`Open today's chest, day ${chestDay} of 7`}
            onPress={onOpenChest}
          />
        ) : null}
      </View>
    </CreamBox>
  );
}

function GameCard({
  game,
  board,
  wide,
  tight,
  onPress,
}: {
  game: GameDefinition;
  board?: ScoreBoard;
  wide: boolean;
  tight: boolean;
  onPress: () => void;
}) {
  const locked = game.status === 'coming-soon';
  const played = (board?.totalRuns ?? 0) > 0;
  const bestLabel = `${game.scoreDirection === 'lower' ? 'Fewest' : 'Best'} ${game.scoreNoun}`;
  return (
    <PressableScale
      onPress={onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${game.name}, coming soon` : `Play ${game.name}`}
      accessibilityState={{ disabled: locked }}
      style={wide ? styles.gameWide : undefined}
    >
      <CreamBox style={[styles.gameBox, wide && styles.gameBoxWide]}>
        <View style={[styles.gameInner, wide && styles.gameInnerWide]}>
          <GameArtwork gameId={game.id} accent={game.accent} size={wide ? 128 : tight ? 40 : 56} />
          <View style={wide ? styles.gameCopyWide : styles.flex}>
            <Text style={[styles.gameName, wide && styles.center]} numberOfLines={1}>
              {game.name}
            </Text>
            {tight ? null : (
              <Text style={[styles.tagline, wide && styles.center]} numberOfLines={1}>
                {game.tagline}
              </Text>
            )}
            {/* Side by side the line stays, empty, so the three names sit level. */}
            {played || wide ? (
              <Text style={[styles.best, wide && styles.center]}>{played ? `${bestLabel}: ${board?.bestStreak ?? 0}` : ' '}</Text>
            ) : null}
          </View>
          {locked ? (
            <Badge label="SOON" />
          ) : (
            <View style={styles.playDisc}>
              <GameIcon name="play" size={18} color={palette.white} />
            </View>
          )}
        </View>
      </CreamBox>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1, minHeight: 0 },
  list: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.sm, gap: space.sm },
  listWide: { flexGrow: 1, justifyContent: 'center', gap: space.md },
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  section: { gap: 4 },
  side: { flexDirection: 'row', gap: space.sm },
  strip: { paddingVertical: 4, paddingHorizontal: space.sm },
  stripRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stripMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  stripTop: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  stripBodyWide: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stripWho: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 5 },
  stripName: { flexShrink: 1, fontFamily: font.black, fontSize: 15, lineHeight: 19, color: palette.ink },
  stripLevel: { fontFamily: font.heavy, fontSize: 12, lineHeight: 19, color: palette.inkSoft },
  xpTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: palette.navyDeep,
    borderWidth: 1.5,
    borderColor: palette.white,
    overflow: 'hidden',
    marginTop: 2,
  },
  xpTrackWide: { width: 320, marginTop: 0 },
  xpFill: { height: '100%', borderRadius: 4, backgroundColor: palette.purple },
  games: { gap: 6 },
  gameWide: { flex: 1, minWidth: 0 },
  gameBox: { paddingVertical: 6, paddingHorizontal: space.sm },
  gameBoxWide: { flex: 1, paddingVertical: space.md, paddingHorizontal: space.md },
  gameInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  gameInnerWide: { flex: 1, flexDirection: 'column', justifyContent: 'space-between', gap: space.xs },
  gameCopyWide: { alignSelf: 'stretch', gap: 1 },
  gameName: { fontFamily: font.black, fontSize: 18, lineHeight: 22, color: palette.ink },
  tagline: { fontFamily: font.body, fontSize: 12, lineHeight: 16, color: palette.inkSoft },
  best: { fontFamily: font.heavy, fontSize: 12, lineHeight: 15, color: palette.coralEdge },
  playDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.white,
    backgroundColor: '#3DB33A',
  },
  modes: { alignItems: 'stretch' },
  modeArt: { width: 46, height: 46 },
  modeArtWide: { width: 64, height: 64 },
  // Foot-aligned, so the word under the gold Play lines up with the others.
  dock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    paddingTop: space.xs,
  },
  dockTiny: { gap: 2, paddingHorizontal: 4 },
  dockSide: { flexDirection: 'row', gap: space.xs },
  dockSideTiny: { gap: 2 },
  gold: { alignItems: 'center', gap: 2 },
  chestReveal: { alignItems: 'center', justifyContent: 'center', gap: space.xs, minHeight: 210 },
  rays: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
