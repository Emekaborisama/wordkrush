import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { feedback } from '../../native/feedback';
import type { MilestoneId, RewardEvent, StarCount } from '../../rewards/types';
import { Button, CountUpText, DisplayTitle, Rays, StarRow } from '../components';
import { font, palette, space, theme, type } from '../theme';

const MILESTONE_TITLE: Record<MilestoneId, string> = {
  'flame-3': '3-DAY FLAME',
  'flame-7': '7-DAY FLAME',
  'flame-14': '14-DAY FLAME',
  'flame-30': '30-DAY FLAME',
  'mol-streak-5': 'STREAK 5',
  'mol-streak-10': 'STREAK 10',
  'mol-streak-20': 'STREAK 20',
  'mol-set-1': 'SET CLEARED',
  'clueless-sparks': 'SPARKS CLEARED',
  'clueless-vault-1': 'FIRST VAULT',
  'clueless-vault-7': 'SEVEN VAULTS',
  'wordfall-campaign': 'CAMPAIGN CLEAR',
  'wordfall-weekly-1': 'WEEKLY CLEAR',
  'level-5': 'LEVEL 5',
  'level-10': 'LEVEL 10',
};

function starsEarned(events: readonly RewardEvent[]): StarCount {
  const stars = events.find((event) => event.kind === 'stars');
  return stars && stars.kind === 'stars' ? stars.stars : 0;
}

function sumKind(events: readonly RewardEvent[], kind: 'xp' | 'coins'): number {
  return events.reduce((total, event) => {
    if (event.kind !== kind) return total;
    return total + event.amount;
  }, 0);
}

/** Stars, XP, and coins from the events `applyRun` returned. */
export function RewardPanel({
  events,
  boosted,
}: {
  events: readonly RewardEvent[];
  boosted: boolean;
}) {
  const xp = sumKind(events, 'xp');
  const coins = sumKind(events, 'coins');
  const earned = starsEarned(events);

  useEffect(() => {
    if (coins > 0) feedback('coin');
  }, [coins]);

  return (
    <View style={styles.panel}>
      <StarRow earned={earned} onStar={() => feedback('star')} />
      <View style={styles.totals}>
        <View style={styles.total}>
          <Text style={styles.totalLabel}>XP</Text>
          <CountUpText value={xp} style={styles.totalValue} announce />
        </View>
        <View style={styles.total}>
          <Text style={styles.totalLabel}>COINS</Text>
          <CountUpText value={coins} style={styles.totalValue} announce />
        </View>
      </View>
      {boosted ? (
        <Text style={styles.boosted}>Boosted run — not on the global board</Text>
      ) : null}
    </View>
  );
}

/**
 * Level-up and milestone beats. They open after the result is already showing.
 */
export function RewardCelebration({ events }: { events: readonly RewardEvent[] }) {
  const beats = events.filter(
    (event): event is Extract<RewardEvent, { kind: 'levelUp' | 'milestone' }> =>
      event.kind === 'levelUp' || event.kind === 'milestone',
  );
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (beats.length === 0) return;
    const timer = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(timer);
  }, [beats.length]);

  if (!open || index >= beats.length) return null;
  const beat = beats[index];
  if (!beat) return null;
  const title = beat.kind === 'levelUp' ? `LEVEL ${beat.to}` : MILESTONE_TITLE[beat.id];
  const last = index + 1 >= beats.length;

  return (
    <View style={styles.celebration} accessibilityViewIsModal>
      <View style={styles.rays} pointerEvents="none">
        <Rays />
      </View>
      <DisplayTitle accessibilityLabel={title}>{title}</DisplayTitle>
      <Button
        title={last ? 'Continue' : 'Next'}
        tone="green"
        size="lg"
        onPress={() => setIndex((current) => current + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', gap: space.sm, alignSelf: 'stretch' },
  totals: { flexDirection: 'row', gap: space.lg },
  total: { alignItems: 'center' },
  totalLabel: { ...type.overline, color: theme.textMuted },
  totalValue: {
    color: palette.brown,
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  boosted: {
    ...type.caption,
    color: theme.textMuted,
    textAlign: 'center',
  },
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
