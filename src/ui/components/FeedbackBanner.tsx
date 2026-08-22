import { StyleSheet, Text, View } from 'react-native';
import { font, gameAccentTokens, radius, space, theme, type } from '../theme';

type Tone = 'success' | 'danger' | 'warning' | 'info';

type Props = {
  title: string;
  body?: string;
  tone?: Tone;
};

export function FeedbackBanner({ title, body, tone = 'info' }: Props) {
  const color =
    tone === 'success'
      ? theme.success
      : tone === 'danger'
        ? theme.danger
        : tone === 'warning'
          ? theme.warning
          : theme.accentSecondary;
  const symbol = tone === 'success' ? '✓' : tone === 'danger' ? '×' : tone === 'warning' ? '!' : 'i';
  const tokens = gameAccentTokens(color);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: tokens.soft, borderColor: tokens.glow },
      ]}
      accessibilityRole="alert"
    >
      <View style={[styles.symbol, { backgroundColor: color }]}>
        <Text style={styles.symbolText}>{symbol}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  symbol: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolText: { color: theme.bg, fontFamily: font.bold, fontSize: 17, fontWeight: '700' },
  copy: { flex: 1 },
  title: { fontFamily: font.semibold, fontSize: 15, fontWeight: '600' },
  body: { ...type.caption, color: theme.textMuted, marginTop: 1 },
});
