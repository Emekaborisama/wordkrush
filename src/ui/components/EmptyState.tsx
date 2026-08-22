import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { gameAccentTokens, radius, space, theme, type } from '../theme';
import { Button } from './Button';

type Props = {
  title: string;
  body: string;
  art?: ReactNode;
  accent?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  body,
  art,
  accent = theme.accent,
  actionLabel,
  onAction,
}: Props) {
  const tokens = gameAccentTokens(accent);
  return (
    <View style={styles.root}>
      {art ? (
        <View
          style={[
            styles.art,
            {
              backgroundColor: tokens.soft,
              borderColor: tokens.glow,
            },
          ]}
        >
          {art}
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          color={accent}
          size="sm"
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  art: {
    width: 76,
    height: 76,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  title: { ...type.title, color: theme.text, textAlign: 'center' },
  body: {
    ...type.body,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: space.sm,
    maxWidth: 320,
  },
  action: { marginTop: space.lg },
});
