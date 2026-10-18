import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { space, tone } from '../theme';
import { GlossFace } from './GlossFace';
import { PressableScale } from './PressableScale';
import { StrokeText } from './StrokeText';

export type TabOption<T extends string> = { id: T; label: string };

/**
 * A row of small glossy tabs: the selected one is gold, the rest sky — the
 * kit's way of showing a choice without a second visual language.
 */
export function TabSwitch<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: readonly TabOption<T>[];
  value: T | undefined;
  onChange: (id: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.id === value;
        const face = active ? tone.gold : tone.sky;
        return (
          <PressableScale
            key={option.id}
            onPress={() => onChange(option.id)}
            translateOnPress={false}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            style={styles.item}
          >
            {({ pressed }) => (
              <GlossFace tone={face} pressed={pressed || active} lip={4} radius={12} outline={1.5} raised={!active} faceStyle={styles.face}>
                <StrokeText size={14} stroke={face.outline} strokeWidth={1.5} depth={1} numberOfLines={1}>
                  {option.label}
                </StrokeText>
              </GlossFace>
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  item: { flex: 1 },
  face: { minHeight: 38, paddingHorizontal: 8 },
});
