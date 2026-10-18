import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { font, motion, palette, shadow, space, theme, withAlpha } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { CloseButton } from './CloseButton';
import { Gradient } from './Gradient';
import { RibbonTitle, type RibbonKind } from './RibbonTitle';
import { StrokeText } from './StrokeText';

export type PanelTone = 'coral' | 'purple' | 'sky';

const BODY: Record<PanelTone, { colors: readonly string[]; keyline: string; ink: string }> = {
  coral: { colors: [palette.coralTop, palette.coral, palette.coralBottom], keyline: palette.coralEdge, ink: palette.coralEdge },
  purple: { colors: ['#DCB6FF', '#B27EF6', '#9256E6'], keyline: '#7036C4', ink: '#5B2AA8' },
  sky: { colors: ['#A6E6FB', '#62C4EF', '#3AA4DE'], keyline: '#1F7DB6', ink: '#155E8E' },
};

/** Outline colour for white copy sitting directly on a panel of this tone. */
export function panelInk(panelTone: PanelTone = 'coral'): string {
  return BODY[panelTone].ink;
}

const RIBBON_HEIGHT = 42;

export type PanelProps = {
  children: ReactNode;
  /** Ribbon title riding the top edge ("Settings", "LEVEL 2"). */
  title?: string;
  ribbon?: RibbonKind;
  ribbonColor?: string;
  onClose?: () => void;
  closeLabel?: string;
  tone?: PanelTone;
  /**
   * Scroll the body inside a bounded parent (a popup, a full-height card).
   * `footer` then stays pinned under it.
   */
  scroll?: boolean;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * The kit's popup panel: coral gradient body in a 4px white rim, a coral
 * keyline just inside it, a gloss dot at the top-left, an optional ribbon
 * title riding the top edge and a red close disc on the corner.
 *
 * Long copy goes in a `CreamBox` with navy ink; only short headings and
 * labels sit straight on the coral, white and outlined (`PanelText`).
 */
export function Panel({
  children,
  title,
  ribbon = 'tab',
  ribbonColor,
  onClose,
  closeLabel = 'Close',
  tone = 'coral',
  scroll = false,
  footer,
  style,
  contentStyle,
  accessibilityLabel,
}: PanelProps) {
  const body = BODY[tone];
  const top = title ? RIBBON_HEIGHT / 2 : 0;
  const content = (
    <View style={[styles.content, { paddingTop: title ? RIBBON_HEIGHT / 2 + space.md : space.lg }, contentStyle]}>
      {children}
    </View>
  );
  return (
    <View style={[styles.wrap, { paddingTop: top }, scroll && styles.bounded, style]} accessibilityLabel={accessibilityLabel}>
      <View style={[styles.rim, scroll && styles.bounded]}>
        <View style={[styles.body, scroll && styles.bounded]}>
          <Gradient colors={body.colors} locations={[0, 0.5, 1]} />
          <View pointerEvents="none" style={[styles.keyline, { borderColor: withAlpha(body.keyline, 0.55) }]} />
          <View pointerEvents="none" style={styles.dot} />
          {scroll ? (
            <ScrollView
              style={styles.scroll}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {content}
            </ScrollView>
          ) : (
            content
          )}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
      {title ? (
        <RibbonTitle label={title} kind={ribbon} color={ribbonColor} style={styles.ribbon} />
      ) : null}
      {onClose ? (
        <CloseButton
          onPress={onClose}
          accessibilityLabel={closeLabel}
          style={[styles.close, { top: title ? top - 14 : -14 }]}
        />
      ) : null}
    </View>
  );
}

/** The kit's divider inside a panel: a darker line over a lighter one. */
export function PanelDivider({ tone = 'coral' }: { tone?: PanelTone }) {
  return (
    <View style={styles.divider}>
      <View style={[styles.dividerDark, { backgroundColor: withAlpha(BODY[tone].keyline, 0.55) }]} />
      <View style={styles.dividerLight} />
    </View>
  );
}

/**
 * White copy on a panel. `heading` is outlined display type; `body` is a
 * thin-outlined line for one or two short sentences.
 */
export function PanelText({
  children,
  variant = 'body',
  tone = 'coral',
  align = 'center',
  style,
}: {
  children: string;
  variant?: 'heading' | 'body';
  tone?: PanelTone;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
}) {
  if (variant === 'heading') {
    return (
      <StrokeText size={24} stroke={BODY[tone].ink} strokeWidth={2.2} depth={1.5} align={align} style={style}>
        {children}
      </StrokeText>
    );
  }
  return (
    <StrokeText
      size={15}
      fontFamily={font.heavy}
      stroke={BODY[tone].ink}
      strokeWidth={1.2}
      depth={0.8}
      align={align}
      lineHeight={20}
      style={style}
    >
      {children}
    </StrokeText>
  );
}

/** Navy copy for inside a `CreamBox`. */
export function CreamText({
  children,
  variant = 'body',
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: 'label' | 'body' | 'title' | 'teal';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text style={[CREAM_TEXT[variant], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

const CREAM_TEXT = StyleSheet.create({
  label: { fontFamily: font.heavy, fontSize: 12, lineHeight: 15, letterSpacing: 0.8, color: palette.inkSoft },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: palette.ink },
  title: { fontFamily: font.black, fontSize: 20, lineHeight: 25, color: palette.ink },
  teal: { fontFamily: font.black, fontSize: 20, lineHeight: 25, color: palette.tealInk },
});

export type PopupModalProps = Omit<PanelProps, 'scroll' | 'onClose'> & {
  visible: boolean;
  onClose: () => void;
  /** Tap on the scrim closes. Off for decisions the player must make. */
  dismissable?: boolean;
  /** Hide the corner X (the footer carries the only exit). */
  hideClose?: boolean;
  width?: number;
};

/**
 * A `Panel` that pops over a dark-blue scrim, scaling in with the kit's
 * overshoot. The body scrolls when it is taller than the screen.
 */
export function PopupModal({
  visible,
  onClose,
  dismissable = true,
  hideClose = false,
  width = 380,
  ...panel
}: PopupModalProps) {
  const reduceMotion = useReduceMotion();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      pop.setValue(0);
      return;
    }
    if (reduceMotion) {
      pop.setValue(1);
      return;
    }
    Animated.timing(pop, {
      toValue: 1,
      duration: motion.popMs + 60,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start();
  }, [visible, reduceMotion, pop]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.scrim}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissable ? onClose : undefined}
          accessibilityRole={dismissable ? 'button' : undefined}
          accessibilityLabel={dismissable ? 'Close' : undefined}
        />
        <Animated.View
          accessibilityViewIsModal
          style={{
            width: Math.min(width, screenWidth - space.lg * 2),
            maxHeight: screenHeight * 0.9,
            opacity: pop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          }}
        >
          <Panel {...panel} onClose={hideClose ? undefined : onClose} scroll />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignSelf: 'stretch' },
  bounded: { flexShrink: 1, minHeight: 0 },
  rim: {
    borderRadius: 26,
    padding: 4,
    backgroundColor: palette.white,
    ...shadow.raised,
  },
  body: { borderRadius: 22, overflow: 'hidden', backgroundColor: palette.coral },
  keyline: {
    position: 'absolute',
    top: 2,
    right: 2,
    bottom: 2,
    left: 2,
    borderRadius: 20,
    borderWidth: 2,
  },
  dot: {
    position: 'absolute',
    top: 9,
    left: 10,
    width: 12,
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    transform: [{ rotate: '-30deg' }],
  },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: space.md + 2, paddingBottom: space.lg, gap: space.md },
  footer: { paddingHorizontal: space.md + 2, paddingBottom: space.lg, paddingTop: space.xs, gap: space.sm },
  ribbon: { position: 'absolute', top: 0, left: 0, right: 0 },
  close: { position: 'absolute', right: -10 },
  divider: { alignSelf: 'stretch', marginVertical: space.xs },
  dividerDark: { height: 2, borderRadius: 1 },
  dividerLight: { height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.45)' },
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.overlay,
    padding: space.md,
  },
});
