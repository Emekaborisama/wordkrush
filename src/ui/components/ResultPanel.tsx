import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { gameAccentTokens, space, theme, type } from '../theme';
import { Button } from './Button';
import { Stat } from './Stat';
import { Surface } from './Surface';

type Action = {
  label: string;
  onPress: () => void;
};

type Props = {
  eyebrow: string;
  title: string;
  value?: string | number;
  valueLabel?: string;
  body?: string;
  accent?: string;
  art?: ReactNode;
  children?: ReactNode;
  primary: Action;
  secondary?: Action;
  tertiary?: Action;
};

export function ResultPanel({
  eyebrow,
  title,
  value,
  valueLabel,
  body,
  accent = theme.accent,
  art,
  children,
  primary,
  secondary,
  tertiary,
}: Props) {
  const tokens = gameAccentTokens(accent);
  return (
    <Surface
      level={3}
      raised
      borderColor={tokens.border}
      style={styles.panel}
    >
      {art ? <View style={styles.art}>{art}</View> : null}
      <Text style={[type.overline, styles.eyebrow, { color: accent }]}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {value !== undefined && valueLabel ? (
        <View style={styles.stat}>
          <Stat value={value} label={valueLabel} size="lg" color={accent} />
        </View>
      ) : null}
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {children}
      <View style={styles.actions}>
        <Button title={primary.label} onPress={primary.onPress} color={accent} size="lg" />
        {secondary ? (
          <Button title={secondary.label} onPress={secondary.onPress} variant="tonal" color={accent} />
        ) : null}
        {tertiary ? (
          <Button title={tertiary.label} onPress={tertiary.onPress} variant="ghost" size="sm" />
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', padding: space.xl },
  art: { marginBottom: space.md },
  eyebrow: { textAlign: 'center' },
  title: { ...type.display, color: theme.text, textAlign: 'center', marginTop: space.xs },
  stat: { marginTop: space.lg },
  body: {
    ...type.body,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: space.md,
    maxWidth: 320,
  },
  actions: { alignSelf: 'stretch', gap: space.sm, marginTop: space.xl },
});
