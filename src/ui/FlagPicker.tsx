import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COUNTRY_CODES, countryName } from '../duel/country';
import { Button, CountryFlag, PanelText, PopupModal, PressableScale, TextField } from './components';
import { font, palette, space, tone } from './theme';

/**
 * Pick the flag beside your name, or hide it. The guess from the connection
 * can be wrong (a VPN, a holiday), so it is always the player's to change.
 */
export function FlagPicker({
  visible,
  current,
  hidden,
  onPick,
  onHide,
  onClose,
}: {
  visible: boolean;
  current: string | null;
  hidden: boolean;
  onPick: (code: string) => void;
  onHide: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const countries = useMemo(
    () =>
      visible
        ? COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [visible],
  );
  const needle = query.trim().toLowerCase();
  const shown = needle ? countries.filter((country) => country.name.toLowerCase().includes(needle)) : countries;

  return (
    <PopupModal visible={visible} onClose={onClose} title="Your flag" width={360}>
      <PanelText>Shows beside your name in 1v1 matches.</PanelText>
      <TextField label="Search" value={query} onChangeText={setQuery} placeholder="Find your country" autoCorrect={false} />
      {hidden ? null : <Button title="Hide my flag" tone="sky" size="sm" onPress={onHide} />}
      <View style={styles.list}>
        {shown.map((country) => {
          const selected = !hidden && country.code === current;
          return (
            <PressableScale
              key={country.code}
              onPress={() => onPick(country.code)}
              accessibilityRole="button"
              accessibilityLabel={country.name}
              accessibilityState={{ selected }}
              style={[styles.row, selected && styles.selected]}
            >
              <CountryFlag code={country.code} size={22} />
              <Text style={styles.name} numberOfLines={1}>
                {country.name}
              </Text>
              {selected ? <Text style={styles.tick}>✓</Text> : null}
            </PressableScale>
          );
        })}
        {shown.length === 0 ? <PanelText>No country matches that.</PanelText> : null}
      </View>
    </PopupModal>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: space.sm,
    borderRadius: 12,
    backgroundColor: palette.creamFill,
  },
  selected: { borderWidth: 2, borderColor: tone.green.outline },
  name: { flex: 1, fontFamily: font.heavy, fontSize: 15, color: palette.ink },
  tick: { fontFamily: font.black, fontSize: 18, color: tone.green.outline },
});
