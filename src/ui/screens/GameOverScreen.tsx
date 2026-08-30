import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import { streakBucket } from '../../analytics/events';
import type { GameState } from '../../games/more-or-less/engine';
import { buildShareText } from '../../games/more-or-less/share';
import type { Category } from '../../games/more-or-less/types';
import { getGame } from '../../games/registry';
import { feedback } from '../../native/feedback';
import { shareResult } from '../../native/share';
import { rankOf, type ScoreBoard } from '../../scores/types';
import { Badge, ResultPanel, Stat, Surface } from '../components';
import { Mascot } from '../lottie/Mascot';
import { font, formatValue, gameAccentTokens, radius, space, theme, type } from '../theme';

type Props = {
  state: GameState;
  category: Category;
  board: ScoreBoard;
  onPlayAgain: () => void;
  onHome: () => void;
  onScores: () => void;
  labelRound?: {
    roundsPassed: number;
    remaining: number;
    justPassed: boolean;
    caughtUp: boolean;
  };
};

export function GameOverScreen({
  state,
  category,
  board,
  onPlayAgain,
  onHome,
  onScores,
  labelRound,
}: Props) {
  const isBest = state.streak > 0 && state.streak >= board.bestStreak;
  const accent = getGame('more-or-less')?.accent ?? theme.success;

  // Celebrate a personal best, and only that. The run that merely ended already
  // got its 'wrong' beat in GameScreen; replaying a fanfare over an ordinary
  // loss would read as sarcasm.
  useEffect(() => {
    if (isBest) feedback('win');
  }, [isBest]);
  const tokens = gameAccentTokens(accent);
  // rankOf counts strictly-better runs, and this run is already saved, so its
  // own entry never inflates the rank.
  const rank = rankOf(board, state.streak);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const shareNoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shareNoteTimer.current !== null) clearTimeout(shareNoteTimer.current);
    };
  }, []);

  async function onShare() {
    captureAnalytics('game_over_action', {
      game_id: 'more-or-less',
      action: 'share',
      streak_bucket: streakBucket(state.streak),
      is_new_best: isBest,
    });
    const outcome = await shareResult(
      buildShareText({ streak: state.streak, bestStreak: board.bestStreak, rank }),
    );
    if (outcome === 'copied') {
      setShareNote('Copied to clipboard');
      if (shareNoteTimer.current !== null) clearTimeout(shareNoteTimer.current);
      shareNoteTimer.current = setTimeout(() => setShareNote(null), 2000);
    }
    if (outcome === 'shared' || outcome === 'copied') {
      captureAnalytics('result_shared', {
        game_id: 'more-or-less',
        outcome: 'loss',
        score_kind: 'streak',
        method: outcome === 'shared' ? 'share_sheet' : 'clipboard',
        is_new_best: isBest,
      });
    }
  }

  return (
    <View style={styles.root}>
      <ResultPanel
        eyebrow={isBest ? 'NEW PERSONAL BEST' : 'RUN COMPLETE'}
        title={isBest ? 'You crushed it!' : 'Good instincts.'}
        value={state.streak}
        valueLabel={state.streak === 1 ? 'ROUND' : 'ROUNDS'}
        accent={accent}
        art={
          <View style={styles.art}>
            <Mascot size={64} pose={isBest ? 'celebrate' : 'wince'} />
            {isBest ? (
              <View style={styles.badge}>
                <Badge label="NEW BEST" tone="success" />
              </View>
            ) : null}
          </View>
        }
        share={{ label: 'Share result', onPress: () => void onShare(), note: shareNote }}
        primary={{ label: 'Play again', onPress: onPlayAgain }}
        secondary={{ label: 'View scores', onPress: onScores }}
        tertiary={{ label: 'All games', onPress: onHome }}
      >
        <View style={styles.summary}>
          <Stat value={`#${rank}`} label="LOCAL RANK" />
          <View style={styles.summaryRule} />
          <Stat value={board.bestStreak} label="BEST" color={accent} />
          {labelRound ? (
            <>
              <View style={styles.summaryRule} />
              <Stat value={labelRound.roundsPassed} label="ROUNDS PASSED" color={accent} />
            </>
          ) : null}
        </View>
        {labelRound ? (
          <Text style={styles.roundNote}>
            {labelRound.justPassed
              ? labelRound.caughtUp
                ? 'Set cleared — new names drop next week.'
                : 'Set cleared — new names unlocked.'
              : labelRound.remaining === 1
                ? '1 name left in this set.'
                : `${labelRound.remaining} names left in this set.`}
          </Text>
        ) : null}

        {/* Keep the losing pair visible: the reveal explains the result and
            gives the player one useful fact to take into the next run. */}
        <Surface level={1} radius={radius.md} borderColor={tokens.glow} style={styles.pairBox}>
          <Text style={styles.pairTitle}>THE MATCHUP THAT ENDED THE RUN</Text>
          <View style={styles.pairRow}>
            <Pair item={state.left} color={accent} />
            <Text style={styles.pairVs}>VS</Text>
            <Pair item={state.right} color={theme.danger} />
          </View>
          <Text style={styles.pairMetric}>{category.metricLabel}</Text>
        </Surface>
      </ResultPanel>
    </View>
  );
}

function Pair({ item, color }: { item: GameState['left']; color: string }) {
  return (
    <View style={styles.pairItem}>
      <Text style={styles.pairLabel} numberOfLines={2}>
        {item.label}
      </Text>
      <Text style={[styles.pairValue, { color }]}>{formatValue(item.value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    padding: space.lg,
    justifyContent: 'center',
  },
  art: { position: 'relative' },
  badge: { position: 'absolute', right: -34, top: -8 },
  summary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: space.lg,
  },
  summaryRule: { width: 1, height: 44, backgroundColor: theme.border },
  pairBox: {
    width: '100%',
    marginTop: space.lg,
  },
  pairTitle: { ...type.overline, color: theme.textDim, textAlign: 'center' },
  pairRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm, gap: space.sm },
  pairItem: { flex: 1, alignItems: 'center' },
  pairLabel: { ...type.caption, color: theme.text, fontFamily: font.bold, fontWeight: '700', textAlign: 'center' },
  pairValue: { ...type.bodyStrong, marginTop: 2 },
  pairVs: { ...type.overline, color: theme.textDim },
  pairMetric: { ...type.caption, color: theme.textDim, textAlign: 'center', marginTop: space.sm },
  roundNote: {
    ...type.caption,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: space.md,
  },
});
