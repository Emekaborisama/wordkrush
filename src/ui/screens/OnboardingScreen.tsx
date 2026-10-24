import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GAMES } from '../../games/registry';
import { BlockLogo, GameArtwork, GlossFace, PressableScale, SkyBackground, StrokeText } from '../components';
import { DanfoBus } from '../lagos/DanfoBus';
import { lagosCopy } from '../lagos/danfoTheme';
import { font, palette, space, tone } from '../theme';
import { useHeightClass } from '../useHeightClass';

/** What the first visit can open: a game's start pop-up, or the Lagos route. */
export type FirstPick = 'more-or-less' | 'clueless' | 'wordfall' | 'lagos';

type Props = {
  onPick: (pick: FirstPick) => void;
  onExplore: () => void;
};

type Tile = { pick: FirstPick; name: string; pitch: string; face: (typeof tone)[keyof typeof tone] };

const nameOf = (id: string): string => GAMES.find((game) => game.id === id)?.name ?? id;

/** One glossy tile per game, in the kit's colours, plus the Lagos route. */
const TILES: readonly Tile[] = [
  { pick: 'more-or-less', name: nameOf('more-or-less'), pitch: 'Is the next number higher or lower?', face: tone.green },
  { pick: 'clueless', name: nameOf('clueless'), pitch: 'Find the secret word by meaning.', face: tone.purple },
  { pick: 'wordfall', name: nameOf('wordfall'), pitch: 'Trace words. Set off cascades.', face: tone.blue },
  { pick: 'lagos', name: lagosCopy.title, pitch: lagosCopy.question, face: tone.danfo },
];

/**
 * The first visit, shown once before any score exists: the block logo drops
 * in over the sky and every game waits as a glossy tile. A tile opens that
 * game's own start pop-up (its goal and Play), so a new player chooses rather
 * than being dropped into one game.
 */
export function OnboardingScreen({ onPick, onExplore }: Props) {
  const fit = useHeightClass();
  const art = fit === 'regular' ? 72 : 56;
  return (
    <View style={styles.root}>
      <SkyBackground variant="sky" />
      <ScrollView contentContainerStyle={styles.column} showsVerticalScrollIndicator={false}>
        <BlockLogo size={fit === 'regular' ? 50 : 38} animate />
        <StrokeText size={fit === 'tight' ? 19 : 22} stroke={palette.navyDeep} strokeWidth={2.2} depth={2} lineHeight={28}>
          Pick a game
        </StrokeText>
        <View style={styles.grid} accessibilityRole="list">
          {TILES.map((tile) => (
            <PressableScale
              key={tile.pick}
              onPress={() => onPick(tile.pick)}
              translateOnPress={false}
              accessibilityRole="button"
              accessibilityLabel={`${tile.name}. ${tile.pitch}`}
              style={styles.cell}
            >
              {({ pressed }) => (
                <GlossFace tone={tile.face} pressed={pressed} lip={5} radius={20} faceStyle={styles.tile}>
                  {tile.pick === 'lagos' ? (
                    <View style={[styles.busArt, { height: art }]}>
                      <DanfoBus width={art * 1.6} destination="LAGOS" driving />
                    </View>
                  ) : (
                    <GameArtwork gameId={tile.pick} accent={tile.face.bottom} size={art} raised />
                  )}
                  <StrokeText size={17} stroke={tile.face.outline} strokeWidth={2} depth={1.5} numberOfLines={1}>
                    {tile.name}
                  </StrokeText>
                  <Text style={[styles.pitch, { textShadowColor: tile.face.outline }]} numberOfLines={2}>
                    {tile.pitch}
                  </Text>
                </GlossFace>
              )}
            </PressableScale>
          ))}
        </View>
        <PressableScale onPress={onExplore} accessibilityRole="button" accessibilityLabel="Explore games" style={styles.explore}>
          <Text style={styles.exploreText}>Look around first</Text>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 5,
    backgroundColor: palette.skyMid,
  },
  column: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.lg,
    gap: space.md,
  },
  grid: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  // Two per row: half the row less half the gap.
  cell: { width: '48.5%', flexGrow: 1 },
  tile: { alignItems: 'center', gap: 4, paddingVertical: space.sm, paddingHorizontal: space.sm, minHeight: 150 },
  busArt: { justifyContent: 'center', alignItems: 'center' },
  pitch: {
    fontFamily: font.heavy,
    fontSize: 12,
    lineHeight: 15,
    color: palette.white,
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  explore: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.md },
  exploreText: {
    fontFamily: font.black,
    fontSize: 15,
    color: palette.white,
    textDecorationLine: 'underline',
    textShadowColor: palette.navyDeep,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
