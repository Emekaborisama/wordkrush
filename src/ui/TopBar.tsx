import { StyleSheet, Text, View } from 'react-native';
import { BrandArtwork, IconButton } from './components';
import { font, space, theme } from './theme';

/**
 * Slim header with the hamburger. Replaces the per-screen "back" links, which
 * did not scale: every new destination needed its own bespoke link, and they
 * sat awkwardly inside each screen's own layout.
 */
export function TopBar({
  onMenu,
  title,
  right,
}: {
  onMenu: () => void;
  title?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.bar}>
      <IconButton icon={<MenuMark />} accessibilityLabel="Open menu" onPress={onMenu} />

      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.lockup}>
          {/* Mark + wordmark, not the lockup: the bar is too short to render
              the lockup above its ~120px legibility floor (logos.md). */}
          <BrandArtwork size={28} />
          <Text style={styles.wordmark}>WordKrush</Text>
        </View>
      )}

      <View style={styles.right}>{right}</View>
    </View>
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
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.bgElevated,
  },
  burger: { width: 18, height: 16, justifyContent: 'space-between', alignItems: 'flex-start' },
  line: { width: 18, height: 2, borderRadius: 2, backgroundColor: theme.text },
  lineShort: { width: 12 },
  title: {
    flex: 1,
    color: theme.text,
    fontFamily: font.semibold,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockup: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  wordmark: {
    color: theme.text,
    fontFamily: font.bold,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  right: { minWidth: 44, alignItems: 'flex-end' },
});
