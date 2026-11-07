import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette, radius as radii, space } from '../theme';

/**
 * The kit's cream inset box (Music / SFX, Goal, level rows). It reads as
 * pressed into the coral panel: a darker rim, a shaded band along the top
 * inside edge, and a lit bottom edge.
 */
export function CreamBox({
  children,
  padded = true,
  radius = radii.md,
  tint,
  style,
}: {
  children?: ReactNode;
  padded?: boolean;
  radius?: number;
  /** Override the fill, e.g. a pale gold row for the current level. */
  tint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.box,
        { borderRadius: radius, backgroundColor: tint ?? palette.creamFill },
        padded && styles.padded,
        style,
      ]}
    >
      <View pointerEvents="none" style={[styles.inset, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderColor: palette.creamEdge,
    borderBottomColor: palette.white,
    overflow: 'hidden',
  },
  padded: { paddingHorizontal: space.md, paddingVertical: space.sm + 2 },
  inset: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: palette.creamShade,
  },
});
