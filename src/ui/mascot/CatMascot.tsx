import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { feedback } from '../../native/feedback';
import { useSvgId } from '../components/Gradient';
import { useReduceMotion } from '../useReduceMotion';
import { CAT_ART, layersFor, type ArtLayer, type CatMood } from './art';

export type { CatMood };

/** A one-off beat: a new `key` replays it. */
export type CatReaction = { key: number; mood: 'cheer' | 'oops' };

type Props = {
  /** Width in px; the height follows the drawing (about 1.04×). */
  size: number;
  /** The face at rest. */
  mood?: CatMood;
  /** Hop with a grin (`cheer`) or shake with a wince (`oops`), then rest. */
  reaction?: CatReaction | null;
  /** Breathing, tail and blinking. Off for a cat that sits still in a dense list. */
  alive?: boolean;
  /** Tapping the cat makes it hop and grin. Decorative when absent. */
  onPress?: () => void;
  /** Accessible name when tappable. */
  accessibilityLabel?: string;
  /** Face left instead of right (the tail side). */
  flip?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** How long a reaction's face holds before the cat goes back to `mood`. */
const REACTION_MS = 900;
const BLINK_EVERY_MS = 3400;
const BLINK_MS = 130;

/**
 * WordKrush's mascot: a ginger cat in round glasses with a bow tie and an
 * open book. One drawing (`cat-art.json`) shared with the share cards.
 *
 * Three stacked SVGs so the parts can move without re-laying out the art:
 * the ground shadow (stays put, squashes on a landing), the tail (sways from
 * its root), and the body (breathes from the feet, blinks, hops). React
 * Native `Animated` only, transforms only. Reduce-motion keeps the faces and
 * drops every movement.
 */
export function CatMascot({ size, mood = 'idle', reaction, alive = true, onPress, accessibilityLabel, flip = false, style }: Props) {
  const reduceMotion = useReduceMotion();
  const moving = alive && !reduceMotion;
  const height = Math.round((size * CAT_ART.height) / CAT_ART.width);
  const prefix = useSvgId('cat');

  const breathe = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const [blink, setBlink] = useState(false);
  const [beat, setBeat] = useState<CatReaction | null>(null);

  // Breathing and the tail: two slow loops, out of step so it never looks mechanical.
  useEffect(() => {
    if (!moving) {
      breathe.setValue(0);
      sway.setValue(0);
      return;
    }
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(sway, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(sway, { toValue: -1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(sway, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ];
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [moving, breathe, sway]);

  // Blinking: a short shut every few seconds.
  useEffect(() => {
    if (!moving) return;
    let open: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      setBlink(true);
      open = setTimeout(() => setBlink(false), BLINK_MS);
    }, BLINK_EVERY_MS);
    return () => {
      clearInterval(timer);
      if (open) clearTimeout(open);
      setBlink(false);
    };
  }, [moving]);

  // A reaction from outside (a right call, a miss) or from a tap.
  const play = (next: CatReaction) => {
    setBeat(next);
    if (reduceMotion) return;
    if (next.mood === 'cheer') {
      hop.setValue(0);
      Animated.timing(hop, { toValue: 1, duration: 560, easing: Easing.linear, useNativeDriver: true }).start();
    } else {
      shake.setValue(0);
      Animated.timing(shake, { toValue: 1, duration: 480, easing: Easing.linear, useNativeDriver: true }).start();
    }
  };

  const reactionKey = reaction?.key;
  const reactionMood = reaction?.mood;
  useEffect(() => {
    if (reactionKey === undefined || reactionMood === undefined) return;
    // `play` reads only refs and setters, so the key and mood are the whole dependency.
    play({ key: reactionKey, mood: reactionMood });
  }, [reactionKey, reactionMood]);

  const beatKey = beat?.key;
  useEffect(() => {
    if (beatKey === undefined) return;
    const timer = setTimeout(() => setBeat(null), REACTION_MS);
    return () => clearTimeout(timer);
  }, [beatKey]);

  const face: CatMood = beat ? beat.mood : mood;
  const lift = size * 0.16;
  // Up and down with a squash on landing: the arc, then a settle.
  const translateY = hop.interpolate({ inputRange: [0, 0.4, 0.75, 0.88, 1], outputRange: [0, -lift, 0, -lift * 0.12, 0] });
  const squashX = hop.interpolate({ inputRange: [0, 0.08, 0.4, 0.75, 0.82, 1], outputRange: [1, 1.08, 0.94, 1.12, 1, 1] });
  const squashY = hop.interpolate({ inputRange: [0, 0.08, 0.4, 0.75, 0.82, 1], outputRange: [1, 0.9, 1.07, 0.88, 1, 1] });
  const breathY = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });
  const shakeX = shake.interpolate({ inputRange: [0, 0.15, 0.35, 0.55, 0.75, 1], outputRange: [0, -size * 0.05, size * 0.05, -size * 0.035, size * 0.02, 0] });
  const tailTurn = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '7deg'] });
  const shadowScale = hop.interpolate({ inputRange: [0, 0.4, 0.75, 1], outputRange: [1, 0.72, 1.05, 1] });

  const layer = (part: ArtLayer['part']) => (
    <Svg width={size} height={height} viewBox={`0 0 ${CAT_ART.width} ${CAT_ART.height}`} style={flip ? styles.flip : undefined}>
      <Defs>
        {CAT_ART.gradients.map((g) => (
          <LinearGradient key={g.id} id={`${prefix}-${g.id}`} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
            {g.stops.map(([offset, color]) => (
              <Stop key={offset} offset={offset} stopColor={color} />
            ))}
          </LinearGradient>
        ))}
      </Defs>
      {layersFor(CAT_ART, part, face, blink).map((item, index) => drawLayer(item, index, prefix))}
    </Svg>
  );

  // Transform origins at the feet and the tail root, as fractions of the drawing.
  const feet = '50% 96%';
  const tailRoot = `${flip ? 100 - 62.5 : 62.5}% 90%`;

  const art = (
    <View style={{ width: size, height }} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: feet, transform: [{ scaleX: shadowScale }] }]}>
        {layer('shadow')}
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transformOrigin: feet, transform: [{ translateX: shakeX }, { translateY }, { scaleX: squashX }, { scaleY: Animated.multiply(squashY, breathY) }] },
        ]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: tailRoot, transform: [{ rotate: tailTurn }] }]}>
          {layer('tail')}
        </Animated.View>
        {layer('body')}
      </Animated.View>
    </View>
  );

  if (!onPress) {
    return (
      <View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {art}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        feedback('select');
        play({ key: Date.now(), mood: 'cheer' });
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'The WordKrush cat'}
      hitSlop={8}
      style={style}
    >
      {art}
    </Pressable>
  );
}

function drawLayer(layer: ArtLayer, index: number, prefix: string): ReactElement {
  const fill = layer.fill.replace(/^url\(#([\w-]+)\)$/, `url(#${prefix}-$1)`);
  const paint = {
    fill,
    stroke: layer.stroke,
    strokeWidth: layer.strokeWidth,
    strokeLinecap: layer.strokeLinecap,
    strokeLinejoin: layer.strokeLinejoin,
    opacity: layer.opacity,
  };
  switch (layer.el) {
    case 'path':
      return <Path key={index} d={layer.d} {...paint} />;
    case 'circle':
      return <Circle key={index} cx={layer.cx} cy={layer.cy} r={layer.r} {...paint} />;
    case 'ellipse':
      return <Ellipse key={index} cx={layer.cx} cy={layer.cy} rx={layer.rx} ry={layer.ry} {...paint} />;
  }
}

const styles = StyleSheet.create({
  flip: { transform: [{ scaleX: -1 }] },
});
