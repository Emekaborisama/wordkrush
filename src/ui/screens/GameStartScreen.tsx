import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getGame } from '../../games/registry';
import type { ScoreBoard } from '../../scores/types';
import { Badge, Button, GameArtwork, Stat, Surface } from '../components';
import { font, radius, space, theme, type, withAlpha } from '../theme';

type Props = {
  gameId: string;
  board: ScoreBoard;
  onPlay: () => void;
  onScores: () => void;
  /** Game-specific block above the footer — today's category, level, etc. */
  detail?: ReactNode;
  /** Small print under everything. */
  footer?: string;
  /** Overrides the CTA label. Defaults to "Play now". */
  playLabel?: string;
};

/**
 * The screen between the hub and a run, shared by every game.
 *
 * Every title gets the same shape — art, badge, name, blurb, the player's own
 * numbers, then the CTA — so entering Clueless feels like entering More or
 * Less. Anything game-specific arrives through `detail` rather than by forking
 * the layout, which is what let the three games drift apart in the first place.
 */
export function GameStartScreen({
  gameId,
  board,
  onPlay,
  onScores,
  detail,
  footer,
  playLabel = 'Play now',
}: Props) {
  const game = getGame(gameId);
  const accent = game?.accent ?? theme.accent;
  const { bestStreak, totalRuns } = board;

  // "Best" is a lie in a lower-is-better game — Clueless wants the FEWEST
  // guesses, so the label has to follow the registry, not the other way round.
  const bestLabel = `${game?.scoreDirection === 'lower' ? 'FEWEST' : 'BEST'} ${(
    game?.scoreNoun ?? 'score'
  ).toUpperCase()}`;

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <GameArtwork gameId={gameId} accent={accent} size={136} raised />
        {game?.badge ? <Badge label={game.badge} color={accent} /> : null}
        <Text style={styles.title}>{game?.name ?? 'Play'}</Text>
        <Text style={styles.subtitle}>{game?.blurb ?? game?.tagline ?? ''}</Text>

        {/* What is on today/this week sits with the pitch, not under the CTA:
            it is the reason to tap Play, so it has to be read first. */}
        {detail ? <View style={styles.detailSlot}>{detail}</View> : null}
      </View>

      <View style={styles.bottom}>
        <Surface
          level={2}
          borderColor={withAlpha(accent, 0.38)}
          radius={radius.lg}
          style={styles.stats}
        >
          <Stat
            value={totalRuns === 0 ? '—' : bestStreak}
            label={bestLabel}
            size="lg"
            color={accent}
          />
          <View style={styles.divider} />
          <Stat value={totalRuns} label={totalRuns === 1 ? 'RUN' : 'RUNS'} size="lg" />
        </Surface>

        <View style={styles.actions}>
          <Button title={playLabel} size="lg" onPress={onPlay} color={accent} />
          <Button title="View scores" variant="tonal" size="md" onPress={onScores} color={accent} />
        </View>
      </View>

      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

/** Shared shape for the `detail` slot, so each game's block matches the others. */
export function StartDetail({
  label,
  title,
  meta,
  accent,
}: {
  label: string;
  title: string;
  meta?: string;
  accent: string;
}) {
  return (
    <Surface level={1} radius={radius.md} style={styles.detailBox}>
      <View style={[styles.detailDot, { backgroundColor: accent, shadowColor: accent }]} />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailTitle}>{title}</Text>
        {meta ? <Text style={styles.detailMeta}>{meta}</Text> : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  hero: { alignItems: 'center', paddingTop: space.md, paddingHorizontal: space.md, gap: space.xs },
  title: { ...type.hero, color: theme.text, fontSize: 40, lineHeight: 44, marginTop: space.xs },
  subtitle: {
    ...type.body,
    color: theme.textMuted,
    textAlign: 'center',
    maxWidth: 340,
    marginTop: space.xxs,
  },
  detailSlot: { alignSelf: 'stretch', marginTop: space.md },
  bottom: { flex: 1, justifyContent: 'flex-end', gap: space.md, paddingTop: space.lg },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: space.md,
  },
  divider: { width: 1, height: 48, backgroundColor: theme.border },
  actions: { gap: space.sm },
  detailBox: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  detailDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  detailCopy: { flex: 1 },
  detailLabel: { ...type.overline, color: theme.textDim },
  detailTitle: { ...type.subtitle, color: theme.text, fontSize: 16, marginTop: 1 },
  detailMeta: { ...type.caption, color: theme.textMuted, marginTop: 1, fontSize: 11.5 },
  footer: {
    color: theme.textDim,
    fontFamily: font.medium,
    fontSize: 10.5,
    textAlign: 'center',
    marginTop: space.sm,
  },
});
