import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { bannerPath, tabPath } from '../shapes';
import { shade, tint, tone } from '../theme';
import { useSvgId } from './Gradient';
import { StrokeText } from './StrokeText';

export type RibbonKind = 'tab' | 'banner' | 'scroll';

export type RibbonTitleProps = {
  label: string;
  /**
   * `tab` — the teal title tab on top of a popup ("Settings", "LEVEL 2").
   * `banner` — the red cloth banner with folded tails ("More Lives?").
   * `scroll` — the blue scroll the result stars sit on.
   */
  kind?: RibbonKind;
  /** Override the fill (e.g. a gold tab). Defaults per kind. */
  color?: string;
  size?: 'lg' | 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
};

const SIZE = {
  lg: { height: 50, font: 28, stroke: 2.5, padX: 34 },
  md: { height: 42, font: 23, stroke: 2.2, padX: 28 },
  sm: { height: 30, font: 15, stroke: 1.6, padX: 18 },
} as const;

const DEFAULT_FILL: Record<RibbonKind, string> = {
  tab: tone.teal.bottom,
  banner: tone.red.bottom,
  scroll: tone.sky.bottom,
};

/**
 * A ribbon title from the kit. The shape is drawn at its measured width, so
 * the slanted sides keep their angle whatever the label length.
 */
export function RibbonTitle({ label, kind = 'tab', color, size = 'md', style }: RibbonTitleProps) {
  const [width, setWidth] = useState(0);
  const id = useSvgId('ribbon');
  const sizing = SIZE[size];
  const fill = color ?? DEFAULT_FILL[kind];
  // Lit from the top, the same way every glossy face in the kit is.
  const light = kind === 'tab' && !color ? tone.teal.top : tint(fill, 0.45);
  const lip = shade(fill, 0.32);
  const outline = shade(fill, 0.52);
  const h = sizing.height;
  const tail = kind === 'banner' ? Math.round(h * 0.55) : kind === 'scroll' ? Math.round(h * 0.4) : 0;

  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next !== width) setWidth(next);
  };

  return (
    <View style={[styles.wrap, style]} accessibilityRole="header" accessibilityLabel={label}>
      <View onLayout={onLayout} style={[styles.body, { minHeight: h, paddingHorizontal: sizing.padX + tail }]}>
        {width > 0 ? (
          <Svg
            width={width}
            height={h + 6}
            style={styles.svg}
            pointerEvents="none"
            aria-hidden
          >
            <Defs>
              <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <Stop offset={0} stopColor={light} />
                <Stop offset={0.62} stopColor={fill} />
                <Stop offset={1} stopColor={shade(fill, 0.1)} />
              </LinearGradient>
            </Defs>
            {kind === 'tab' ? (
              <>
                <Path d={tabPath(width, h, h * 0.24, h * 0.24)} fill={lip} stroke={outline} strokeWidth={2} transform="translate(0,5)" />
                <Path d={tabPath(width, h, h * 0.24, h * 0.24)} fill={`url(#${id})`} stroke={outline} strokeWidth={2} />
                <Path
                  d={`M${h * 0.3},4 L${width - h * 0.3},4`}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                {/* Folded tails sit behind both ends of the band. */}
                <Path
                  d={`M0,${h * 0.42} L${tail + 4},${h * 0.32} L${tail + 4},${h + 2} L0,${h + 4} L${tail * 0.45},${h * 0.72} Z`}
                  fill={lip}
                  stroke={outline}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                <Path
                  d={`M${width},${h * 0.42} L${width - tail - 4},${h * 0.32} L${width - tail - 4},${h + 2} L${width},${h + 4} L${width - tail * 0.45},${h * 0.72} Z`}
                  fill={lip}
                  stroke={outline}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                <Path
                  d={bannerPath(width - tail * 2, h * 0.84, kind === 'banner' ? h * 0.12 : -h * 0.08)}
                  transform={`translate(${tail},${h * 0.1})`}
                  fill={`url(#${id})`}
                  stroke={outline}
                  strokeWidth={2.2}
                  strokeLinejoin="round"
                />
              </>
            )}
          </Svg>
        ) : null}
        <StrokeText
          size={sizing.font}
          stroke={outline}
          strokeWidth={sizing.stroke}
          depth={1.5}
          numberOfLines={1}
          style={kind === 'tab' ? undefined : styles.bannerLabel}
        >
          {label}
        </StrokeText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'center' },
  body: { alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute', top: 0, left: 0 },
  bannerLabel: { marginTop: 2 },
});

