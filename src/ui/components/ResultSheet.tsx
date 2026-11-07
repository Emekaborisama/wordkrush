import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette, space } from '../theme';
import { CreamBox } from './CreamBox';
import { Panel } from './Panel';
import { StrokeText } from './StrokeText';

export type ResultSheetProps = {
  /** Scrolls. Stars, score, rewards. */
  children: ReactNode;
  /** Stays on screen. Play again, scores, home. */
  footer: ReactNode;
  /** Ribbon title on the panel ("LEVEL 4", "GAME OVER"). */
  title?: string;
  /** Red banner instead of the teal tab, for a loss. */
  banner?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Result card: the kit's coral pop-up with a scrolling body and the actions
 * pinned under it. The parent must bound its height (`flex: 1`).
 */
export function ResultSheet({
  children,
  footer,
  title,
  banner = false,
  style,
  contentContainerStyle,
  accessibilityLabel,
}: ResultSheetProps) {
  return (
    <Panel
      title={title}
      ribbon={banner ? 'banner' : 'tab'}
      scroll
      footer={footer}
      style={[styles.root, style]}
      contentStyle={[styles.content, contentContainerStyle]}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Panel>
  );
}

/** The score on a result card: a cream pill with a big outlined number. */
export function ScoreWell({ label, value }: { label: string; value: string }) {
  return (
    <CreamBox style={styles.well}>
      <View accessible accessibilityLabel={`${label} ${value}`} style={styles.wellInner}>
        <StrokeText size={14} stroke={palette.tealInk} strokeWidth={0} depth={0} color={palette.tealInk}>
          {label}
        </StrokeText>
        <StrokeText size={40} stroke={palette.ink} strokeWidth={2.5} depth={2} textStyle={styles.tabular}>
          {value}
        </StrokeText>
      </View>
    </CreamBox>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, width: '100%', maxHeight: '100%' },
  content: { alignItems: 'center' },
  well: { alignSelf: 'stretch', marginTop: space.xs },
  wellInner: { alignItems: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
});
