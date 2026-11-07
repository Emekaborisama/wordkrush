import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { feedback } from '../../native/feedback';
import { celebrationLabels } from '../../rewards/celebrations';
import type { RewardEvent, StarCount } from '../../rewards/types';
import { CoinIcon, CountUpText, PanelText, StarRibbon } from '../components';
import { font, palette, space } from '../theme';

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
 * scroll, coin and XP chips that count up, then one row for any level-up or
 * milestone. Lives inside a result panel: one celebration per result, never a
 * second pop-up over it.
 */
export function RewardPanel({
  events,
  boosted,
  stars = true,
}: {
  events: readonly RewardEvent[];
  boosted: boolean;
  /** Off where a run has no star rating: an empty ribbon reads as a failure. */
  stars?: boolean;
}) {
  const xp = sumKind(events, 'xp');
  const coins = sumKind(events, 'coins');
  const earned = starsEarned(events);
  const moments = celebrationLabels(events);

  useEffect(() => {
    if (coins > 0) feedback('coin');
  }, [coins]);

  return (
    <View style={styles.panel}>
      {stars ? <StarRibbon earned={earned} onStar={() => feedback('star')} /> : null}
      <View style={styles.chips}>
        <RewardChip icon={<CoinIcon size={30} />} value={coins} label="coins" />
        <RewardChip icon={<XpGem />} value={xp} label="XP" />
      </View>
      {moments.length > 0 ? (
        <View style={styles.moments}>
          {moments.map((label) => (
            <Text key={label} style={styles.moment}>
              {label}
            </Text>
          ))}
        </View>
      ) : null}
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
  moments: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xs },
  moment: {
    fontFamily: font.heavy,
    fontSize: 13,
    color: palette.ink,
    backgroundColor: palette.gold,
    borderWidth: 2,
    borderColor: palette.goldEdge,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
});
