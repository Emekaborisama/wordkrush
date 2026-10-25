import { Image, StyleSheet, Text, View } from 'react-native';
import { FLUENT } from '../fluent';
import type { Stone } from '../levelTrail';
import { font, palette } from '../theme';
import { Gradient } from './Gradient';

/** Stone colours from the Animal Heroes map: wood once cleared, gold where you are, grey ahead. */
const LOOK = {
  cleared: { top: '#F6A85A', bottom: '#B8611D', edge: '#6B3410', text: '#FFFFFF' },
  current: { top: '#FFF08A', bottom: '#F5B400', edge: '#9A6A00', text: '#5A3C00' },
  open: { top: '#F6A85A', bottom: '#C8742A', edge: '#6B3410', text: '#FFFFFF' },
  locked: { top: '#D9DDE3', bottom: '#8E96A3', edge: '#5B6370', text: '#F4F6F8' },
  soon: { top: '#D9DDE3', bottom: '#8E96A3', edge: '#5B6370', text: '#F4F6F8' },
} as const;

/**
 * One numbered stone on a level path: a round, bevelled disc with its number,
 * and the stars it earned above it (or a tick when the game keeps no stars).
 * Locked stones are grey, numbers still showing, as on the reference map.
 */
export function LevelStone({ stone, size = 40, showStars = true }: { stone: Stone; size?: number; showStars?: boolean }) {
  const look = LOOK[stone.state];
  const done = stone.state === 'cleared';
  return (
    <View style={{ width: size, alignItems: 'center' }}>
      {showStars && done ? (
        <View style={[styles.stars, { top: -size * 0.42 }]}>
          {stone.stars === undefined ? (
            <Text style={[styles.tick, { fontSize: size * 0.36 }]}>✓</Text>
          ) : (
            [0, 1, 2].map((i) => (
              <Image
                key={i}
                source={FLUENT.star}
                style={{ width: size * 0.34, height: size * 0.34, opacity: i < (stone.stars ?? 0) ? 1 : 0.28, marginTop: i === 1 ? -size * 0.1 : 0 }}
              />
            ))
          )}
        </View>
      ) : null}
      <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2, borderColor: look.edge }]}>
        <View style={[styles.face, { borderRadius: size / 2 }]}>
          <Gradient colors={[look.top, look.bottom]} />
        </View>
        <View style={[styles.shine, { borderRadius: size / 2 }]} />
        <Text style={[styles.number, { fontSize: size * (stone.number >= 100 ? 0.32 : 0.42), color: look.text }]}>
          {stone.state === 'soon' ? '…' : stone.number}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  face: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  shine: { position: 'absolute', top: 3, left: '18%', right: '18%', height: '32%', backgroundColor: 'rgba(255,255,255,0.35)' },
  number: { fontFamily: font.black, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  stars: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-end', zIndex: 2 },
  tick: { fontFamily: font.black, color: palette.white, textShadowColor: '#2E7D32', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});
