import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, formatValue, palette, radius, space, theme } from '../theme';
import { CountUpText } from './CountUpText';
import { PressableScale } from './PressableScale';

export type CoinIconProps = {
  size?: number;
};

/** Gold coin drawn from views. "K" is Fredoka; the coin is not a logo. */
export function CoinIcon({ size = 28 }: CoinIconProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.coin,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(2, Math.round(size * 0.08)),
        },
      ]}
    >
      <Text style={[styles.mark, { fontSize: size * 0.52, lineHeight: size * 0.62 }]}>K</Text>
    </View>
  );
}

export type CoinPillProps = {
  count: number;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Krush coin plus a count that ticks up from zero. */
export function CoinPill({ count, onPress, accessibilityLabel }: CoinPillProps) {
  const label = accessibilityLabel ?? `${formatValue(count)} coins`;
  const body: ReactNode = (
    <>
      <CoinIcon />
      <CountUpText value={count} style={styles.count} accessibilityLabel={label} />
    </>
  );
  if (!onPress) {
    return (
      <View accessibilityLabel={label} style={styles.pill}>
        {body}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      translateOnPress={false}
      style={styles.pill}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  coin: {
    backgroundColor: palette.star,
    borderColor: palette.starEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { color: palette.brown, fontFamily: font.bold, fontWeight: '700' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: palette.paper,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: space.sm,
    minHeight: 36,
  },
  count: {
    color: palette.brown,
    fontFamily: font.bold,
    fontWeight: '700',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
});
