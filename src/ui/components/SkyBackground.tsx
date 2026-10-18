import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { diamondLatticePath, playCloudPuffs, sparkleField, sparklePath, sunRayWedges } from '../blockMath';
import { cloudBank, type Circle as Puff } from '../shapes';
import { motion, palette } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { useSvgId } from './Gradient';

export type SkyBackgroundProps = {
  /** 'sky' for menus, the hub and behind popups; 'play' for gameplay (calmer). */
  variant?: 'sky' | 'play';
  /** Slowly turning sun rays from the top centre. On for sky, off for play. */
  rays?: boolean;
  /** Cumulus along the bottom (sky) or pale puffs (play). */
  clouds?: boolean;
  style?: StyleProp<ViewStyle>;
};

type Box = { w: number; h: number };

/**
 * The kit's backdrop, painted behind a whole screen. Put it first inside the
 * screen's root; it fills that root, never takes a touch, and is invisible to
 * assistive tech. Until it has measured itself it shows the flat sky colour,
 * so nothing flashes white.
 */
export function SkyBackground({ variant = 'sky', rays, clouds = true, style }: SkyBackgroundProps) {
  const [box, setBox] = useState<Box | null>(null);
  const sky = variant === 'sky';
  const showRays = rays ?? sky;

  const onLayout = (event: LayoutChangeEvent) => {
    const w = Math.round(event.nativeEvent.layout.width);
    const h = Math.round(event.nativeEvent.layout.height);
    setBox((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  };

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: sky ? palette.skyMid : palette.playTop }, style]}
    >
      {box && box.w > 0 && box.h > 0 ? (
        <>
          <Backdrop box={box} sky={sky} />
          {showRays ? <SunRays box={box} sky={sky} /> : null}
          {clouds ? sky ? <SkyClouds box={box} /> : <PlayClouds box={box} /> : null}
        </>
      ) : null}
    </View>
  );
}

const SKY_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, palette.skyTop],
  [0.55, palette.skyMid],
  [1, palette.skyBottom],
];
const PLAY_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, palette.playTop],
  [1, palette.playBottom],
];

/** Where the light comes from: top centre, a little way down. */
function sunPoint({ w, h }: Box, sky: boolean) {
  return { x: w / 2, y: sky ? Math.min(h * 0.2, 190) : Math.min(h * 0.12, 110) };
}

function Backdrop({ box, sky }: { box: Box; sky: boolean }) {
  const fill = useSvgId('skyFill');
  const glow = useSvgId('skyGlow');
  const sun = sunPoint(box, sky);
  const lattice = useMemo(
    () => (sky ? '' : diamondLatticePath(box.w, box.h, Math.max(64, Math.round(box.w / 5)))),
    [sky, box.w, box.h],
  );
  return (
    <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
          {(sky ? SKY_STOPS : PLAY_STOPS).map(([offset, color]) => (
            <Stop key={offset} offset={offset} stopColor={color} />
          ))}
        </LinearGradient>
        <RadialGradient id={glow} cx={sun.x} cy={sun.y} r={Math.max(box.w, 240) * 0.75} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={palette.white} stopOpacity={sky ? 0.26 : 0.16} />
          <Stop offset="1" stopColor={palette.white} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={box.w} height={box.h} fill={`url(#${fill})`} />
      <Rect x={0} y={0} width={box.w} height={box.h} fill={`url(#${glow})`} />
      {lattice ? <Path d={lattice} fill={palette.white} fillOpacity={0.055} /> : null}
    </Svg>
  );
}

const RAY_COUNT = 16;
const RAY_SPREAD_DEG = 11;

function SunRays({ box, sky }: { box: Box; sky: boolean }) {
  const reduceMotion = useReduceMotion();
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useSvgId('rayFade');
  const sun = sunPoint(box, sky);
  // Long enough to reach the farthest corner at any angle while spinning.
  const reach = Math.ceil(Math.hypot(Math.max(sun.x, box.w - sun.x), Math.max(sun.y, box.h - sun.y)));
  const d = useMemo(() => sunRayWedges(reach, RAY_COUNT, RAY_SPREAD_DEG).join(' '), [reach]);

  useEffect(() => {
    if (reduceMotion) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: motion.rayPeriodMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const side = reach * 2;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: sun.x - reach,
        top: sun.y - reach,
        width: side,
        height: side,
        transform: [{ rotate }],
      }}
    >
      <Svg width={side} height={side}>
        <Defs>
          <RadialGradient id={fade} cx={reach} cy={reach} r={reach} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.white} stopOpacity={sky ? 0.15 : 0.1} />
            <Stop offset="0.45" stopColor={palette.white} stopOpacity={sky ? 0.08 : 0.05} />
            <Stop offset="1" stopColor={palette.white} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Path d={d} fill={`url(#${fade})`} />
      </Svg>
    </Animated.View>
  );
}

/** Higher puffs first, so lower ones overlap them and the shading scallops. */
function backToFront(puffs: Puff[]): Puff[] {
  return [...puffs].sort((a, b) => a.cy - b.cy);
}

function SkyClouds({ box }: { box: Box }) {
  const shadeId = useSvgId('puff');
  const scale = Math.max(0.55, Math.min(1.35, Math.min(box.w / 390, box.h / 640)));
  const unit = 46 * scale;
  const base = box.h - unit * 0.45;
  const front = useMemo(() => backToFront(cloudBank(box.w, base, scale)), [box.w, base, scale]);
  const back = useMemo(
    () => backToFront(cloudBank(box.w + unit, base - unit * 1.05, scale * 0.85)),
    [box.w, base, scale, unit],
  );
  const sparks = useMemo(() => sparkleField(box.w, box.h, 7), [box.w, box.h]);
  return (
    <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.white} />
          <Stop offset="0.5" stopColor={palette.white} />
          <Stop offset="1" stopColor={palette.cloudShade} />
        </LinearGradient>
      </Defs>
      {sparks.map((s, i) => (
        <Path key={`s${i}`} d={sparklePath(s.x, s.y, s.r)} fill={palette.white} fillOpacity={s.alpha} />
      ))}
      <G opacity={0.5}>
        {back.map((c, i) => (
          <Circle key={`b${i}`} cx={c.cx - unit * 0.5} cy={c.cy} r={c.r} fill={`url(#${shadeId})`} />
        ))}
      </G>
      {front.map((c, i) => (
        <Circle key={`f${i}`} cx={c.cx} cy={c.cy} r={c.r} fill={`url(#${shadeId})`} />
      ))}
      <Rect x={0} y={base + unit * 0.2} width={box.w} height={box.h} fill={palette.cloudShade} />
    </Svg>
  );
}

function PlayClouds({ box }: { box: Box }) {
  const puffs = useMemo(() => backToFront(playCloudPuffs(box.w, box.h)), [box.w, box.h]);
  const scale = Math.max(0.5, Math.min(1.2, box.w / 390));
  const unit = 46 * scale;
  const bank = useMemo(
    () => backToFront(cloudBank(box.w, box.h + unit * 0.2, scale * 0.9)),
    [box.w, box.h, scale, unit],
  );
  return (
    <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill}>
      <G opacity={0.16}>
        {puffs.map((c, i) => (
          <Circle key={`p${i}`} cx={c.cx} cy={c.cy} r={c.r} fill={palette.white} />
        ))}
      </G>
      <G opacity={0.3}>
        {bank.map((c, i) => (
          <Circle key={`k${i}`} cx={c.cx} cy={c.cy} r={c.r} fill={palette.white} />
        ))}
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
});
