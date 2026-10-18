import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette, radius, space, theme, type } from '../theme';

export type ResultSheetProps = {
  /** Scrolls. Stars, score, rewards. */
  children: ReactNode;
  /** Stays on screen. Play again, scores, home. */
  footer: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Warm-white result card with a scrolling body and a sticky action footer.
 *
 * The parent must give it a bounded height (`flex: 1` inside the screen).
 * On a 375×667 phone the body scrolls and the actions stay in view instead of
 * drawing past the bottom of the frame.
 */
export function ResultSheet({
  children,
  footer,
  style,
  contentContainerStyle,
  accessibilityLabel,
}: ResultSheetProps) {
  return (
    <View style={[styles.root, style]} accessibilityLabel={accessibilityLabel}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      <View style={styles.footer}>{footer}</View>
    </View>
  );
}

/** Dark inset well for the score sitting on the warm-white result card. */
export function ScoreWell({ label, value }: { label: string; value: string }) {
  return (
    <View style={wellStyles.well} accessibilityLabel={`${label} ${value}`}>
      <Text style={wellStyles.label}>{label}</Text>
      <Text style={wellStyles.value}>{value}</Text>
    </View>
  );
}

const wellStyles = StyleSheet.create({
  well: {
    alignSelf: 'stretch',
    backgroundColor: theme.well,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    marginTop: space.sm,
  },
  label: { ...type.overline, color: palette.paper },
  value: {
    ...type.display,
    color: palette.paper,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxHeight: '100%',
    backgroundColor: palette.paper,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  body: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, padding: space.lg, alignItems: 'center' },
  footer: {
    flexShrink: 0,
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: palette.paper,
  },
});
