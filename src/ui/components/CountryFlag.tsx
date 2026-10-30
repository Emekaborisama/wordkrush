import { StyleSheet, Text } from 'react-native';
import { countryName, flagEmoji } from '../../duel/country';

/**
 * The flag beside a player's name. Nothing at all when they have none: a
 * hidden flag should not leave a gap or a placeholder saying so.
 */
export function CountryFlag({ code, size = 16 }: { code: string | null | undefined; size?: number }) {
  if (!code) return null;
  return (
    <Text style={[styles.flag, { fontSize: size, lineHeight: size * 1.25 }]} accessibilityLabel={countryName(code)}>
      {flagEmoji(code)}
    </Text>
  );
}

const styles = StyleSheet.create({
  // System font on purpose: the app's Exo 2 has no emoji.
  flag: { includeFontPadding: false },
});
