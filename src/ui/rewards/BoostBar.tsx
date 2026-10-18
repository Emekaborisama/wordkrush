import { StyleSheet, Text, View } from 'react-native';
import type { BoostKind } from '../../rewards/types';
import { RoundIconButton } from '../components/RoundIconButton';
import { font, palette, space } from '../theme';

export type BoostControl = {
  kind: BoostKind;
  label: string;
  glyph: string;
  price: number;
  disabled?: boolean;
  disabledReason?: string;
  onPress: () => void;
};

/** How many coins short a boost is, as the disabled explanation. */
export function coinShortfall(coins: number, price: number): string | undefined {
  const need = price - coins;
  if (need <= 0) return undefined;
  return `Need ${need} more coins`;
}

/** Round boost buttons. Hidden by the caller during a live race. */
export function BoostBar({ controls }: { controls: BoostControl[] }) {
  if (controls.length === 0) return null;
  return (
    <View style={styles.row}>
      {controls.map((control) => (
        <View key={control.kind} style={styles.item}>
          <RoundIconButton
            icon={<Text style={styles.glyph}>{control.glyph}</Text>}
            badge={control.price}
            accessibilityLabel={control.label}
            disabled={control.disabled}
            disabledReason={control.disabledReason}
            onPress={control.onPress}
            tone="purple"
            size={52}
          />
          <Text style={styles.caption} numberOfLines={2}>
            {control.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  item: { alignItems: 'center', width: 72, gap: 4 },
  glyph: { color: palette.white, fontSize: 16, fontWeight: '700' },
  caption: {
    color: palette.brown,
    fontFamily: font.semibold,
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 13,
    textAlign: 'center',
  },
});
