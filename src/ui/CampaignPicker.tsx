import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { pickerStatus, type PickerStatus } from '../games/campaign';
import type { PathRow } from '../live/catalog';
import { Badge, Surface } from './components';
import { radius, space, theme, type } from './theme';

type Props = {
  rows: PathRow[];
  personalUnlocked: number;
  teamUnlocked: number;
  selected: number | null;
  accent: string;
  onSelect: (levelNumber: number) => void;
};

function statusLabel(status: PickerStatus, row: PathRow): string | null {
  if (row.dailySpoiler) return "TODAY'S DAILY";
  if (!row.released) return 'UNRELEASED';
  if (status === 'locked') return null;
  if (status === 'team_ahead') return 'TEAM AHEAD';
  if (status === 'current') return 'CURRENT';
  return null;
}

export function CampaignPicker({
  rows,
  personalUnlocked,
  teamUnlocked,
  selected,
  accent,
  onSelect,
}: Props) {
  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {rows.map((row) => {
        const status = pickerStatus(row.number, personalUnlocked, teamUnlocked);
        const locked = status === 'locked' || !row.released || row.dailySpoiler;
        const active = selected === row.number;
        const label = statusLabel(status, row);
        return (
          <Surface
            key={row.number}
            level={active ? 3 : 2}
            radius={radius.md}
            disabled={locked}
            onPress={() => onSelect(row.number)}
            borderColor={active ? accent : undefined}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={
              locked
                ? `Level ${row.number}, ${row.name}, locked. ${row.description}`
                : `Race level ${row.number}, ${row.name}. ${row.description}`
            }
          >
            <View
              style={[styles.number, active && { backgroundColor: accent, borderColor: accent }]}
            >
              {locked ? (
                <LockMark />
              ) : (
                <Text style={[styles.numberText, active && { color: theme.bg }]}>{row.number}</Text>
              )}
            </View>
            <View style={styles.body}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, locked && styles.dim]}>{row.name}</Text>
                {label ? <Badge label={label} color={active ? accent : theme.textMuted} /> : null}
              </View>
              <Text style={styles.description} numberOfLines={2}>
                {row.description}
              </Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.metaValue}>{row.meta}</Text>
            </View>
          </Surface>
        );
      })}
    </ScrollView>
  );
}

function LockMark() {
  return (
    <View style={styles.lock}>
      <View style={styles.lockShackle} />
      <View style={styles.lockBody} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm, paddingBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  number: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { ...type.subtitle, color: theme.text, fontSize: 16 },
  body: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  name: { ...type.subtitle, color: theme.text, fontSize: 15 },
  dim: { color: theme.textDim },
  description: { ...type.caption, color: theme.textMuted, marginTop: 2 },
  meta: { alignItems: 'flex-end' },
  metaValue: { ...type.overline, color: theme.textDim, fontSize: 10 },
  lock: { width: 14, height: 16, alignItems: 'center' },
  lockShackle: {
    width: 8,
    height: 6,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: theme.textDim,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  lockBody: {
    width: 12,
    height: 8,
    marginTop: -1,
    backgroundColor: theme.textDim,
    borderRadius: 2,
  },
});
