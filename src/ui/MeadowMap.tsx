import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { CloseButton, Gradient, PressableScale } from './components';
import { LevelStone } from './components/LevelStone';
import { FLUENT, MEADOW_SCENERY, type FluentName } from './fluent';
import { meadowLayout, trailPathD, type Stone } from './levelTrail';
import { font, palette, space } from './theme';
import { useReduceMotion } from './useReduceMotion';

const SPACING = 116;
const STONE = 54;
const CURRENT = 64;

/**
 * The full level map, after the Animal Heroes kit's level path: a meadow
 * with a winding sandy trail climbing from level 1 at the bottom, numbered
 * stones (wood when cleared, gold where you are, grey ahead), the stars each
 * level earned, 3D animals and trees along the way, and the game's animal
 * hopping on your stone. With `onSelect` an open stone starts that level;
 * without it the map is a view of the journey.
 */
export function MeadowMap({
  visible,
  title,
  stones,
  current,
  animal,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  stones: readonly Stone[];
  current: number;
  animal: FluentName;
  onSelect?: (levelNumber: number) => void;
  onClose: () => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const scroll = useRef<ScrollView>(null);
  const reduceMotion = useReduceMotion();
  const hop = useRef(new Animated.Value(0)).current;
  const layout = meadowLayout(stones.length, size.width, SPACING);
  const currentIndex = Math.max(0, stones.findIndex((stone) => stone.number === current));

  useEffect(() => {
    if (!visible || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(700),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, reduceMotion, hop]);

  // Open on your level, not on level 1.
  useEffect(() => {
    if (!visible || size.width === 0) return;
    const point = layout.points[currentIndex];
    if (!point) return;
    const y = Math.max(0, point.y - size.height / 2);
    const timer = setTimeout(() => scroll.current?.scrollTo({ y, animated: false }), 0);
    return () => clearTimeout(timer);
  }, [visible, size.width, size.height, currentIndex, layout.points]);

  if (!visible) return null;
  const path = trailPathD(layout.points);

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <Gradient colors={['#8FD866', '#62B947', '#469A33']} locations={[0, 0.5, 1]} />
      <View style={styles.fill} onLayout={(event) => setSize(event.nativeEvent.layout)}>
        {size.width > 0 ? (
          <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ height: layout.height }}>
            <Svg width={size.width} height={layout.height} style={StyleSheet.absoluteFill}>
              {layout.points.map((point, i) => (
                // Soft lighter patches of grass, so the meadow has some depth.
                <Ellipse
                  key={`g${i}`}
                  cx={(point.x + size.width * (0.35 + 0.3 * ((i * 7) % 3))) % size.width}
                  cy={point.y + SPACING * 0.45}
                  rx={size.width * 0.22}
                  ry={26}
                  fill="#B6EC8C"
                  opacity={0.35}
                />
              ))}
              <Path d={path} stroke="#B9873A" strokeWidth={46} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d={path} stroke="#F6DC97" strokeWidth={36} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            {layout.points.map((point, i) => {
              const scenery = MEADOW_SCENERY[i % MEADOW_SCENERY.length];
              const big = scenery === 'tree' || scenery === 'pine' || scenery === 'house';
              // Beside the path, on the far side of the stone, never behind it.
              const offset = size.width * 0.3;
              const side = Math.min(size.width - 40, Math.max(40, point.x < size.width / 2 ? point.x + offset : point.x - offset));
              const sceneSize = big ? 84 : 58;
              return (
                <Image
                  key={`s${i}`}
                  source={FLUENT[scenery]}
                  style={[styles.scenery, { width: sceneSize, height: sceneSize, left: side - sceneSize / 2, top: point.y - sceneSize + 18 }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              );
            })}
            {stones.map((stone, i) => {
              const point = layout.points[i];
              const isCurrent = stone.number === current;
              const diameter = isCurrent ? CURRENT : STONE;
              const playable = Boolean(onSelect) && (stone.state === 'cleared' || stone.state === 'open' || stone.state === 'current');
              const label = `Level ${stone.number}${stone.name ? `, ${stone.name}` : ''}, ${
                stone.state === 'locked' ? 'locked' : stone.state === 'soon' ? 'coming soon' : stone.state === 'cleared' ? 'cleared' : 'open'
              }`;
              return (
                <PressableScale
                  key={stone.number}
                  disabled={!playable}
                  onPress={() => onSelect?.(stone.number)}
                  accessibilityRole={playable ? 'button' : 'text'}
                  accessibilityLabel={label}
                  accessibilityState={{ disabled: !playable, selected: isCurrent }}
                  style={[styles.stone, { left: point.x - diameter / 2, top: point.y - diameter / 2 }]}
                >
                  <LevelStone stone={{ ...stone, state: isCurrent ? 'current' : stone.state }} size={diameter} />
                  {stone.name && stone.state !== 'locked' ? (
                    <View style={styles.tag}>
                      <Text style={styles.tagText} numberOfLines={1}>
                        {stone.name}
                      </Text>
                    </View>
                  ) : null}
                  {isCurrent ? (
                    <Animated.View
                      style={[
                        styles.animal,
                        { left: diameter / 2 - 26, transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] },
                      ]}
                    >
                      <Image source={FLUENT[animal]} style={styles.animalImage} />
                    </Animated.View>
                  ) : null}
                </PressableScale>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
      {/* The kit's wooden sign, hanging on two chains. */}
      <View style={styles.signWrap} pointerEvents="box-none">
        <View style={styles.chains} pointerEvents="none">
          <View style={styles.chain} />
          <View style={styles.chain} />
        </View>
        <View style={styles.sign}>
          <Gradient colors={['#C98B4E', '#9C5F2B', '#7A4419']} locations={[0, 0.5, 1]} />
          <Text style={styles.signText}>{title}</Text>
        </View>
        <CloseButton onPress={onClose} accessibilityLabel="Close level map" style={styles.close} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 80, backgroundColor: '#62B947' },
  fill: { flex: 1 },
  scenery: { position: 'absolute' },
  stone: { position: 'absolute', alignItems: 'center' },
  tag: {
    marginTop: 4,
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 244, 214, 0.95)',
    borderWidth: 2,
    borderColor: '#9C5F2B',
  },
  tagText: { fontFamily: font.black, fontSize: 11, color: '#5A3415' },
  animal: { position: 'absolute', top: -46 },
  animalImage: { width: 52, height: 52 },
  signWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: space.lg },
  chains: { position: 'absolute', top: 0, width: 190, height: space.lg + 6, flexDirection: 'row', justifyContent: 'space-between' },
  chain: { width: 4, height: '100%', backgroundColor: '#D8DCE2', borderRadius: 2 },
  sign: {
    minWidth: 220,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#4A2810',
    overflow: 'hidden',
    alignItems: 'center',
  },
  signText: {
    fontFamily: font.black,
    fontSize: 26,
    color: '#FFE9B8',
    textShadowColor: '#4A2810',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  close: { position: 'absolute', right: space.md, top: space.lg },
});
