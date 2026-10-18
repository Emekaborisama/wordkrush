import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BrandArtwork } from './components';
import { RoundIconButton } from './components/RoundIconButton';
import { font, palette, shade, space, theme } from './theme';

/**
 * Yellow header band. Hub keeps the menu on the left. Every other screen that
 * shows this bar gets a round back button, with the menu on the right.
 * The wordmark image is not recoloured.
 */
export function TopBar({
  onMenu,
  onBack,
  title,
  right,
  hud,
}: {
  onMenu: () => void;
  onBack?: () => void;
  title?: string;
  right?: ReactNode;
  /** Coins and level. Sits in the band without replacing the wordmark. */
  hud?: ReactNode;
}) {
  return (
    <View style={styles.bar}>
      {onBack ? (
        <RoundIconButton
          icon={<Text style={styles.glyph}>‹</Text>}
          accessibilityLabel="Go back"
          onPress={onBack}
          tone="blue"
          size={44}
        />
      ) : (
        <MenuButton onPress={onMenu} />
      )}

      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.lockup}>
          <BrandArtwork size={28} />
          <Text style={styles.wordmark}>WordKrush</Text>
        </View>
      )}

      {hud}
      <View style={styles.right}>
        {onBack ? <MenuButton onPress={onMenu} /> : right}
      </View>
    </View>
  );
}

function MenuButton({ onPress }: { onPress: () => void }) {
  return (
    <RoundIconButton
      icon={<MenuMark />}
      accessibilityLabel="Open menu"
      onPress={onPress}
      tone="purple"
      size={44}
    />
  );
}

function MenuMark() {
  return (
    <View style={styles.burger}>
      <View style={styles.line} />
      <View style={[styles.line, styles.lineShort]} />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.sm,
    backgroundColor: palette.ribbon,
    borderBottomWidth: 4,
    borderBottomColor: shade(palette.ribbon, 0.28),
  },
  burger: { width: 18, height: 14, justifyContent: 'space-between', alignItems: 'flex-start' },
  line: { width: 18, height: 2, borderRadius: 2, backgroundColor: theme.onPill },
  lineShort: { width: 12 },
  title: {
    flex: 1,
    color: palette.brown,
    fontFamily: font.semibold,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockup: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  wordmark: {
    color: palette.brown,
    fontFamily: font.bold,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  right: { minWidth: 44, alignItems: 'flex-end' },
  glyph: { color: theme.onPill, fontSize: 22, lineHeight: 24, fontWeight: '700' },
});
