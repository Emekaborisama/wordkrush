import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  StrokeText,
} from '../components';
import { afterModalClose } from '../components/modalHandoff';
import { CatMascot } from '../mascot/CatMascot';
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

type Beat = Extract<RewardEvent, { kind: 'levelUp' | 'milestone' }>;

function isBeat(event: RewardEvent): event is Beat {
  return event.kind === 'levelUp' || event.kind === 'milestone';
}

/**
 * Level-up and milestone beats, one pop-up each with rays behind the title,
 * paced by the player rather than a clock.
 *
 * They used to open 0.7 s after the result, on a timer, and cover it before
 * its stars had landed. Now the result stays put until the player leaves it:
 * wrap each action that leaves the result in `gate`, and the beats play
 * first, then the action runs once the last one is closed. Share is not a
 * way out, so it is not gated. With no beats, `gate(action)` is `action`.
 */
export function useRewardBeats(events: readonly RewardEvent[] | null | undefined): {
  gate: (action: () => void) => () => void;
  celebration: ReactNode;
} {
  const beats = (events ?? []).filter(isBeat);
  // Content, not array identity: a replay in the same screen is a new set.
  const runKey = beats.map((beat) => (beat.kind === 'levelUp' ? `l${beat.to}` : `m${beat.id}`)).join(',');
  const [shown, setShown] = useState<{ key: string; index: number }>({ key: runKey, index: 0 });
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const index = shown.key === runKey ? shown.index : 0;

  useEffect(() => {
    pending.current = null;
    setOpen(false);
  }, [runKey]);

  const gate = (action: () => void) => () => {
    if (index >= beats.length) {
      action();
      return;
    }
    pending.current = action;
    setOpen(true);
  };

  const next = () => {
    const following = index + 1;
    setShown({ key: runKey, index: following });
    if (following < beats.length) return;
    setOpen(false);
    const action = pending.current;
    pending.current = null;
    // Let the pop-up finish closing before the screen changes under it.
    if (action) afterModalClose(action);
  };

  const beat = beats[index];
  const celebration =
    open && beat ? <BeatPopup beat={beat} last={index + 1 >= beats.length} onNext={next} beatKey={index} /> : null;
  return { gate, celebration };
}

function BeatPopup({ beat, last, onNext, beatKey }: { beat: Beat; last: boolean; onNext: () => void; beatKey: number }) {
  const title = beat.kind === 'levelUp' ? `LEVEL ${beat.to}` : MILESTONE_TITLE[beat.id];
  return (
    <PopupModal
      visible
      onClose={onNext}
      dismissable={false}
      hideClose
      scrim="strong"
      title={beat.kind === 'levelUp' ? 'LEVEL UP!' : 'MILESTONE'}
      ribbon="banner"
      ribbonColor={palette.goldDeep}
      footer={<Button title={last ? 'Continue' : 'Next'} tone="green" size="lg" onPress={onNext} />}
    >
      <View style={styles.beat}>
        <View style={styles.rays} pointerEvents="none">
          <Rays />
        </View>
        {beat.kind === 'levelUp' ? (
          // A game's level is also "LEVEL n"; this one is the player's own.
          <StrokeText size={15} stroke={palette.coralEdge} strokeWidth={1.5} depth={1}>
            YOUR PLAYER LEVEL
          </StrokeText>
        ) : null}
        <DisplayTitle accessibilityLabel={beat.kind === 'levelUp' ? `Player level ${beat.to}` : title}>{title}</DisplayTitle>
        <CatMascot size={104} mood="cheer" reaction={{ key: beatKey, mood: 'cheer' }} />
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
  beat: { alignItems: 'center', justifyContent: 'center', minHeight: 150, gap: space.xs },
  rays: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
