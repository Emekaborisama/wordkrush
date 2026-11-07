import { StyleSheet, Text, View } from 'react-native';
import {
  bestStreakFor,
  isLevelUnlocked,
  levelStars,
  type LabelLevel,
  type LabelPathProgress,
} from '../games/more-or-less/labelPath';
import { BlockDigits, CreamBox, GameIcon, PopupModal, PressableScale, StarRow } from './components';
import { RoadSign } from './lagos/RoadSign';
import { font, palette, space, tone } from './theme';

/**
 * The kit's Levels list for a More or Less label path. Each row is a label
 * with its number in cubes (or, on the Lagos route, a green stop sign), the
 * target, the best streak and the stars it earned. Locked rows are dimmed.
 */
export function LabelLevelsPopup({
  visible,
  onClose,
  title,
  levels,
  progress,
  selected,
  onSelect,
  lagos = false,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  levels: readonly LabelLevel[];
  progress: LabelPathProgress;
  selected: number;
  onSelect: (levelNumber: number) => void;
  lagos?: boolean;
}) {
  return (
    <PopupModal visible={visible} onClose={onClose} title={title} closeLabel="Close levels">
      {levels.map((level) => {
        const unlocked = isLevelUnlocked(progress, level.number);
        const best = bestStreakFor(progress, level.number);
        const stars = levelStars(level.targetStreak, best);
        const active = level.number === selected;
        const label = unlocked
          ? `Level ${level.number}, ${level.name}, streak of ${level.targetStreak} to clear, best ${best}`
          : `Level ${level.number}, ${level.name}, locked`;
        return (
          <PressableScale
            key={level.number}
            disabled={!unlocked}
            onPress={() => onSelect(level.number)}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: !unlocked, selected: active }}
          >
            <CreamBox
              tint={active ? '#FFF3B8' : undefined}
              style={[styles.row, active && styles.rowActive, !unlocked && styles.locked]}
            >
              <View style={styles.inner}>
                {lagos && level.stop ? (
                  <RoadSign eyebrow={`STOP ${level.number}`} title={level.stop} size="sm" highlight={active} style={styles.sign} />
                ) : (
                  <View style={styles.number}>
                    <BlockDigits value={level.number} cell={9} color={active ? 'orange' : 'red'} />
                  </View>
                )}
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={1}>
                    {level.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {unlocked
                      ? best > 0
                        ? `Best ${best} · clear at ${level.targetStreak}`
                        : `Streak of ${level.targetStreak} to clear`
                      : 'Clear the level before it'}
                  </Text>
                  {unlocked && best > 0 ? (
                    <View style={styles.stars}>
                      <StarRow earned={stars} animate={false} size={16} surface="cream" />
                    </View>
                  ) : null}
                </View>
                {!unlocked ? (
                  <GameIcon name="lock" size={26} color={palette.inkSoft} />
                ) : active ? (
                  <GameIcon name="play" size={24} color={tone.green.outline} />
                ) : null}
              </View>
            </CreamBox>
          </PressableScale>
        );
      })}
    </PopupModal>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: space.xs + 2, paddingHorizontal: space.sm },
  rowActive: { borderColor: palette.goldDeep },
  locked: { opacity: 0.55 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  number: { width: 52, alignItems: 'center' },
  sign: { width: 108 },
  flex: { flex: 1, minWidth: 0 },
  name: { fontFamily: font.black, fontSize: 16, lineHeight: 20, color: palette.ink },
  meta: { fontFamily: font.body, fontSize: 12, lineHeight: 16, color: palette.inkSoft },
  stars: { alignItems: 'flex-start', marginTop: 2 },
});
