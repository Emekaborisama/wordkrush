import { StyleSheet, Text, View } from 'react-native';
import { levelStars, starThresholds, type LabelLevel } from '../games/more-or-less/labelPath';
import { BlockDigits, Button, GameIcon, PressableScale, StarRow } from './components';
import { DanfoBus } from './lagos/DanfoBus';
import { danfo } from './lagos/danfoTheme';
import { font, palette, space, tone } from './theme';

/**
 * The goal block on More or Less' start pop-up: the chosen level's label,
 * the streak that clears it, what the stars need, and the way to the other
 * levels and to the player's city (I Sabi Lagos).
 */
export function LabelLevelCard({
  level,
  levelCount,
  best,
  extra,
  onLevels,
  onCity,
}: {
  level: LabelLevel;
  levelCount: number;
  best: number;
  /** One more line under the goal, e.g. Popularity's set progress. */
  extra?: string;
  onLevels: () => void;
  onCity: () => void;
}) {
  const [, two, three] = starThresholds(level.targetStreak);
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <BlockDigits value={level.number} cell={8} color="red" />
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>{`LEVEL ${level.number} OF ${levelCount}`}</Text>
          <Text style={styles.name}>{level.name}</Text>
          <Text style={styles.description}>{level.description}</Text>
        </View>
      </View>
      <View style={styles.goal} accessible accessibilityLabel={`Streak of ${level.targetStreak} clears it. ${two} for two stars, ${three} for three.`}>
        <StarRow earned={levelStars(level.targetStreak, best)} animate={false} size={20} surface="cream" />
        <Text style={styles.goalText}>
          {`Streak of ${level.targetStreak} clears it · ${two} for ★★ · ${three} for ★★★`}
        </Text>
        {best > 0 ? <Text style={styles.best}>{`Your best here: ${best}`}</Text> : null}
        {extra ? <Text style={styles.extra}>{extra}</Text> : null}
      </View>
      <Button
        title="All levels"
        tone="sky"
        size="sm"
        leading={<GameIcon name="flag" size={20} color={tone.sky.outline} />}
        onPress={onLevels}
      />
      <PressableScale onPress={onCity} accessibilityRole="button" accessibilityLabel="New: I Sabi Lagos, the Lagos edition. Play it" style={styles.city}>
        <DanfoBus width={70} destination="LAGOS" />
        <View style={styles.flex}>
          <Text style={styles.cityEyebrow}>NEW · LAGOS EDITION</Text>
          <Text style={styles.cityName}>I Sabi Lagos</Text>
          <Text style={styles.cityMeta}>How much you sabi Lagos?</Text>
        </View>
        <GameIcon name="play" size={22} color={danfo.black} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: font.heavy, fontSize: 11, letterSpacing: 1, color: palette.inkSoft },
  name: { fontFamily: font.black, fontSize: 20, lineHeight: 24, color: palette.ink },
  description: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: palette.inkSoft },
  goal: { alignItems: 'center', gap: 2 },
  goalText: { fontFamily: font.heavy, fontSize: 12, lineHeight: 16, color: palette.ink, textAlign: 'center' },
  best: { fontFamily: font.black, fontSize: 13, color: palette.tealInk },
  extra: { fontFamily: font.body, fontSize: 12, lineHeight: 16, color: palette.inkSoft, textAlign: 'center' },
  city: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: 14,
    backgroundColor: danfo.yellow,
    borderWidth: 2,
    borderColor: danfo.black,
    minHeight: 56,
  },
  cityEyebrow: { fontFamily: font.heavy, fontSize: 10, letterSpacing: 1, color: danfo.black },
  cityName: { fontFamily: font.black, fontSize: 17, lineHeight: 21, color: danfo.black },
  cityMeta: { fontFamily: font.body, fontSize: 12, lineHeight: 15, color: danfo.black },
});
