import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { font, interaction, palette } from '../theme';
import { CountUpText } from './CountUpText';
import { PressableScale } from './PressableScale';

export type ResourcePillProps = {
  /** Art icon (coin, flame, star) that overlaps the pill's left end. */
  icon: ReactNode;
  value: number | string;
  /** Small word after the number ("DAYS", "FULL"). */
  suffix?: string;
  /** Ticks numbers up from the previous value. */
  countUp?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

const ICON = 34;

/**
 * Top-bar counter from the kit ("3 FULL", "100"): a cream pill with a sunken
 * top edge, the art icon riding over its left end and the number in navy.
 */
export function ResourcePill({
  icon,
  value,
  suffix,
  countUp = true,
  onPress,
  accessibilityLabel,
  style,
}: ResourcePillProps) {
  const body = (
    <View style={styles.row}>
      <View style={styles.pill}>
        <View pointerEvents="none" style={styles.inset} />
        {typeof value === 'number' && countUp ? (
          <CountUpText value={value} style={styles.value} accessibilityLabel={accessibilityLabel} />
        ) : (
          <Text style={styles.value}>{value}</Text>
        )}
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      <View style={styles.icon} pointerEvents="none">
        {icon}
      </View>
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel} style={[styles.hit, style]}>
        {body}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.hit, style]}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hit: { minHeight: interaction.minTouch, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  pill: {
    marginLeft: ICON / 2,
    paddingLeft: ICON / 2 + 5,
    paddingRight: 12,
    height: 32,
    minWidth: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.creamFill,
    borderWidth: 2,
    borderColor: palette.creamEdge,
    borderBottomColor: palette.white,
    overflow: 'hidden',
  },
  inset: { position: 'absolute', top: 0, left: 0, right: 0, height: 5, backgroundColor: palette.creamShade },
  icon: {
    position: 'absolute',
    left: 0,
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontFamily: font.black, fontSize: 17, lineHeight: 21, color: palette.ink, fontVariant: ['tabular-nums'] },
  suffix: { fontFamily: font.heavy, fontSize: 11, lineHeight: 14, letterSpacing: 0.6, color: palette.inkSoft },
});
