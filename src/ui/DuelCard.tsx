import { Image, StyleSheet, Text, View } from 'react-native';
import type { DuelPlayer } from '../duel/rules';
import { CountryFlag, Gradient, PressableScale, StrokeText } from './components';
import { FLUENT } from './fluent';
import { font, palette, shadow, space } from './theme';

/**
 * 1v1 on Home: a live match against a stranger, with the player's own flag and
 * name so they see how they will show up to the other side.
 */
export function DuelCard({ player, onPress }: { player: DuelPlayer; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="1v1 live. Play someone right now"
      style={styles.card}
    >
      <View style={styles.clip}>
        <Gradient colors={['#F9736A', '#DC2F4F', '#B01E42']} locations={[0, 0.55, 1]} />
      </View>
      <View style={styles.row}>
        <Image source={FLUENT.swords} style={styles.icon} />
        <View style={styles.copy}>
          <StrokeText size={13} stroke="#6E0F2A" strokeWidth={1.4} depth={0} align="left">
            1V1 LIVE
          </StrokeText>
          <StrokeText size={20} stroke="#6E0F2A" strokeWidth={2} depth={1.5} align="left" numberOfLines={1}>
            Find a rival
          </StrokeText>
          <View style={styles.meta}>
            <CountryFlag code={player.country} size={13} />
            <Text style={styles.metaText} numberOfLines={1}>
              {player.name}
            </Text>
          </View>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Play</Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 3, borderColor: palette.white, ...shadow.card },
  clip: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 19, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm },
  icon: { width: 60, height: 60 },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { flexShrink: 1, fontFamily: font.heavy, fontSize: 12, color: palette.white },
  pill: {
    paddingHorizontal: 16,
    minHeight: 40,
    borderRadius: 20,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.white,
    backgroundColor: '#3DB33A',
  },
  pillText: { fontFamily: font.black, fontSize: 16, color: palette.white },
});
