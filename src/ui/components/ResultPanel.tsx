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

/**
 * Sharing the result, which needs somewhere to confirm itself.
 *
 * A share sheet reports its own outcome, but a clipboard write is silent — with
 * no note the button looks broken. `note` is that line; the screen clears it
 * after a moment.
 */
type ShareAction = Action & {
  note?: string | null;
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
  share?: ShareAction;
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
  share,
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
        {/* Above the primary because this is the moment the result is worth
            showing off, but tonal rather than filled so it never outweighs the
            action that keeps the player playing. */}
        {share ? (
          <>
            <Button
              title={share.label}
              onPress={share.onPress}
              variant="tonal"
              color={accent}
              accessibilityHint="Copies a spoiler-free result you can paste anywhere"
            />
            {share.note ? (
              <Text style={styles.shareNote} accessibilityLiveRegion="polite">
                {share.note}
              </Text>
            ) : null}
          </>
        ) : null}
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
  shareNote: { ...type.caption, color: theme.textMuted, textAlign: 'center' },
});
