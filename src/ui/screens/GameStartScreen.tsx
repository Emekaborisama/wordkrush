import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGame } from '../../games/registry';
import type { ScoreBoard } from '../../scores/types';
import { Badge, Button, GameArtwork, Stat, Surface } from '../components';
import { font, space, theme, type, withAlpha } from '../theme';

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
 * Every title gets the same shape — art, badge, name, blurb, one status card,
 * then the CTA — so entering Clueless feels like entering More or Less.
 * Anything game-specific arrives through `detail` rather than by forking the
 * layout, which is what let the three games drift apart in the first place.
 *
 * `detail` and the player's numbers share ONE card deliberately. They answer
 * the same question — what is this game like right now — and as two adjacent
 * bordered cards they competed for a single glance and read as clutter. The
 * numbers are also hidden until there are some: a first-time player was being
 * shown a full-width accent card containing "—" and "0", which is the loudest
 * element on the screen saying the least.
 */
export function GameStartScreen({
  gameId,
  board,
  onPlay,
  onScores,
  detail,
  footer,
  playLabel = 'Play now',
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

  // "Best" is a lie in a lower-is-better game — Clueless wants the FEWEST
  // guesses, so the label has to follow the registry, not the other way round.
  const bestLabel = `${game?.scoreDirection === 'lower' ? 'FEWEST' : 'BEST'} ${(
    game?.scoreNoun ?? 'score'
  ).toUpperCase()}`;

  return (
    // Scrolls rather than overlaps. The blurb is 2 lines on More or Less and 3
    // on Clueless, and a fixed column let the bottom block ride up over the
    // status card on the taller one — the same way it would on any short phone.
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <GameArtwork gameId={gameId} accent={accent} size={136} raised />
        {game?.badge ? <Badge label={game.badge} color={accent} /> : null}
        <Text style={styles.title}>{game?.name ?? 'Play'}</Text>
        <Text style={styles.subtitle}>{game?.blurb ?? game?.tagline ?? ''}</Text>
      </View>

      <View style={styles.bottom}>
        {detail || played ? (
          <Surface level={2} borderColor={withAlpha(accent, 0.3)} style={styles.status}>
            {detail}
            {detail && played ? <View style={styles.hairline} /> : null}
            {played ? (
              <View style={styles.stats}>
                <View style={styles.statCell}>
                  <Stat value={bestStreak} label={bestLabel} size="md" align="left" color={accent} />
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
            ) : null}
          </Surface>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={playLabel}
            size="lg"
            onPress={onPlay}
            color={accent}
            disabled={playDisabled}
          />
          {onRace ? (
            <>
              <Button
                title={raceLabel}
                variant="tonal"
                size="md"
                onPress={onRace}
                color={accent}
                disabled={raceDisabled}
              />
              {raceHint ? <Text style={styles.raceHint}>{raceHint}</Text> : null}
            </>
          ) : null}
          <Button title="View scores" variant="tonal" size="md" onPress={onScores} color={accent} />
        </View>

        {footer ? <Text style={styles.footer}>{footer}</Text> : null}
      </View>
    </ScrollView>
  );
}

/**
 * Shared shape for the `detail` slot, so each game's block matches the others.
 *
 * Content only — the card around it belongs to GameStartScreen, which is what
 * lets the detail and the stats sit inside one border instead of two.
 */
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
    <View style={styles.detailRow}>
      <View style={[styles.detailDot, { backgroundColor: accent, shadowColor: accent }]} />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailTitle}>{title}</Text>
        {meta ? <Text style={styles.detailMeta}>{meta}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  // One gutter for the whole screen. The hero used to add its own inset on top
  // of this, so the status card and the buttons sat at different widths and the
  // stack looked broken rather than designed.
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
  status: { gap: space.md },
  hairline: { height: 1, backgroundColor: theme.border },
  stats: { flexDirection: 'row' },
  statCell: { flex: 1 },
  actions: { gap: space.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  detailDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
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
    marginTop: space.xs,
  },
  raceHint: {
    ...type.caption,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
