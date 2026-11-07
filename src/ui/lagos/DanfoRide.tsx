import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { feedback } from '../../native/feedback';
import { StrokeText } from '../components';
import { font, palette, space } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { DanfoBus } from './DanfoBus';
import { danfo } from './danfoTheme';
import { RoadSign } from './RoadSign';

export type DanfoRideStop = {
  /** New per ride, so a second ride replays from the start. */
  key: number;
  /** "STOP 2" or "LEVEL 2". */
  eyebrow: string;
  /** The stop or level name. */
  title: string;
  /** The label played there. */
  subtitle?: string;
  lagos: boolean;
};

const BUS_W = 220;

/** Milliseconds for each beat of the ride. */
const RIDE = {
  coverMs: 180,
  arriveMs: 520,
  holdMs: 650,
  leaveMs: 420,
  uncoverMs: 340,
  stillMs: 800,
} as const;

/**
 * The danfo that carries the player to their next level. The screen goes
 * danfo-yellow (sky blue off the Lagos route), the bus pulls in under the
 * stop's sign while the conductor calls it, then drives off and the new level
 * shows. The level swaps in under the cover (`onCovered`), so nothing jumps.
 * Reduce-motion parks the bus and only fades.
 */
export function DanfoRide({
  ride,
  onCovered,
  onDone,
}: {
  ride: DanfoRideStop | null;
  onCovered: () => void;
  onDone: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const cover = useRef(new Animated.Value(0)).current;
  const bus = useRef(new Animated.Value(0)).current;
  const sign = useRef(new Animated.Value(0)).current;
  const covered = useLatest(onCovered);
  const done = useLatest(onDone);
  const key = ride?.key;
  // The ride key whose level has been boarded, so a replayed effect (the
  // reduce-motion setting changing mid-ride) cannot board it twice.
  const boarded = useRef<number | null>(null);

  useEffect(() => {
    if (key === undefined) return;
    cover.setValue(0);
    bus.setValue(0);
    sign.setValue(0);
    let stopped = false;
    const reveal = reduceMotion
      ? Animated.sequence([
          Animated.delay(RIDE.stillMs),
          Animated.timing(cover, { toValue: 0, duration: RIDE.uncoverMs, easing: Easing.linear, useNativeDriver: true }),
        ])
      : Animated.sequence([
          Animated.parallel([
            Animated.timing(bus, { toValue: 1, duration: RIDE.arriveMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(RIDE.arriveMs / 2),
              Animated.timing(sign, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
            ]),
          ]),
          Animated.delay(RIDE.holdMs),
          Animated.parallel([
            Animated.timing(bus, { toValue: 2, duration: RIDE.leaveMs, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            // The words go with the bus, so only plain yellow fades off the level.
            Animated.timing(sign, { toValue: 0, duration: RIDE.leaveMs / 2, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(RIDE.leaveMs / 2),
              Animated.timing(cover, { toValue: 0, duration: RIDE.uncoverMs, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            ]),
          ]),
        ]);
    Animated.timing(cover, { toValue: 1, duration: RIDE.coverMs, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      if (stopped) return;
      if (boarded.current !== key) {
        boarded.current = key;
        covered.current();
        feedback('levelUp');
      }
      if (reduceMotion) sign.setValue(1);
      reveal.start(({ finished }) => {
        if (finished && !stopped) done.current();
      });
    });
    return () => {
      stopped = true;
      cover.stopAnimation();
      bus.stopAnimation();
      sign.stopAnimation();
    };
  }, [key, reduceMotion, cover, bus, sign, covered, done]);

  if (!ride) return null;

  const offscreen = width / 2 + BUS_W;
  const translateX = reduceMotion
    ? 0
    : bus.interpolate({ inputRange: [0, 1, 2], outputRange: [-offscreen, 0, offscreen] });
  const shout = ride.lagos ? `${ride.title}! ${ride.title}! Oya, enter!` : 'Next level. Hold on tight!';
  return (
    <Animated.View
      style={[styles.root, ride.lagos ? styles.lagos : styles.world, { opacity: cover }]}
      accessibilityLiveRegion="polite"
      accessibilityViewIsModal
      accessibilityLabel={`${ride.lagos ? 'Next stop' : 'Next level'}: ${ride.title}`}
    >
      {ride.lagos ? <Stripes /> : null}
      <View style={styles.middle}>
        <Animated.Text style={[styles.kicker, ride.lagos && styles.kickerLagos, { opacity: sign }]}>
          {ride.lagos ? 'NEXT STOP' : 'NEXT LEVEL'}
        </Animated.Text>
        <Animated.View style={{ opacity: sign, transform: [{ scale: sign.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
          {ride.lagos ? (
            <RoadSign eyebrow={ride.eyebrow} title={ride.title} subtitle={ride.subtitle} size="lg" highlight style={styles.sign} />
          ) : (
            <View style={styles.worldSign}>
              <StrokeText size={22} stroke={palette.navyDeep} strokeWidth={2} depth={1.5}>
                {ride.eyebrow}
              </StrokeText>
              <StrokeText size={36} stroke={palette.navyDeep} strokeWidth={2.5} depth={2.5} numberOfLines={1}>
                {ride.title}
              </StrokeText>
            </View>
          )}
        </Animated.View>
        <View style={styles.roadWrap}>
          <Animated.View style={[styles.bus, { transform: [{ translateX }] }]}>
            <DanfoBus width={BUS_W} destination={ride.title} driving={!reduceMotion} />
          </Animated.View>
          <View style={styles.road}>
            <View style={styles.lane}>
              {Array.from({ length: 9 }, (_, i) => (
                <View key={i} style={styles.dash} />
              ))}
            </View>
          </View>
        </View>
        <Animated.Text style={[styles.shout, ride.lagos && styles.shoutLagos, { opacity: sign }]} numberOfLines={2}>
          {shout}
        </Animated.Text>
      </View>
      {ride.lagos ? <Stripes /> : null}
    </Animated.View>
  );
}

/** Keeps the latest callback without restarting the ride when it changes identity. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

function Stripes() {
  return (
    <View style={styles.stripes} pointerEvents="none">
      <View style={styles.stripe} />
      <View style={[styles.stripe, styles.stripeThin]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Above every screen and pop-up; it also eats taps while it runs.
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, justifyContent: 'space-between' },
  lagos: { backgroundColor: danfo.yellow },
  world: { backgroundColor: palette.skyMid },
  stripes: { gap: 6, paddingVertical: space.xl },
  stripe: { height: 14, backgroundColor: danfo.black },
  stripeThin: { height: 5 },
  middle: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.md, paddingHorizontal: space.md },
  kicker: { fontFamily: font.black, fontSize: 16, letterSpacing: 2, color: palette.white },
  kickerLagos: { color: danfo.black },
  sign: { minWidth: 220 },
  worldSign: { alignItems: 'center' },
  roadWrap: { alignSelf: 'stretch', height: 150, justifyContent: 'flex-end' },
  bus: { position: 'absolute', alignSelf: 'center', bottom: 18 },
  road: {
    height: 30,
    marginHorizontal: -space.md,
    backgroundColor: danfo.road,
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderColor: danfo.roadEdge,
    justifyContent: 'center',
  },
  lane: { flexDirection: 'row', justifyContent: 'space-around' },
  dash: { width: 22, height: 4, borderRadius: 2, backgroundColor: danfo.lane },
  shout: { fontFamily: font.black, fontSize: 20, lineHeight: 26, color: palette.white, textAlign: 'center' },
  shoutLagos: { color: danfo.black },
});
