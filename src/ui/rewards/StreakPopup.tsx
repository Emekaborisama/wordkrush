import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import { prepareShareImage, sharePayload } from '../../native/share';
import { nextFlameGoal } from '../../rewards/progression';
import { buildStreakSharePayload } from '../../streak/share';
import { isAtRisk, liveStreakDays, recentStreakDays, type DailyStreak, type StreakDay } from '../../streak/types';
import { Button, CreamBox, CreamText, GameIcon, GoldText, PanelText, PopupModal, Rays, StrokeText } from '../components';
import { CatMascot, type CatMood } from '../mascot/CatMascot';
import { font, palette, space, tone } from '../theme';

const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const WEEKDAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

type Props = {
  visible: boolean;
  streak: DailyStreak;
  today: string;
  /** Milestone ids already claimed, so the next flame shown is one that still pays. */
  claimed: readonly string[];
  onClose: () => void;
  /** Starts a run: the only way to light today. */
  onPlay: () => void;
};

function daysBucket(days: number): '1_2' | '3_6' | '7_13' | '14_29' | '30_plus' {
  if (days < 3) return '1_2';
  if (days < 7) return '3_6';
  if (days < 14) return '7_13';
  if (days < 30) return '14_29';
  return '30_plus';
}

/**
 * The daily streak, opened from the flame in the top bar: the cat beside the
 * flame and the live count, the last seven days, the next flame that pays,
 * and the two things to do about it — share it, or play to keep it.
 *
 * The count is `liveStreakDays`, never the stored number: a streak that
 * already lapsed is not shown or shared as alive.
 */
export function StreakPopup({ visible, streak, today, claimed, onClose, onPlay }: Props) {
  const days = liveStreakDays(streak, today);
  const playedToday = days > 0 && !isAtRisk(streak, today);
  const lost = days === 0 && streak.longest > 0;
  const goal = nextFlameGoal(claimed, days);
  const week = recentStreakDays(streak, today);
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sharing = days > 0 ? buildStreakSharePayload({ days, best: streak.longest }) : null;

  // Fetch the card when the pop-up opens, so Share can attach it at once.
  useEffect(() => {
    if (visible && sharing) prepareShareImage(sharing);
  }, [visible, sharing?.imageUrl]);

  useEffect(() => {
    if (!visible) setNote(null);
    return () => {
      if (noteTimer.current !== null) clearTimeout(noteTimer.current);
    };
  }, [visible]);

  const mood: CatMood = playedToday ? 'cheer' : lost ? 'oops' : 'idle';
  const status = playedToday
    ? `Lit for today. Day ${days + 1} tomorrow!`
    : days > 0
      ? 'Play any game today to keep it burning.'
      : lost
        ? `Your ${streak.longest}-day flame went out. Light a new one today.`
        : 'Finish any run today to light your flame.';

  const share = async () => {
    if (!sharing) return;
    const outcome = await sharePayload(sharing);
    if (outcome === 'shared' || outcome === 'copied') {
      captureAnalytics('streak_shared', { days_bucket: daysBucket(days), method: outcome === 'shared' ? 'share_sheet' : 'clipboard' });
    }
    if (outcome === 'copied') {
      setNote('Link copied');
      if (noteTimer.current !== null) clearTimeout(noteTimer.current);
      noteTimer.current = setTimeout(() => setNote(null), 2000);
    }
  };

  return (
    <PopupModal
      visible={visible}
      onClose={onClose}
      title="DAILY STREAK"
      ribbon="banner"
      ribbonColor={palette.goldDeep}
      footer={
        <View style={styles.actions}>
          {days > 0 ? (
            <Button
              title="Share"
              tone="blue"
              size="lg"
              fullWidth={false}
              style={styles.action}
              leading={<GameIcon name="share" size={22} color={tone.blue.outline} />}
              accessibilityLabel={`Share your ${days}-day streak`}
              onPress={() => void share()}
            />
          ) : null}
          <Button
            title={playedToday ? 'Play more' : 'Play'}
            tone="green"
            size="lg"
            fullWidth={false}
            style={styles.action}
            onPress={onPlay}
          />
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.rays} pointerEvents="none">
          <Rays size={250} />
        </View>
        <CatMascot size={118} mood={mood} onPress={() => undefined} accessibilityLabel="The WordKrush cat. Tap to say hi" />
        <View
          style={styles.count}
          accessible
          accessibilityLabel={days === 1 ? '1 day in a row' : `${days} days in a row`}
        >
          <View style={!playedToday && days > 0 ? styles.dim : undefined}>
            <GameIcon name="flame" size={60} />
          </View>
          <GoldText text={String(days)} size={days > 99 ? 46 : 58} />
          <StrokeText size={16} stroke={palette.coralEdge} strokeWidth={2} depth={1}>
            {days === 1 ? 'DAY' : 'DAYS'}
          </StrokeText>
        </View>
      </View>

      <PanelText live>{status}</PanelText>

      <CreamBox style={styles.week}>
        <View style={styles.weekRow}>
          {week.map((day) => (
            <WeekCell key={day.key} day={day} />
          ))}
        </View>
        {streak.longest > 0 ? (
          <CreamText variant="label" style={styles.center}>{`BEST ${streak.longest} ${streak.longest === 1 ? 'DAY' : 'DAYS'}`}</CreamText>
        ) : null}
      </CreamBox>

      {goal ? (
        <CreamBox style={styles.goal}>
          <View style={styles.goalRow}>
            <GameIcon name="gift" size={44} />
            <View style={styles.flex}>
              <CreamText variant="teal">{`${goal.days}-day flame`}</CreamText>
              <View
                style={styles.track}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`${days} of ${goal.days} days`}
                accessibilityValue={{ min: 0, max: goal.days, now: days }}
              >
                <View style={[styles.fill, { width: `${Math.min(1, days / goal.days) * 100}%` }]} />
              </View>
              <CreamText style={styles.small}>
                {`${goal.days - days} more ${goal.days - days === 1 ? 'day' : 'days'} to go`}
              </CreamText>
            </View>
            <View style={styles.prize} accessibilityLabel={`${goal.coins} coins`}>
              <GameIcon name="coin" size={24} />
              <Text style={styles.prizeText}>{`+${goal.coins}`}</Text>
            </View>
          </View>
        </CreamBox>
      ) : null}

      {note ? <PanelText live>{note}</PanelText> : null}
    </PopupModal>
  );
}

