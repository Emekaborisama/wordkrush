import { StyleSheet, Text, View } from 'react-native';
import { contrastRatio, font, labelFloorPx, palette, shade } from '../theme';

export type RibbonProps = {
  /** "LEVEL 4 · BOXED IN" */
  label: string;
  /** Fill. Defaults to the yellow level ribbon. A game may pass its accent. */
  color?: string;
  /** Defaults to brown when that clears 4.5:1 on `color`, otherwise white. */
  labelColor?: string;
};

/**
 * Level ribbon: a yellow pill with a small folded tab at each end.
 * The label is Fredoka. Brown on yellow; white when a saturated accent needs it.
 */
export function Ribbon({ label, color = palette.ribbon, labelColor }: RibbonProps) {
  const text = labelColor ?? (contrastRatio(palette.brown, color) >= 4.5 ? palette.brown : palette.white);
  const fold = shade(color, 0.35);
  return (
    <View accessibilityRole="text" accessibilityLabel={label} style={styles.row}>
      <View style={[styles.fold, { borderTopColor: fold }]} />
      <View style={[styles.pill, { backgroundColor: color }]}>
        <Text style={[styles.label, { color: text }]}>{label}</Text>
      </View>
      <View style={[styles.fold, styles.foldRight, { borderTopColor: fold }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', alignSelf: 'center' },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 28,
    justifyContent: 'center',
  },
  label: {
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize: Math.max(labelFloorPx, 13),
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  fold: {
    width: 0,
    height: 0,
    marginTop: 22,
    borderLeftWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  foldRight: { borderLeftWidth: 0, borderRightWidth: 8 },
});
