import { StyleSheet, Text, View } from 'react-native';
import {
  CLUELESS_DIFFICULTIES,
  type CluelessDifficulty,
} from '../games/clueless/types';
import { Surface } from './components';
import { font, radius, space, theme, type, withAlpha } from './theme';

const COPY: Record<CluelessDifficulty, { label: string; detail: string }> = {
  easy: { label: 'Easy', detail: 'Hint from start' },
  standard: { label: 'Standard', detail: 'Hint after 15' },
  expert: { label: 'Expert', detail: 'No hint' },
};

type Props = {
  value: CluelessDifficulty;
  locked: boolean;
  disabled?: boolean;
  accent: string;
  onChange: (difficulty: CluelessDifficulty) => void;
};

export function CluelessDifficultyPicker({
  value,
  locked,
  disabled = false,
  accent,
  onChange,
}: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.heading}>
        <Text style={styles.label}>DIFFICULTY</Text>
        <Text style={styles.lock}>{locked ? 'Locked for today' : 'Locks after first valid guess'}</Text>
      </View>
      <View style={styles.options} accessibilityRole="radiogroup">
        {CLUELESS_DIFFICULTIES.map((difficulty) => {
          const selected = difficulty === value;
          const unavailable = disabled || (locked && !selected);
          return (
            <Surface
              key={difficulty}
              level={selected ? 3 : 1}
              radius={radius.sm}
              padded={false}
              disabled={unavailable}
              onPress={() => onChange(difficulty)}
              borderColor={selected ? accent : undefined}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: unavailable }}
              aria-checked={selected}
              accessibilityLabel={`${COPY[difficulty].label}. ${COPY[difficulty].detail}${
                selected ? '. Selected' : ''
              }`}
              style={[
                styles.option,
                selected && { backgroundColor: withAlpha(accent, 0.15) },
              ]}
            >
              <Text style={[styles.optionLabel, selected && { color: accent }]}>
                {COPY[difficulty].label}
              </Text>
              <Text style={styles.optionDetail}>{COPY[difficulty].detail}</Text>
            </Surface>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...type.overline, color: theme.textDim },
  lock: { ...type.caption, color: theme.textDim, fontSize: 10.5 },
  options: { flexDirection: 'row', gap: space.xs },
  option: {
    flex: 1,
    minHeight: 62,
    paddingHorizontal: space.xs,
    paddingVertical: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    color: theme.text,
    fontFamily: font.semibold,
    fontSize: 13,
    fontWeight: '600',
  },
  optionDetail: {
    color: theme.textDim,
    fontFamily: font.medium,
    fontSize: 9.5,
    marginTop: 2,
    textAlign: 'center',
  },
});