/** One day of the strip: a flame when played, a ring for today, an empty socket otherwise. */
function WeekCell({ day }: { day: StreakDay }) {
  const label = `${WEEKDAY_NAME[day.weekday]}${day.isToday ? ', today' : ''}, ${day.played ? 'played' : 'not played'}`;
  return (
    <View style={styles.cell} accessible accessibilityLabel={label}>
      <Text style={[styles.letter, day.isToday && styles.letterToday]}>{WEEKDAY_LETTER[day.weekday]}</Text>
      <View style={[styles.socket, day.played && styles.socketLit, day.isToday && !day.played && styles.socketToday]}>
        {day.played ? <GameIcon name="flame" size={24} /> : day.isToday ? <Text style={styles.todayMark}>?</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, minHeight: 150 },
  rays: { position: 'absolute', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  count: { alignItems: 'center', gap: 0 },
  dim: { opacity: 0.55 },
  week: { gap: space.xs, paddingVertical: space.sm },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { alignItems: 'center', gap: 4, minWidth: 34 },
  letter: { fontFamily: font.heavy, fontSize: 12, color: palette.inkSoft },
  letterToday: { fontFamily: font.black, color: palette.tealInk },
  socket: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.creamShade,
    borderWidth: 2,
    borderColor: palette.creamEdge,
  },
  socketLit: { backgroundColor: '#FFE7A3', borderColor: palette.goldDeep },
  socketToday: { backgroundColor: palette.white, borderColor: palette.teal, borderStyle: 'dashed' },
  todayMark: { fontFamily: font.black, fontSize: 16, color: palette.tealInk },
  center: { textAlign: 'center' },
  goal: { paddingVertical: space.sm },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  track: { height: 10, borderRadius: 5, backgroundColor: palette.creamShade, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: palette.goldDeep },
  small: { fontSize: 13, lineHeight: 17 },
  prize: { alignItems: 'center', gap: 2 },
  prizeText: { fontFamily: font.black, fontSize: 16, color: palette.ink },
  actions: { flexDirection: 'row', gap: space.sm, justifyContent: 'center' },
  action: { flex: 1 },
});
