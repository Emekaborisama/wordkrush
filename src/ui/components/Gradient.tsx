import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * An SVG id that is safe inside `url(#…)`. React's `useId` returns characters
 * (`:` and `«»`) that break the reference on some renderers.
 */
export function useSvgId(prefix: string): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export type GradientProps = {
  /** Two or more colours, first at the top (or left). */
  colors: readonly string[];
  /** 0–1 positions for each colour. Evenly spread when omitted. */
  locations?: readonly number[];
  direction?: 'vertical' | 'horizontal';
  style?: StyleProp<ViewStyle>;
};

/**
 * Absolute-fill linear gradient. The parent clips it: give the parent a
 * `borderRadius` and `overflow: 'hidden'`. Never takes touches.
 */
export function Gradient({ colors, locations, direction = 'vertical', style }: GradientProps) {
  const id = useSvgId('grad');
  const horizontal = direction === 'horizontal';
  const last = Math.max(1, colors.length - 1);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2={horizontal ? '1' : '0'} y2={horizontal ? '0' : '1'}>
            {colors.map((color, index) => (
              <Stop key={`${color}-${index}`} offset={locations?.[index] ?? index / last} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
