import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { font, palette, tone } from '../theme';
import { Gradient } from './Gradient';
import { StrokeText } from './StrokeText';

export type HudPanelProps = {
  /** Word on the red tab: "Moves", "Goal", "Score". */
  label: string;
  /** Big outlined number. Omit and pass `children` for a goal row. */
  value?: number | string;
  children?: ReactNode;
  /** Red value, for a running-out budget. */
  urgent?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * In-game stat panel from the kit's HUD: a cream panel with a small red
 * ribbon tab on its top edge and the value in white outlined numerals.
 */
export function HudPanel({ label, value, children, urgent = false, style, accessibilityLabel }: HudPanelProps) {
  const shown = typeof value === 'number' ? value.toLocaleString('en-US') : value;
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? (shown === undefined ? label : `${label}: ${shown}`)}
      style={[styles.wrap, style]}
    >
      <View style={[styles.panel, urgent && styles.urgent]}>
        <View pointerEvents="none" style={styles.inset} />
        {shown === undefined ? (
          children
        ) : (
          <StrokeText
            size={24}
            color={urgent ? '#FFE3E3' : palette.white}
            stroke={urgent ? palette.redDeep : palette.ink}
            strokeWidth={2.2}
            depth={1.5}
            numberOfLines={1}
            textStyle={styles.tabular}
          >
            {shown}
          </StrokeText>
        )}
      </View>
      <View style={styles.tab} pointerEvents="none">
        <View style={styles.tabClip}>
          <Gradient colors={[tone.red.top, tone.red.bottom]} />
        </View>
        <Text style={styles.tabText} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 10, flex: 1, minWidth: 0 },
  panel: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: palette.creamFill,
    borderWidth: 2,
    borderColor: palette.creamEdge,
    borderBottomColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 2,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  urgent: { backgroundColor: '#FFE0DA', borderColor: palette.red },
  inset: { position: 'absolute', top: 0, left: 0, right: 0, height: 5, backgroundColor: palette.creamShade },
  tab: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    height: 21,
    paddingHorizontal: 12,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: tone.red.outline,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabClip: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  tabText: {
    fontFamily: font.black,
    fontSize: 12,
    lineHeight: 15,
    color: palette.white,
    textShadowColor: tone.red.outline,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  tabular: { fontVariant: ['tabular-nums'] },
});
