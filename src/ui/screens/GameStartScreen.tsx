import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGame } from '../../games/registry';
import type { ScoreBoard } from '../../scores/types';
import { Badge, Button, GameArtwork, Ribbon, Stat, Surface } from '../components';
import { font, screen, space, theme, type } from '../theme';

type Props = {
  gameId: string;
  board: ScoreBoard;
  onPlay: () => void;
  onScores: () => void;
  /** Game-specific block at the top of the status card — today's category, level, etc. */
  detail?: ReactNode;
  /** Small print under everything. */
  footer?: string;
  /** Overrides the CTA label. Defaults to "Play now". */
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
 * The screen between the hub and a run, shared by every game.
 *
 * Every title gets the same shape — art, a level ribbon, one stats card,
 * then a green Play — so entering Clueless feels like entering More or Less.
 */
export function GameStartScreen({
  gameId,
  board,
  onPlay,
  onScores,
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
  const accent = game?.accent ?? theme.accent;
  const { bestStreak, totalRuns } = board;
  const played = totalRuns > 0;

  const bestLabel = `${game?.scoreDirection === 'lower' ? 'FEWEST' : 'BEST'} ${(
    game?.scoreNoun ?? 'score'
  ).toUpperCase()}`;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <GameArtwork gameId={gameId} accent={accent} size={120} raised />
        {game?.badge ? <Badge label={game.badge} color={accent} /> : null}
        <Text style={styles.title}>{game?.name ?? 'Play'}</Text>
        <Text style={styles.subtitle}>{game?.blurb ?? game?.tagline ?? ''}</Text>
      </View>

      <View style={styles.bottom}>
        {detail ? <View style={styles.detailSlot}>{detail}</View> : null}

        {played ? (
          <Surface level={2} style={styles.status}>
            <View style={styles.stats}>
              <View style={styles.statCell}>
                <Stat value={bestStreak} label={bestLabel} size="md" align="left" color={theme.text} />
              </View>
              <View style={styles.statCell}>
                <Stat
                  value={totalRuns}
                  label={totalRuns === 1 ? 'RUN' : 'RUNS'}
                  size="md"
                  align="left"
                />
              </View>
            </View>
          </Surface>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={playLabel}
            size="xl"
            tone="green"
            onPress={onPlay}
            disabled={playDisabled}
          />
          {onRace ? (
            <>
              <Button
                title={raceLabel}
                tone="blue"
                size="md"
                onPress={onRace}
                disabled={raceDisabled}
              />
              {raceHint ? <Text style={styles.raceHint}>{raceHint}</Text> : null}
            </>
          ) : null}
          <Button title="View scores" tone="purple" size="md" onPress={onScores} />
        </View>

        {footer ? <Text style={styles.footer}>{footer}</Text> : null}
      </View>
    </ScrollView>
  );
}

/**
 * Shared shape for the `detail` slot.
 *
 * Wordfall and Clueless pass `ribbon` so the level is a hanging ribbon on the
 * sand page. The stats card stays separate, under this block.
 */
export function StartDetail({
  label,
  title,
  meta,
  accent,
  ribbon = false,
  ribbonColor,
}: {
  label: string;
  title: string;
  meta?: string;
  accent: string;
  ribbon?: boolean;
  ribbonColor?: string;
}) {
  if (ribbon) {
    return (
      <View style={styles.ribbonBlock}>
        <Ribbon label={label.toUpperCase()} color={ribbonColor ?? accent} />
        <Text style={styles.detailTitle}>{title}</Text>
        {meta ? <Text style={styles.detailMeta}>{meta}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.detailCopy}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailTitle}>{title}</Text>
      {meta ? <Text style={styles.detailMeta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: screen.page,
  content: { flexGrow: 1, paddingHorizontal: space.lg, paddingBottom: space.md },
  hero: { alignItems: 'center', paddingTop: space.md, gap: space.xs },
  title: { ...type.hero, color: theme.text, fontSize: 40, lineHeight: 44, marginTop: space.xs },
  subtitle: {
    ...type.body,
    color: theme.textMuted,
    textAlign: 'center',
    maxWidth: 340,
    marginTop: space.xxs,
  },
  bottom: { gap: space.md, paddingTop: space.lg },
  detailSlot: { gap: space.md },
  status: { gap: space.md },
  stats: { flexDirection: 'row' },
  statCell: { flex: 1 },
  actions: { gap: space.sm },
  ribbonBlock: { alignItems: 'center', gap: space.xs },
  detailCopy: { alignItems: 'center' },
  detailLabel: { ...type.overline, color: theme.textDim, textAlign: 'center' },
  detailTitle: { ...type.subtitle, color: theme.text, fontSize: 16, marginTop: 1, textAlign: 'center' },
  detailMeta: { ...type.caption, color: theme.textMuted, marginTop: 1, textAlign: 'center' },
  footer: {
    color: theme.textDim,
    fontFamily: font.medium,
    fontSize: 11,
    textAlign: 'center',
    marginTop: space.xs,
  },
  raceHint: {
    ...type.caption,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
