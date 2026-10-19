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
import {
  Button,
  CreamBox,
  CreamText,
  GameIcon,
  Panel,
  PanelText,
  Rays,
  ScoreWell,
  SquareButton,
} from '../components';
import { RewardCelebration, RewardPanel } from '../rewards/RewardReveal';
import { font, formatValue, palette, space, tone } from '../theme';

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

  const footer = (
    <>
      <Button
        title="Play again"
        size="lg"
        tone="green"
        onPress={onPlayAgain}
        leading={<GameIcon name="retry" size={26} color={tone.green.outline} />}
      />
      <View style={styles.squares}>
        <SquareButton
          icon={<GameIcon name="home" size={28} color={tone.sky.outline} />}
          accessibilityLabel="Home"
          caption="Home"
          tone="sky"
          size={50}
          onPress={onHome}
        />
        <SquareButton
          icon={<GameIcon name="trophy" size={34} />}
          accessibilityLabel="View scores"
          caption="Scores"
          tone="sky"
          size={50}
          onPress={onScores}
        />
        <SquareButton
          icon={<GameIcon name="share" size={28} color={tone.sky.outline} />}
          accessibilityLabel="Share result"
          caption="Share"
          tone="sky"
          size={50}
          onPress={() => void onShare()}
        />
      </View>
      {shareNote ? <PanelText live>{shareNote}</PanelText> : null}
    </>
  );

  return (
    <View style={styles.root}>
      {personalBest ? (
        <View style={styles.rays} pointerEvents="none">
          <Rays size={360} />
        </View>
      ) : null}
      {/* Block King's new-record moment: a trophy riding the banner. */}
      {personalBest ? (
        <View style={styles.trophy} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <GameIcon name="trophy" size={88} />
        </View>
      ) : null}
      <Panel
        title={personalBest ? 'NEW RECORD!' : 'GAME OVER'}
        ribbon="banner"
        ribbonColor={personalBest ? palette.red : tone.red.lip}
        scroll
        footer={footer}
        style={styles.panel}
        accessibilityLabel={personalBest ? 'Game over. New personal best.' : 'Game over'}
      >
        <RewardPanel events={events} boosted={boosted} />
        <ScoreWell label={state.streak === 1 ? 'ROUND' : 'ROUNDS'} value={String(state.streak)} />
        <View style={styles.chips}>
          <Text style={styles.chip}>{`Rank #${rank}`}</Text>
          <Text style={styles.chip}>{`Best ${board.bestStreak}`}</Text>
          {labelRound ? <Text style={styles.chip}>{`Sets ${labelRound.roundsPassed}`}</Text> : null}
        </View>
        {labelRound ? (
          <PanelText>
            {labelRound.justPassed
              ? labelRound.caughtUp
                ? 'Set cleared — new names drop next week.'
                : 'Set cleared — new names unlocked.'
              : labelRound.remaining === 1
                ? '1 name left in this set.'
                : `${labelRound.remaining} names left in this set.`}
          </PanelText>
        ) : null}

        <CreamBox>
          <CreamText variant="label" style={styles.center}>
            THE MATCHUP THAT ENDED THE RUN
          </CreamText>
          <View style={styles.pairRow}>
            <Pair item={state.left} />
            <Text style={styles.vs}>VS</Text>
            <Pair item={state.right} />
          </View>
          <CreamText style={[styles.center, styles.metric]}>{category.metricLabel}</CreamText>
        </CreamBox>
      </Panel>
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
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  rays: { position: 'absolute', top: -40, left: 0, right: 0, alignItems: 'center' },
  trophy: { alignItems: 'center', marginBottom: -2, zIndex: 2 },
  panel: { flexShrink: 1 },
  squares: { flexDirection: 'row', justifyContent: 'center', gap: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xs },
  chip: {
    fontFamily: font.heavy,
    fontSize: 13,
    lineHeight: 17,
    color: palette.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: palette.coralEdge,
  },
  center: { textAlign: 'center' },
  metric: { fontSize: 13, lineHeight: 18, color: palette.inkSoft },
  pairRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.xs, gap: space.sm },
  pairItem: { flex: 1, alignItems: 'center' },
  pairLabel: { fontFamily: font.heavy, fontSize: 14, lineHeight: 18, color: palette.ink, textAlign: 'center' },
  pairValue: { fontFamily: font.black, fontSize: 18, lineHeight: 22, color: palette.ink, marginTop: 2 },
  vs: { fontFamily: font.black, fontSize: 14, color: palette.red },
});
