import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { extrusionOffsets, strokeOffsets } from '../shapes';
import { font, palette } from '../theme';

export type StrokeTextProps = {
  children: string | number;
  size?: number;
  /** Fill. White by default, like every label in the kit. */
  color?: string;
  /** Outline colour. Defaults to navy ink. */
  stroke?: string;
  /** Outline width in px. 0 draws plain text. */
  strokeWidth?: number;
  /**
   * Extra outline pushed below the glyphs, the kit's thick-footed label.
   * 0 turns it off.
   */
  depth?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  numberOfLines?: number;
  /** Applied to the wrapper (margins, flex). */
  style?: StyleProp<ViewStyle>;
  /** Applied to every copy (e.g. `textTransform`). Never a colour. */
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: 'header' | 'text';
};

/**
 * White, outlined, thick-footed display text — the kit's headline and button
 * lettering. The outline is a ring of copies under the fill, which works the
 * same on web, iOS and Android without a text-stroke API. The copies are
 * hidden from assistive tech; the wrapper carries the label.
 */
export function StrokeText({
  children,
  size = 20,
  color = palette.white,
  stroke = palette.ink,
  strokeWidth = 2,
  depth = 2,
  fontFamily = font.black,
  align = 'center',
  lineHeight,
  letterSpacing,
  numberOfLines,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityRole = 'text',
}: StrokeTextProps) {
  const label = String(children);
  const base: StyleProp<TextStyle> = [
    {
      fontFamily,
      fontSize: size,
      lineHeight: lineHeight ?? Math.round(size * 1.18),
      letterSpacing,
      textAlign: align,
    },
    textStyle,
  ];
  const copies = [...extrusionOffsets(strokeWidth, depth), ...strokeOffsets(strokeWidth)];
  // Room for the ring so the outline is not clipped by a parent.
  const pad = Math.ceil(strokeWidth);
  return (
    <View
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        { paddingHorizontal: pad, paddingTop: pad, paddingBottom: pad + Math.ceil(depth) },
        align === 'left' && styles.left,
        align === 'right' && styles.right,
        align === 'center' && styles.center,
        style,
      ]}
    >
      {copies.map(([x, y]) => (
        <Text
          key={`${x},${y}`}
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          selectable={false}
          numberOfLines={numberOfLines}
          style={[
            base,
            styles.copy,
            { left: pad, right: pad, top: pad, color: stroke, transform: [{ translateX: x }, { translateY: y }] },
          ]}
        >
          {label}
        </Text>
      ))}
      <Text
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        numberOfLines={numberOfLines}
        style={[base, { color }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { position: 'absolute' },
  left: { alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  center: { alignItems: 'center' },
});
