import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { feedback } from '../../native/feedback';
import type { MilestoneId, RewardEvent, StarCount } from '../../rewards/types';
import {
  Button,
  CoinIcon,
  CountUpText,
  DisplayTitle,
  PanelText,
  PopupModal,
  Rays,
  StarRibbon,
} from '../components';
import { font, palette, space } from '../theme';

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

export function starsEarned(events: readonly RewardEvent[]): StarCount {
  const stars = events.find((event) => event.kind === 'stars');
  return stars && stars.kind === 'stars' ? stars.stars : 0;
}

function sumKind(events: readonly RewardEvent[], kind: 'xp' | 'coins'): number {
  return events.reduce((total, event) => {
    if (event.kind !== kind) return total;
    return total + event.amount;
  }, 0);
}

/** Purple XP gem drawn from views, so the chip never waits on an image. */
function XpGem() {
  return (
    <View style={styles.gem} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.gemShine} />
    </View>
  );
}

/**
 * What a finished run earned, the kit way: the stars standing on the blue
 * scroll, then coin and XP chips that count up. Lives inside a result panel.
 */
export function RewardPanel({ events, boosted }: { events: readonly RewardEvent[]; boosted: boolean }) {
  const xp = sumKind(events, 'xp');
  const coins = sumKind(events, 'coins');
  const earned = starsEarned(events);

  useEffect(() => {
    if (coins > 0) feedback('coin');
  }, [coins]);

  return (
    <View style={styles.panel}>
      <StarRibbon earned={earned} onStar={() => feedback('star')} />
      <View style={styles.chips}>
        <RewardChip icon={<CoinIcon size={30} />} value={coins} label="coins" />
        <RewardChip icon={<XpGem />} value={xp} label="XP" />
      </View>
      {boosted ? <PanelText>Boosted run — not on the global board</PanelText> : null}
    </View>
  );
}

function RewardChip({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <View style={styles.chip} accessible accessibilityLabel={`plus ${value} ${label}`}>
      <View style={styles.chipIcon}>{icon}</View>
      <Text style={styles.plus}>+</Text>
      <CountUpText value={value} style={styles.chipValue} announce />
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

/**
 * Level-up and milestone beats, one pop-up each with rays behind the title.
 * They open after the result is already showing.
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

  const beat = beats[index];
  if (!open || !beat) return null;
  const title = beat.kind === 'levelUp' ? `LEVEL ${beat.to}` : MILESTONE_TITLE[beat.id];
  const last = index + 1 >= beats.length;
  const next = () => setIndex((current) => current + 1);

  return (
    <PopupModal
      visible
      onClose={next}
      dismissable={false}
      hideClose
      scrim="strong"
      title={beat.kind === 'levelUp' ? 'LEVEL UP!' : 'MILESTONE'}
      ribbon="banner"
      ribbonColor={palette.goldDeep}
      footer={<Button title={last ? 'Continue' : 'Next'} tone="green" size="lg" onPress={next} />}
    >
      <View style={styles.beat}>
        <View style={styles.rays} pointerEvents="none">
          <Rays />
        </View>
        <DisplayTitle accessibilityLabel={title}>{title}</DisplayTitle>
      </View>
    </PopupModal>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', gap: space.sm, alignSelf: 'stretch' },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 40,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 20,
    backgroundColor: palette.creamFill,
    borderWidth: 2,
    borderColor: palette.creamEdge,
    borderBottomColor: palette.white,
  },
  chipIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  plus: { fontFamily: font.black, fontSize: 16, color: palette.green },
  chipValue: { fontFamily: font.black, fontSize: 20, color: palette.ink, fontVariant: ['tabular-nums'] },
  chipLabel: { fontFamily: font.heavy, fontSize: 12, color: palette.inkSoft, marginLeft: 2 },
  gem: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: palette.purple,
    borderWidth: 2,
    borderColor: '#5B2AA8',
    transform: [{ rotate: '45deg' }],
    overflow: 'hidden',
  },
  gemShine: { position: 'absolute', top: 1, left: 1, width: 8, height: 8, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)' },
  beat: { alignItems: 'center', justifyContent: 'center', minHeight: 150 },
  rays: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
