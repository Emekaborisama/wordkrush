import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from './theme';

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
      <Pressable
        onPress={onMenu}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        // 44pt is the minimum comfortable touch target; the glyph alone is far
        // smaller than that, so the hit area is padded out to reach it.
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
      >
        <View style={styles.burger}>
          <View style={styles.line} />
          <View style={styles.line} />
          <View style={styles.line} />
        </View>
      </Pressable>

      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.flex} />
      )}

      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 10,
  },
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  burger: { width: 20, gap: 4 },
  line: { height: 2, borderRadius: 1, backgroundColor: theme.textDim },
  title: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '700' },
  flex: { flex: 1 },
  right: { minWidth: 44, alignItems: 'flex-end' },
  pressed: { opacity: 0.6 },
});
