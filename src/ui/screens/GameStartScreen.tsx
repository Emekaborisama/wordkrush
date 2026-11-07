import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { getGame } from '../../games/registry';
import type { ScoreBoard } from '../../scores/types';
import {
  BlockTile,
  Button,
  CreamBox,
  CreamText,
  GameArtwork,
  GameIcon,
  Panel,
  PanelDivider,
  PanelText,
  Stat,
  StrokeText,
} from '../components';
import { palette, space, tone } from '../theme';

type Props = {
  gameId: string;
  board: ScoreBoard;
  onPlay: () => void;
  onScores: () => void;
  /** The pop-up's red close disc: back to the hub. */
  onClose?: () => void;
  /** Game-specific goal — today's set, the spark path, the campaign. */
  detail?: ReactNode;
  /** Small print under everything. */
  footer?: string;
  /** Overrides the CTA label. Defaults to "Play". */
  playLabel?: string;
  /** Used while game-specific resume state is still resolving. */
  playDisabled?: boolean;
  onRace?: () => void;
  raceDisabled?: boolean;
  raceLabel?: string;
  /** Caption under the Race button so the roster size is visible before the lobby. */
  raceHint?: string;
};

/**
 * The screen between the hub and a run, shared by every game: the kit's
 * "LEVEL 2" pop-up — the game on the tab, its art and pitch, the goal in a
 * cream box, the player's best, and one green Play.
 */
export function GameStartScreen({
  gameId,
  board,
  onPlay,
  onScores,
  onClose,
  detail,
  footer,
  playLabel = 'Play',
  playDisabled = false,
  onRace,
  raceDisabled = false,
  raceLabel = 'Race with team',
  raceHint,
}: Props) {
  const game = getGame(gameId);
  const accent = game?.accent ?? palette.green;
  const { bestStreak, totalRuns } = board;
  const played = totalRuns > 0;
  const bestLabel = `${game?.scoreDirection === 'lower' ? 'FEWEST' : 'BEST'} ${(game?.scoreNoun ?? 'score').toUpperCase()}`;

  return (
    // A bounded column, not a scroll view: the panel shrinks to fit and
    // scrolls inside itself, so its footer (Play) always stays on screen.
    <View style={[styles.root, styles.content]}>
      {/* Play sits in the fixed footer: on a short phone the goal scrolls and
          the main button never falls below the fold. */}
      <Panel
        title={game?.name ?? 'Play'}
        onClose={onClose}
        closeLabel="Back to all games"
        scroll
        footer={
          <View style={styles.actions}>
            <Button
              title={playLabel}
              size="lg"
              tone="green"
              onPress={onPlay}
              disabled={playDisabled}
              leading={playDisabled ? undefined : <GameIcon name="play" size={26} color={tone.green.outline} />}
            />
            <View style={styles.pair}>
              {onRace ? (
                <Button
                  title={raceLabel}
                  tone="blue"
                  size="sm"
                  onPress={onRace}
                  disabled={raceDisabled}
                  style={styles.flex}
                />
              ) : null}
              <Button title="Scores" tone="purple" size="sm" onPress={onScores} style={styles.flex} />
            </View>
          </View>
        }
      >
        <View style={styles.hero}>
          <GameArtwork gameId={gameId} accent={accent} size={92} raised />
          <View style={styles.flex}>
            {game?.badge ? (
              <StrokeText size={13} stroke={palette.coralEdge} strokeWidth={1.2} depth={0} align="left">
                {game.badge}
              </StrokeText>
            ) : null}
            <CreamBox style={styles.blurb}>
              <CreamText style={styles.blurbText}>{game?.blurb ?? game?.tagline ?? ''}</CreamText>
            </CreamBox>
          </View>
        </View>
        <PanelDivider />

        {detail ? (
          <CreamBox style={styles.goal}>
            <CreamText variant="teal" style={styles.center}>
              Goal
            </CreamText>
            {detail}
          </CreamBox>
        ) : null}

        {played ? (
          <View style={styles.stats}>
            <CreamBox style={styles.flex}>
              <Stat value={bestStreak} label={bestLabel} />
            </CreamBox>
            <CreamBox style={styles.flex}>
              <Stat value={totalRuns} label={totalRuns === 1 ? 'RUN' : 'RUNS'} />
            </CreamBox>
          </View>
        ) : null}

        {onRace && raceHint ? <PanelText>{raceHint}</PanelText> : null}
      </Panel>

      {footer ? (
        <StrokeText size={12} stroke={palette.navyDeep} strokeWidth={1.2} depth={0} style={styles.footer}>
          {footer}
        </StrokeText>
      ) : null}
    </View>
  );
}

