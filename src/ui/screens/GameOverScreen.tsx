import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import { streakBucket } from '../../analytics/events';
import type { GameState } from '../../games/more-or-less/engine';
import { buildShareText } from '../../games/more-or-less/share';
import type { Category } from '../../games/more-or-less/types';
import { feedback } from '../../native/feedback';
import { shareResult } from '../../native/share';
import { rankOf, type ScoreBoard } from '../../scores/types';
import type { RewardEvent } from '../../rewards/types';
import { Button, DisplayTitle, Rays, ResultSheet, RoundIconButton, ScoreWell } from '../components';
import { RewardCelebration, RewardPanel } from '../rewards/RewardReveal';
import { font, formatValue, palette, radius, screen, space, theme, type } from '../theme';

type Props = {
  state: GameState;
  category: Category;
  board: ScoreBoard;
  onPlayAgain: () => void;
  onHome: () => void;
  onScores: () => void;
  isNewBest: boolean;
  boosted: boolean;
  events: readonly RewardEvent[];
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
  isNewBest,
  boosted,
  events,
  labelRound,
}: Props) {
  const rank = rankOf(board, state.streak);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const shareNoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const personalBest = isNewBest && state.streak > 0;

  useEffect(() => {
    if (personalBest) feedback('win');
  }, [personalBest]);

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
      is_new_best: isNewBest,
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
        is_new_best: isNewBest,
      });
    }
  }

  return (
    <View style={styles.root}>
      {personalBest ? (
        <View style={styles.rays} pointerEvents="none">
          <Rays />
        </View>
      ) : null}
      <View style={styles.stars}>
        <RewardPanel events={events} boosted={boosted} />
      </View>
      <ResultSheet
        accessibilityLabel={personalBest ? 'Game over. New personal best.' : 'Game over'}
        footer={
          <View style={styles.footer}>
            <Button title="Try again" size="xl" tone="green" onPress={onPlayAgain} />
            <View style={styles.roundRow}>
              <RoundIconButton
                icon={<Text style={styles.roundGlyph}>⌂</Text>}
                accessibilityLabel="Home"
                onPress={onHome}
                tone="blue"
                size={52}
              />
              <RoundIconButton
                icon={<Text style={styles.roundGlyph}>↻</Text>}
                accessibilityLabel="Replay"
                onPress={onPlayAgain}
                tone="purple"
                size={52}
              />
            </View>
            <Button
              title="Share result"
              tone="blue"
              size="md"
              onPress={() => void onShare()}
              accessibilityHint="Copies a spoiler-free result you can paste anywhere"
            />
            {shareNote ? (
              <Text style={styles.shareNote} accessibilityLiveRegion="polite">
                {shareNote}
              </Text>
            ) : null}
            <Button title="View scores" tone="purple" size="md" onPress={onScores} />
          </View>
        }
      >
        <DisplayTitle>GAME OVER</DisplayTitle>
        {personalBest ? <Text style={styles.best}>New personal best</Text> : null}
        <ScoreWell label={state.streak === 1 ? 'ROUND' : 'ROUNDS'} value={String(state.streak)} />
        <View style={styles.summary}>
          <Text style={styles.summaryItem}>Local rank #{rank}</Text>
          <Text style={styles.summaryItem}>Best {board.bestStreak}</Text>
          {labelRound ? <Text style={styles.summaryItem}>Passed {labelRound.roundsPassed}</Text> : null}
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

        <View style={styles.pairBox}>
          <Text style={styles.pairTitle}>THE MATCHUP THAT ENDED THE RUN</Text>
          <View style={styles.pairRow}>
            <Pair item={state.left} />
            <Text style={styles.pairVs}>VS</Text>
            <Pair item={state.right} />
          </View>
          <Text style={styles.pairMetric}>{category.metricLabel}</Text>
        </View>
      </ResultSheet>
      <RewardCelebration events={events} />
    </View>
  );
}

function Pair({ item }: { item: GameState['left'] }) {
  return (
    <View style={styles.pairItem}>
      <Text style={styles.pairLabel} numberOfLines={2}>
        {item.label}
      </Text>
      <Text style={styles.pairValue}>{formatValue(item.value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...screen.playfield,
    padding: space.md,
    paddingBottom: space.lg,
  },
  rays: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stars: { alignItems: 'center', marginBottom: -16, zIndex: 2 },
  best: { ...type.caption, color: theme.onWood, fontFamily: font.bold, fontWeight: '700', textAlign: 'center' },
  footer: { gap: space.sm },
  roundRow: { flexDirection: 'row', justifyContent: 'center', gap: space.lg },
  roundGlyph: { color: theme.onPill, fontSize: 22, lineHeight: 26 },
  shareNote: { ...type.caption, color: theme.textMuted, textAlign: 'center' },
  summary: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.md,
    marginTop: space.md,
  },
  summaryItem: { ...type.caption, color: theme.text, fontFamily: font.bold, fontWeight: '700' },
  pairBox: {
    width: '100%',
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.sand,
  },
  pairTitle: { ...type.overline, color: theme.textDim, textAlign: 'center' },
  pairRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm, gap: space.sm },
  pairItem: { flex: 1, alignItems: 'center' },
  pairLabel: { ...type.caption, color: theme.text, fontFamily: font.bold, fontWeight: '700', textAlign: 'center' },
  pairValue: { ...type.bodyStrong, color: theme.text, marginTop: 2 },
  pairVs: { ...type.overline, color: theme.textDim },
  pairMetric: { ...type.caption, color: theme.textDim, textAlign: 'center', marginTop: space.sm },
  roundNote: {
    ...type.caption,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: space.md,
  },
});
