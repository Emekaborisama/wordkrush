import { useEffect, useRef } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Line, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useSvgId } from '../components/Gradient';
import { font } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { danfo } from './danfoTheme';

/** Side view, in a 200×110 box. */
const VIEW_W = 200;
const VIEW_H = 110;

/**
 * The Lagos danfo, side on: yellow body with the two black stripes, a row of
 * windows, Ghana-must-go bags on the roof rack, and a destination board.
 * `driving` gives it the road bounce; reduce-motion keeps it parked.
 */
export function DanfoBus({
  width = 200,
  destination = 'LAGOS',
  driving = false,
  facing = 'right',
  style,
}: {
  width?: number;
  /** Lettering on the side board ("OJUELEGBA"). */
  destination?: string;
  driving?: boolean;
  facing?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReduceMotion();
  const bounce = useRef(new Animated.Value(0)).current;
  const id = useSvgId('danfo');

  useEffect(() => {
    if (!driving || reduceMotion) {
      bounce.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(140),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [driving, reduceMotion, bounce]);

  const height = (width * VIEW_H) / VIEW_W;
  const board = destination.toUpperCase().slice(0, 12);
  return (
    <View
      style={[{ width, height }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Animated.View
        style={{
          transform: [
            { scaleX: facing === 'left' ? -1 : 1 },
            { translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
            { rotate: bounce.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-1.2deg'] }) },
          ],
        }}
      >
        <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden>
          <Defs>
            <LinearGradient id={`${id}body`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset={0} stopColor={danfo.yellowTop} />
              <Stop offset={0.55} stopColor={danfo.yellow} />
              <Stop offset={1} stopColor={danfo.yellowDeep} />
            </LinearGradient>
            <LinearGradient id={`${id}glass`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset={0} stopColor="#5E7A94" />
              <Stop offset={1} stopColor="#22303D" />
            </LinearGradient>
          </Defs>
          {/* Shadow on the road. */}
          <Ellipse cx={100} cy={101} rx={90} ry={6} fill="rgba(0,0,0,0.22)" />
          {/* Roof rack and the bags on it. */}
          <Rect x={30} y={14} width={128} height={4} rx={2} fill={danfo.black} />
          <Line x1={40} y1={18} x2={40} y2={24} stroke={danfo.black} strokeWidth={3} />
          <Line x1={148} y1={18} x2={148} y2={24} stroke={danfo.black} strokeWidth={3} />
          <Bag x={44} y={2} w={34} h={13} base="#C8343F" line="#F4E1E3" />
          <Bag x={82} y={4} w={30} h={11} base="#2F5BB7" line="#E2E9F8" />
          <Rect x={116} y={6} width={22} height={9} rx={3} fill="#7A4A2B" stroke={danfo.black} strokeWidth={1.5} />
          {/* Body: a box with a rounded, slightly raked front. */}
          <Path
            d="M14 26 Q14 22 18 22 L160 22 Q172 22 178 32 L190 52 Q193 57 193 62 L193 84 Q193 90 187 90 L14 90 Q8 90 8 84 L8 32 Q8 26 14 26 Z"
            fill={`url(#${id}body)`}
            stroke={danfo.black}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          {/* Windows. */}
          {[18, 44, 70, 96, 122].map((x) => (
            <G key={x}>
              <Rect x={x} y={29} width={22} height={19} rx={3} fill={`url(#${id}glass)`} stroke={danfo.black} strokeWidth={2} />
              <Path d={`M${x + 4} ${46} L${x + 14} ${31}`} stroke="rgba(255,255,255,0.45)" strokeWidth={3} strokeLinecap="round" />
            </G>
          ))}
          {/* Windscreen. */}
          <Path d="M150 29 L163 29 Q169 29 172 34 L182 50 L150 50 Z" fill={`url(#${id}glass)`} stroke={danfo.black} strokeWidth={2} strokeLinejoin="round" />
          {/* The two black stripes every danfo wears. */}
          <Rect x={8} y={55} width={185} height={6} fill={danfo.black} />
          <Rect x={8} y={65} width={185} height={3} fill={danfo.black} />
          {/* Destination board. */}
          <Rect x={52} y={71} width={80} height={13} rx={3} fill={danfo.black} />
          <SvgText
            x={92}
            y={81.5}
            fill={danfo.yellowTop}
            fontSize={board.length > 9 ? 7 : 8.5}
            fontFamily={font.black}
            textAnchor="middle"
          >
            {board}
          </SvgText>
          {/* Head lamp and bumper. */}
          <Circle cx={186} cy={68} r={4} fill="#FFF6C8" stroke={danfo.black} strokeWidth={1.5} />
          <Rect x={176} y={84} width={20} height={6} rx={3} fill="#C9CED6" stroke={danfo.black} strokeWidth={1.5} />
          {/* Wheels. */}
          {[46, 152].map((cx) => (
            <G key={cx}>
              <Circle cx={cx} cy={91} r={13} fill={danfo.black} />
              <Circle cx={cx} cy={91} r={6} fill="#C9CED6" />
              <Circle cx={cx} cy={91} r={2} fill={danfo.black} />
            </G>
          ))}
          {/* Gloss along the roofline. */}
          <Path d="M18 25 L158 25" stroke="rgba(255,255,255,0.7)" strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** A Ghana-must-go bag: checked plastic, strapped to the roof. */
function Bag({ x, y, w, h, base, line }: { x: number; y: number; w: number; h: number; base: string; line: string }) {
  const lines = [0.25, 0.5, 0.75];
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={3} fill={base} stroke={danfo.black} strokeWidth={1.5} />
      {lines.map((f) => (
        <Line key={`v${f}`} x1={x + w * f} y1={y + 1} x2={x + w * f} y2={y + h - 1} stroke={line} strokeWidth={1} opacity={0.7} />
      ))}
      <Line x1={x + 1} y1={y + h / 2} x2={x + w - 1} y2={y + h / 2} stroke={line} strokeWidth={1} opacity={0.7} />
    </G>
  );
}
