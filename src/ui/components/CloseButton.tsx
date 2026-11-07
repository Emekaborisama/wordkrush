import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette, shadow, tone } from '../theme';
import { Gradient } from './Gradient';
import { PressableScale } from './PressableScale';

/**
 * The kit's popup close: a red glossy disc in a white ring with a white X,
 * pinned over the panel's top-right corner. Drawn from views so the X never
 * depends on a font having the glyph.
 */
export function CloseButton({
  onPress,
  accessibilityLabel = 'Close',
  size = 40,
  style,
}: {
  onPress: () => void;
  accessibilityLabel?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const bar = Math.round(size * 0.46);
  const thick = Math.max(4, Math.round(size * 0.13));
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={Math.max(0, (44 - size) / 2) + 4}
      style={[
        styles.disc,
        { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(3, Math.round(size * 0.08)) },
        style,
      ]}
    >
      <View style={[styles.clip, { borderRadius: size / 2 }]}>
        <Gradient colors={[tone.red.top, tone.red.bottom, tone.red.lip]} locations={[0, 0.6, 1]} />
        <View style={styles.glint} />
      </View>
      {[45, -45].map((deg) => (
        <View
          key={deg}
          pointerEvents="none"
          style={[
            styles.bar,
            {
              width: bar,
              height: thick,
              borderRadius: thick / 2,
              transform: [{ rotate: `${deg}deg` }],
            },
          ]}
        />
      ))}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: palette.white,
    backgroundColor: tone.red.bottom,
    ...shadow.card,
  },
  clip: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  glint: {
    position: 'absolute',
    top: '14%',
    left: '20%',
    width: '28%',
    height: '18%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
    transform: [{ rotate: '-30deg' }],
  },
  bar: {
    position: 'absolute',
    backgroundColor: palette.white,
  },
});
