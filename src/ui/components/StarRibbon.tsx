import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { bannerPath } from '../shapes';
import { tone } from '../theme';
import { useSvgId } from './Gradient';
import { StarRow, type StarRowProps } from './StarRow';

const BAND = 46;
const CURL = 22;

/**
 * The kit's result stars: three gold stars standing on a blue scroll ribbon
 * whose ends roll back into curls ("LEVEL COMPLETED", UI kit header).
 */
export function StarRibbon({
  style,
  ...stars
}: Omit<StarRowProps, 'surface'> & { style?: StyleProp<ViewStyle> }) {
  const [width, setWidth] = useState(0);
  const id = useSvgId('scroll');
  const size = stars.size ?? 62;
  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next !== width) setWidth(next);
  };
  const band = width - CURL * 2;
  return (
    <View style={[styles.wrap, style]} onLayout={onLayout}>
      {width > 0 ? (
        <Svg
          width={width}
          height={BAND + 18}
          style={[styles.scroll, { top: size * 0.5 }]}
          pointerEvents="none"
          aria-hidden
        >
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset={0} stopColor={tone.sky.top} />
              <Stop offset={0.55} stopColor={tone.sky.bottom} />
              <Stop offset={1} stopColor={tone.sky.lip} />
            </LinearGradient>
          </Defs>
          {/* Curls: rolled ends standing behind the band. */}
          {[0, width - CURL - 6].map((x) => (
            <Rect key={x} x={x + 3} y={4} width={CURL} height={BAND + 8} rx={CURL / 2} fill={tone.sky.lip} stroke={tone.sky.outline} strokeWidth={2.5} />
          ))}
          {[0, width - CURL - 6].map((x) => (
            <Rect key={`hl-${x}`} x={x + 9} y={10} width={5} height={BAND - 6} rx={2.5} fill="rgba(255,255,255,0.45)" />
          ))}
          <Path
            d={bannerPath(band, BAND, -7)}
            transform={`translate(${CURL},9)`}
            fill={`url(#${id})`}
            stroke={tone.sky.outline}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
      <StarRow {...stars} size={size} surface="sky" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', alignItems: 'center', minHeight: 110, paddingHorizontal: CURL },
  scroll: { position: 'absolute', left: 0 },
});
