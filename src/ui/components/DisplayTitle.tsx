import { StyleSheet, Text, View } from 'react-native';
import { EXTRUDE_SHADE, EXTRUSION_OFFSET, OUTLINE_OFFSETS } from '../motion';
import { palette, reward, shade, type } from '../theme';

export type DisplayTitleProps = {
  children: string;
  /** Fill. Defaults to star gold. */
  color?: string;
  accessibilityLabel?: string;
  align?: 'center' | 'left';
};

/**
 * Extruded display type without SVG: offset copies for the brown outline, one
 * darker extrusion, gold fill on top, two view-drawn glints. The copies are
 * hidden from assistive tech; the container carries the label. Not for the logo.
 */
export function DisplayTitle({
  children,
  color = reward.gold,
  accessibilityLabel,
  align = 'center',
}: DisplayTitleProps) {
  const text = [styles.text, align === 'left' && styles.left];
  const extrusion = shade(reward.outline, EXTRUDE_SHADE);
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel={accessibilityLabel ?? children}
      style={[styles.wrap, align === 'left' && styles.left]}
    >
      {OUTLINE_OFFSETS.map(([x, y]) => (
        <Text
          key={`${x},${y}`}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[text, styles.copy, { color: reward.outline, transform: [{ translateX: x }, { translateY: y }] }]}
        >
          {children}
        </Text>
      ))}
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[
          text,
          styles.copy,
          {
            color: extrusion,
            transform: [{ translateX: EXTRUSION_OFFSET.x }, { translateY: EXTRUSION_OFFSET.y }],
          },
        ]}
      >
        {children}
      </Text>
      <Text accessibilityElementsHidden importantForAccessibility="no" style={[text, { color }]}>
        {children}
      </Text>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no" style={styles.glintA} />
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no" style={styles.glintB} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 8 },
  left: { alignItems: 'flex-start' },
  text: { ...type.displayXL, textAlign: 'center' },
  copy: { position: 'absolute', left: 0, right: 0 },
  glintA: {
    position: 'absolute',
    top: 2,
    right: '18%',
    width: 7,
    height: 7,
    backgroundColor: palette.white,
    transform: [{ rotate: '45deg' }],
    opacity: 0.95,
  },
  glintB: {
    position: 'absolute',
    top: '42%',
    left: '12%',
    width: 4,
    height: 4,
    backgroundColor: palette.paper,
    transform: [{ rotate: '45deg' }],
    opacity: 0.85,
  },
});
