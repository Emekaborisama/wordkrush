import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  bestStreakFor,
  isLevelUnlocked,
  levelStars,
  type LabelLevel,
  type LabelPathProgress,
} from '../../games/more-or-less/labelPath';
import { Button, GameIcon, PressableScale, StarRow, StrokeText } from '../components';
import { danfo, lagosCopy } from '../lagos/danfoTheme';
import { LagosScene } from '../lagos/LagosScene';
import { LagosWordmark } from '../lagos/LagosWordmark';
import { RoadSign } from '../lagos/RoadSign';
import { font, palette, space, tone } from '../theme';

/** The road and skyline strip at the foot, and the button that sits on it. */
const SCENE_SPACE = 150;

/**
 * I Sabi Lagos: More or Less for people who know Lagos. The route is the
 * level list — each stop a green road sign with its label, best streak and
 * stars — over a Lagos skyline with a danfo driving the road below. "Oya,
 * enter!" boards at the chosen stop.
 */
export function LagosScreen({
  levels,
  progress,
  selected,
  onSelect,
  onPlay,
}: {
  levels: readonly LabelLevel[];
  progress: LabelPathProgress;
  selected: number;
  onSelect: (levelNumber: number) => void;
  onPlay: () => void;
}) {
  const current = levels[selected - 1] ?? levels[0];
  return (
    <View style={styles.root}>
      <LagosScene />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LagosWordmark size={52} />
        <StrokeText size={18} stroke={danfo.black} strokeWidth={2} depth={1.5}>
          {lagosCopy.question}
        </StrokeText>
        <View style={styles.stripes} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length: 10 }, (_, i) => (
            <View key={i} style={[styles.stripe, i % 2 === 1 && styles.stripeDark]} />
          ))}
        </View>
        <View style={styles.route} accessibilityRole="list">
          {levels.map((level) => (
            <Stop
              key={level.number}
              level={level}
              unlocked={isLevelUnlocked(progress, level.number)}
              best={bestStreakFor(progress, level.number)}
              active={level.number === selected}
              onPress={() => onSelect(level.number)}
            />
          ))}
        </View>
        <Text style={styles.source}>
          Measured by monthly Wikipedia pageviews — how often each one gets looked up.
        </Text>
      </ScrollView>
      <View style={styles.cta} pointerEvents="box-none">
        <Button
          title={lagosCopy.enter}
          tone="danfo"
          size="xl"
          leading={<GameIcon name="play" size={28} color={tone.danfo.outline} />}
          accessibilityLabel={current ? `Oya, enter. Play stop ${current.number}, ${current.stop ?? current.name}` : 'Oya, enter'}
          onPress={onPlay}
        />
      </View>
    </View>
  );
}

function Stop({
  level,
  unlocked,
  best,
  active,
  onPress,
}: {
  level: LabelLevel;
  unlocked: boolean;
  best: number;
  active: boolean;
  onPress: () => void;
}) {
  const stars = levelStars(level.targetStreak, best);
  return (
    <PressableScale
      disabled={!unlocked}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !unlocked }}
      accessibilityLabel={
        unlocked
          ? `Stop ${level.number}, ${level.stop}, ${level.name}. Streak of ${level.targetStreak} to clear. Best ${best}.`
          : `Stop ${level.number}, ${level.stop}, locked`
      }
      style={[styles.stop, !unlocked && styles.locked]}
    >
      <RoadSign
        eyebrow={`STOP ${level.number}`}
        title={level.stop ?? level.name}
        subtitle={level.name}
        highlight={active}
        style={styles.sign}
      />
      <View style={styles.stopSide}>
        {unlocked ? (
          <>
            <StarRow earned={stars} animate={false} size={18} surface="sky" />
            <Text style={styles.stopMeta}>{best > 0 ? `Best ${best}` : `Get ${level.targetStreak}`}</Text>
          </>
        ) : (
          <GameIcon name="lock" size={30} color={palette.ink} />
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // The route ends above the road, so the danfo and the skyline stay clear.
  scroll: { flex: 1, marginBottom: SCENE_SPACE },
  content: { alignItems: 'center', paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.lg, gap: space.sm },
  stripes: { flexDirection: 'row', width: '70%', height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: space.xs },
  stripe: { flex: 1, backgroundColor: danfo.yellow },
  stripeDark: { backgroundColor: danfo.black },
  route: { alignSelf: 'stretch', gap: space.sm },
  stop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  locked: { opacity: 0.6 },
  sign: { flex: 1 },
  stopSide: { width: 92, alignItems: 'center', gap: 2 },
  stopMeta: {
    fontFamily: font.black,
    fontSize: 12,
    color: palette.white,
    textShadowColor: palette.navyDeep,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  source: {
    fontFamily: font.heavy,
    fontSize: 12,
    lineHeight: 16,
    color: palette.white,
    textAlign: 'center',
    textShadowColor: palette.navyDeep,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: space.xs,
  },
  cta: { position: 'absolute', left: space.md, right: space.md, bottom: 72 },
});
