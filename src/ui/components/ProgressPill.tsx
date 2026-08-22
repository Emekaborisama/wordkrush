import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, gameAccentTokens, radius, space, theme, type } from '../theme';

type Props = {
  label: string;
  value: string | number;
  color?: string;
  icon?: ReactNode;
  urgent?: boolean;
};

export function ProgressPill({
  label,
  value,
  color = theme.text,
  icon,
  urgent = false,
}: Props) {
  const tint = urgent ? theme.danger : color;
  const tokens = gameAccentTokens(tint);
  return (
    <View
      style={[
        styles.root,
        {
          borderColor: urgent ? tokens.border : tokens.glow,
          backgroundColor: urgent ? tokens.dim : tokens.soft,
        },
      ]}
      accessibilityLabel={`${label}: ${value}`}
    >
      {icon}
      <View>
        <Text style={[styles.value, { color: tint }]}>{value}</Text>
        <Text style={[type.overline, styles.label]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  value: {
    fontFamily: font.bold,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 23,
    fontVariant: ['tabular-nums'],
  },
  label: { color: theme.textDim, fontSize: 8.5 },
});