/**
 * One line of a game's goal, inside the start card's cream box: a small teal
 * label, the goal in navy, and a quieter line of detail.
 *
 * `ribbon`, `ribbonColor` and `accent` are kept so call sites compile; the
 * kit draws every goal the same way.
 */
export function StartDetail({
  label,
  title,
  meta,
}: {
  label: string;
  title: string;
  meta?: string;
  accent?: string;
  ribbon?: boolean;
  ribbonColor?: string;
}) {
  return (
    <View style={styles.detail} accessible accessibilityLabel={[label, title, meta].filter(Boolean).join('. ')}>
      <CreamText variant="label" style={styles.center}>
        {label}
      </CreamText>
      {title ? (
        <CreamText variant="title" style={styles.center}>
          {title}
        </CreamText>
      ) : null}
      {meta ? <CreamText style={[styles.center, styles.meta]}>{meta}</CreamText> : null}
    </View>
  );
}

/**
 * Clueless's way to the Daily Vault as a row of cubes: three sparks (green
 * when cleared, gold for the one you are on, stone when still ahead), then
 * the vault — a chest when it can be opened, a lock while it is sealed.
 */
export function PathRail({ cleared, vaultOpen }: { cleared: number; vaultOpen: boolean }) {
  const label = `${Math.min(cleared, 3)} of 3 sparks cleared, vault ${vaultOpen ? 'open' : 'sealed'}`;
  return (
    <View style={styles.rail} accessible accessibilityLabel={label}>
      {[1, 2, 3].map((n) => (
        <BlockTile
          key={n}
          size={36}
          color={n <= cleared ? 'green' : 'stone'}
          state={n === cleared + 1 ? 'selected' : 'normal'}
          letter={n <= cleared ? undefined : String(n)}
        >
          {n <= cleared ? <GameIcon name="check" size={20} color={tone.green.outline} /> : null}
        </BlockTile>
      ))}
      <GameIcon name="arrowUp" size={22} color={palette.inkSoft} style={styles.arrow} />
      <BlockTile size={44} color={vaultOpen ? 'gold' : 'stone'} stud={false}>
        <GameIcon name={vaultOpen ? 'chest' : 'lock'} size={vaultOpen ? 34 : 24} color={palette.ink} />
      </BlockTile>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: space.xs },
  arrow: { transform: [{ rotate: '90deg' }] },
  root: { flex: 1 },
  content: {
    flexGrow: 1,
    minHeight: 0,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    gap: space.md,
  },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  blurb: { marginTop: 4, paddingVertical: space.xs + 2, paddingHorizontal: space.sm },
  blurbText: { fontSize: 13, lineHeight: 18 },
  flex: { flex: 1, minWidth: 0 },
  goal: { gap: space.sm },
  actions: { gap: space.sm },
  center: { textAlign: 'center' },
  stats: { flexDirection: 'row', gap: space.sm },
  pair: { flexDirection: 'row', gap: space.sm },
  detail: { gap: 2 },
  meta: { fontSize: 13, lineHeight: 18, color: palette.inkSoft },
  footer: { alignSelf: 'center' },
});
