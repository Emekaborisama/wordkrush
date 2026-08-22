import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, space, theme, type } from '../theme';
import { IconButton } from './IconButton';

type Props = {
  title: string;
  subtitle?: string;
  accent?: string;
  onExit?: () => void;
  onHelp?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  sideWidth?: number;
};

export function GameHeader({
  title,
  subtitle,
  accent = theme.accent,
  onExit,
  onHelp,
  leading,
  trailing,
  sideWidth = 48,
}: Props) {
  return (
    <View style={styles.root}>
      <View style={[styles.side, { width: sideWidth }]}>
        {leading ??
          (onExit ? (
            <IconButton
              icon={<Text style={styles.icon}>‹</Text>}
              accessibilityLabel="Leave game"
              onPress={onExit}
              color={accent}
            />
          ) : null)}
      </View>

      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.overline, styles.subtitle, { color: accent }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[styles.side, styles.trailing, { width: sideWidth }]}>
        {trailing ??
          (onHelp ? (
            <IconButton
              icon={<Text style={styles.help}>?</Text>}
              accessibilityLabel="How to play"
              onPress={onHelp}
              color={accent}
            />
          ) : null)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  side: { width: 48, alignItems: 'flex-start' },
  trailing: { alignItems: 'flex-end' },
  copy: { flex: 1, alignItems: 'center' },
  title: {
    color: theme.text,
    fontFamily: font.semibold,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  subtitle: { marginTop: 1 },
  icon: {
    color: theme.text,
    fontFamily: font.semibold,
    fontSize: 30,
    lineHeight: 30,
    marginTop: -2,
  },
  help: { color: theme.text, fontFamily: font.semibold, fontSize: 16, fontWeight: '600' },
});
